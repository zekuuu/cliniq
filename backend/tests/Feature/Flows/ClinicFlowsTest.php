<?php

declare(strict_types=1);

use App\Modules\UserManagement\Models\User;
use App\Modules\UserManagement\Services\Totp;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Process\PendingProcess;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Process;

uses(RefreshDatabase::class);

/*
 * Phase 2 "Simulate" (Backend-Loop-Engineering.md): whole flows through HTTP, the way the screens will
 * call them, from a real sign-in. Each flow ends with the privacy check: no LRN, name or birthdate in the
 * audit trail or the log file.
 */

beforeEach(function () {
    $this->travelTo('2026-11-10 08:00:00');
    $this->nurse = User::factory()->create(['name' => 'Nurse Joy', 'username' => 'nurse', 'password_hash' => bcrypt('nurse-pass-1')]);
    $this->principal = User::factory()->admin()->create(['name' => 'Principal Oak', 'username' => 'principal', 'password_hash' => bcrypt('admin-pass-1')]);
    $this->ana = DB::table('students')->insertGetId(['lrn' => '136401250001', 'first_name' => 'Ana', 'last_name' => 'Cruz', 'sex' => 'female', 'birth_date' => '2013-05-01',
        'grade_level_id' => DB::table('grade_levels')->where('name', 'Grade 7')->value('id')]);
    $this->item = DB::table('inventory_items')->insertGetId(['name' => 'Paracetamol 500 mg', 'category' => 'medicine', 'unit' => 'tablet', 'low_stock_threshold' => 5]);
    DB::table('inventory_batches')->insert(['item_id' => $this->item, 'quantity' => 20, 'expiration_date' => '2027-06-01', 'received_date' => '2026-01-01']);
});

function signInAs(string $username, string $password): void
{
    asSpa()->postJson('/api/auth/login', ['username' => $username, 'password' => $password])->assertOk();
}

/** No LRN, name or birthdate in the audit trail or the log file (ADR-017, ADR-028). */
function assertNothingPersonalLogged(): void
{
    $trail = DB::table('audit_logs')->get(['target_label', 'summary'])->map(fn (object $r): string => $r->target_label.' '.$r->summary)->implode("\n");
    $log = is_file(storage_path('logs/laravel.log')) ? (string) file_get_contents(storage_path('logs/laravel.log')) : '';
    foreach (['136401250001', 'Ana Cruz', 'Cruz', '2013-05-01'] as $secret) {
        expect($trail)->not->toContain($secret)->and($log)->not->toContain($secret);
    }
}

it('records a visit with a medicine: stock lowers, the trail has it, the Dashboard and the monthly report count it', function () {
    signInAs('nurse', 'nurse-pass-1');
    asSpa()->postJson('/api/visits', ['studentId' => (string) $this->ana, 'complaint' => 'Headache', 'treatment' => 'Rest', 'disposition' => 'returned_to_class',
        'itemsGiven' => [['itemId' => (string) $this->item, 'quantity' => 2, 'instructions' => 'One now']]])->assertCreated();

    asSpa()->getJson("/api/inventory/{$this->item}")->assertJsonPath('data.currentStock', 18);
    expect(DB::table('audit_logs')->orderBy('id')->pluck('target_type')->all())->toBe(['user', 'visit', 'inventory-dispensation']);
    asSpa()->getJson('/api/dashboard/summary?preset=today')->assertJsonPath('data.counts.visits', 1);
    asSpa()->getJson('/api/reports/monthly?month=2026-11')->assertJsonPath('data.counts.visits', 1)
        ->assertJsonPath('data.itemsGiven', [['itemName' => 'Paracetamol 500 mg', 'unit' => 'tablet', 'quantity' => 2]]);
    asSpa()->getJson('/api/inventory/movements')->assertJsonPath('data.0.patientNumber', '●●●●●●●●0001');
    assertNothingPersonalLogged();
});

