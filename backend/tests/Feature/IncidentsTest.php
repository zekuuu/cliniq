<?php

declare(strict_types=1);

use App\Modules\UserManagement\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->travelTo('2026-11-10 09:00:00');
    $this->staff = User::factory()->create(['name' => 'Nurse Joy']);
    $this->student = DB::table('students')->insertGetId(['lrn' => '100000000001', 'first_name' => 'Ana', 'last_name' => 'Cruz']);
    $this->personnel = DB::table('personnel')->insertGetId(['staff_number' => 'STF-0001', 'first_name' => 'Rosa', 'last_name' => 'Lim', 'sex' => 'female', 'type' => 'Teacher']);
    $this->item = DB::table('inventory_items')->insertGetId(['name' => 'Gauze', 'category' => 'supply', 'unit' => 'pad']);
    $this->batch = DB::table('inventory_batches')->insertGetId(['item_id' => $this->item, 'quantity' => 10, 'expiration_date' => null, 'received_date' => '2026-01-01']);
});

function stageOne(array $over = []): array
{
    return $over + ['studentId' => (string) test()->student, 'complaint' => 'Fall in the gym'];
}

function stageTwo(array $over = []): array
{
    return $over + ['complaint' => 'Fall in the gym', 'vitals' => ['pulseBpm' => 90, 'treatmentNotes' => 'Cold compress'], 'hospitalReferral' => null,
        'newParentNotifications' => [], 'followUp' => null];
}

it('saves Stage 1 without readings, rejects submitted readings, and audits it', function () {
    signIn($this->staff);
    $incident = $this->postJson('/api/incidents', stageOne(['generalNotes' => 'Seen by coach']))->assertCreated()->json('data');

    expect($incident['stage'])->toBe(1)->and($incident['vitals'])->toBe([])
        ->and(DB::table('audit_logs')->value('target_type'))->toBe('incident-stage-1')
        ->and(DB::table('audit_logs')->value('summary'))->toBe('Included additional notes');
    $this->postJson('/api/incidents', stageOne(['complaint' => ' ']))->assertUnprocessable()->assertJsonPath('message', 'Enter the complaint.');
    $this->postJson('/api/incidents', stageOne(['vitals' => ['pulseBpm' => 104]]))->assertUnprocessable()->assertJsonPath('errors.vitals.0', 'The vitals field is prohibited.');
    $this->postJson('/api/incidents', stageOne(['time' => '2026-11-10T10:00:00+08:00']))->assertUnprocessable()->assertJsonPath('message', "The incident time can't be in the future.");
});

it('keeps entry time immutable while event, arrival and reading times are recorded separately', function () {
    signIn($this->staff);
    $created = $this->postJson('/api/incidents', stageOne(['time' => '2026-11-09T14:30:00+08:00']))->assertCreated()->json('data');
    $id = $created['id'];
    expect($created['time'])->toBe('2026-11-09T14:30:00+08:00')
        ->and($created['recordedAt'])->toBe('2026-11-10T09:00:00+08:00')
        ->and($created['arrivedAtClinic'])->toBeNull();

    $changed = $this->putJson("/api/incidents/{$id}/stage-two", stageTwo([
        'time' => '2026-11-09T14:20:00+08:00',
        'arrivedAtClinic' => '2026-11-09T14:10:00+08:00',
        'vitals' => ['temperatureC' => 37.2, 'pulseBpm' => 92],
        'readingTimes' => ['temperatureC' => '2026-11-09T14:25:00+08:00', 'pulseBpm' => '2026-11-09T14:35:00+08:00'],
    ]))->assertOk()->json('data.incident');
    expect($changed['time'])->toBe('2026-11-09T14:20:00+08:00')
        ->and($changed['arrivedAtClinic'])->toBe('2026-11-09T14:10:00+08:00')
        ->and($changed['recordedAt'])->toBe($created['recordedAt'])
        ->and($changed['readingTimes']['temperatureC'])->toBe('2026-11-09T14:25:00+08:00')
        ->and($changed['readingTimes']['pulseBpm'])->toBe('2026-11-09T14:35:00+08:00')
        ->and(DB::table('incident_vital_readings')->where('incident_id', $id)->count())->toBe(2);
    expect(DB::table('audit_logs')->where('target_type', 'incident-stage-2')->value('summary'))
        ->toContain('corrected when it happened')->not->toContain('2026-11-09');

    $this->putJson("/api/incidents/{$id}/stage-two", stageTwo(['time' => '2026-11-10T10:00:00+08:00']))->assertUnprocessable();
    $this->putJson("/api/incidents/{$id}/stage-two", stageTwo(['arrivedAtClinic' => '2026-11-10T10:00:00+08:00']))->assertUnprocessable();
    $this->putJson("/api/incidents/{$id}/stage-two", stageTwo(['readingTimes' => ['pulseBpm' => '2026-11-10T10:00:00+08:00']]))->assertUnprocessable();
    $this->postJson("/api/incidents/{$id}/approve")->assertNoContent();
    $this->putJson("/api/incidents/{$id}/stage-two", stageTwo(['time' => '2026-11-09T14:00:00+08:00']))->assertConflict();
});

