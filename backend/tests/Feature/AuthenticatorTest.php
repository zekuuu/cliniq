<?php

declare(strict_types=1);

use App\Modules\UserManagement\Models\User;
use App\Modules\UserManagement\Services\Totp;
use App\Shared\Support\ConfigurationCheck;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

beforeEach(fn () => $this->travelTo('2026-11-10 09:00:00'));

/** Signs in and sets up the authenticator; returns the secret and the recovery codes. */
function enrol(string $username = 'nurse'): array
{
    asSpa()->postJson('/api/auth/login', ['username' => $username, 'password' => 'password'])->assertOk();
    $secret = asSpa()->postJson('/api/auth/authenticator/setup')->assertOk()->json('data.secret');
    $codes = asSpa()->postJson('/api/auth/authenticator/confirm', ['code' => Totp::codeAt($secret, now()->getTimestamp())])->assertOk()->json('data.recoveryCodes');
    test()->travel(31)->seconds(); // the next code is a new step

    return [$secret, $codes];
}

function code(string $secret): string
{
    return Totp::codeAt($secret, now()->getTimestamp());
}

it('matches the RFC 6238 test vector', function () {
    // RFC 6238 appendix B, SHA-1, T = 59 seconds: 94287082 (8 digits), so 287082 for 6.
    expect(Totp::codeAt('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', 59))->toBe('287082')
        ->and(Totp::matchStep('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', '287082', 89))->toBe(1)
        ->and(Totp::matchStep('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', '287082', 120))->toBeNull();
});

it('sets up an authenticator: secret once, 8 hashed codes, encrypted secret, audited', function () {
    $user = User::factory()->create(['username' => 'nurse']);
    asSpa()->postJson('/api/auth/login', ['username' => 'nurse', 'password' => 'password'])->assertOk();

    asSpa()->postJson('/api/auth/authenticator/confirm', ['code' => '123456'])->assertConflict()->assertJsonPath('rule', 'authenticator_setup');
    $setup = asSpa()->postJson('/api/auth/authenticator/setup')->assertOk()->json('data');
    expect($setup['otpauthUri'])->toStartWith('otpauth://totp/CLINIQ%3Anurse?secret='.$setup['secret']);
    asSpa()->postJson('/api/auth/authenticator/confirm', ['code' => '000000'])->assertUnprocessable();
    $codes = asSpa()->postJson('/api/auth/authenticator/confirm', ['code' => code($setup['secret'])])->assertOk()->json('data.recoveryCodes');

    expect($codes)->toHaveCount(8)->each->toMatch('/^[A-Z2-7]{4}-[A-Z2-7]{4}$/');
    $raw = DB::table('users')->where('id', $user->id)->value('totp_secret');
    expect($raw)->not->toContain($setup['secret'])
        ->and(DB::table('recovery_codes')->pluck('code_hash')->implode(','))->not->toContain(str_replace('-', '', $codes[0]))
        ->and(DB::table('audit_logs')->pluck('summary')->all())->toContain('Set up authenticator')
        ->and(DB::table('audit_logs')->pluck('summary')->implode(' '))->not->toContain($setup['secret']);
    asSpa()->getJson('/api/auth/authenticator')->assertExactJson(['data' => ['enabled' => true, 'recoveryCodesLeft' => 8]]);
});

