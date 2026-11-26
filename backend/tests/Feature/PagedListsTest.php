<?php

declare(strict_types=1);

use App\Modules\UserManagement\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

/*
 * Server-side paging of the long lists (ADR-082, API-Contract "Filtering and pagination"): one page
 * with `meta: { page, perPage, total, lastPage }`, filters, search and sort in SQL, a page past the
 * end answered with no rows, the role rules unchanged, and a query count that does not grow with
 * the page size.
 */

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->travelTo('2026-11-10 09:00:00');
    $this->staff = User::factory()->create();
    $this->admin = User::factory()->admin()->create();
    $grade = fn (string $name) => DB::table('grade_levels')->where('name', $name)->value('id');
    $this->students = [];
    foreach (range(1, 12) as $n) {
        $this->students[] = DB::table('students')->insertGetId([
            'lrn' => sprintf('1000000000%02d', $n), 'first_name' => "Ana{$n}", 'last_name' => 'Cruz',
            'grade_level_id' => $grade($n % 2 ? 'Grade 7' : 'Grade 8'),
        ]);
    }
    $this->personnel = DB::table('personnel')->insertGetId(['staff_number' => 'STF-0001', 'first_name' => 'Rosa', 'last_name' => 'Lim', 'sex' => 'female', 'type' => 'Teacher']);
    // 25 visits over 25 days, the newest last; visit 25 is a staff patient's, visit 24 is resting today.
    foreach (range(1, 25) as $n) {
        DB::table('visits')->insert([
            'student_id' => $n === 25 ? null : $this->students[$n % 12], 'personnel_id' => $n === 25 ? $this->personnel : null,
            'visited_at' => CarbonImmutable::parse('2026-10-16 08:00:00')->addDays($n), 'complaint' => $n % 3 ? 'Headache' : 'Fever',
            'disposition' => $n === 24 ? 'resting_in_clinic' : ($n % 2 ? 'returned_to_class' : 'sent_home'), 'logged_by_user_id' => $this->staff->id,
        ]);
    }
    foreach (range(1, 4) as $n) {
        DB::table('incidents')->insert([
            'student_id' => $n === 4 ? null : $this->students[$n], 'personnel_id' => $n === 4 ? $this->personnel : null,
            'occurred_at' => "2026-11-0{$n} 10:00:00", 'complaint' => "Fall {$n}", 'stage' => $n % 2 ? 1 : 2, 'created_by_user_id' => $this->staff->id,
        ] + ($n % 2 ? [] : ['completed_by_user_id' => $this->staff->id, 'completed_at' => "2026-11-0{$n} 11:00:00"]));
    }
});

it('pages the Visit Log in SQL with the masked number, the filters, the search and the sort', function () {
    signIn($this->staff);
    $first = $this->getJson('/api/visits/log?page=1&perPage=10')->assertOk();
    expect($first->json('meta'))->toBe(['page' => 1, 'perPage' => 10, 'total' => 25, 'lastPage' => 3])
        ->and($first->json('data'))->toHaveCount(10)
        ->and($first->json('data.0.dateTime'))->toStartWith('2026-11-10') // newest first
        ->and($first->json('data.0.patient'))->toBe(['kind' => 'personnel', 'number' => 'STF-0001'])
        ->and($first->json('data.1.patient.number'))->toBe('●●●●●●●●0001')
        ->and($first->json('data.1.inClinicNow'))->toBeFalse(); // resting, but not today

    $last = $this->getJson('/api/visits/log?page=3&perPage=10')->assertOk();
    expect($last->json('data'))->toHaveCount(5)->and($last->json('meta.lastPage'))->toBe(3);
    // A page past the end is empty, with the right meta, not an error.
    $this->getJson('/api/visits/log?page=9&perPage=10')->assertOk()->assertJsonPath('data', [])->assertJsonPath('meta.total', 25);

    expect($this->getJson('/api/visits/log?page=1&perPage=50&patient=staff')->json('meta.total'))->toBe(1)
        ->and($this->getJson('/api/visits/log?page=1&perPage=50&disposition=sent_home')->json('meta.total'))->toBe(11) // the even days but the resting one
        ->and($this->getJson('/api/visits/log?page=1&perPage=50&search=fever')->json('meta.total'))->toBe(8)
        // Typed digits find the last 4 of the masked LRN (ADR-080 item 7); "0003" is one student.
        ->and($this->getJson('/api/visits/log?page=1&perPage=50&search=0003')->json('meta.total'))->toBe(2)
        ->and($this->getJson('/api/visits/log?page=1&perPage=50&from=2026-11-01&to=2026-11-05')->json('meta.total'))->toBe(5);

    $oldest = $this->getJson('/api/visits/log?page=1&perPage=1&sort=dateTime')->json('data.0.dateTime');
    expect($oldest)->toStartWith('2026-10-17')
        ->and($this->getJson('/api/visits/log?page=1&perPage=1&sort=record')->json('data.0.complaint'))->toBe('Fever');
});

