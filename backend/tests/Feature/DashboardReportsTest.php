<?php

declare(strict_types=1);

use App\Modules\UserManagement\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->travelTo('2026-11-10 09:00:00');
    $this->staff = User::factory()->create(['name' => 'Nurse Joy']);
    $this->admin = User::factory()->admin()->create(['name' => 'Principal Oak']);
    $g7 = DB::table('grade_levels')->where('name', 'Grade 7')->value('id');
    $this->ana = DB::table('students')->insertGetId(['lrn' => '100000000001', 'first_name' => 'Ana', 'last_name' => 'Cruz', 'sex' => 'female', 'grade_level_id' => $g7]);
    $this->ben = DB::table('students')->insertGetId(['lrn' => '100000000002', 'first_name' => 'Ben', 'last_name' => 'Abad', 'sex' => 'male', 'grade_level_id' => $g7]);
    $this->rosa = DB::table('personnel')->insertGetId(['staff_number' => 'STF-0001', 'first_name' => 'Rosa', 'last_name' => 'Lim', 'sex' => 'female', 'type' => 'Teacher']);
    $visit = fn (array $row) => DB::table('visits')->insertGetId($row + ['complaint' => 'Headache', 'disposition' => 'returned_to_class', 'logged_by_user_id' => $this->staff->id, 'grade_level_at_time' => 'Grade 7']);
    $visit(['student_id' => $this->ana, 'visited_at' => '2026-11-02 08:00:00', 'complaint' => 'head ache.']);
    $visit(['student_id' => $this->ana, 'visited_at' => '2026-11-03 08:00:00', 'disposition' => 'sent_home']);
    $visit(['student_id' => $this->ben, 'visited_at' => '2026-11-10 08:30:00', 'disposition' => 'resting_in_clinic']);
    $visit(['personnel_id' => $this->rosa, 'visited_at' => '2026-11-04 08:00:00', 'complaint' => 'Cough', 'grade_level_at_time' => null]);
    $visit(['student_id' => $this->ben, 'visited_at' => '2026-11-05 08:00:00', 'entered_in_error_at' => '2026-11-05 09:00:00', 'entered_in_error_by_user_id' => $this->staff->id, 'entered_in_error_reason' => 'Wrong']);
    $visit(['student_id' => $this->ben, 'visited_at' => '2026-10-20 08:00:00']);
    DB::table('incidents')->insert(['personnel_id' => $this->rosa, 'occurred_at' => '2026-11-06 10:00:00', 'complaint' => 'Cut', 'created_by_user_id' => $this->staff->id]);
    DB::table('incidents')->insert(['student_id' => $this->ana, 'occurred_at' => '2026-11-07 10:00:00', 'complaint' => 'Fall', 'created_by_user_id' => $this->staff->id, 'grade_level_at_time' => 'Grade 7']);
});

it('builds the monthly report from the records, masked, staff incidents included', function () {
    signIn($this->staff);
    $r = $this->getJson('/api/reports/monthly?month=2026-11')->assertOk()->json('data');

    expect($r['counts'])->toBe(['visits' => 4, 'incidents' => 2, 'followUps' => 0])
        ->and($r['previousCounts']['visits'])->toBe(1)
        ->and($r['complaintCounts'])->toBe([['complaint' => 'Headache', 'count' => 3], ['complaint' => 'Cough', 'count' => 1]])
        ->and($r['weeklyComplaints']['weeks'][0])->toBe(['from' => '2026-11-01', 'to' => '2026-11-07', 'label' => '1-7'])
        ->and($r['weeklyComplaints']['totals'])->toBe([3, 1, 0, 0, 0])
        ->and($r['visitsBySex'])->toBe(['female' => ['students' => 2, 'staff' => 1], 'male' => ['students' => 1, 'staff' => 0], 'noSexRecorded' => 0])
        ->and(array_column($r['incidents'], 'patient'))->toBe([['kind' => 'student', 'number' => '●●●●●●●●0001'], ['kind' => 'personnel', 'number' => 'STF-0001']])
        ->and($r['principalName'])->toBe('Principal Oak');
    $this->getJson('/api/reports/monthly?month=2026-13')->assertUnprocessable();
    $this->getJson('/api/reports/latest-month')->assertExactJson(['data' => ['month' => '2026-11']]);
});