it('needs proof to replace or turn off, and refuses a code from a used step', function () {
    User::factory()->create(['username' => 'nurse']);
    [$secret, $codes] = enrol();

    asSpa()->postJson('/api/auth/authenticator/setup')->assertUnprocessable();
    $next = asSpa()->postJson('/api/auth/authenticator/setup', ['proof' => code($secret)])->assertOk()->json('data.secret');
    asSpa()->deleteJson('/api/auth/authenticator', ['proof' => code($secret)])->assertUnprocessable(); // same step again
    asSpa()->postJson('/api/auth/authenticator/confirm', ['code' => code($next)])->assertOk();
    expect(DB::table('audit_logs')->pluck('summary')->all())->toContain('Replaced authenticator');

    asSpa()->deleteJson('/api/auth/authenticator', ['proof' => strtolower($codes[0])])->assertUnprocessable(); // old codes were replaced
    $this->travel(31)->seconds();
    asSpa()->deleteJson('/api/auth/authenticator', ['proof' => code($next)])->assertNoContent();
    asSpa()->getJson('/api/auth/authenticator')->assertExactJson(['data' => ['enabled' => false, 'recoveryCodesLeft' => 0]]);
    expect(DB::table('recovery_codes')->count())->toBe(0);
});

it('recovers a password: check, verify with a recovery code once, reset once', function () {
    $user = User::factory()->create(['username' => 'nurse']);
    [, $codes] = enrol();
    $user->forceFill(['must_change_password' => true])->save(); // the Admin reset it meanwhile
    asSpa()->postJson('/api/auth/logout')->assertNoContent();
    $this->app['auth']->forgetGuards();

    asSpa()->postJson('/api/auth/recovery/check', ['username' => ' Nurse '])->assertNoContent();
    $token = asSpa()->postJson('/api/auth/recovery/verify', ['username' => 'nurse', 'code' => strtolower($codes[1])])->assertOk()->json('data.token');
    asSpa()->postJson('/api/auth/recovery/verify', ['username' => 'nurse', 'code' => $codes[1]])->assertUnprocessable(); // spent

    asSpa()->postJson('/api/auth/recovery/reset', ['token' => $token, 'nextPassword' => 'short'])->assertUnprocessable();
    asSpa()->postJson('/api/auth/recovery/reset', ['token' => $token, 'nextPassword' => 'recovered-pass'])->assertNoContent();
    asSpa()->postJson('/api/auth/recovery/reset', ['token' => $token, 'nextPassword' => 'another-pass'])->assertStatus(410);

    expect($user->fresh()->must_change_password)->toBeFalse()
        ->and(DB::table('audit_logs')->pluck('summary')->all())->toContain('Used a recovery code', 'Reset password with authenticator');
    asSpa()->postJson('/api/auth/login', ['username' => 'nurse', 'password' => 'recovered-pass'])->assertOk();
});

it('expires the reset token after 10 minutes', function () {
    User::factory()->create(['username' => 'nurse']);
    [$secret] = enrol();
    $token = asSpa()->postJson('/api/auth/recovery/verify', ['username' => 'nurse', 'code' => code($secret)])->json('data.token');

    $this->travel(11)->minutes();
    asSpa()->postJson('/api/auth/recovery/reset', ['token' => $token, 'nextPassword' => 'recovered-pass'])->assertStatus(410)
        ->assertJsonPath('message', 'This reset has expired. Start again with a new code.');
});

it('says why the check fails, and counts each failure toward the shared lockout', function () {
    User::factory()->create(['username' => 'plain']);
    User::factory()->create(['username' => 'gone', 'deactivated_at' => now()]);

    asSpa()->postJson('/api/auth/recovery/check', ['username' => 'ghost'])->assertUnprocessable()->assertJsonPath('message', 'No account with that username.')->assertJsonPath('attempts_left', 4);
    asSpa()->postJson('/api/auth/recovery/check', ['username' => 'gone'])->assertJsonPath('message', 'This account is disabled. Ask the Administrator.');
    asSpa()->postJson('/api/auth/recovery/check', ['username' => 'plain'])->assertJsonPath('message', 'This account has no authenticator app set up. Ask the Administrator to reset your password.');

    // Sign-in and recovery share one count: 2 wrong passwords, then 3 failed codes lock.
    asSpa()->postJson('/api/auth/login', ['username' => 'plain', 'password' => 'x'])->assertJsonPath('attempts_left', 3);
    asSpa()->postJson('/api/auth/recovery/verify', ['username' => 'plain', 'code' => '123456'])->assertJsonPath('attempts_left', 2)
        ->assertJsonPath('message', 'The code did not work, or the account is not set up for recovery. Ask the Administrator to reset your password.');
    asSpa()->postJson('/api/auth/recovery/verify', ['username' => 'plain', 'code' => '123456'])->assertJsonPath('attempts_left', 1);
    $this->travel(61)->seconds(); // past the per-username limiter
    asSpa()->postJson('/api/auth/recovery/verify', ['username' => 'plain', 'code' => '123456'])->assertStatus(423);
    expect(DB::table('audit_logs')->value('summary'))->toBe('Account locked for 5 minutes after 5 wrong passwords (password recovery)');
});

