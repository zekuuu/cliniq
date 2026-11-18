<?php

declare(strict_types=1);

use App\Modules\UserManagement\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->travelTo('2026-11-10 09:00:00');
    $this->staff = User::factory()->create();
    $student = DB::table('students')->insertGetId(['lrn' => '100000000001', 'first_name' => 'Ana', 'last_name' => 'Cruz']);
    $this->visit = DB::table('visits')->insertGetId(['student_id' => $student, 'visited_at' => '2026-11-01 08:00:00', 'complaint' => 'Fever', 'disposition' => 'sent_home', 'logged_by_user_id' => $this->staff->id]);
    $add = fn (string $date, string $reason): int => DB::table('follow_ups')->insertGetId(['student_id' => $student, 'visit_id' => $this->visit, 'follow_up_date' => $date, 'reason' => $reason, 'created_by_user_id' => $this->staff->id]);
    $this->upcoming = $add('2026-11-12', 'Upcoming');
    $this->today = $add('2026-11-10', 'Today');
    $this->overdue = $add('2026-11-06', 'Overdue');
    $this->stale = $add('2026-11-02', 'Stale'); // 8 days past: reads as Missed
    signIn($this->staff);
});

it('lists follow-ups by date with the due state, a masked number, and stale ones read as Missed', function () {
    $rows = collect($this->getJson('/api/follow-ups')->assertOk()->json('data'))->keyBy('reason');

    expect($rows['Upcoming']['dueState'])->toBe('upcoming')->and($rows['Today']['dueState'])->toBe('due_today')
        ->and($rows['Overdue']['dueState'])->toBe('overdue')
        ->and($rows['Stale']['status'])->toBe('missed')->and($rows['Stale']['statusReason'])->toBe('No response (closed automatically after 7 days)')
        ->and($rows['Today']['patient'])->toBe(['kind' => 'student', 'number' => '●●●●●●●●0001'])
        ->and(DB::table('follow_ups')->where('id', $this->stale)->value('status'))->toBe('pending'); // reading writes nothing
});

it('sets a status, needing a reason to cancel, and audits only a change', function () {
    $this->putJson("/api/follow-ups/{$this->today}/status", ['status' => 'cancelled'])->assertUnprocessable()->assertJsonPath('message', 'Give the reason this follow-up is cancelled.');
    $this->putJson("/api/follow-ups/{$this->today}/status", ['status' => 'completed'])->assertOk()->assertJsonPath('data.status', 'completed');
    $this->putJson("/api/follow-ups/{$this->today}/status", ['status' => 'completed'])->assertOk();

    expect(DB::table('audit_logs')->orderBy('id')->pluck('summary')->all())->toBe(['Marked completed', null]);
});

it('reschedules a missed follow-up once, writing it Missed, and hides it from the list', function () {
    $this->postJson("/api/follow-ups/{$this->today}/reschedule", ['followUpDate' => '2026-11-20'])->assertConflict()->assertJsonPath('rule', 'follow_up_state');
    $this->postJson("/api/follow-ups/{$this->stale}/reschedule", ['followUpDate' => '2026-11-09'])->assertUnprocessable();
    $this->postJson("/api/follow-ups/{$this->stale}/reschedule", ['followUpDate' => '2026-11-20'])->assertCreated()->assertJsonPath('data.reason', 'Stale');
    $this->postJson("/api/follow-ups/{$this->stale}/reschedule", ['followUpDate' => '2026-11-21'])->assertConflict()->assertJsonPath('message', 'This follow-up already has a new date.');

    expect(DB::table('follow_ups')->where('id', $this->stale)->value('status'))->toBe('missed');
    expect(collect($this->getJson('/api/follow-ups')->json('data'))->where('reason', 'Stale')->pluck('status')->all())->toBe(['pending']);
});

it('closes stale follow-ups as Missed with the daily command', function () {
    $this->artisan('cliniq:close-missed-follow-ups')->expectsOutput('1 follow-ups closed as missed.')->assertSuccessful();
    expect(DB::table('follow_ups')->where('id', $this->stale)->value('status'))->toBe('missed')
        ->and(DB::table('follow_ups')->where('id', $this->overdue)->value('status'))->toBe('pending');
});
