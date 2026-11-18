<?php

declare(strict_types=1);

/*
 * Step 4 of the load run: is the generated data sound? Read-only.
 *   php tools/load/checks.php            (the database of .env.testing, or DB_DATABASE)
 * Exit code 0 = every check passes. Prints counts and names of checks, never a person's name.
 */

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;

if (! function_exists('app')) {
    putenv('APP_ENV=testing');
    $_ENV['APP_ENV'] = $_SERVER['APP_ENV'] = 'testing';
    require __DIR__.'/../../vendor/autoload.php';
    $app = require __DIR__.'/../../bootstrap/app.php';
    $app->make(Kernel::class)->bootstrap();
}
require_once __DIR__.'/Generator.php'; // LoadGenerator::DEMO_USERNAMES

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
