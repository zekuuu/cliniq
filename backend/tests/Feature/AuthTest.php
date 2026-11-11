<?php

declare(strict_types=1);

use App\Modules\UserManagement\Models\User;
use App\Shared\Settings\SettingsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\TestResponse;

uses(RefreshDatabase::class);

beforeEach(fn () => $this->travelTo('2026-11-10 09:00:00'));

function login(string $username, string $password = 'password'): TestResponse
{
    return asSpa()->postJson('/api/auth/login', ['username' => $username, 'password' => $password]);
}

/** @return list<string|null> */
function auditSummaries(): array
{
    return DB::table('audit_logs')->orderBy('id')->pluck('summary')->all();
}

it('signs in, sets the last sign-in time and audits it, never returning a password', function () {
    $user = User::factory()->create(['username' => 'nurse']);

    $response = login('  NURSE ')->assertOk();

    $response->assertExactJson(['data' => ['user' => ['id' => (string) $user->id, 'name' => $user->name, 'role' => 'staff'], 'mustChangePassword' => false]]);
    expect($user->fresh()->last_login_at?->toDateTimeString())->toBe('2026-11-10 09:00:00')
        ->and(DB::table('audit_logs')->where('action_type', 'login')->count())->toBe(1);
    asSpa()->getJson('/api/auth/me')->assertOk()->assertJsonPath('data.idleSignoutMinutes', 60)->assertJsonPath('data.idleSecondsLeft', 3600);
});

it('counts wrong passwords down, then locks for 5 minutes and audits the lock', function () {
    User::factory()->create(['username' => 'nurse']);

    foreach ([4, 3, 2, 1] as $left) {
        login('nurse', 'wrong')->assertUnauthorized()->assertJsonPath('code', 'invalid_credentials')->assertJsonPath('attempts_left', $left);
    }
    expect(DB::table('audit_logs')->count())->toBe(0);

    login('nurse', 'wrong')->assertStatus(423)->assertJsonPath('code', 'account_locked')->assertJsonPath('locked_until', '2026-11-10T09:05:00+08:00');
    expect(auditSummaries())->toBe(['Account locked for 5 minutes after 5 wrong passwords (sign-in)']);

    login('nurse')->assertStatus(423);
    $this->travel(5)->minutes();
    login('nurse')->assertOk();
});

it('locks an unknown username the same way, with no audit entry (Q6)', function () {
    foreach ([4, 3, 2, 1] as $left) {
        login('ghost', 'x')->assertJsonPath('attempts_left', $left);
    }
    login('ghost', 'x')->assertStatus(423);
    expect(DB::table('audit_logs')->count())->toBe(0);
});

it('refuses a disabled account like a wrong password', function () {
    User::factory()->create(['username' => 'gone', 'deactivated_at' => now()]);

    login('gone')->assertUnauthorized()->assertJsonPath('code', 'invalid_credentials')->assertJsonPath('attempts_left', 4);
});

it('ends the session of an account disabled after sign-in', function () {
    $user = User::factory()->create(['username' => 'nurse']);
    login('nurse')->assertOk();
    $user->forceFill(['deactivated_at' => now()])->save();
    $this->app['auth']->forgetGuards(); // a real request re-reads the account; the test client keeps it in memory

    asSpa()->getJson('/api/auth/me')->assertUnauthorized()->assertJsonPath('code', 'unauthenticated');
});

it('allows only me, the password change and sign-out during a forced change', function () {
    User::factory()->create(['username' => 'fresh', 'must_change_password' => true]);
    login('fresh')->assertOk()->assertJsonPath('data.mustChangePassword', true);

    asSpa()->getJson('/api/settings/idle-signout')->assertForbidden()->assertJsonPath('code', 'password_change_required');
    asSpa()->getJson('/api/auth/me')->assertOk();
    asSpa()->postJson('/api/auth/password', ['nextPassword' => 'brand-new-pass'])->assertNoContent();
    asSpa()->getJson('/api/settings/idle-signout')->assertOk();
});

