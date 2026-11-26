<?php

declare(strict_types=1);

use App\Modules\UserManagement\Models\User;
use App\Shared\AuditLog\AuditAction;
use App\Shared\AuditLog\AuditEvent;
use App\Shared\AuditLog\AuditLogger;
use App\Shared\AuditLog\AuditTarget;
use Carbon\CarbonImmutable;
use Illuminate\Database\QueryException;
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
        expect($res->json('data.rows.0.target.label'))->toBe('T-0042')
            ->and($res->json('data.rows.0.dateTime'))->toBe('2026-11-06T11:00:00+08:00')
            ->and($res->json('data.rows.1.target.label'))->not->toBe('000000250009')
            ->and($res->json('data.rows.1.target.label'))->toContain('0009')
            ->and($res->json('data.rows.1.target.studentId'))->toBe((string) $this->studentId)
            ->and($res->json('data.rows.1.userName'))->toBe('Nurse Joy')
            ->and($res->json('data.rows.1.summary'))->toBe('Updated allergies')
            ->and($res->getContent())->not->toContain('Ana')->not->toContain('Reyes')->not->toContain('000000250009');
    }
    expect(DB::table('audit_logs')->count())->toBe(2); // reading writes nothing (ADR-016)
});

it('filters by date range, user, action and target bucket', function () {
    logAt('2026-10-31 23:59:00', $this->staff, AuditAction::Create, AuditTarget::Visit, '1');
    logAt('2026-11-02 08:00:00', $this->staff, AuditAction::Create, AuditTarget::InventoryRestock, '3', ['label' => 'Paracetamol']);
    logAt('2026-11-03 08:00:00', $this->admin, AuditAction::Login, null, null, ['label' => 'Signed in']);

    $this->actingAs($this->staff);
    expect($this->getJson(auditLog())->json('data.rows'))->toHaveCount(2)
        ->and($this->getJson(auditLog(['userId' => $this->admin->id]))->json('data.rows.0.summary'))->toBe('Signed in')
        ->and($this->getJson(auditLog(['actionTypes' => ['login']]))->json('data.rows'))->toHaveCount(1)
        ->and($this->getJson(auditLog(['targetTypes' => ['inventory']]))->json('data.rows.0.target'))
        ->toMatchArray(['type' => 'inventory', 'recordType' => 'inventory-restock', 'kind' => 'Inventory', 'label' => 'Paracetamol']);
});

it('answers in the { data } envelope, with meta beside it when paged (contract Format, ADR-080)', function () {
    logAt('2026-11-02 08:00:00', $this->staff, AuditAction::Create, AuditTarget::Visit, '1');

    $this->actingAs($this->staff)->getJson(auditLog())
        ->assertOk()->assertJsonStructure(['data' => ['rows', 'users']])->assertJsonMissingPath('rows');
    $this->getJson(auditLog(['page' => 1, 'perPage' => 25]))
        ->assertOk()->assertJsonPath('meta.total', 1)->assertJsonCount(1, 'data.rows');
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
        ->assertOk()->assertJsonPath('data.rows.0.target.label', '000000250009');
    $print = DB::table('audit_logs')->where('action_type', 'print')->sole();
    expect($print->target_label)->toBe('Audit Log');

    signIn($this->admin)->getJson(auditLog(['fullLrn' => 1]))->assertForbidden();
});

it('streams the complete filtered A4 audit print once, with full LRNs and escaped labels', function () {
    logAt('2026-11-05 10:00:00', $this->staff, AuditAction::Update, AuditTarget::Student, (string) $this->studentId,
        ['fields' => ['allergies'], 'student' => (string) $this->studentId]);
    logAt('2026-11-06 11:00:00', $this->staff, AuditAction::Create, AuditTarget::Inventory, '17',
        ['label' => '<script>alert(1)</script>']);
    $this->actingAs($this->staff);
    $response = $this->get('/api/audit-log/print?from=2026-11-01&to=2026-11-30');
    $response->assertOk()->assertHeader('Content-Type', 'text/html; charset=UTF-8');
    expect($response->headers->get('Content-Security-Policy'))->toContain("default-src 'none'", "script-src 'nonce-");
    $html = $response->streamedContent();
    expect($html)->toContain('<title>CLINIQ Audit Log</title>', '2 entries', '000000250009', '&lt;script&gt;alert(1)&lt;/script&gt;')
        ->not->toContain('<script>alert(1)</script>')
        ->and(substr_count($html, '<tr><td>'))->toBe(2)
        ->and(DB::table('audit_logs')->where('action_type', 'print')->count())->toBe(1);

    $filtered = $this->get('/api/audit-log/print?from=2026-11-01&to=2026-11-30&targetTypes[]=student&search=allergies');
    expect($filtered->streamedContent())->toContain('1 entry', '000000250009')->not->toContain('&lt;script&gt;');
    signIn($this->admin)->get('/api/audit-log/print?from=2026-11-01&to=2026-11-30')->assertForbidden();
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
    // Reads cliniq_app's grant on the `cliniq` database from the grant tables (read only; nothing in
    // `cliniq` is touched). Needs, once, as root:
    //   GRANT SELECT ON mysql.global_priv TO 'cliniq_migrate'@'localhost';
    //   GRANT SELECT ON mysql.db TO 'cliniq_migrate'@'localhost';
    //   GRANT SELECT ON mysql.tables_priv TO 'cliniq_migrate'@'localhost';
    try {
        $global = DB::selectOne("SELECT JSON_VALUE(Priv, '$.access') AS access FROM mysql.global_priv WHERE User = 'cliniq_app' AND Host = 'localhost'");
        $db = DB::selectOne("SELECT Select_priv, Insert_priv, Update_priv, Delete_priv FROM mysql.db WHERE User = 'cliniq_app' AND Host = 'localhost' AND Db = 'cliniq'");
        $tables = collect(DB::select("SELECT Table_name, Table_priv FROM mysql.tables_priv WHERE User = 'cliniq_app' AND Host = 'localhost' AND Db = 'cliniq'"))
            ->mapWithKeys(fn (object $r): array => [$r->Table_name => explode(',', (string) $r->Table_priv)]);
    } catch (QueryException) {
        $this->markTestSkipped('The test account cannot read the grant tables; run the three GRANT SELECT lines above as root.');
    }

    expect($global)->not->toBeNull('cliniq_app@localhost does not exist')
        ->and((int) $global->access & (4 | 8))->toBe(0); // no global UPDATE (4) or DELETE (8)
    expect($db)->not->toBeNull()
        ->and([$db->Select_priv, $db->Insert_priv, $db->Update_priv, $db->Delete_priv])->toBe(['Y', 'Y', 'N', 'N']);
    expect($tables->get('audit_logs', []))->not->toContain('Update')->not->toContain('Delete');
    expect($tables->filter(fn (array $p): bool => in_array('Update', $p, true) && in_array('Delete', $p, true))->count())->toBe(47);
});
