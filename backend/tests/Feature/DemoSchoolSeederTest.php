<?php

declare(strict_types=1);

use App\Shared\Database\DemoSchoolSeeder;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

require_once __DIR__.'/../../tools/load/checks.php';

/** A tiny school: one year, two weeks of class (June 15 to 26, 2026), stopping at noon on the last day. */
function tinySchool(): array
{
    (new DemoSchoolSeeder)->run(['students' => 20, 'staff' => 3, 'years' => 1, 'audit' => 0, 'seed' => 20261116, 'until' => CarbonImmutable::parse('2026-06-26 12:00', 'Asia/Manila')]);
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

it('never dates anything after now', function () {
    $now = CarbonImmutable::now('Asia/Manila');
    expect(DemoSchoolSeeder::until('')->lessThanOrEqualTo($now))->toBeTrue()
        ->and(DemoSchoolSeeder::until($now->addYear()->format('Y-m-d'))->lessThanOrEqualTo($now))->toBeTrue()
        ->and(DemoSchoolSeeder::until('2026-06-26')->format('Y-m-d H:i'))->toBe('2026-06-26 23:59');
});

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
