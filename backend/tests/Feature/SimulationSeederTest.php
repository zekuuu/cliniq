<?php

declare(strict_types=1);

use App\Shared\Database\SimulationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

it('seeds five linked fictional records per daily-use list and skips a repeat', function () {
    $this->artisan('db:seed', ['--class' => SimulationSeeder::class])->assertSuccessful();
    $tables = [
        'students', 'personnel', 'inventory_items', 'calendar_events', 'visits', 'excuse_letters',
        'follow_ups', 'incidents', 'parent_notification_attempts', 'sports_reports', 'issue_reports',
    ];
    foreach ($tables as $table) {
        expect(DB::table($table)->count())->toBe(5, $table);
    }
    expect(DB::table('users')->count())->toBe(3);
    expect(DB::table('students')->distinct()->count('grade_level_id'))->toBe(5)
        ->and(DB::table('students')->whereNull('sex')->count())->toBe(0)
        ->and(DB::table('students')->where('lrn', 'like', '999900%')->count())->toBe(5)
        ->and(DB::table('emergency_contacts')->pluck('phone')->every(fn (string $phone): bool => preg_match('/^09\d{2}-\d{3}-\d{4}$/', $phone) === 1))->toBeTrue()
        ->and(DB::table('inventory_items')->where('category', 'medicine')->count())->toBeGreaterThan(0)
        ->and(DB::table('inventory_items')->where('category', 'supply')->count())->toBeGreaterThan(0)
        ->and(DB::table('inventory_transactions')->where('type', 'dispense')->count())->toBe(1)
        ->and(DB::table('visits')->distinct()->count('complaint'))->toBe(5)
        ->and(DB::table('incidents')->where('stage', 2)->count())->toBe(4)
        ->and(DB::table('hospital_referrals')->count())->toBe(1)
        ->and(DB::table('parent_notification_attempts')->distinct()->count('outcome'))->toBeGreaterThan(1)
        ->and(DB::table('issue_reports')->distinct()->count('route'))->toBe(5);
    $visibleText = collect([
        DB::table('users')->pluck('name'), DB::table('inventory_items')->pluck('name'),
        DB::table('calendar_events')->pluck('title'), DB::table('visits')->pluck('complaint'),
        DB::table('incidents')->pluck('complaint'), DB::table('sports_reports')->pluck('title'),
        DB::table('issue_reports')->pluck('description'),
    ])->flatten()->implode(' ');
    expect(mb_strtolower($visibleText))->not->toContain('simulation', 'demo clinician', 'demo admin');
    $this->artisan('db:seed', ['--class' => SimulationSeeder::class])->assertSuccessful();
    foreach ($tables as $table) {
        expect(DB::table($table)->count())->toBe(5, $table);
    }
});