it('changes the password by the rules and audits it', function () {
    $user = User::factory()->create(['username' => 'nurse']);
    login('nurse')->assertOk();

    asSpa()->postJson('/api/auth/password', ['nextPassword' => 'new-password-1'])->assertUnprocessable()->assertJsonPath('message', 'Your current password is incorrect.');
    asSpa()->postJson('/api/auth/password', ['currentPassword' => 'nope', 'nextPassword' => 'new-password-1'])->assertUnprocessable();
    asSpa()->postJson('/api/auth/password', ['currentPassword' => 'password', 'nextPassword' => ' short '])->assertUnprocessable()->assertJsonPath('message', 'Password must be at least 8 characters.');
    asSpa()->postJson('/api/auth/password', ['currentPassword' => 'password', 'nextPassword' => 'password'])->assertConflict()->assertJsonPath('rule', 'password_reuse');

    $current = 'password';
    foreach (range(1, 6) as $i) {
        asSpa()->postJson('/api/auth/password', ['currentPassword' => $current, 'nextPassword' => "  new-password-{$i} "])->assertNoContent();
        $current = "new-password-{$i}";
    }
    // The last 5 cannot be reused; the sixth-newest can, and the history keeps at most 5.
    asSpa()->postJson('/api/auth/password', ['currentPassword' => $current, 'nextPassword' => 'new-password-2'])->assertConflict();
    expect(DB::table('password_histories')->where('user_id', $user->id)->count())->toBe(5);
    asSpa()->postJson('/api/auth/password', ['currentPassword' => $current, 'nextPassword' => 'new-password-1'])->assertNoContent();
    expect(collect(auditSummaries())->filter(fn ($s) => $s === 'Changed password')->count())->toBe(7);
});

it('signs out with an optional idle reason and audits it', function () {
    User::factory()->create(['username' => 'nurse']);
    login('nurse')->assertOk();

    asSpa()->postJson('/api/auth/logout', ['reason' => 'something else'])->assertUnprocessable();
    asSpa()->postJson('/api/auth/logout', ['reason' => 'Signed out (idle)'])->assertNoContent();
    $this->app['auth']->forgetGuards();
    expect(DB::table('audit_logs')->where('action_type', 'logout')->value('target_label'))->toBe('Signed out (idle)');
    asSpa()->getJson('/api/auth/me')->assertUnauthorized();
});

it('lets Staff save the idle sign-out minutes, audited by field name, and the Admin only read', function () {
    User::factory()->admin()->create(['username' => 'principal']);
    User::factory()->create(['username' => 'nurse']);

    login('principal')->assertOk();
    asSpa()->getJson('/api/settings/idle-signout')->assertExactJson(['data' => ['idleSignoutMinutesStaff' => 60, 'idleSignoutMinutesAdmin' => 30]]);
    asSpa()->putJson('/api/settings/idle-signout', ['idleSignoutMinutesStaff' => 90, 'idleSignoutMinutesAdmin' => 30])
        ->assertForbidden()->assertJsonPath('message', 'Only the clinic staff can change the sign-out times.');
    asSpa()->postJson('/api/auth/logout')->assertNoContent();
    $this->app['auth']->forgetGuards();

    login('nurse')->assertOk();
    foreach ([9, 241, 12.5, 'x'] as $bad) {
        asSpa()->putJson('/api/settings/idle-signout', ['idleSignoutMinutesStaff' => $bad, 'idleSignoutMinutesAdmin' => 30])
            ->assertUnprocessable()->assertJsonPath('message', 'Enter whole minutes from 10 to 240.');
    }
    asSpa()->getJson('/api/settings/idle-signout')->assertOk(); // warms the cache
    asSpa()->putJson('/api/settings/idle-signout', ['idleSignoutMinutesStaff' => 90, 'idleSignoutMinutesAdmin' => 30])
        ->assertOk()->assertJsonPath('data.idleSignoutMinutesStaff', 90);

    expect(app(SettingsService::class)->int('idle_signout_minutes_staff'))->toBe(90)
        ->and(DB::table('audit_logs')->where('target_label', 'settings/idle-signout')->value('summary'))->toBe('Updated Staff idle sign-out minutes');
});
