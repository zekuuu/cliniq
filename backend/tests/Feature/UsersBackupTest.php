<?php

declare(strict_types=1);

use App\Modules\UserManagement\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Process\PendingProcess;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Process;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->travelTo('2026-11-10 09:00:00');
    $this->admin = User::factory()->admin()->create(['name' => 'Principal Oak', 'username' => 'principal']);
    $this->staff = User::factory()->create(['name' => 'Nurse Joy', 'username' => 'nurse']);
});

/** A temporary folder standing in for a drive. */
function tempLocation(): string
{
    $dir = sys_get_temp_dir().DIRECTORY_SEPARATOR.'cliniq-test-'.bin2hex(random_bytes(4));
    mkdir($dir);

    return $dir;
}

it('lets the Admin add an account that must change its password, refusing a taken username', function () {
    signIn($this->admin);
    $id = $this->postJson('/api/users', ['name' => 'Nurse Two', 'username' => 'nurse2', 'role' => 'staff', 'temporaryPassword' => 'temp-pass-1'])->assertCreated()
        ->assertJsonMissingPath('data.password_hash')->json('data.id');
    expect((bool) DB::table('users')->where('id', $id)->value('must_change_password'))->toBeTrue();

    $this->postJson('/api/users', ['name' => 'Copy', 'username' => 'NURSE2', 'role' => 'staff', 'temporaryPassword' => 'temp-pass-1'])->assertConflict()->assertJsonPath('rule', 'duplicate_username');
    $this->postJson('/api/users', ['name' => 'Short', 'username' => 'short', 'role' => 'staff', 'temporaryPassword' => 'short'])->assertUnprocessable()->assertJsonPath('message', 'Password must be at least 8 characters.');
    $this->putJson("/api/users/{$id}", ['name' => 'Nurse Two Renamed', 'username' => 'nurse2', 'role' => 'staff'])->assertOk();
    expect(DB::table('audit_logs')->where('target_type', 'user')->orderBy('id')->pluck('summary')->all())->toBe([null, 'Updated name']);
});

it('never disables or demotes the last active Admin, and audits enable and disable', function () {
    signIn($this->admin);
    $this->putJson("/api/users/{$this->admin->id}/active", ['active' => false])->assertConflict()->assertJsonPath('rule', 'last_admin');
    $this->putJson("/api/users/{$this->admin->id}", ['name' => 'Principal Oak', 'username' => 'principal', 'role' => 'staff'])->assertConflict()->assertJsonPath('rule', 'last_admin');

    $this->putJson("/api/users/{$this->staff->id}/active", ['active' => false])->assertOk()->assertJsonPath('data.deactivatedAt', '2026-11-10T09:00:00+08:00');
    $this->putJson("/api/users/{$this->staff->id}/active", ['active' => false])->assertOk();
    expect(DB::table('audit_logs')->where('summary', 'Disabled account')->count())->toBe(1);
});

it('resets a password to a temporary one, clearing the history and the lock', function () {
    DB::table('password_histories')->insert(['user_id' => $this->staff->id, 'password_hash' => 'x']);
    DB::table('users')->where('id', $this->staff->id)->update(['failed_login_count' => 3, 'locked_until' => '2026-11-10 09:05:00']);
    signIn($this->admin);

    $this->postJson("/api/users/{$this->staff->id}/reset-password", ['temporaryPassword' => 'new-temp-1'])->assertNoContent();
    expect(DB::table('password_histories')->count())->toBe(0)->and(DB::table('users')->where('id', $this->staff->id)->value('locked_until'))->toBeNull()
        ->and(DB::table('audit_logs')->value('summary'))->toBe('Reset password');
});

it('shows Staff names only, and refuses them every account write', function () {
    signIn($this->staff);
    expect($this->getJson('/api/users')->assertOk()->json('data.0'))->toBe(['id' => (string) $this->staff->id, 'name' => 'Nurse Joy', 'role' => 'staff']);
    $this->getJson('/api/users/principal-name')->assertExactJson(['data' => 'Principal Oak']);
    $this->postJson('/api/users', ['name' => 'X', 'username' => 'xxx', 'role' => 'staff', 'temporaryPassword' => 'temp-pass-1'])->assertForbidden()
        ->assertJsonPath('message', 'Only the Admin/Principal can manage accounts.');
});

it('creates the first Admin from the console with a one-time password, and the break-glass resets it', function () {
    $this->artisan('cliniq:create-admin', ['username' => 'head', '--name' => 'Head Admin'])->expectsOutputToContain('One-time password')->assertSuccessful();
    $head = User::query()->where('username', 'head')->firstOrFail();
    expect($head->role)->toBe('admin')->and($head->must_change_password)->toBeTrue()
        ->and(DB::table('audit_logs')->pluck('summary')->implode(' '))->toBe('Created from the console');

    $this->artisan('cliniq:reset-admin-password')->expectsQuestion('Administrator username', 'HEAD')
        ->expectsQuestion('Temporary password (at least 8 characters)', 'break-glass-1')->assertSuccessful();
    expect(password_verify('break-glass-1', (string) DB::table('users')->where('username', 'head')->value('password_hash')))->toBeTrue()
        ->and(DB::table('audit_logs')->orderByDesc('id')->value('summary'))->toBe('Reset password with the break-glass command');
});

