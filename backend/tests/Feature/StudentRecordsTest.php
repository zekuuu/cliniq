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

/** A complete `StudentInput` with fake data. */
function studentInput(array $over = []): array
{
    return $over + [
        'lrn' => '100000000001', 'firstName' => 'Ana', 'lastName' => 'Cruz', 'middleName' => null,
        'gradeLevel' => 'Grade 7', 'section' => null, 'sex' => 'female', 'birthDate' => '2013-05-01',
        'allergies' => ['Peanuts'], 'medicalConditions' => [],
        'emergencyContacts' => [['name' => 'Maria Cruz', 'relationship' => 'Mother', 'phone' => '0917 000 0000', 'verified' => true]],
    ];
}

function createStudent(array $over = []): string
{
    return (string) test()->postJson('/api/students', studentInput($over))->assertCreated()->json('data.student.id');
}

it('creates a student, audits it, and shows the full LRN only on the single record', function () {
    signIn($this->staff);
    $res = $this->postJson('/api/students', studentInput(['firstName' => '  Ana  ', 'middleName' => ' ']))->assertCreated();
    $res->assertJsonPath('data.status', 'saved')->assertJsonPath('data.action', 'create')
        ->assertJsonPath('data.student.fullName', 'Ana Cruz')->assertJsonPath('data.student.middleName', null)
        ->assertJsonPath('data.student.recordComplete', true)->assertJsonPath('data.student.lrn', '100000000001');
    $id = $res->json('data.student.id');
    expect($res->json('data.student'))->not->toHaveKey('missingFields');

    $row = $this->postJson('/api/students/query', [])->assertOk()->json('data.0');
    expect($row)->toBe(['id' => $id, 'lrn' => '●●●●●●●●0001', 'fullName' => 'Ana Cruz', 'gradeLevel' => 'Grade 7', 'archived' => false, 'recordComplete' => true]);
    expect(DB::table('audit_logs')->where('action_type', 'create')->where('target_type', 'student')->count())->toBe(1);
});

it('lets the Admin read one student but write nothing', function () {
    $id = DB::table('students')->insertGetId(['lrn' => '100000000001', 'first_name' => 'Ana', 'last_name' => 'Cruz']);
    signIn($this->admin);

    $this->getJson("/api/students/{$id}")->assertOk()->assertJsonPath('data.lrn', '100000000001')->assertJsonPath('data.sex', null);
    $this->getJson('/api/students/999999')->assertNotFound();
    $this->postJson('/api/students', studentInput(['lrn' => '100000000002']))->assertForbidden();
});

it('refuses bad input with the mock messages', function (array $over, string $message) {
    signIn($this->staff);
    $this->postJson('/api/students', studentInput($over))->assertUnprocessable()->assertJsonPath('message', $message);
})->with([
    'short LRN' => [['lrn' => '12345'], 'The LRN must be exactly 12 digits.'],
    'no first name' => [['firstName' => ' '], "Enter the student's first name."],
    'no last name' => [['lastName' => ''], "Enter the student's last name."],
    'long middle name' => [['middleName' => str_repeat('a', 41)], 'The middle name can be at most 40 characters.'],
    'unreal birthdate' => [['birthDate' => '2013-02-30'], 'Enter a real birthdate.'],
    'future birthdate' => [['birthDate' => '2026-11-11'], "The birthdate can't be in the future."],
    'unknown grade' => [['gradeLevel' => 'Grade 99'], 'Choose the grade level.'],
]);

it('asks once on a name and grade match, and refuses a taken LRN without naming its owner', function () {
    signIn($this->staff);
    createStudent();

    $this->postJson('/api/students', studentInput(['lrn' => '100000000002', 'firstName' => 'ANA']))->assertOk()
        ->assertJsonPath('data.status', 'duplicate')->assertJsonPath('data.matches.0.lrn', '●●●●●●●●0001');
    $this->postJson('/api/students', studentInput(['lrn' => '100000000002', 'confirmDuplicate' => true]))->assertCreated();
    $this->postJson('/api/students', studentInput(['firstName' => 'Bea']))->assertConflict()
        ->assertJsonPath('rule', 'duplicate_lrn')->assertJsonPath('message', 'This LRN is already used by another student record.');

    $this->postJson('/api/students/check-duplicates', ['lrn' => '1000 0000 0001', 'firstName' => 'ána', 'lastName' => 'cruz'])->assertOk()
        ->assertJsonPath('data.lrnTaken', true)->assertJsonCount(2, 'data.nameMatches')->assertJsonPath('data.nameMatches.0.lrn', '●●●●●●●●0001');
});

