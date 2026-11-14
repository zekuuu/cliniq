<?php

declare(strict_types=1);

use App\Modules\UserManagement\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->travelTo('2026-11-10 09:00:00');
    $this->staff = User::factory()->create();
    $this->admin = User::factory()->admin()->create();
    $g7 = DB::table('grade_levels')->where('name', 'Grade 7')->value('id');
    $archive = fn (string $at, string $reason, string $year): array => ['archived_at' => $at, 'archive_reason' => $reason, 'archived_school_year' => $year, 'archived_by_user_id' => $this->staff->id];
    DB::table('students')->insert([
        ['lrn' => '100000001234', 'first_name' => 'Ana', 'last_name' => 'Cruz', 'grade_level_id' => $g7] + $archive('2026-03-01 10:00:00', 'Transferred', '2025–2026'),
        ['lrn' => '100000005678', 'first_name' => 'Ben', 'last_name' => 'Abad', 'grade_level_id' => $g7] + $archive('2026-02-01 10:00:00', 'Graduated', '2025–2026'),
        ['lrn' => '100000009999', 'first_name' => 'Cy', 'last_name' => 'Dela', 'grade_level_id' => $g7] + $archive('2026-07-01 10:00:00', 'Transferred', '2026–2027'),
    ]);
    DB::table('students')->insert(['lrn' => '100000000001', 'first_name' => 'Active', 'last_name' => 'One']);
    DB::table('personnel')->insert(['staff_number' => 'STF-0001', 'first_name' => 'Rosa', 'last_name' => 'Lim', 'sex' => 'female', 'type' => 'Teacher'] + $archive('2026-01-10 10:00:00', 'Resigned', '2025–2026'));
});

it('lists the switcher years newest first with their months up to today', function () {
    signIn($this->staff);
    $data = $this->getJson('/api/archive/years')->assertOk()->json('data');

    expect(array_column($data['years'], 'label'))->toBe(['2026–2027', '2025–2026'])
        ->and($data['defaultYear'])->toBe('2026–2027')
        ->and($data['years'][0]['months'])->toBe(['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'])
        ->and($data['years'][1]['from'])->toBe('2025-06-15');
});

it('lists one year of archived students, masked, newest first, with search, reason filter, sort and paging', function () {
    signIn($this->staff);
    $res = $this->getJson('/api/archive/students?year=2025–2026')->assertOk();
    expect(array_column($res->json('data'), 'fullName'))->toBe(['Ana Cruz', 'Ben Abad'])
        ->and($res->json('data.0.number'))->toBe('●●●●●●●●1234')->and($res->json('data.0.group'))->toBe('Grade 7')
        ->and($res->json('meta'))->toBe(['page' => 1, 'perPage' => 25, 'total' => 2, 'totalInYear' => 2, 'reasons' => ['Graduated', 'Transferred']]);

    $this->getJson('/api/archive/students?year=2025–2026&search=5678')->assertJsonCount(1, 'data')->assertJsonPath('data.0.fullName', 'Ben Abad');
    $this->getJson('/api/archive/students?year=2025–2026&reason=Transferred')->assertJsonPath('meta.total', 1)->assertJsonPath('meta.totalInYear', 2);
    $this->getJson('/api/archive/students?year=2025–2026&sort=name')->assertJsonPath('data.0.fullName', 'Ben Abad');
    $this->getJson('/api/archive/students?year=2025–2026&perPage=1&page=2')->assertJsonPath('data.0.fullName', 'Ben Abad');
    $this->getJson('/api/archive/students')->assertUnprocessable();
});

it('gives Staff the archived staff and the Admin a 403 there, but the students', function () {
    signIn($this->staff);
    $this->getJson('/api/archive/staff?year=2025–2026')->assertOk()->assertJsonPath('data.0.number', 'STF-0001')->assertJsonPath('data.0.group', 'Teacher');

    $this->app['auth']->forgetGuards();
    signIn($this->admin);
    $this->getJson('/api/archive/staff?year=2025–2026')->assertForbidden();
});

it('lets the Admin read the archived students', function () {
    signIn($this->admin);
    $this->getJson('/api/archive/students?year=2025–2026')->assertOk()->assertJsonCount(2, 'data');
});
