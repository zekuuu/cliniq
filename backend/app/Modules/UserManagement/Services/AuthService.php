<?php

declare(strict_types=1);

namespace App\Modules\UserManagement\Services;

use App\Modules\UserManagement\Models\User;
use App\Shared\AuditLog\AuditAction;
use App\Shared\AuditLog\AuditEvent;
use App\Shared\AuditLog\AuditLogger;
use App\Shared\AuditLog\AuditTarget;
use App\Shared\Http\ApiError;
use App\Shared\Http\BusinessRuleViolation;
use App\Shared\Settings\SettingsService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/** Sign-in and password changes (`authenticateMockUser`, `changeMockPassword`, `changeOwnPassword`). */
final class AuthService
{
    public function __construct(
        private readonly LoginLockout $lockout,
        private readonly AuditLogger $audit,
        private readonly SettingsService $settings,
    ) {}

    /** A disabled account counts as a failure and answers like a wrong password. */
    public function attempt(string $username, string $password): User
    {
        $name = LoginLockout::normalize($username);
        $user = User::query()->where('username', $name)->first();
        $this->lockout->ensureNotLocked($name, $user);

        if ($user === null || $user->deactivated_at !== null || ! Hash::check($password, $user->password_hash)) {
            throw ApiError::invalidCredentials($this->lockout->fail($name, $user, 'sign-in'));
        }

        DB::transaction(function () use ($user): void {
            $user->forceFill(['failed_login_count' => 0, 'locked_until' => null, 'last_login_at' => CarbonImmutable::now()])->save();
            $this->record($user, AuditAction::Login, null);
        });

        return $user;
    }

    /** `currentPassword` is required unless a change is forced (Q14). */
    public function changeOwnPassword(User $user, ?string $currentPassword, string $nextPassword): void
    {
        if (! $user->must_change_password || $currentPassword !== null) {
            if ($currentPassword === null || ! Hash::check($currentPassword, $user->password_hash)) {
                throw ValidationException::withMessages(['currentPassword' => 'Your current password is incorrect.']);
            }
        }
        $this->setPassword($user, $nextPassword, 'Changed password');
    }

    /** Trimmed, at least 8 characters, not one of the last 5; the history keeps at most 5. */
    public function setPassword(User $user, string $nextPassword, string $summary): void
    {
        $next = trim($nextPassword);
        if (mb_strlen($next) < $this->settings->int('password_min_length')) {
            throw ValidationException::withMessages(['nextPassword' => 'Password must be at least 8 characters.']);
        }
        $keep = $this->settings->int('password_history_count');
        $recent = DB::table('password_histories')->where('user_id', $user->id)
            ->orderByDesc('created_at')->orderByDesc('id')->limit($keep)->pluck('password_hash')->all();
        foreach ([$user->password_hash, ...$recent] as $hash) {
            if (is_string($hash) && Hash::check($next, $hash)) {
                throw new BusinessRuleViolation('password_reuse', 'Choose a password that was not used recently.');
            }
        }

        DB::transaction(function () use ($user, $next, $keep, $summary): void {
            $hash = Hash::make($next);
            DB::table('password_histories')->insert(['user_id' => $user->id, 'password_hash' => $hash, 'created_at' => CarbonImmutable::now()]);
            $old = DB::table('password_histories')->where('user_id', $user->id)
                ->orderByDesc('created_at')->orderByDesc('id')->skip($keep)->take(PHP_INT_MAX)->pluck('id');
            DB::table('password_histories')->whereIn('id', $old)->delete();
            $user->forceFill(['password_hash' => $hash, 'must_change_password' => false, 'password_changed_at' => CarbonImmutable::now()])->save();
            $this->record($user, AuditAction::Update, $summary);
        });
    }

    public function record(User $user, AuditAction $action, ?string $summary): void
    {
        $this->audit->record(new AuditEvent(
            actorId: (string) $user->id,
            actorRole: $user->role,
            action: $action,
            targetType: AuditTarget::User,
            targetId: (string) $user->id,
            targetLabel: null,
            at: CarbonImmutable::now(),
            summary: $summary,
        ));
    }
}