it('returns the current excuse-letter state for every Visit Log row', function () {
    signIn($this->staff);
    [$draft, $approved, $voided] = DB::table('visits')->where('disposition', 'sent_home')->orderBy('id')->limit(3)->pluck('id')->all();
    $letter = ['excused_from' => '2026-11-10', 'excused_until' => '2026-11-10', 'prepared_by_user_id' => $this->staff->id];
    DB::table('excuse_letters')->insert($letter + ['visit_id' => $draft, 'status' => 'draft']);
    DB::table('excuse_letters')->insert($letter + [
        'visit_id' => $approved, 'status' => 'approved', 'approved_at' => '2026-11-10 08:00:00',
        'approved_by_user_id' => $this->staff->id, 'reference_no' => 'EL-2026-TEST1', 'snapshot_text' => 'Approved letter',
    ]);
    DB::table('visits')->where('id', $voided)->update([
        'entered_in_error_at' => '2026-11-10 08:30:00', 'entered_in_error_by_user_id' => $this->staff->id,
        'entered_in_error_reason' => 'Wrong patient',
    ]);
    DB::table('excuse_letters')->insert($letter + [
        'visit_id' => $voided, 'status' => 'voided', 'voided_at' => '2026-11-10 08:30:00',
        'voided_by_user_id' => $this->staff->id, 'voided_reason' => 'Wrong patient',
    ]);

    $rows = collect($this->getJson('/api/visits/log?perPage=50&includeEnteredInError=1')->assertOk()->json('data'))->keyBy('id');
    expect($rows[(string) $draft]['letterStatus'])->toBe('draft')
        ->and($rows[(string) $draft]['letterPending'])->toBeTrue()
        ->and($rows[(string) $approved]['letterStatus'])->toBe('approved')
        ->and($rows[(string) $approved]['letterPending'])->toBeFalse()
        ->and($rows[(string) $voided]['letterStatus'])->toBe('voided')
        ->and($rows[(string) $voided]['letterPending'])->toBeFalse()
        ->and(collect($rows)->where('letterStatus', 'none')->count())->toBeGreaterThan(0);
});

it('keeps the Visit Log Staff only and the Incident Log without staff patients for the Admin', function () {
    signIn($this->admin);
    $this->getJson('/api/visits/log?page=1')->assertForbidden();
    $admin = $this->getJson('/api/incidents/log?page=1&perPage=10')->assertOk();
    expect($admin->json('meta.total'))->toBe(3)
        ->and(collect($admin->json('data'))->pluck('patient.kind')->unique()->values()->all())->toBe(['student']);
});

it('pages the Incident Log for Staff with the completion filter and the status sort', function () {
    signIn($this->staff);
    $staff = $this->getJson('/api/incidents/log?page=1&perPage=2')->assertOk();
    expect($staff->json('meta'))->toBe(['page' => 1, 'perPage' => 2, 'total' => 4, 'lastPage' => 2])
        ->and($this->getJson('/api/incidents/log?page=1&perPage=10&completion=needs_completion')->assertOk()->json('meta.total'))->toBe(2)
        ->and($this->getJson('/api/incidents/log?page=1&perPage=10&sort=status')->json('data.0.completion'))->toBe('complete');
});

it('reads a list page with the same few queries whatever the page size', function (string $url) {
    signIn($this->staff);
    $count = function (int $perPage) use ($url): int {
        DB::flushQueryLog();
        DB::enableQueryLog();
        $this->getJson("{$url}&page=1&perPage={$perPage}")->assertOk();
        $n = count(DB::getQueryLog());
        DB::disableQueryLog();

        return $n;
    };
    $count(2); // the first request of a session reads a little more (the session start)
    expect($count(25))->toBe($count(2));
})->with(['/api/visits/log?x=1', '/api/incidents/log?x=1', '/api/follow-ups?x=1', '/api/inventory/movements?x=1', '/api/audit-log?from=2026-01-01&to=2026-12-31']);