it('escalates a visit once, linked both ways', function () {
    signIn($this->staff);
    $visit = $this->postJson('/api/visits', ['studentId' => (string) $this->student, 'dateTime' => '2026-11-10T08:15', 'complaint' => 'Fall', 'treatment' => '', 'disposition' => 'resting_in_clinic', 'temperatureC' => 37.1])->assertCreated()->json('data.visit.id');

    $this->postJson('/api/incidents', stageOne(['sourceVisitId' => $visit, 'studentId' => null, 'personnelId' => (string) $this->personnel]))->assertConflict()->assertJsonPath('rule', 'wrong_patient');
    $created = $this->postJson('/api/incidents', stageOne(['sourceVisitId' => $visit]))->assertCreated()->json('data');
    $id = $created['id'];
    expect($created['vitals'])->toBe(['temperatureC' => 37.1])
        ->and($created['time'])->toBe('2026-11-10T08:15:00+08:00');
    $this->postJson('/api/incidents', stageOne(['sourceVisitId' => $visit]))->assertConflict()->assertJsonPath('message', 'This visit was already escalated to an incident.');

    $this->getJson("/api/visits/{$visit}")->assertJsonPath('data.escalatedIncidentId', $id);
    expect(DB::table('audit_logs')->where('target_type', 'visit')->where('action_type', 'update')->value('summary'))->toBe('Escalated to incident');
});

it('completes Stage 2: dispenses once, merges the latest readings, logs calls and the follow-up, then approves', function () {
    signIn($this->staff);
    $id = $this->postJson('/api/incidents', stageOne())->json('data.id');
    $this->postJson("/api/incidents/{$id}/approve")->assertConflict()->assertJsonPath('message', 'Complete Stage 2 before approving this report.');

    $res = $this->putJson("/api/incidents/{$id}/stage-two", stageTwo([
        'itemsGiven' => [['itemId' => (string) $this->item, 'quantity' => 2]], 'bodyPart' => 'Knee',
        'newParentNotifications' => [['outcome' => 'no_answer', 'calledContact' => ['name' => 'Maria Cruz', 'relationship' => 'Mother', 'phone' => '0917 000 0000', 'source' => 'emergency_contact']]],
        'followUp' => ['followUpDate' => '2026-11-12', 'reason' => 'Check knee', 'notes' => null],
        'hospitalReferral' => ['destination' => 'City Hospital', 'transportMode' => 'Ambulance', 'departureTime' => '2026-11-10T08:50:00+08:00'],
    ]))->assertOk();
    $incident = $res->json('data.incident');
    expect($incident['stage'])->toBe(2)->and($incident['vitals'])->toBe(['pulseBpm' => 90, 'treatmentNotes' => 'Cold compress'])
        ->and($incident['itemsGiven'][0]['quantity'])->toBe(2)->and($incident['parentNotifications'][0]['calledContact']['relationship'])->toBe('Mother')
        ->and($incident['hospitalReferral']['departureTime'])->toBe('2026-11-10T08:50:00+08:00')
        ->and($res->json('data.followUp.relatedRecord'))->toBe(['type' => 'incident', 'id' => $id])
        ->and((int) DB::table('inventory_batches')->where('id', $this->batch)->value('quantity'))->toBe(8)
        ->and(DB::table('audit_logs')->where('target_type', 'incident-stage-2')->value('summary'))->toBe('Completed Stage 2 details; included body part affected and recorded readings and their times');

    // Saving again keeps the stock; changing the medicines is refused.
    $this->putJson("/api/incidents/{$id}/stage-two", stageTwo(['itemsGiven' => [['itemId' => (string) $this->item, 'quantity' => 2]]]))->assertOk();
    $this->putJson("/api/incidents/{$id}/stage-two", stageTwo(['itemsGiven' => [['itemId' => (string) $this->item, 'quantity' => 3]]]))->assertConflict()
        ->assertJsonPath('message', "Medicines on a completed incident can't be changed.");
    expect((int) DB::table('inventory_batches')->where('id', $this->batch)->value('quantity'))->toBe(8);

    $this->postJson("/api/incidents/{$id}/approve")->assertNoContent();
    $this->postJson("/api/incidents/{$id}/approve")->assertConflict()->assertJsonPath('rule', 'incident_stage');
    $this->putJson("/api/incidents/{$id}/stage-two", stageTwo(['generalNotes' => 'Changed']))->assertConflict()->assertJsonPath('rule', 'incident_approved');
    $this->getJson('/api/incidents/approved-ids')->assertExactJson(['data' => [$id]]);
    $trail = $this->getJson("/api/incidents/{$id}/trail")->json('data');
    expect($trail['recorded']['by'])->toBe('Nurse Joy')->and($trail['completed'])->not->toBeNull()->and($trail['approved']['at'])->toBe('2026-11-10T09:00:00+08:00')
        ->and(DB::table('incident_report_approvals')->value('reference_no'))->toBe('IR-2026-0001');
});