it('gives Staff the full LRN for the printout and records the print; the Admin views only', function () {
    signIn($this->staff);
    $this->getJson('/api/reports/monthly?month=2026-11&fullLrn=1')->assertJsonPath('data.incidents.0.patient.number', '100000000001');
    expect(DB::table('audit_logs')->where('action_type', 'print')->value('target_label'))->toBe('Monthly Clinic Report — November 2026');

    $this->app['auth']->forgetGuards();
    signIn($this->admin);
    $this->getJson('/api/reports/monthly?month=2026-11')->assertOk()->assertJsonPath('data.incidents.0.patient.number', '●●●●●●●●0001');
    $this->getJson('/api/reports/monthly?month=2026-11&fullLrn=1')->assertForbidden();
    $this->getJson('/api/sports-reports')->assertForbidden()->assertJsonPath('message', 'Only the clinic staff can open Sports Reports.');
});

it('summarises the dashboard: counted visits, in clinic now, splits, clusters, and the Admin without staff incidents', function () {
    signIn($this->staff);
    $s = $this->getJson('/api/dashboard/summary?preset=thisMonth')->assertOk()->json('data');

    expect($s['range'])->toBe(['from' => '2026-11-01', 'to' => '2026-11-10'])
        ->and($s['counts']['visits'])->toBe(4)->and($s['counts']['incidents'])->toBe(2)
        ->and($s['counts']['inClinicNow'])->toBe(1)->and($s['counts']['split']['visits'])->toBe(['students' => 3, 'staff' => 1])
        ->and($s['counts']['activeStudents'])->toBe(2)
        ->and($s['complaintTrends']['granularity'])->toBe('day')->and($s['complaintTrends']['weekdayComparison']['currentLabel'])->toBe('November 2026')
        ->and(array_column($s['demographics']['sex'], 'key'))->toBe(['female', 'male'])
        ->and($s['backupAlert']['kind'])->toBe('never')
        // No school year started yet on a new install: starting 2026–2027 is overdue (B4 decision (a)).
        ->and($s['schoolYearReminder'])->toBe(['kind' => 'start', 'label' => '2026–2027', 'dueOn' => '2026-06-15', 'overdue' => true, 'dueToday' => false])
        ->and(json_encode($s))->not->toContain('100000000001');
    $this->getJson('/api/dashboard/summary?preset=custom&from=2026-11-05&to=2026-11-01')->assertUnprocessable();

    $this->app['auth']->forgetGuards();
    signIn($this->admin);
    expect($this->getJson('/api/dashboard/summary?preset=thisMonth')->json('data.counts.incidents'))->toBe(1);
    $this->getJson('/api/dashboard/cluster-alerts')->assertExactJson(['data' => []]);
});

it('flags a possible cluster for Staff: three students, one complaint, one grade, in the window', function () {
    $cal = DB::table('students')->insertGetId(['lrn' => '100000000003', 'first_name' => 'Cy', 'last_name' => 'Dela']);
    foreach ([$this->ana, $this->ben, $cal] as $id) {
        DB::table('visits')->insert(['student_id' => $id, 'visited_at' => '2026-11-09 08:00:00', 'complaint' => 'Fever', 'disposition' => 'sent_home', 'logged_by_user_id' => $this->staff->id, 'grade_level_at_time' => 'Grade 7']);
    }
    signIn($this->staff);
    $this->getJson('/api/dashboard/cluster-alerts')->assertExactJson(['data' => [['complaint' => 'Fever', 'gradeLevel' => 'Grade 7', 'students' => 3, 'from' => '2026-11-08', 'to' => '2026-11-10']]]);
});

