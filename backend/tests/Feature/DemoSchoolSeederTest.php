<?php

declare(strict_types=1);

use App\Shared\Database\DemoSchoolSeeder;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

require_once __DIR__.'/../../tools/load/checks.php';

/** A tiny school: one year, two weeks of class (June 15 to 26, 2026), stopping at noon on the last day (or at $until). */
function tinySchool(string $until = '2026-06-26 12:00'): array
{
    // A Pest process reuses the app after HTTP tests; a CLI seed starts with a fresh request/cache.
    app('cache')->setDefaultDriver('array');
    cache()->flush();
    request()->attributes->remove('cliniq.system_settings');
    (new DemoSchoolSeeder)->run(['students' => 20, 'staff' => 3, 'years' => 1, 'audit' => 0, 'seed' => 20261116, 'until' => CarbonImmutable::parse($until, 'Asia/Manila')]);
    $counts = [];
    foreach (DB::select('SELECT table_name t FROM information_schema.tables WHERE table_schema = ? ORDER BY table_name', [DB::getDatabaseName()]) as $r) {
        $counts[$r->t] = DB::table($r->t)->count();
    }

    return $counts;
}

it('refuses production, cliniq and an unlisted database', function () {
    expect(DemoSchoolSeeder::refusal('cliniq_testing', true))->toContain('production')
        ->and(DemoSchoolSeeder::refusal('cliniq', false))->toContain('not one of')
        ->and(DemoSchoolSeeder::refusal('cliniq_other', false))->toContain('not one of')
        ->and(DemoSchoolSeeder::refusal('cliniq_check_demo', false))->toBeNull()
        ->and(DemoSchoolSeeder::refusal('cliniq_load', false))->toBeNull()
        ->and(DemoSchoolSeeder::refusal('cliniq_testing', false))->toBeNull();
});

it('refuses a database with foreign accounts, and one that is not empty', function () {
    DB::table('users')->insert(['name' => 'Someone Else', 'username' => 'someone', 'password_hash' => 'x', 'role' => 'staff']);
    expect(fn () => (new DemoSchoolSeeder)->run())->toThrow(RuntimeException::class, 'accounts or students this tool did not make');
    DB::table('users')->delete();
    DB::table('users')->insert(['name' => 'Jennesse Baas', 'username' => 'demo.nurse', 'password_hash' => 'x', 'role' => 'staff']);
    expect(fn () => (new DemoSchoolSeeder)->run())->toThrow(RuntimeException::class, 'not freshly migrated and empty');
});

it('ends on February 28, 2027 by default and accepts future dates', function () {
    expect(DemoSchoolSeeder::until('')->format('Y-m-d H:i'))->toBe('2027-02-28 23:59')
        ->and(DemoSchoolSeeder::until('2028-03-31')->format('Y-m-d H:i'))->toBe('2028-03-31 23:59')
        ->and(DemoSchoolSeeder::until('2026-06-26')->format('Y-m-d H:i'))->toBe('2026-06-26 23:59')
        ->and(DemoSchoolSeeder::optionsFromEnv()['years'])->toBe(5);
});

/** The rows of one day and before, for comparing two builds; ids left out (a rolled-back test keeps its AUTO_INCREMENT; build.php proves the ids). */
function rowsUpTo(string $end): string
{
    $out = [];
    foreach (['visits' => 'visited_at', 'inventory_transactions' => 'occurred_at', 'audit_logs' => 'occurred_at', 'incident_vital_readings' => 'recorded_at', 'students' => 'created_at'] as $table => $col) {
        $out[$table] = DB::table($table)->where($col, '<=', $end)->orderBy('id')->get()->map(fn (object $r): array => array_filter((array) $r, fn (string $k): bool => $k !== 'id' && ! str_ends_with($k, '_id') && ! in_array($k, ['updated_at', 'section', 'target_id', 'run_key'], true), ARRAY_FILTER_USE_KEY))->all();
    }

    return md5((string) json_encode($out));
}

it('seeds a tiny school that passes the soundness checks, with the screenshot extras', function () {
    $counts = tinySchool();
    ob_start();
    $failed = loadChecks();
    ob_end_clean();

    expect($failed)->toBe(0)
        ->and($counts['visits'])->toBeGreaterThan(0)
        ->and(DB::table('visits')->max('visited_at'))->toBeLessThanOrEqual('2026-06-26 12:00:00')
        ->and(DB::table('users')->where('username', 'demo.nurse')->value('name'))->toBe('Jennesse Baas')
        ->and(DB::table('users')->where('username', 'demo.principal')->value('name'))->toBe('Gilan Avelida')
        ->and(DB::table('backup_locations')->where('label', 'External drive')->exists())->toBeTrue()
        ->and(DB::table('sports_reports')->where('title', 'Grade 10 basketball try-outs')->exists())->toBeTrue()
        ->and(DB::table('sports_report_students')->count())->toBeGreaterThan(0);

    return $counts;
});

