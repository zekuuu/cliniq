<?php

declare(strict_types=1);

/*
 * Step 4 of the load run: is the generated data sound? Read-only.
 *   php tools/load/checks.php            (the database of .env.testing, or DB_DATABASE)
 * Exit code 0 = every check passes. Prints counts and names of checks, never a person's name.
 */

use App\Shared\Database\DemoSchool\LoadGenerator;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;

if (! function_exists('app')) {
    putenv('APP_ENV=testing');
    $_ENV['APP_ENV'] = $_SERVER['APP_ENV'] = 'testing';
    require __DIR__.'/../../vendor/autoload.php';
    $app = require __DIR__.'/../../bootstrap/app.php';
    $app->make(Kernel::class)->bootstrap();
}

/** @return int number of failed checks */
function loadChecks(): int
{
    $db = DB::getDatabaseName();
    $failed = 0;
    $check = function (string $name, bool $ok, string $detail = '') use (&$failed): void {
        $failed += $ok ? 0 : 1;
        printf("  %-4s %s%s\n", $ok ? 'ok' : 'FAIL', $name, $detail === '' ? '' : "  ({$detail})");
    };
    $one = fn (string $sql, array $b = []): int => (int) (array_values((array) (DB::selectOne($sql, $b) ?? ['n' => 0]))[0] ?? 0);

    echo "\nChecks on {$db}\n";

    // Every foreign key resolves (InnoDB enforces them; this proves nothing was loaded with checks off).
    $orphans = 0;
    $fks = [];
    foreach (DB::select('SELECT constraint_name k, table_name t, column_name c, referenced_table_name rt, referenced_column_name rc FROM information_schema.key_column_usage WHERE table_schema = ? AND referenced_table_name IS NOT NULL ORDER BY constraint_name, ordinal_position', [$db]) as $c) {
        $fks["{$c->t}.{$c->k}"][] = $c; // a composite key, such as (incident_id, student_id), joins on every column
    }
    foreach ($fks as $cols) {
        $on = implode(' AND ', array_map(fn (object $c): string => "b.`{$c->rc}` = a.`{$c->c}`", $cols));
        $set = implode(' AND ', array_map(fn (object $c): string => "a.`{$c->c}` IS NOT NULL", $cols));
        $orphans += $one("SELECT COUNT(*) FROM `{$cols[0]->t}` a LEFT JOIN `{$cols[0]->rt}` b ON {$on} WHERE {$set} AND b.`{$cols[0]->rc}` IS NULL");
    }
    $check('every foreign key resolves', $orphans === 0, "{$orphans} orphans");

    // Stock parity. Each movement's stock_after = the one before + its delta; the last = the batches'
    // sum; the ledger (with its `opening` row, ERD "Starting stock for a new item") sums to the stock.
    $bad = $one('SELECT COUNT(*) FROM (SELECT stock_after - quantity_delta - LAG(stock_after) OVER (PARTITION BY item_id ORDER BY id) d FROM inventory_transactions) x WHERE d <> 0');
    $check('every movement: stock_after = the previous stock_after + its delta', $bad === 0, "{$bad} movements break the chain");
    $bad = $one('SELECT COUNT(*) FROM inventory_items i JOIN inventory_transactions t ON t.id = (SELECT MAX(id) FROM inventory_transactions WHERE item_id = i.id)
        WHERE t.stock_after <> (SELECT COALESCE(SUM(quantity), 0) FROM inventory_batches WHERE item_id = i.id)');
    $check('the last movement stock_after = stock on hand (the batches), every item', $bad === 0, "{$bad} items differ");
    $bad = $one('SELECT COUNT(*) FROM inventory_items i
        LEFT JOIN (SELECT item_id, SUM(quantity) q FROM inventory_batches GROUP BY item_id) b ON b.item_id = i.id
        LEFT JOIN (SELECT item_id, SUM(quantity_delta) q FROM inventory_transactions GROUP BY item_id) t ON t.item_id = i.id
        WHERE COALESCE(b.q, 0) <> COALESCE(t.q, 0)');
    $check('stock on hand = opening + restocked - dispensed +/- adjusted, every item', $bad === 0, "{$bad} items differ");
    $bad = $one('SELECT COUNT(*) FROM inventory_batches b LEFT JOIN (SELECT batch_id, SUM(quantity) q FROM inventory_transaction_batches GROUP BY batch_id) a ON a.batch_id = b.id WHERE b.quantity <> COALESCE(a.q, 0)');
    $check('each batch = the sum of its allocations', $bad === 0, "{$bad} batches differ");
    $bad = $one("SELECT COUNT(*) FROM inventory_items i WHERE NOT EXISTS (SELECT 1 FROM inventory_transactions WHERE item_id = i.id AND type = 'opening')");
    $check('every item has its `opening` ledger row (defect D1, fixed November 16, 2026)', $bad === 0, "{$bad} items without");

    // Reference numbers: unique (the schema) and gapless per year.
    foreach (['excuse_letters' => 'EL', 'incident_report_approvals' => 'IR'] as $table => $prefix) {
        $gaps = 0;
        $dupes = $one("SELECT COUNT(reference_no) - COUNT(DISTINCT reference_no) FROM {$table}");
        foreach (DB::select("SELECT SUBSTRING(reference_no, 4, 4) y, COUNT(*) n, MAX(CAST(SUBSTRING(reference_no, 9) AS UNSIGNED)) m FROM {$table} WHERE reference_no IS NOT NULL GROUP BY y") as $r) {
            $gaps += (int) $r->m - (int) $r->n;
        }
        $check("{$prefix}- numbers unique and gapless per year", $dupes === 0 && $gaps === 0, "{$dupes} repeats, {$gaps} gaps, ".$one("SELECT COUNT(reference_no) FROM {$table}").' numbers');
    }
    $n = $one('SELECT COUNT(*) FROM personnel');
    $m = $one("SELECT MAX(CAST(SUBSTRING(staff_number, 5) AS UNSIGNED)) FROM personnel WHERE staff_number LIKE 'STF-%'");
    $check('Staff No. unique and gapless', $n === $m && $one('SELECT COUNT(DISTINCT staff_number) FROM personnel') === $n, "{$n} staff, highest {$m}");

    // The audit log names only people and users that exist.
    $bad = $one('SELECT COUNT(*) FROM audit_logs a WHERE (a.actor_user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = a.actor_user_id))
        OR (a.subject_student_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM students s WHERE s.id = a.subject_student_id))
        OR (a.subject_personnel_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM personnel p WHERE p.id = a.subject_personnel_id))');
    $check('the audit log names no one who does not exist', $bad === 0, "{$bad} rows");

    // No LRN outside the reserved range.
    $bad = $one("SELECT COUNT(*) FROM students WHERE lrn NOT LIKE '999900______' OR lrn NOT REGEXP '^[0-9]{12}$'");
    $check('every LRN is in the reserved range 999900000001-999900999999', $bad === 0, "{$bad} outside");

    // No real person: the project's people, read from the knowledge base at run time and never printed.
    $real = [];
    $plan = (string) @file_get_contents(base_path('../CLINIQ-Knowledge-Base/09-References/Canonical-Documents/CLINIQ_Project_Plan.md'));
    foreach (explode("\n", $plan) as $line) {
        if (preg_match('/^\| \d+\.\d+ \| [^|]+\| ([^|]+)\|/', $line, $m) === 1) {
            foreach (explode(',', (string) preg_replace('/\(.*?\)/', '', $m[1])) as $who) {
                $real[] = trim($who);
            }
        }
    }
    $mock = json_decode((string) @file_get_contents(base_path('../frontend/src/lib/mock-db/mock-db.json')), true);
    foreach ((array) ($mock['users'] ?? []) as $u) {
        $name = (string) ($u['name'] ?? '');
        $real[] = str_starts_with($name, 'Demo ') ? '' : $name; // "Demo Clinician" and the like are role words
    }
    $surnames = [];
    foreach (array_unique(array_filter($real)) as $who) {
        $parts = preg_split('/\s+/', trim((string) preg_replace('/[^\p{L}\s\'-]/u', ' ', $who))) ?: [];
        if (count($parts) >= 2 && mb_strlen(end($parts)) > 2) {
            $surnames[] = mb_strtolower((string) end($parts));
        }
    }
    $hits = 0;
    foreach (['students', 'personnel'] as $t) {
        foreach (DB::table($t)->pluck('last_name') as $last) {
            $hits += in_array(mb_strtolower((string) $last), $surnames, true) ? 1 : 0;
        }
    }
    // The demo accounts are copied from the mock on purpose (same names and passwords), so they are not matched.
    foreach (DB::table('users')->whereNotIn('username', LoadGenerator::DEMO_USERNAMES)->pluck('name') as $name) {
        foreach ($surnames as $s) {
            $hits += str_contains(mb_strtolower((string) $name), $s) ? 1 : 0;
        }
    }
    $check('no generated person shares a surname with the project\'s real people', $hits === 0, count(array_unique($surnames))." surnames read from the KB, {$hits} matches");

    return $failed + loadRealism();
}

/**
 * Does the school look like a school? Read-only, in the same ok / FAIL style (added Saturday, November 21,
 * 2026, with the realistic demo school). Thresholds come from the product's own settings.
 *
 * @return int number of failed checks
 */
function loadRealism(): int
{
    $failed = 0;
    $check = function (string $name, int $bad, string $detail = '') use (&$failed): void {
        $failed += $bad === 0 ? 0 : 1;
        printf("  %-4s %s  (%d%s)\n", $bad === 0 ? 'ok' : 'FAIL', $name, $bad, $detail === '' ? '' : ", {$detail}");
    };
    $one = fn (string $sql): int => (int) (array_values((array) (DB::selectOne($sql) ?? ['n' => 0]))[0] ?? 0);
    $setting = fn (string $key): array => (array) json_decode((string) DB::table('reference_settings')->where('setting_key', $key)->value('setting_value'), true);
    $usual = $setting('vitals_usual_ranges');
    $fever = (float) ($setting('vitals_warning_ranges')['feverFromC'] ?? 37);
    $noClass = "(DAYOFWEEK(%s) IN (1, 7) OR %s IN (SELECT holiday_date FROM holidays WHERE kind <> 'special-working'))";
    $off = fn (string $col): string => sprintf($noClass, $col, $col);
    echo "\nRealism checks\n";

    // People: a Grade g student is 5 + g on August 31 of the school year (the cut-off), so bands never overlap.
    $y = (int) substr((string) DB::table('school_years')->max('label'), 0, 4);
    $check('every active student\'s age fits the grade by the August 31 cut-off', $y === 0 ? 0 : $one("SELECT COUNT(*) FROM students s JOIN grade_levels g ON g.id = s.grade_level_id
        WHERE s.archived_at IS NULL AND s.birth_date IS NOT NULL AND TIMESTAMPDIFF(YEAR, s.birth_date, '{$y}-08-31') <> g.sort_order + 5"), "school year {$y}");
    $check('birth dates after 1990 and before the school year', $one("SELECT COUNT(*) FROM students WHERE birth_date < '1990-01-01' OR birth_date > '".($y ?: 2100)."-06-15'"));
    $check('twins and same-birthday students share a grade', $one('SELECT COUNT(*) FROM (SELECT birth_date FROM students WHERE archived_at IS NULL AND birth_date IS NOT NULL GROUP BY birth_date HAVING COUNT(DISTINCT grade_level_id) > 1) x'));

    // Visits: who, when, how long.
    $check('menstrual cramps only for female students aged 10 and up, and female staff', $one("SELECT COUNT(*) FROM visits v LEFT JOIN students s ON s.id = v.student_id LEFT JOIN personnel p ON p.id = v.personnel_id
        WHERE v.complaint = 'Menstrual cramps' AND ((s.id IS NOT NULL AND (s.sex IS NULL OR s.sex <> 'female' OR TIMESTAMPDIFF(YEAR, s.birth_date, v.visited_at) < 10
        OR (s.birth_date IS NULL AND v.grade_level_at_time IN ('Kinder', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4')))) OR (p.id IS NOT NULL AND p.sex <> 'female'))"));
    $check('visits on school days, 07:00 to 17:00', $one("SELECT COUNT(*) FROM visits WHERE TIME(visited_at) < '07:00' OR TIME(visited_at) > '17:00' OR ".$off('DATE(visited_at)')));
    $check('time out after time in', $one('SELECT COUNT(*) FROM visits WHERE time_out IS NOT NULL AND time_out < TIME(visited_at)'));
    $check('excuse letters dated on or after their visit', $one('SELECT COUNT(*) FROM excuse_letters e JOIN visits v ON v.id = e.visit_id WHERE e.created_at < v.visited_at OR e.excused_from < DATE(v.visited_at) OR e.excused_until < e.excused_from'));
    $check('follow-ups due on a school day, after they were set', $one('SELECT COUNT(*) FROM follow_ups WHERE '.$off('follow_up_date').' OR follow_up_date < DATE(created_at)'));
    $check('created_at on the record\'s own clock (visits), never after updated_at', $one('SELECT COUNT(*) FROM visits WHERE DATE(created_at) <> DATE(visited_at) OR created_at > updated_at'));

    // Vitals against the settings: a fever reads at or above feverFromC; a wound or a sprain does not run a fever.
    $check("a Fever visit reads {$fever} °C or more; a wound, sprain or toothache under ".($fever + 0.5).' °C', $one("SELECT COUNT(*) FROM visits WHERE (complaint = 'Fever' AND temperature_c < {$fever})
        OR (complaint IN ('Minor wound', 'Sprain', 'Toothache', 'Eye irritation', 'Nosebleed', 'Itchy skin') AND temperature_c >= ".($fever + 0.5).')'));
    // Injury incidents: pulse and systolic inside the age group's usual range, with a tolerance of 20 bpm and 10 mmHg for pain.
    $bad = 0;
    $injuries = "'Fall injury', 'Head bump during PE', 'Hit by a ball', 'Ankle sprain during PE', 'Deep cut'";
    foreach (DB::select("SELECT i.grade_level_at_time g, i.personnel_id p, r.pulse_bpm pulse, r.blood_pressure bp FROM incident_vital_readings r JOIN incidents i ON i.id = r.incident_id WHERE i.complaint IN ({$injuries})") as $r) {
        $group = $r->p !== null ? 'adult' : match ($r->g) {
            'Kinder' => 'kinder', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6' => 'grades1to6', default => 'grades7to12',
        };
        $u = (array) ($usual['byAgeGroup'][$group] ?? []);
        $sys = (int) explode('/', (string) $r->bp)[0];
        $bad += $r->pulse !== null && ($r->pulse < ($u['pulseBpm']['min'] ?? 0) - 20 || $r->pulse > ($u['pulseBpm']['max'] ?? 999) + 20) ? 1 : 0;
        $bad += $r->bp !== null && ($sys < ($u['systolic']['min'] ?? 0) - 10 || $sys > ($u['systolic']['max'] ?? 999) + 10) ? 1 : 0;
    }
    $check('injury incident vitals inside the age group\'s usual range (+/- 20 bpm, 10 mmHg)', $bad);

    // Stock: nothing given against a recorded allergy (the item's allergy words or its name), nothing negative, sane expiry dates.
    $check('no item given to a student allergic to it', $one("SELECT COUNT(*) FROM inventory_transactions t JOIN inventory_items i ON i.id = t.item_id
        JOIN student_health_entries h ON h.student_id = t.student_id AND h.kind = 'allergy'
        WHERE t.type = 'dispense' AND (LOCATE(LOWER(h.label), LOWER(i.name)) > 0
        OR EXISTS (SELECT 1 FROM inventory_item_allergy_words w WHERE w.item_id = t.item_id AND (LOCATE(LOWER(w.word), LOWER(h.label)) > 0 OR LOCATE(LOWER(h.label), LOWER(w.word)) > 0)))"));
    $check('stock never negative', $one('SELECT (SELECT COUNT(*) FROM inventory_batches WHERE quantity < 0) + (SELECT COUNT(*) FROM inventory_transactions WHERE stock_after < 0)'));
    $check('expiry dates 12 to 36 months after receipt', $one('SELECT COUNT(*) FROM inventory_batches WHERE expiration_date IS NOT NULL AND TIMESTAMPDIFF(MONTH, received_date, expiration_date) NOT BETWEEN 12 AND 36'));

    // Calendar and contacts.
    $check('calendar events start and end on school days', $one('SELECT COUNT(*) FROM calendar_events WHERE '.$off('start_date').' OR '.$off('last_date')));
    $check('contact numbers are 09XXXXXXXXX', $one("SELECT (SELECT COUNT(*) FROM emergency_contacts WHERE phone NOT REGEXP '^09[0-9]{9}$')
        + (SELECT COUNT(*) FROM personnel_emergency_contacts WHERE phone NOT REGEXP '^09[0-9]{9}$') + (SELECT COUNT(*) FROM personnel WHERE contact_number NOT REGEXP '^09[0-9]{9}$')"));
    $check('no number shared by unrelated families', $one('SELECT COUNT(*) FROM (SELECT c.phone FROM emergency_contacts c JOIN students s ON s.id = c.student_id GROUP BY c.phone HAVING COUNT(DISTINCT s.last_name) > 1) x')
        + $one('SELECT COUNT(*) FROM emergency_contacts c JOIN personnel_emergency_contacts p ON p.phone = c.phone'));

    return $failed;
}

/** Row counts of the big tables and the audit log per year. */
function loadCounts(): void
{
    $db = DB::getDatabaseName();
    echo "\nRows on {$db}\n";
    foreach (DB::select('SELECT table_name t, table_rows r FROM information_schema.tables WHERE table_schema = ? ORDER BY table_name', [$db]) as $r) {
        $n = DB::table($r->t)->count();
        if ($n > 0) {
            printf("  %-34s %8d\n", $r->t, $n);
        }
    }
    printf("  %-34s %8d active, %d archived, %d with no sex, %d incomplete reviews open\n", 'students (detail)', DB::table('students')->whereNull('archived_at')->count(), DB::table('students')->whereNotNull('archived_at')->count(), DB::table('students')->whereNull('sex')->whereNull('archived_at')->count(), DB::table('student_record_reviews')->whereNull('resolved_at')->count());
    echo '  audit_logs per year:';
    foreach (DB::select('SELECT YEAR(occurred_at) y, COUNT(*) n FROM audit_logs GROUP BY y ORDER BY y') as $r) {
        echo " {$r->y}={$r->n}";
    }
    echo "\n";
}

if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === realpath(__FILE__)) {
    loadCounts();
    exit(loadChecks() === 0 ? 0 : 1);
}