it('limits recovery attempts per username', function () {
    foreach (range(1, 5) as $i) {
        asSpa()->postJson('/api/auth/recovery/check', ['username' => "ghost{$i}"]);
    }
    foreach (range(1, 5) as $i) {
        asSpa()->postJson('/api/auth/recovery/check', ['username' => 'target'])->assertStatus($i < 5 ? 422 : 423);
    }
    asSpa()->postJson('/api/auth/recovery/check', ['username' => 'target'])->assertStatus(429);
});

it('reads and edits only the own profile, audited by field name', function () {
    User::factory()->create(['username' => 'nurse', 'name' => 'Old Name']);
    asSpa()->postJson('/api/auth/login', ['username' => 'nurse', 'password' => 'password'])->assertOk();

    asSpa()->getJson('/api/auth/profile')->assertExactJson(['data' => ['name' => 'Old Name', 'username' => 'nurse', 'role' => 'staff', 'profilePicture' => null, 'lastLogin' => '2026-11-10T09:00:00+08:00']]);
    asSpa()->putJson('/api/auth/profile', ['name' => '   ', 'profilePicture' => null])->assertUnprocessable()->assertJsonPath('message', 'Enter your full name.');
    asSpa()->putJson('/api/auth/profile', ['name' => str_repeat('a', 121), 'profilePicture' => null])->assertJsonPath('message', 'Keep your name to 120 characters or fewer.');
    asSpa()->putJson('/api/auth/profile', ['name' => 'Ok', 'profilePicture' => 'data:image/svg+xml;base64,PHN2Zz4='])->assertJsonPath('message', 'Choose a JPEG, PNG, or WebP image.');
    asSpa()->putJson('/api/auth/profile', ['name' => '  New   Name ', 'profilePicture' => 'data:image/png;base64,iVBORw0KGgo=', 'role' => 'admin', 'username' => 'x'])
        ->assertOk()->assertJsonPath('data.name', 'New Name')->assertJsonPath('data.role', 'staff')->assertJsonPath('data.username', 'nurse');

    $summaries = DB::table('audit_logs')->pluck('summary')->all();
    expect($summaries)->toContain('Changed own name', 'Changed own profile picture')
        ->and(implode(' ', array_filter($summaries)))->not->toContain('New Name');
});

it('refuses to start on a mismatched secure cookie, debug outside local, or root', function () {
    expect(ConfigurationCheck::problems('local', 'http://localhost', false, true, 'root'))->toBe([])
        ->and(ConfigurationCheck::problems('production', 'http://localhost', false, false, 'cliniq_app'))->toBe([])
        ->and(ConfigurationCheck::problems('production', 'https://clinic.local', true, false, 'cliniq_app'))->toBe([])
        ->and(ConfigurationCheck::problems('local', 'http://localhost', true, false, 'cliniq_app'))->toHaveCount(1)
        ->and(ConfigurationCheck::problems('local', 'https://clinic.local', false, false, 'cliniq_app'))->toHaveCount(1)
        ->and(ConfigurationCheck::problems('production', 'http://localhost', false, true, 'ROOT'))->toHaveCount(2);
});