it('makes the same rows again from the same options', function (array $first) {
    expect(tinySchool())->toBe($first);
})->depends('it seeds a tiny school that passes the soundness checks, with the screenshot extras');

it('keeps every earlier row when the end date moves later (prefix-stable)', function () {
    tinySchool('2026-06-22 23:59');
    expect(DB::table('visits')->where('visited_at', '>', '2026-06-23')->exists())->toBeFalse();

    return rowsUpTo('2026-06-22 23:59:59');
});

it('builds the same days again with a later end date', function (string $earlier) {
    tinySchool('2026-06-26 23:59');
    expect(rowsUpTo('2026-06-22 23:59:59'))->toBe($earlier)
        ->and(DB::table('visits')->where('visited_at', '>', '2026-06-23')->exists())->toBeTrue();
})->depends('it keeps every earlier row when the end date moves later (prefix-stable)');

it('builds students whose ages fit their grade, twins in one grade, and no impossible complaint or allergy dispense', function () {
    tinySchool();
    $y = 2026;
    $outside = DB::table('students')->join('grade_levels', 'grade_levels.id', '=', 'students.grade_level_id')->whereNotNull('students.birth_date')
        ->whereRaw("TIMESTAMPDIFF(YEAR, students.birth_date, '{$y}-08-31') <> grade_levels.sort_order + 5")->count();
    $crossGrade = DB::select('SELECT birth_date FROM students WHERE birth_date IS NOT NULL GROUP BY birth_date HAVING COUNT(DISTINCT grade_level_id) > 1');
    $twins = DB::select('SELECT birth_date FROM students WHERE birth_date IS NOT NULL GROUP BY birth_date, last_name HAVING COUNT(*) > 1');
    $badCramps = DB::table('visits')->leftJoin('students', 'students.id', '=', 'visits.student_id')->where('complaint', 'Menstrual cramps')
        ->whereNotNull('visits.student_id')->where(fn ($q) => $q->whereNull('students.sex')->orWhere('students.sex', '<>', 'female')->orWhereRaw('TIMESTAMPDIFF(YEAR, students.birth_date, visits.visited_at) < 10'))->count();

    expect($outside)->toBe(0)->and($crossGrade)->toBe([])->and(count($twins))->toBeGreaterThanOrEqual(1)->and($badCramps)->toBe(0)
        ->and(DB::table('inventory_item_allergy_words')->count())->toBeGreaterThan(0)
        ->and(DB::table('visits')->whereNull('time_out')->count())->toBe(0)
        ->and(DB::table('visits')->whereRaw('DATE(created_at) <> DATE(visited_at)')->count())->toBe(0);
});

it('makes the realism check fail on a bad row', function () {
    tinySchool();
    $quiet = function (): int {
        ob_start();
        $n = loadRealism();
        ob_end_clean();

        return $n;
    };
    expect($quiet())->toBe(0);

    // A Grade 8 student born nine years ago: the bug that started this work.
    $grade8 = DB::table('grade_levels')->where('name', 'Grade 8')->value('id');
    $student = DB::table('students')->where('grade_level_id', $grade8)->whereNotNull('birth_date')->value('id');
    DB::table('students')->where('id', $student)->update(['birth_date' => '2017-04-01']);
    expect($quiet())->toBe(1);

    // An item given to a student who is allergic to it.
    $line = DB::table('inventory_transactions')->where('type', 'dispense')->whereNotNull('student_id')->first();
    DB::table('student_health_entries')->insert(['student_id' => $line->student_id, 'kind' => 'allergy', 'label' => (string) DB::table('inventory_items')->where('id', $line->item_id)->value('name')]);
    expect($quiet())->toBe(2);

    // Menstrual cramps for a boy.
    $boy = DB::table('visits')->join('students', 'students.id', '=', 'visits.student_id')->where('students.sex', 'male')->value('visits.id');
    DB::table('visits')->where('id', $boy)->update(['complaint' => 'Menstrual cramps']);
    expect($quiet())->toBe(3);
});