it('pages the follow-ups in one query, with the status as it reads and the patient filter', function () {
    signIn($this->staff);
    foreach (DB::table('visits')->orderBy('id')->get() as $n => $visit) {
        if ($n < 5) {
            DB::table('follow_ups')->insert(['student_id' => $visit->student_id, 'visit_id' => $visit->id, 'follow_up_date' => '2026-11-0'.($n + 1), 'reason' => 'Check', 'status' => 'pending', 'created_by_user_id' => $this->staff->id]);
        }
        if ($visit->personnel_id !== null) {
            DB::table('follow_ups')->insert(['personnel_id' => $visit->personnel_id, 'visit_id' => $visit->id, 'follow_up_date' => '2026-11-12', 'reason' => 'Check', 'status' => 'completed', 'created_by_user_id' => $this->staff->id]);
        }
    }

    $page = $this->getJson('/api/follow-ups?page=1&perPage=4')->assertOk();
    expect($page->json('meta.total'))->toBe(6)->and($page->json('data'))->toHaveCount(4)
        ->and($this->getJson('/api/follow-ups?page=1&perPage=10&patient=staff')->json('meta.total'))->toBe(1)
        ->and($this->getJson('/api/follow-ups?page=1&perPage=10&status=completed')->json('data.0.patient.number'))->toBe('STF-0001')
        // Without page, the whole list, as before (Q19).
        ->and($this->getJson('/api/follow-ups')->assertOk()->json('meta'))->toBeNull();
});

it('pages the audit log in SQL: the search sees only the shown words, the total is exact, and reading writes nothing', function () {
    foreach (range(1, 30) as $n) {
        DB::table('audit_logs')->insert(['occurred_at' => '2026-10-0'.(1 + $n % 9).' 08:00:00', 'actor_user_id' => $this->staff->id, 'actor_role' => 'staff',
            'action_type' => $n % 2 ? 'view' : 'update', 'target_type' => $n % 2 ? 'student' : 'inventory-restock', 'target_id' => (string) $this->students[1], 'subject_student_id' => $this->students[1]]);
    }
    signIn($this->staff);
    $before = DB::table('audit_logs')->count();
    $page = $this->getJson('/api/audit-log?from=2026-10-01&to=2026-10-31&page=2&perPage=10')->assertOk();
    expect($page->json('meta'))->toBe(['page' => 2, 'perPage' => 10, 'total' => 30, 'lastPage' => 3])
        ->and($page->json('data.rows'))->toHaveCount(10)->and($page->json('data.users'))->not->toBeEmpty()
        ->and($this->getJson('/api/audit-log?from=2026-10-01&to=2026-10-31&page=1&perPage=50&search=viewed')->json('meta.total'))->toBe(15)
        ->and($this->getJson('/api/audit-log?from=2026-10-01&to=2026-10-31&page=1&perPage=50&targetTypes[]=inventory')->json('meta.total'))->toBe(15)
        // The record shows masked; its hidden full LRN never matches a search.
        ->and($this->getJson('/api/audit-log?from=2026-10-01&to=2026-10-31&page=1&perPage=50&search=100000000002')->json('meta.total'))->toBe(0)
        ->and($this->getJson('/api/audit-log?from=2026-10-01&to=2026-10-31&page=1&perPage=1&sort=action')->json('data.rows.0.actionType'))->toBe('update')
        ->and(DB::table('audit_logs')->count())->toBe($before); // reading the log writes nothing (ADR-016)
});

it('pages the Student List and the Incomplete Records Queue with counts, and gives the backup summary', function () {
    signIn($this->staff);
    $page = $this->postJson('/api/students/query', ['search' => '', 'page' => 2, 'perPage' => 5, 'sort' => '-grade'])->assertOk();
    expect($page->json('meta'))->toBe(['page' => 2, 'perPage' => 5, 'total' => 12, 'lastPage' => 3])
        ->and($page->json('data.0.lrn'))->toStartWith('●')
        ->and($this->postJson('/api/students/query', ['search' => '', 'page' => 1, 'perPage' => 1, 'sort' => '-grade'])->json('data.0.gradeLevel'))->toBe('Grade 8')
        // Without page, the whole list, as before.
        ->and($this->postJson('/api/students/query', ['search' => ''])->json('data'))->toHaveCount(12);

    $queue = $this->getJson('/api/students/incomplete?page=1&perPage=5&status=open')->assertOk();
    expect($queue->json('meta.counts'))->toBe(['open' => 12, 'resolved' => 0])
        ->and($queue->json('meta.total'))->toBe(12)->and($queue->json('data'))->toHaveCount(5);

    DB::table('backup_logs')->insert([['run_key' => 'a', 'ran_at' => '2026-11-08 18:00:00', 'status' => 'ok', 'file_size_bytes' => 10], ['run_key' => 'b', 'ran_at' => '2026-11-09 18:00:00', 'status' => 'ok', 'file_size_bytes' => 10]]);
    $summary = $this->getJson('/api/backups/status?summary=1')->assertOk()->json('data');
    expect(array_keys($summary))->toBe(['latest', 'needsVerification'])->and($summary['latest']['lastRun'])->toStartWith('2026-11-09');

    signIn($this->admin);
    $this->getJson('/api/students/incomplete?page=1')->assertForbidden();
});