it('lays out calendar days with counts, events and tags; events are added, edited and deleted with audits', function () {
    signIn($this->admin);
    $this->postJson('/api/calendar/events', ['title' => ' ', 'startDate' => '2026-11-05', 'endDate' => '2026-11-04'])->assertUnprocessable()
        ->assertJsonPath('errors.title.0', 'Enter a title for the event.')->assertJsonPath('errors.endDate.0', "The end date can't be before the start date.");
    $id = $this->postJson('/api/calendar/events', ['title' => 'Sports Fest', 'startDate' => '2026-11-06', 'endDate' => '2026-11-07'])->assertCreated()->json('data.id');
    $this->putJson("/api/calendar/events/{$id}", ['title' => 'Sports Festival', 'startDate' => '2026-11-06', 'endDate' => '2026-11-07'])->assertOk();

    $days = collect($this->getJson('/api/calendar/days?from=2026-11-01&to=2026-11-07')->json('data'))->keyBy('date');
    expect($days['2026-11-02']['visits'])->toBe(1)->and($days['2026-11-06']['incidents'])->toBe(1)->and($days['2026-11-07']['events'][0]['title'])->toBe('Sports Festival')
        ->and($days->count())->toBe(7);
    $this->deleteJson("/api/calendar/events/{$id}")->assertNoContent();
    expect(DB::table('audit_logs')->where('target_type', 'calendar-event')->orderBy('id')->pluck('action_type')->all())->toBe(['create', 'update', 'delete']);
});

it('syncs holidays monthly when online, keeps the last good list when offline, and serves the feed', function () {
    Http::fake(['*' => Http::sequence()
        ->push(['meta' => ['source' => 'Official Gazette (test)'], 'holidays' => [
            ['date' => '2026-11-30', 'name' => 'Bonifacio Day', 'kind' => 'regular', 'confirmed' => true],
            ['date' => '2026-12-25', 'name' => 'Christmas Day', 'kind' => 'regular', 'confirmed' => true],
            ['date' => 'bad', 'name' => 'Skipped', 'kind' => 'regular'],
        ]])
        ->push('down', 500)]);
    $this->artisan('cliniq:sync-holidays')->expectsOutput('2 holidays loaded.')->assertSuccessful();
    $this->artisan('cliniq:sync-holidays')->expectsOutput('Holidays are up to date.')->assertSuccessful();

    $this->travel(31)->days();
    $this->artisan('cliniq:sync-holidays')->expectsOutput('Holiday sync failed; the last good list stays. It will try again tomorrow.')->assertSuccessful();
    expect(DB::table('holidays')->count())->toBe(2)->and(DB::table('holiday_sync_runs')->orderBy('id')->pluck('status')->all())->toBe(['ok', 'failed']);

    signIn($this->staff);
    $this->getJson('/api/calendar/holidays?from=2026-11-01&to=2026-11-30')->assertOk()
        ->assertJsonPath('data.holidays', [['date' => '2026-11-30', 'name' => 'Bonifacio Day', 'kind' => 'regular', 'confirmed' => true]])
        ->assertJsonPath('data.years', [2026])->assertJsonPath('data.source', 'Official Gazette (test)');
});

it('keeps Sports Reports: lists only the students, computes content when asked, duplicates and archives', function () {
    signIn($this->staff);
    $this->postJson('/api/sports-reports', ['title' => '', 'requestedBy' => '', 'window' => 45])->assertUnprocessable()
        ->assertJsonPath('errors.title.0', 'Enter a title for the report.')->assertJsonPath('errors.window.0', 'Choose a look-back window.');
    $id = $this->postJson('/api/sports-reports', ['title' => 'Intramurals', 'activity' => 'Basketball', 'requestedBy' => 'Coach Ramos', 'window' => 30, 'includeConditions' => false,
        'students' => [['studentId' => (string) $this->ana], ['studentId' => (string) $this->ben], ['studentId' => (string) $this->ana]]])->assertCreated()->json('data.id');

    $this->getJson('/api/sports-reports')->assertJsonPath('data.0.studentCount', 2);
    $content = $this->getJson("/api/sports-reports/{$id}/content")->assertOk()->json('data');
    expect(array_column($content['rows'], 'fullName'))->toBe(['Ben Abad', 'Ana Cruz'])
        ->and($content['rows'][1]['entries'][0])->toMatchArray(['kind' => 'Incident', 'what' => 'Fall', 'outcome' => 'No hospital referral recorded'])
        ->and(json_encode($content))->not->toContain('100000000');
    $copy = $this->postJson("/api/sports-reports/{$id}/duplicate")->assertCreated()->json('data');
    expect($copy['title'])->toBe('Copy of Intramurals');
    $this->putJson("/api/sports-reports/{$id}/archived", ['archived' => true])->assertOk()->assertJsonPath('data.archived', true);
    expect(DB::table('audit_logs')->where('target_type', 'sports-report')->orderBy('id')->pluck('summary')->all())->toBe([null, 'Duplicated from another Sports Report', null]);
});