it('takes an incident through Stage 1 and Stage 2 to an approved report, with its trail', function () {
    signInAs('nurse', 'nurse-pass-1');
    $id = asSpa()->postJson('/api/incidents', ['studentId' => (string) $this->ana, 'complaint' => 'Fall in the gym', 'vitals' => ['pulseBpm' => 110]])->assertCreated()->json('data.id');
    $this->travel(20)->minutes();
    asSpa()->putJson("/api/incidents/{$id}/stage-two", ['complaint' => 'Fall in the gym', 'vitals' => ['pulseBpm' => 92, 'treatmentNotes' => 'Cold compress'], 'hospitalReferral' => null,
        'newParentNotifications' => [['outcome' => 'reached']], 'followUp' => ['followUpDate' => '2026-11-11', 'reason' => 'Check the knee', 'notes' => null],
        'itemsGiven' => [['itemId' => (string) $this->item, 'quantity' => 1]]])->assertOk();
    asSpa()->postJson("/api/incidents/{$id}/approve")->assertNoContent();

    $trail = asSpa()->getJson("/api/incidents/{$id}/trail")->json('data');
    expect($trail['recorded']['by'])->toBe('Nurse Joy')->and($trail['approved']['by'])->toBe('Nurse Joy');
    asSpa()->getJson('/api/follow-ups')->assertJsonPath('data.0.reason', 'Check the knee')->assertJsonPath('data.0.dueState', 'upcoming');
    asSpa()->getJson("/api/students/{$this->ana}/history")->assertJsonCount(1, 'data.incidents');
    assertNothingPersonalLogged();
});

it('prepares an excuse letter with a visit, approves it, and logs the print', function () {
    signInAs('nurse', 'nurse-pass-1');
    $visit = asSpa()->postJson('/api/visits', ['studentId' => (string) $this->ana, 'complaint' => 'Fever', 'treatment' => '', 'disposition' => 'sent_home',
        'collectedBy' => ['name' => 'Maria Cruz', 'relationship' => 'Mother', 'time' => '08:00'],
        'excuseLetterDraft' => ['excusedFrom' => '2026-11-10', 'excusedUntil' => '2026-11-11', 'note' => null]])->assertCreated()->json('data.visit.id');
    asSpa()->getJson('/api/excuse-letters/pending')->assertJsonCount(1, 'data');

    $letter = asSpa()->postJson("/api/visits/{$visit}/excuse-letter/approve", ['excusedFrom' => '2026-11-10', 'excusedUntil' => '2026-11-11'])->assertCreated()->json('data');
    asSpa()->postJson('/api/audit/prints', ['document' => 'excuse-letter', 'record' => ['type' => 'excuse-letter', 'id' => (int) $letter['id']]])->assertNoContent();

    expect($letter['body'])->toContain('Ana Cruz') // the letter itself names the student; the trail never does
        ->and(DB::table('audit_logs')->where('action_type', 'print')->value('summary'))->toBe('Printed Clinic Excuse Letter');
    asSpa()->getJson('/api/excuse-letters/pending')->assertJsonCount(0, 'data');
    assertNothingPersonalLogged();
});

it('imports the yearly list, queues the new records for review, and archives the missing one into the year', function () {
    signInAs('nurse', 'nurse-pass-1');
    $row = ['lrn' => '136401250002', 'firstName' => 'Ben', 'lastName' => 'Abad', 'middleName' => '', 'gradeLevel' => 'Grade 8', 'section' => 'Mabini', 'sex' => 'M', 'birthDate' => ''];
    asSpa()->postJson('/api/students/import/preview', ['rows' => [$row]])->assertJsonPath('data.newCount', 1)->assertJsonPath('data.missing.0.lrn', '●●●●●●●●0001');
    asSpa()->postJson('/api/students/import', ['rows' => [$row], 'fileName' => 'grade8.csv', 'archiveIds' => [$this->ana]])->assertJsonPath('data.archived', 1);

    $queue = collect(asSpa()->getJson('/api/students/incomplete')->json('data'));
    expect($queue->pluck('student.fullName')->all())->toBe(['Ben Abad']);
    asSpa()->getJson('/api/archive/students?year=2026–2027')->assertJsonPath('data.0.archiveReason', 'Not on the new list');
    assertNothingPersonalLogged();
});

it('ends a school year and starts the next one, by hand, with the reminder', function () {
    signInAs('nurse', 'nurse-pass-1');
    asSpa()->postJson('/api/school-years/start')->assertOk()->assertJsonPath('data.label', '2026–2027');

    $this->travelTo('2027-04-14 15:00:00');
    signInAs('nurse', 'nurse-pass-1');
    asSpa()->getJson('/api/school-years/reminder')->assertJsonPath('data.kind', 'end')->assertJsonPath('data.dueToday', true);
    asSpa()->postJson('/api/school-years/end')->assertOk();

    $this->travelTo('2027-06-15 08:00:00');
    signInAs('nurse', 'nurse-pass-1');
    asSpa()->getJson('/api/school-years/reminder')->assertJsonPath('data.kind', 'start')->assertJsonPath('data.label', '2027–2028');
    asSpa()->postJson('/api/school-years/start')->assertOk()->assertJsonPath('data.label', '2027–2028');
    asSpa()->getJson('/api/school-years')->assertJsonCount(2, 'data.years');
});

