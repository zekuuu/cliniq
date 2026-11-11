<?php

declare(strict_types=1);

namespace App\Modules\UserManagement\Services;

use App\Modules\UserManagement\Models\User;
use App\Shared\AuditLog\AuditAction;
use App\Shared\Http\ApiError;
use App\Shared\Http\BusinessRuleViolation;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Session\Session;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Password recovery with an authenticator app (ADR-073, username-first amendment). The secret is
 * encrypted at rest; recovery codes are slow-hashed and single-use; a code from an already accepted
 * step is refused. No code, secret or password ever reaches a log or an audit entry.
 */
final class AuthenticatorService
{
    public const PENDING = 'cliniq.pending_totp_secret';

    public const FAILED = 'The code did not work, or the account is not set up for recovery. Ask the Administrator to reset your password.';

    private const PROOF_FAILED = 'That code did not work. Enter the 6-digit code from the app, or a recovery code.';

    private const TOKEN_MINUTES = 10;

    public function __construct(private readonly AuthService $auth, private readonly LoginLockout $lockout) {}

    /** @return array{enabled: bool, recoveryCodesLeft: int} */
    public function status(User $user): array
    {
        $enabled = $user->totp_confirmed_at !== null;

        return ['enabled' => $enabled, 'recoveryCodesLeft' => $enabled ? $this->unusedCodes($user)->count() : 0];
    }

    /** @return array{secret: string, otpauthUri: string} */
    public function startSetup(User $user, ?string $proof, Session $session): array
    {
        if ($user->totp_confirmed_at !== null && ($proof === null || ! $this->prove($user, $proof))) {
            throw ValidationException::withMessages(['proof' => self::PROOF_FAILED]);
        }
        $secret = Totp::secret();
        $session->put(self::PENDING, $secret);

        return ['secret' => $secret, 'otpauthUri' => Totp::uri($user->username, $secret)];
    }

    /** @return array{recoveryCodes: list<string>} */
    public function confirm(User $user, string $code, Session $session): array
    {
        $secret = $session->get(self::PENDING);
        if (! is_string($secret)) {
            throw new BusinessRuleViolation('authenticator_setup', 'Start the setup again.');
        }
        $step = Totp::matchStep($secret, $code, CarbonImmutable::now()->getTimestamp());
        if ($step === null) {
            throw ValidationException::withMessages(['code' => "That code did not work. If codes do not work, check that the phone's date and time are set automatically."]);
        }
        $codes = Totp::recoveryCodes();
        $replacing = $user->totp_confirmed_at !== null;

        DB::transaction(function () use ($user, $secret, $step, $codes, $replacing): void {
            DB::table('recovery_codes')->where('user_id', $user->id)->delete();
            $now = CarbonImmutable::now();
            DB::table('recovery_codes')->insert(array_map(fn (string $c): array => [
                'user_id' => $user->id, 'code_hash' => Hash::make(Totp::normalizeRecoveryCode($c)), 'created_at' => $now,
            ], $codes));
            $user->forceFill(['totp_secret' => $secret, 'totp_confirmed_at' => $now, 'last_totp_step' => $step])->save();
            $this->auth->record($user, AuditAction::Update, $replacing ? 'Replaced authenticator' : 'Set up authenticator');
        });
        $session->forget(self::PENDING);

        return ['recoveryCodes' => $codes];
    }

    public function turnOff(User $user, string $proof): void
    {
        if (! $this->prove($user, $proof)) {
            throw ValidationException::withMessages(['proof' => self::PROOF_FAILED]);
        }
        DB::transaction(function () use ($user): void {
            DB::table('recovery_codes')->where('user_id', $user->id)->delete();
            $user->forceFill(['totp_secret' => null, 'totp_confirmed_at' => null, 'last_totp_step' => null])->save();
            $this->auth->record($user, AuditAction::Update, 'Turned off authenticator');
        });
    }

    /** Recovery step 1: says which of the three it is not; each failure counts toward the lockout. */
    public function checkAccount(string $username): void
    {
        $name = LoginLockout::normalize($username);
        $user = User::query()->where('username', $name)->first();
        $this->lockout->ensureNotLocked($name, $user);
        $message = match (true) {
            $user === null => 'No account with that username.',
            $user->deactivated_at !== null => 'This account is disabled. Ask the Administrator.',
            $user->totp_confirmed_at === null => 'This account has no authenticator app set up. Ask the Administrator to reset your password.',
            default => null,
        };
        if ($message !== null) {
            throw ApiError::recoveryFailed('username', $message, $this->lockout->fail($name, $user, 'password recovery'));
        }
    }

    /** Recovery step 2: a good code clears the lockout and returns a one-time, 10-minute token. */
    public function verify(string $username, string $code): string
    {
        $name = LoginLockout::normalize($username);
        $user = User::query()->where('username', $name)->first();
        $this->lockout->ensureNotLocked($name, $user);
        if ($user === null || $user->deactivated_at !== null || ! $this->prove($user, $code)) {
            throw ApiError::recoveryFailed('code', self::FAILED, $this->lockout->fail($name, $user, 'password recovery'));
        }
        $this->lockout->clear($name, $user);
        $token = Str::random(48);
        Cache::put(self::tokenKey($token), $user->id, now()->addMinutes(self::TOKEN_MINUTES));

        return $token;
    }

    /** Recovery step 3: the Change Password rules; clears a forced change. The token is spent on success. */
    public function reset(string $token, string $nextPassword): void
    {
        $id = Cache::get(self::tokenKey($token));
        $user = is_int($id) ? User::query()->find($id) : null;
        if ($user === null || $user->deactivated_at !== null) {
            throw new ApiError(410, 'bad_request', 'This reset has expired. Start again with a new code.');
        }
        $this->auth->setPassword($user, $nextPassword, 'Reset password with authenticator');
        Cache::forget(self::tokenKey($token));
    }

    /** The current code (a step not used before) or an unused recovery code, which is spent and audited. */
    private function prove(User $user, string $proof): bool
    {
        $secret = $user->totp_secret;
        if ($secret === null || $user->totp_confirmed_at === null) {
            return false;
        }
        $step = Totp::matchStep($secret, $proof, CarbonImmutable::now()->getTimestamp());
        if ($step !== null) {
            if ($user->last_totp_step !== null && $step <= $user->last_totp_step) {
                return false;
            }
            $user->forceFill(['last_totp_step' => $step])->save();

            return true;
        }
        $typed = Totp::normalizeRecoveryCode($proof);
        if (strlen($typed) !== 8) {
            return false;
        }
        foreach ($this->unusedCodes($user) as $row) {
            if (Hash::check($typed, $row->code_hash)) {
                DB::transaction(function () use ($user, $row): void {
                    DB::table('recovery_codes')->where('id', $row->id)->update(['used_at' => CarbonImmutable::now()]);
                    $this->auth->record($user, AuditAction::Update, 'Used a recovery code');
                });

                return true;
            }
        }

        return false;
    }

    /** @return Collection<int, object{id: int, code_hash: string}> */
    private function unusedCodes(User $user): Collection
    {
        /** @var Collection<int, object{id: int, code_hash: string}> */
        return DB::table('recovery_codes')->where('user_id', $user->id)->whereNull('used_at')->get(['id', 'code_hash']);
    }

    private static function tokenKey(string $token): string
    {
        return 'cliniq.recovery_token.'.hash('sha256', $token);
    }
}