it('runs a backup to every enabled location without putting the password on the command line', function () {
    expect(class_exists(ZipArchive::class))->toBeTrue();
    Process::fake(function (PendingProcess $process) {
        $args = (array) $process->command;
        $file = substr((string) collect($args)->first(fn ($a) => str_starts_with((string) $a, '--result-file=')), strlen('--result-file='));
        file_put_contents($file, "-- dump\n");

        return Process::result('', '', 0);
    });
    $good = tempLocation();
    signIn($this->admin);
    $this->postJson('/api/backups/run')->assertConflict()->assertJsonPath('rule', 'no_backup_location');
    $this->postJson('/api/backups/locations', ['label' => '', 'path' => ''])->assertUnprocessable();
    $this->postJson('/api/backups/locations', ['label' => 'USB drive', 'path' => $good])->assertCreated()->assertJsonPath('data.status', 'found');
    $this->postJson('/api/backups/locations', ['label' => 'Gone drive', 'path' => $good.DIRECTORY_SEPARATOR.'missing'])->assertCreated()->assertJsonPath('data.status', 'not_found');

    $status = $this->postJson('/api/backups/run')->assertOk()->json('data');
    expect($status['latest']['status'])->toBe('ok')->and($status['latest']['locationNames'])->toBe(['USB drive', 'Gone drive'])->and($status['needsVerification'])->toBeTrue()
        ->and(glob($good.'/.cliniq/backups/2026/11/cliniq-2026-11-10_0900.zip'))->toHaveCount(1)
        ->and(is_file($good.'/.cliniq/cliniq.json'))->toBeTrue()
        ->and(DB::table('backup_location_results')->orderBy('id')->pluck('status')->all())->toBe(['ok', 'failed'])
        ->and(DB::table('audit_logs')->where('target_type', 'backup')->value('summary'))->toBe('Backup started from the Backup page (2 locations)');
    Process::assertRan(function (PendingProcess $process) {
        $line = implode(' ', (array) $process->command);

        return str_contains($line, '--defaults-extra-file=') && ! str_contains($line, '--password') && ! str_contains($line, '-p');
    });

    $this->postJson('/api/backups/verify-latest')->assertOk()->assertJsonPath('data.verifiedByName', 'Principal Oak')->assertJsonPath('data.needsVerification', false);
});

it('records a failed dump, refuses to verify it, and keeps the last enabled location on', function () {
    Process::fake(fn () => Process::result('', 'denied', 2));
    $loc = tempLocation();
    signIn($this->staff);
    $id = $this->postJson('/api/backups/locations', ['label' => 'USB', 'path' => $loc])->json('data.id');

    $this->postJson('/api/backups/run')->assertOk()->assertJsonPath('data.latest.status', 'failed');
    $this->postJson('/api/backups/verify-latest')->assertConflict()->assertJsonPath('rule', 'backup_failed');
    $this->putJson("/api/backups/locations/{$id}/enabled", ['enabled' => false])->assertUnprocessable()
        ->assertJsonPath('message', 'Enable another backup location before disabling the last one.');
    $this->getJson('/api/backups/folders?path='.urlencode($loc))->assertOk()->assertJsonStructure(['data' => ['drives', 'folders']]);
});

it('takes issue reports from both roles and serves the reference lists', function () {
    signIn($this->staff);
    $this->postJson('/api/issue-reports', ['description' => ' ', 'route' => '/x', 'pageName' => 'X'])->assertUnprocessable()->assertJsonPath('message', 'Issue description is required.');
    $this->postJson('/api/issue-reports', ['description' => 'The save button is grey', 'route' => '/visits/new', 'pageName' => 'New Visit'])->assertCreated()->assertJsonPath('data.role', 'staff');
    $this->getJson('/api/issue-reports')->assertJsonCount(1, 'data');

    $type = DB::table('complaint_types')->insertGetId(['label' => 'Nosebleed', 'sort_order' => -1]);
    DB::table('triage_steps')->insert(['complaint_type_id' => $type, 'step_text' => 'Lean forward', 'sort_order' => 0]);
    $this->getJson('/api/reference/visit-complaint-types')->assertJsonPath('data.0', ['id' => (string) $type, 'label' => 'Nosebleed', 'triageSteps' => ['Lean forward']])
        ->assertJsonPath('data.1.label', 'Headache')->assertJsonPath('data.1.triageSteps', ['Check temperature', 'Ask about hydration and meals', 'Allow supervised rest']);
    $this->getJson('/api/reference/incident-complaint-types')->assertExactJson(['data' => ['Fainting', 'Fall injury', 'Asthma attack', 'Severe allergic reaction', 'Head bump during PE']]);
    $this->getJson('/api/reference/grade-levels')->assertJsonPath('data.0', 'Kinder');
    $this->getJson('/api/reference/large-write-off-percent')->assertExactJson(['data' => 25]);
    $this->getJson('/api/reference/vitals-ranges')->assertJsonPath('data.feverFromC', 37)->assertJsonPath('data.usual.temperatureMinC', 36);
    $this->getJson('/api/reference/personnel-types')->assertJsonPath('data.0', 'Teacher');
});

it('backs up after a sign-out when a location is enabled, and signs out quietly when none is', function () {
    Process::fake(function (PendingProcess $process) {
        $file = substr((string) collect((array) $process->command)->first(fn ($a) => str_starts_with((string) $a, '--result-file=')), strlen('--result-file='));
        file_put_contents($file, '-- dump
');

        return Process::result('', '', 0);
    });
    $this->withoutDefer();
    signIn($this->staff);
    $this->postJson('/api/auth/logout')->assertNoContent(); // no location: nothing to run, no error
    expect(DB::table('backup_logs')->count())->toBe(0);

    $this->app['auth']->forgetGuards();
    signIn($this->staff);
    $this->postJson('/api/backups/locations', ['label' => 'USB', 'path' => tempLocation()])->assertCreated();
    $this->postJson('/api/auth/logout')->assertNoContent();
    expect(DB::table('backup_logs')->latest('id')->value('status'))->toBe('ok');
});
