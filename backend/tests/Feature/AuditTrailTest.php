<?php

declare(strict_types=1);

use App\Modules\UserManagement\Models\User;
use App\Shared\AuditLog\AuditAction;
use App\Shared\AuditLog\AuditEvent;
use App\Shared\AuditLog\AuditLogger;
use App\Shared\AuditLog\AuditTarget;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

beforeEach(function () {
    asSpa();
    $this->travelTo('2026-11-10 09:00:00');
    $this->staff = User::factory()->create(['name' => 'Nurse Joy']);
    $this->admin = User::factory()->admin()->create(['name' => 'Principal Oak']);
    $this->studentId = DB::table('students')->insertGetId(['lrn' => '000000250009', 'first_name' => 'Ana', 'last_name' => 'Cruz']);
    $this->staffPatientId = DB::table('personnel')->insertGetId([
        'staff_number' => 'T-0042', 'first_name' => 'Ben', 'last_name' => 'Reyes', 'sex' => 'male', 'type' => 'Teacher',
    ]);
});

function logAt(string $at, User $by, AuditAction $action, ?AuditTarget $type, ?string $id, array $extra = []): void
{
    app(AuditLogger::class)->record(new AuditEvent(
        actorId: (string) $by->id, actorRole: $by->role, action: $action, targetType: $type, targetId: $id,
        targetLabel: $extra['label'] ?? null, at: CarbonImmutable::parse($at), fields: $extra['fields'] ?? [],
        subjectStudentId: $extra['student'] ?? null, subjectPersonnelId: $extra['personnel'] ?? null,
    ));
}

function auditLog(array $query = []): string
{
    return '/api/audit-log?'.http_build_query($query + ['from' => '2026-11-01', 'to' => '2026-11-30']);
}

it('writes an entry with field names only and a summary built from them', function () {
    logAt('2026-11-05 10:00:00', $this->staff, AuditAction::Update, AuditTarget::Student, (string) $this->studentId,
        ['fields' => ['lrn', 'gradeLevel', 'allergies'], 'student' => (string) $this->studentId]);

    $row = DB::table('audit_logs')->sole();
    expect($row->summary)->toBe('Updated LRN, grade level and allergies')
        ->and($row->actor_role)->toBe('staff')
        ->and($row->target_type)->toBe('student')
        ->and($row->occurred_at)->toBe('2026-11-05 10:00:00')
        ->and(json_encode($row))->not->toContain('000000250009');
});

it('lists newest first with the actor, a masked LRN for students and the Staff No. for staff patients', function () {
    logAt('2026-11-05 10:00:00', $this->staff, AuditAction::Update, AuditTarget::Student, (string) $this->studentId,
        ['fields' => ['allergies'], 'student' => (string) $this->studentId]);
    logAt('2026-11-06 11:00:00', $this->staff, AuditAction::Update, AuditTarget::Staff, (string) $this->staffPatientId,
        ['fields' => ['department'], 'personnel' => (string) $this->staffPatientId]);

    foreach ([$this->staff, $this->admin] as $viewer) {
        $res = signIn($viewer)->getJson(auditLog())->assertOk();
        expect($res->json('rows.0.target.label'))->toBe('T-0042')
            ->and($res->json('rows.0.dateTime'))->toBe('2026-11-06T11:00:00+08:00')
            ->and($res->json('rows.1.target.label'))->not->toBe('000000250009')
            ->and($res->json('rows.1.target.label'))->toContain('0009')
            ->and($res->json('rows.1.target.studentId'))->toBe((string) $this->studentId)
            ->and($res->json('rows.1.userName'))->toBe('Nurse Joy')
            ->and($res->json('rows.1.summary'))->toBe('Updated allergies')
            ->and($res->getContent())->not->toContain('Ana')->not->toContain('Reyes')->not->toContain('000000250009');
    }
    expect(DB::table('audit_logs')->count())->toBe(2); // reading writes nothing (ADR-016)
});