it('locks the LRN, needs a reason for a name correction, and audits field names only', function () {
    signIn($this->staff);
    $id = createStudent();

    $this->putJson("/api/students/{$id}", studentInput(['lrn' => '100000000009']))->assertConflict()->assertJsonPath('rule', 'lrn_locked');
    $this->putJson("/api/students/{$id}", studentInput(['lastName' => 'Santos']))->assertUnprocessable()
        ->assertJsonPath('message', 'Enter a reason for the name correction (at least 3 characters).');
    $this->putJson("/api/students/{$id}", studentInput(['lastName' => 'Santos', 'nameCorrectionReason' => 'Typo on the form', 'allergies' => []]))
        ->assertOk()->assertJsonPath('data.action', 'update')->assertJsonPath('data.student.fullName', 'Ana Santos');

    expect(DB::table('audit_logs')->where('action_type', 'update')->value('summary'))->toBe('Updated last name and allergies. Name corrected; reason: Typo on the form')
        ->and(DB::table('students')->where('id', $id)->value('name_correction_reason'))->toBe('Typo on the form');
});

it('queues an incomplete record and resolves it when a save completes it', function () {
    signIn($this->staff);
    $id = createStudent(['birthDate' => null, 'emergencyContacts' => []]);

    $row = $this->getJson('/api/students/incomplete')->assertOk()->json('data.0');
    expect($row['status'])->toBe('open')->and($row['missingFields'])->toBe(['Birthdate', 'Emergency contact'])
        ->and($row['student']['lrn'])->toBe('●●●●●●●●0001')->and($row['review'])->toBeNull();

    $this->putJson("/api/students/{$id}", studentInput())->assertOk();
    $row = $this->getJson('/api/students/incomplete')->json('data.0');
    expect($row['status'])->toBe('resolved')->and($row['resolvedByName'])->toBe($this->staff->name)
        ->and($row['review']['importedBy'])->toBe('Flagged in CLINIQ');
});

it('archives with a reason and the school year, never deleting', function () {
    signIn($this->staff);
    $id = createStudent();

    $this->postJson("/api/students/{$id}/archive", ['reason' => '  '])->assertUnprocessable()->assertJsonPath('message', 'Give the reason for archiving.');
    $this->postJson("/api/students/{$id}/archive", ['reason' => 'Transferred'])->assertOk()
        ->assertJsonPath('data.archived', true)->assertJsonPath('data.archiveReason', 'Transferred')
        ->assertJsonPath('data.archivedSchoolYear', '2026–2027')->assertJsonPath('data.archivedAt', '2026-11-10T09:00:00+08:00');

    $this->postJson('/api/students/query', [])->assertJsonCount(0, 'data');
    $this->postJson('/api/students/query', ['includeArchived' => true])->assertJsonCount(1, 'data');
    expect(DB::table('audit_logs')->where('action_type', 'archive')->count())->toBe(1);
});

it('searches active students by LRN prefix first, then by every word of the name', function () {
    signIn($this->staff);
    createStudent(['lrn' => '200000000001', 'firstName' => 'José', 'lastName' => 'Reyes']);
    createStudent(['lrn' => '100000000002', 'firstName' => 'Ana', 'lastName' => 'Abad']);

    expect(collect($this->postJson('/api/students/search', ['q' => 'jose reyes'])->json('data'))->pluck('fullName')->all())->toBe(['José Reyes'])
        ->and($this->postJson('/api/students/search', ['q' => '2000'])->json('data.0.lrn'))->toBe('●●●●●●●●0001')
        ->and($this->postJson('/api/students/search', ['q' => ''])->json('data'))->toBe([]);
    $this->postJson('/api/students/query', ['search' => 'reyes jo'])->assertJsonCount(1, 'data');
    $this->postJson('/api/students/query', ['search' => '1000'])->assertJsonPath('data.0.fullName', 'Ana Abad');

    signIn($this->admin);
    $this->postJson('/api/students/search', ['q' => 'ana'])->assertForbidden();
});
