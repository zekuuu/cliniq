<?php

declare(strict_types=1);

use App\Modules\InventoryTracker\Services\InventoryService;
use App\Modules\StudentRecords\Services\StudentService;
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
    $students = collect(app(StudentService::class)->list('', '', false, '', null));
    $incomplete = app(StudentService::class)->incompleteQueue();
    expect($students->count())->toBe(5)
        ->and($students->where('recordComplete', false)->count())->toBe(1)
        ->and($incomplete)->toHaveCount(1)
        ->and($incomplete[0]['missingFields'])->toContain('Birthdate')
        ->and(DB::table('students')->whereNull('birth_date')->count())->toBe(1)
        ->and(DB::table('student_health_entries')->where('kind', 'condition')->distinct()->count('label'))->toBeGreaterThan(1);
    expect(DB::table('students')->distinct()->count('grade_level_id'))->toBe(5)
        ->and(DB::table('students')->whereNull('sex')->count())->toBe(0)
        ->and(DB::table('students')->where('lrn', 'like', '999900%')->count())->toBe(5)
        ->and(DB::table('student_health_entries')->where('kind', 'allergy')->count())->toBeGreaterThan(0)
        ->and(DB::table('emergency_contacts')->pluck('phone')->every(fn (string $phone): bool => preg_match('/^09\d{2}-\d{3}-\d{4}$/', $phone) === 1))->toBeTrue()
        ->and(DB::table('inventory_items')->where('category', 'medicine')->count())->toBeGreaterThan(0)
        ->and(DB::table('inventory_items')->where('category', 'supply')->count())->toBeGreaterThan(0)
        ->and(DB::table('personnel')->distinct()->count('type'))->toBe(4)
        ->and(DB::table('inventory_transactions')->where('type', 'dispense')->count())->toBe(3)
        ->and(DB::table('visits')->distinct()->count('complaint'))->toBe(5)
        ->and(DB::table('incidents')->where('stage', 2)->count())->toBe(4)
        ->and(DB::table('incident_report_approvals')->count())->toBe(1)
        ->and(DB::table('hospital_referrals')->count())->toBe(1)
        ->and(DB::table('parent_notification_attempts')->distinct()->count('outcome'))->toBeGreaterThan(1)
        ->and(DB::table('issue_reports')->distinct()->count('route'))->toBe(5)
        ->and(DB::table('holidays')->count())->toBeGreaterThan(0)
        ->and(DB::table('holiday_sync_runs')->where('status', 'ok')->count())->toBe(1)
        ->and(DB::table('excuse_letters')->where('status', 'approved')->count())->toBe(2)
        ->and(DB::table('excuse_letters')->where('status', 'draft')->count())->toBe(3)
        ->and(DB::table('follow_ups')->where('status', 'pending')->count())->toBe(2)
        ->and(DB::table('follow_ups')->where('status', 'completed')->count())->toBe(1)
        ->and(DB::table('follow_ups')->where('status', 'missed')->count())->toBe(1)
        ->and(DB::table('follow_ups')->where('status', 'cancelled')->count())->toBe(1);
    $stock = collect(app(InventoryService::class)->list('', '', false, ''))->keyBy('name');
    expect($stock['Paracetamol 500 mg tablets']['flags'])->toBe([])
        ->and($stock['Sterile gauze pads 10 cm x 10 cm']['flags'])->toContain('low_stock')
        ->and($stock['Adhesive bandages']['flags'])->toContain('nearing_expiration')
        ->and($stock['Disposable nitrile gloves']['flags'])->toContain('expired')
        ->and($stock['Disposable nitrile gloves']['currentStock'])->toBe(0)
        ->and($stock['Reusable cold packs']['expirationDate'])->toBeNull();
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