it('backs up to the chosen locations, clears the Dashboard alert, and is verified', function () {
    Process::fake(function (PendingProcess $process) {
        $arg = collect((array) $process->command)->first(fn ($a) => str_starts_with((string) $a, '--result-file='));
        file_put_contents(substr((string) $arg, strlen('--result-file=')), "-- dump\n");

        return Process::result();
    });
    $dir = sys_get_temp_dir().DIRECTORY_SEPARATOR.'cliniq-flow-'.bin2hex(random_bytes(4));
    mkdir($dir);
    signInAs('principal', 'admin-pass-1');
    asSpa()->getJson('/api/dashboard/summary?preset=today')->assertJsonPath('data.backupAlert.kind', 'never');
    asSpa()->postJson('/api/backups/locations', ['label' => 'External drive', 'path' => $dir])->assertCreated();
    asSpa()->postJson('/api/backups/run')->assertOk()->assertJsonPath('data.latest.status', 'ok');
    asSpa()->getJson('/api/dashboard/summary?preset=today')->assertJsonPath('data.backupAlert', null);
    asSpa()->postJson('/api/backups/verify-latest')->assertOk()->assertJsonPath('data.verifiedByName', 'Principal Oak');
});

it('lets the Admin read the audit log and the monthly report, and refuses the clinic work', function () {
    signInAs('principal', 'admin-pass-1');
    asSpa()->getJson('/api/audit-log?from=2026-11-01&to=2026-11-30')->assertOk();
    asSpa()->getJson('/api/reports/monthly?month=2026-11')->assertOk();
    asSpa()->getJson('/api/visits')->assertForbidden();
    asSpa()->getJson('/api/inventory')->assertForbidden();
    asSpa()->postJson('/api/students', ['lrn' => '136401250009'])->assertForbidden();
    asSpa()->getJson('/api/reports/monthly?month=2026-11&fullLrn=1')->assertForbidden();
});

it('signs out after the idle minutes on the server clock, and a keep-alive keeps the session', function () {
    signInAs('nurse', 'nurse-pass-1');
    $this->travel(59)->minutes();
    asSpa()->postJson('/api/session/keepalive')->assertOk()->assertJsonPath('data.idleSecondsLeft', 3600);
    $this->travel(59)->minutes();
    asSpa()->getJson('/api/auth/me')->assertOk();
    $this->travel(60)->minutes();
    asSpa()->getJson('/api/auth/me')->assertUnauthorized()->assertJsonPath('code', 'session_idle');
    expect(DB::table('audit_logs')->where('target_label', 'Signed out (idle)')->count())->toBe(1);
});

it('locks after five wrong passwords and recovers with an authenticator code', function () {
    signInAs('nurse', 'nurse-pass-1');
    $secret = asSpa()->postJson('/api/auth/authenticator/setup')->json('data.secret');
    asSpa()->postJson('/api/auth/authenticator/confirm', ['code' => Totp::codeAt($secret, now()->getTimestamp())])->assertOk();
    asSpa()->postJson('/api/auth/logout')->assertNoContent();
    $this->app['auth']->forgetGuards();

    foreach (range(1, 4) as $i) {
        asSpa()->postJson('/api/auth/login', ['username' => 'nurse', 'password' => 'wrong'])->assertUnauthorized();
    }
    asSpa()->postJson('/api/auth/login', ['username' => 'nurse', 'password' => 'wrong'])->assertStatus(423);
    $this->travel(6)->minutes();

    asSpa()->postJson('/api/auth/recovery/check', ['username' => 'nurse'])->assertNoContent();
    $token = asSpa()->postJson('/api/auth/recovery/verify', ['username' => 'nurse', 'code' => Totp::codeAt($secret, now()->getTimestamp())])->assertOk()->json('data.token');
    asSpa()->postJson('/api/auth/recovery/reset', ['token' => $token, 'nextPassword' => 'recovered-pass-1'])->assertNoContent();
    signInAs('nurse', 'recovered-pass-1');
    expect(DB::table('audit_logs')->pluck('summary')->filter()->implode(' | '))->toContain('Account locked for 5 minutes after 5 wrong passwords (sign-in)')
        ->toContain('Reset password with authenticator')->not->toContain($secret);
});
