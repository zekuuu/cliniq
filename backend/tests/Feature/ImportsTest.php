<?php

declare(strict_types=1);

use App\Modules\UserManagement\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->travelTo('2026-11-10 09:00:00');
    $this->staff = User::factory()->create();
});

/** One mapped student row, fake data. */
function importRow(array $over = []): array
{
    return $over + ['lrn' => '100000000001', 'firstName' => 'Ana', 'lastName' => 'Cruz', 'middleName' => '', 'gradeLevel' => 'Grade 7', 'section' => 'Rizal', 'sex' => 'F', 'birthDate' => '2013-05-01'];
}

function staffRow(array $over = []): array
{
    return $over + ['staffNumber' => '', 'firstName' => 'Rosa', 'lastName' => 'Lim', 'middleName' => '', 'sex' => 'Female', 'type' => 'teacher', 'department' => 'Science', 'contactInfo' => '', 'contactName' => '', 'contactRelationship' => '', 'contactPhone' => ''];
}

it('previews a student list without writing, flagging bad rows in the mock order', function () {
    signIn($this->staff);
    DB::table('students')->insert(['lrn' => '100000000002', 'first_name' => 'Old', 'last_name' => 'Timer']);
    $rows = [
        importRow(),
        importRow(['lrn' => '123']),
        importRow(['lrn' => '100000000003', 'gradeLevel' => 'Grade 99']),
        importRow(['lrn' => '100000000004', 'sex' => 'x']),
        importRow(['lrn' => '100000000005', 'birthDate' => '2030-01-01']),
        importRow(['lrn' => '100000000006']), importRow(['lrn' => '100000000006']),
    ];

    $preview = $this->postJson('/api/students/import/preview', ['rows' => $rows])->assertOk()->json('data');
    expect($preview['newCount'])->toBe(1)->and($preview['continuingCount'])->toBe(0)
        ->and(array_column($preview['problems'], 'problem'))->toBe([
            'The LRN must be exactly 12 digits.', '"Grade 99" is not a grade level.', 'Sex must be Male or Female.',
            'The birth date is not a real past date (use YYYY-MM-DD).', 'This LRN appears more than once in the file.', 'This LRN appears more than once in the file.',
        ])
        ->and($preview['problems'][1]['lrn'])->toBe('●●●●●●●●0003')
        ->and($preview['missing'][0]['lrn'])->toBe('●●●●●●●●0002')
        ->and(DB::table('students')->count())->toBe(1)->and(DB::table('audit_logs')->count())->toBe(0);
});

it('applies a list: adds, updates, archives only the ticked, audits counts, and changes nothing twice', function () {
    signIn($this->staff);
    $old = DB::table('students')->insertGetId(['lrn' => '100000000002', 'first_name' => 'Old', 'last_name' => 'Timer']);
    $kept = DB::table('students')->insertGetId(['lrn' => '100000000003', 'first_name' => 'Kept', 'last_name' => 'Back']);
    $rows = [importRow(), importRow(['lrn' => '100000000009', 'gradeLevel' => 'Grade 8', 'firstName' => 'New', 'lastName' => 'Kid']), importRow(['lrn' => 'bad'])];

    $this->postJson('/api/students/import', ['rows' => $rows, 'fileName' => 'list.csv', 'archiveIds' => [$old]])->assertOk()
        ->assertExactJson(['data' => ['created' => 2, 'updated' => 0, 'archived' => 1, 'flagged' => 1]]);

    expect(DB::table('students')->where('id', $old)->value('archive_reason'))->toBe('Not on the new list')
        ->and(DB::table('students')->where('id', $kept)->value('archived_at'))->toBeNull()
        ->and(DB::table('audit_logs')->where('action_type', 'submit')->value('summary'))->toBe('2 added, 0 updated, 1 archived, 1 flagged')
        ->and(DB::table('student_record_reviews')->where('source', 'registrar_import')->count())->toBe(2);
    $ana = collect($this->getJson('/api/students/incomplete')->json('data'))->firstWhere('student.fullName', 'Ana Cruz');
    expect($ana['review']['importedBy'])->toBe('list.csv')->and($ana['missingFields'])->toBe(['Emergency contact']);

    $this->postJson('/api/students/import', ['rows' => $rows, 'fileName' => 'list.csv', 'archiveIds' => []])->assertJsonPath('data.created', 0);
    expect(DB::table('student_import_batches')->count())->toBe(1);
});

it('imports staff: adds with a Staff No., matches by number or name, restores the archived, flags the rest', function () {
    signIn($this->staff);
    $archived = DB::table('personnel')->insertGetId(['staff_number' => 'STF-0001', 'first_name' => 'Ben', 'last_name' => 'Abad', 'sex' => 'male', 'type' => 'Teacher', 'archived_at' => now(), 'archive_reason' => 'Resigned', 'archived_school_year' => '2026–2027']);
    DB::table('number_sequences')->insert(['sequence_name' => 'staff_number', 'scope' => 'all', 'last_value' => 1]);
    $rows = [
        staffRow(['contactName' => 'Ben Lim', 'contactRelationship' => 'Spouse', 'contactPhone' => '0917 123 4567']),
        staffRow(['staffNumber' => 'stf-0001', 'firstName' => 'Ben', 'lastName' => 'Abad', 'sex' => 'M']),
        staffRow(['staffNumber' => 'STF-0099']),
        staffRow(['firstName' => 'Cy', 'type' => 'Janitor']),
        staffRow(['firstName' => 'Di', 'contactName' => 'X', 'contactRelationship' => 'Y', 'contactPhone' => '12']),
    ];

    $preview = $this->postJson('/api/personnel/import/preview', ['rows' => $rows])->assertOk()->json('data');
    expect([$preview['newCount'], $preview['continuingCount'], $preview['changedCount']])->toBe([1, 1, 1])
        ->and(array_column($preview['problems'], 'problem'))->toBe([
            'No staff record has the Staff No. STF-0099. Leave it blank to add a new staff member.',
            '"Janitor" is not a staff type (Teacher, Non-teaching staff, Utility worker, Other).',
            'The emergency contact phone is not a Philippine number.',
        ]);

    $this->postJson('/api/personnel/import', ['rows' => $rows, 'fileName' => 'staff.csv'])->assertOk()
        ->assertExactJson(['data' => ['created' => 1, 'updated' => 1, 'flagged' => 3]]);
    expect(DB::table('personnel')->where('first_name', 'Rosa')->value('staff_number'))->toBe('STF-0002')
        ->and(DB::table('personnel')->where('id', $archived)->value('archived_at'))->toBeNull()
        ->and(DB::table('staff_record_reviews')->whereNull('resolved_at')->value('staff_id'))->toBe($archived) // no contact
        ->and(DB::table('audit_logs')->where('target_type', 'staff-import')->value('summary'))->toBe('1 added, 1 updated, 3 flagged');
});
