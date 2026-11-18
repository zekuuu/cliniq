<?php

declare(strict_types=1);

namespace App\Modules\UserManagement\Services;

use App\Modules\UserManagement\Models\User;
use App\Shared\AuditLog\AuditAction;
use App\Shared\AuditLog\AuditEvent;
use App\Shared\AuditLog\AuditLogger;
use App\Shared\AuditLog\AuditTarget;
use App\Shared\Http\ApiError;
use App\Shared\Settings\SettingsService;
use App\Shared\Support\ClinicTime;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Cache;

/**
 * One lockout shared by sign-in and password recovery (ADR-015, ADR-073): 5 failures in a row lock
 * the name for 5 minutes. A real account keeps its count in `users`; an unknown name is counted in
 * the cache by its normalized form, so both answer alike (API-Contract Q6).
 */
final class LoginLockout
{
    public function __construct(private readonly AuditLogger $audit, private readonly SettingsService $settings) {}

    public static function normalize(string $username): string
    {
        return mb_strtolower(trim($username));
    }

    /** Refuses a locked name; an expired lock clears first. */
    public function ensureNotLocked(string $name, ?User $user): void
    {
        $until = $user !== null ? $user->locked_until : $this->cached($name)['until'];
        if ($until === null) {
            return;
        }
        if ($until->isFuture()) {
            throw ApiError::accountLocked(ClinicTime::iso($until));
        }
        $this->clear($name, $user);
    }

    /**
     * Counts one failure. Returns the attempts left, or locks (and audits a real account) on the last
     * one and throws 423. `$where` is "sign-in" or "password recovery".
     */
    public function fail(string $name, ?User $user, string $where): int
    {
        $max = $this->settings->int('lockout_max_attempts');
        $minutes = $this->settings->int('lockout_minutes');
        $state = $user !== null ? ['count' => $user->failed_login_count, 'until' => null] : $this->cached($name);
        $count = $state['count'] + 1;

        if ($count < $max) {
            $this->store($name, $user, $count, null);

            return $max - $count;
        }

        $until = CarbonImmutable::now()->addMinutes($minutes);
        $this->store($name, $user, 0, $until);
        if ($user !== null) {
            $this->audit->record(new AuditEvent(
                actorId: (string) $user->id,
                actorRole: $user->role,
                action: AuditAction::Login,
                targetType: AuditTarget::User,
                targetId: (string) $user->id,
                targetLabel: null,
                at: CarbonImmutable::now(),
                summary: "Account locked for {$minutes} minutes after {$max} wrong passwords ({$where})",
            ));
        }

        throw ApiError::accountLocked(ClinicTime::iso($until));
    }

    public function clear(string $name, ?User $user): void
    {
        $this->store($name, $user, 0, null);
    }

    private function store(string $name, ?User $user, int $count, ?CarbonImmutable $until): void
    {
        if ($user !== null) {
            $user->forceFill(['failed_login_count' => $count, 'locked_until' => $until])->save();

            return;
        }
        Cache::put($this->key($name), ['count' => $count, 'until' => $until?->getTimestamp()], now()->addHour());
    }

    /** @return array{count: int, until: CarbonImmutable|null} */
    private function cached(string $name): array
    {
        $raw = Cache::get($this->key($name));
        $count = is_array($raw) && is_int($raw['count'] ?? null) ? $raw['count'] : 0;
        $until = is_array($raw) && is_int($raw['until'] ?? null) ? CarbonImmutable::createFromTimestamp($raw['until']) : null;

        return ['count' => $count, 'until' => $until];
    }

    private function key(string $name): string
    {
        return 'cliniq.lockout.'.hash('sha256', $name);
    }
}