it('logs a parent call by itself and refuses an unknown outcome', function () {
    signIn($this->staff);
    $id = $this->postJson('/api/incidents', stageOne())->json('data.id');

    $this->postJson("/api/incidents/{$id}/parent-notifications", ['outcome' => 'hung_up'])->assertUnprocessable();
    $this->postJson("/api/incidents/{$id}/parent-notifications", ['outcome' => 'reached'])->assertCreated()->assertJsonPath('data.outcome', 'reached');
    expect(DB::table('audit_logs')->where('target_type', 'parent-notification')->count())->toBe(1);
});

it('gives each patient a history of visits and incidents, staff with follow-ups', function () {
    signIn($this->staff);
    $this->postJson('/api/incidents', stageOne());
    $this->postJson('/api/visits', ['personnelId' => (string) $this->personnel, 'complaint' => 'Cough', 'treatment' => '', 'disposition' => 'returned_to_class',
        'followUp' => ['followUpDate' => '2026-11-11', 'reason' => 'Recheck', 'notes' => null]]);

    $this->getJson("/api/students/{$this->student}/history")->assertOk()->assertJsonCount(0, 'data.visits')->assertJsonCount(1, 'data.incidents');
    $this->getJson("/api/personnel/{$this->personnel}/history")->assertOk()->assertJsonCount(1, 'data.visits')->assertJsonCount(1, 'data.followUps');
});

it('hides staff patients\' incidents from the Admin, who reads and approves nothing', function () {
    $student = DB::table('incidents')->insertGetId(['student_id' => $this->student, 'occurred_at' => '2026-11-10 08:00:00', 'complaint' => 'Fall', 'created_by_user_id' => $this->staff->id]);
    $staff = DB::table('incidents')->insertGetId(['personnel_id' => $this->personnel, 'occurred_at' => '2026-11-10 08:30:00', 'complaint' => 'Cut', 'created_by_user_id' => $this->staff->id]);
    signIn(User::factory()->admin()->create());

    expect(array_column($this->getJson('/api/incidents')->assertOk()->json('data'), 'id'))->toBe([(string) $student]);
    $this->getJson("/api/incidents/{$staff}")->assertNotFound();
    $this->getJson("/api/incidents/{$student}")->assertOk();
    $this->postJson("/api/incidents/{$student}/approve")->assertForbidden();
    $this->getJson("/api/students/{$this->student}/history")->assertOk();
});