it('filters by date range, user, action and target bucket', function () {
    logAt('2026-10-31 23:59:00', $this->staff, AuditAction::Create, AuditTarget::Visit, '1');
    logAt('2026-11-02 08:00:00', $this->staff, AuditAction::Create, AuditTarget::InventoryRestock, '3', ['label' => 'Paracetamol']);
    logAt('2026-11-03 08:00:00', $this->admin, AuditAction::Login, null, null, ['label' => 'Signed in']);

    $this->actingAs($this->staff);
    expect($this->getJson(auditLog())->json('rows'))->toHaveCount(2)
        ->and($this->getJson(auditLog(['userId' => $this->admin->id]))->json('rows.0.summary'))->toBe('Signed in')
        ->and($this->getJson(auditLog(['actionTypes' => ['login']]))->json('rows'))->toHaveCount(1)
        ->and($this->getJson(auditLog(['targetTypes' => ['inventory']]))->json('rows.0.target'))
        ->toMatchArray(['type' => 'inventory', 'recordType' => 'inventory-restock', 'kind' => 'Inventory', 'label' => 'Paracetamol']);
});

it('rejects bad filters with 422 and a signed-out request with 401', function () {
    $this->getJson(auditLog())->assertUnauthorized()->assertJsonPath('code', 'unauthenticated');
    $this->actingAs($this->staff)->getJson('/api/audit-log?from=2026-11-30&to=2026-11-01')
        ->assertUnprocessable()->assertJsonValidationErrors('to');
    $this->getJson(auditLog(['actionTypes' => ['erase']]))->assertUnprocessable();
});

it('gives Staff the full LRN for the printout and records the print; the Admin gets 403', function () {
    logAt('2026-11-05 10:00:00', $this->staff, AuditAction::Update, AuditTarget::Student, (string) $this->studentId,
        ['fields' => ['allergies'], 'student' => (string) $this->studentId]);

    $this->actingAs($this->staff)->getJson(auditLog(['fullLrn' => 1]))
        ->assertOk()->assertJsonPath('rows.0.target.label', '000000250009');
    $print = DB::table('audit_logs')->where('action_type', 'print')->sole();
    expect($print->target_label)->toBe('Audit Log');

    signIn($this->admin)->getJson(auditLog(['fullLrn' => 1]))->assertForbidden();
});

it('records a profile view once per record per session', function (string $who) {
    signIn($this->{$who})->postJson('/api/audit/views', ['type' => 'student', 'id' => $this->studentId])->assertNoContent();
    $this->postJson('/api/audit/views', ['type' => 'student', 'id' => $this->studentId])->assertNoContent();

    $row = DB::table('audit_logs')->where('action_type', 'view')->sole();
    expect($row->summary)->toBe('Opened student profile')
        ->and($row->actor_role)->toBe($this->{$who}->role)
        ->and($row->subject_student_id)->toBe($this->studentId);

    $this->postJson('/api/audit/views', ['type' => 'student', 'id' => 999999])->assertNotFound();
    $this->postJson('/api/audit/views', ['type' => 'visit', 'id' => 1])->assertUnprocessable();
})->with(['staff', 'admin']);

it('records a print by fixed key with a server-built title; the Admin never prints', function () {
    $this->actingAs($this->staff)->postJson('/api/audit/prints', ['document' => 'monthly-clinic-report', 'month' => '2026-10'])
        ->assertNoContent();
    expect(DB::table('audit_logs')->value('target_label'))->toBe('Monthly Clinic Report — October 2026');

    $this->postJson('/api/audit/prints', ['document' => 'anything I like'])->assertUnprocessable();
    signIn($this->admin)->postJson('/api/audit/prints', ['document' => 'audit-log'])->assertForbidden();
});

it('has no route that updates or deletes an audit entry', function () {
    $writes = collect(Route::getRoutes()->getRoutes())
        ->filter(fn ($r) => str_contains($r->uri(), 'audit') && array_intersect($r->methods(), ['PUT', 'PATCH', 'DELETE']));
    expect($writes)->toBeEmpty();
});

it('refuses UPDATE and DELETE on audit_logs for the app account', function () {
    // The test connection is the migration account; the cliniq_app grant cannot be shown from here.
    // Run notes Nov10, ANSWERS AND DECISIONS: "append-only grant test".
})->skip('cliniq_app is not reachable from the test connection; see Overnight-Run-Nov10/NOTES.md');
