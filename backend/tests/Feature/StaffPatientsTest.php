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
});

/** A `PersonnelInput` with fake data. */
function staffInput(array $over = []): array
{
    return $over + [
        'firstName' => 'Rosa', 'lastName' => 'Lim', 'middleName' => null, 'sex' => 'female', 'type' => 'Teacher',
        'department' => 'Science', 'contactInfo' => '', 'allergies' => [], 'medicalConditions' => ['Asthma'],
        'emergencyContacts' => [['name' => 'Ben Lim', 'relationship' => 'Spouse', 'phone' => '0917 111 1111', 'verified' => false]],
    ];
}

it('creates staff with a new Staff No. each time, never reused, and audits it', function () {
    signIn($this->staff);
    $first = $this->postJson('/api/personnel', staffInput())->assertCreated()->assertJsonPath('data.action', 'create')->json('data.personnel');
    $second = $this->postJson('/api/personnel', staffInput(['firstName' => 'Carlo']))->assertCreated()->json('data.personnel');

    expect($first['staffNumber'])->toBe('STF-0001')->and($second['staffNumber'])->toBe('STF-0002')
        ->and($first['fullName'])->toBe('Rosa Lim')->and($first['contactInfo'])->toBe('')
        ->and(DB::table('audit_logs')->where('action_type', 'create')->where('target_type', 'staff')->count())->toBe(2);
});

it('refuses bad staff input with the mock messages', function (array $over, string $message) {
    signIn($this->staff);
    $this->postJson('/api/personnel', staffInput($over))->assertUnprocessable()->assertJsonPath('message', $message);
})->with([
    'no first name' => [['firstName' => ''], "Enter the staff member's first name."],
    'no sex' => [['sex' => null], 'Choose the sex.'],
    'unknown type' => [['type' => 'Janitor'], 'Choose the staff type.'],
    'long department' => [['department' => str_repeat('d', 61)], 'Department or role can be at most 60 characters.'],
]);

it('opens a review for an incomplete record and resolves it when completed (ADR-076)', function () {
    signIn($this->staff);
    $id = $this->postJson('/api/personnel', staffInput(['emergencyContacts' => []]))->json('data.personnel.id');

    $row = $this->getJson('/api/personnel/incomplete')->assertOk()->json('data.0');
    expect($row['status'])->toBe('open')->and($row['missingFields'])->toBe(['Emergency contact'])->and($row['person']['fullName'])->toBe('Rosa Lim');

    $this->putJson("/api/personnel/{$id}", staffInput(['department' => null]))->assertOk()->assertJsonPath('data.action', 'update');
    $row = $this->getJson('/api/personnel/incomplete')->json('data.0');
    expect($row['status'])->toBe('resolved')->and($row['resolvedByName'])->toBe($this->staff->name)
        ->and(DB::table('audit_logs')->where('action_type', 'update')->value('summary'))->toBe('Updated department or role and emergency contacts');
});

it('archives staff with a reason, lists and searches active staff by number or name', function () {
    signIn($this->staff);
    $id = $this->postJson('/api/personnel', staffInput())->json('data.personnel.id');
    $this->postJson('/api/personnel', staffInput(['firstName' => 'Carlo', 'lastName' => 'Abad', 'type' => 'Utility worker']));

    expect(collect($this->getJson('/api/personnel')->json('data'))->pluck('fullName')->all())->toBe(['Carlo Abad', 'Rosa Lim'])
        ->and($this->getJson('/api/personnel?type=Teacher')->json('data.0.fullName'))->toBe('Rosa Lim')
        ->and($this->getJson('/api/personnel/search?q=0002')->json('data.0'))->toBe(['id' => (string) ($id + 1), 'staffNumber' => 'STF-0002', 'fullName' => 'Carlo Abad', 'type' => 'Utility worker']);

    $this->postJson("/api/personnel/{$id}/archive", ['reason' => 'Resigned'])->assertOk()->assertJsonPath('data.archivedSchoolYear', '2026–2027');
    $this->getJson('/api/personnel')->assertJsonCount(1, 'data');
    $this->getJson('/api/personnel?includeArchived=1')->assertJsonCount(2, 'data');
    expect(DB::table('audit_logs')->where('action_type', 'archive')->value('target_type'))->toBe('staff');
});

it('searches students and staff in one box, labelled and in last-name order', function () {
    signIn($this->staff);
    $this->postJson('/api/personnel', staffInput(['firstName' => 'Ana', 'lastName' => 'Zamora']));
    DB::table('students')->insert(['lrn' => '100000000001', 'first_name' => 'Ana', 'last_name' => 'Abad']);

    $rows = $this->postJson('/api/patients/search', ['q' => 'ana'])->assertOk()->json('data');
    expect(array_column($rows, 'kind'))->toBe(['student', 'personnel'])
        ->and($rows[0]['lrn'])->toBe('●●●●●●●●0001')->and($rows[1]['staffNumber'])->toBe('STF-0001');
});

it('lets Staff open one staff patient through the patient route', function () {
    signIn($this->staff);
    $id = $this->postJson('/api/personnel', staffInput())->json('data.personnel.id');

    $this->getJson("/api/patients/personnel/{$id}")->assertOk()->assertJsonPath('data.kind', 'personnel')->assertJsonPath('data.staffNumber', 'STF-0001');
});

it('keeps staff patients from the Admin: 403 on the staff pages, 404 for one staff patient', function () {
    $id = DB::table('personnel')->insertGetId(['staff_number' => 'STF-0001', 'first_name' => 'Rosa', 'last_name' => 'Lim', 'sex' => 'female', 'type' => 'Teacher']);
    $studentId = DB::table('students')->insertGetId(['lrn' => '100000000001', 'first_name' => 'Ana', 'last_name' => 'Abad']);
    signIn($this->admin);

    $this->getJson("/api/patients/personnel/{$id}")->assertNotFound();
    $this->getJson("/api/patients/student/{$studentId}")->assertOk()->assertJsonPath('data.lrn', '100000000001');
    $this->getJson('/api/personnel')->assertForbidden();
    $this->postJson('/api/personnel', staffInput())->assertForbidden();
});
