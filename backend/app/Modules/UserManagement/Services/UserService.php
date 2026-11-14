<?php

declare(strict_types=1);

namespace App\Modules\UserManagement\Services;

use App\Modules\UserManagement\Models\User;
use App\Shared\AuditLog\AuditAction;
use App\Shared\AuditLog\AuditEvent;
use App\Shared\AuditLog\AuditLogger;
use App\Shared\AuditLog\AuditTarget;
use App\Shared\AuditLog\DatabaseAuditLogger;
use App\Shared\Http\BusinessRuleViolation;
use App\Shared\Support\ClinicTime;
use App\Shared\Support\Row;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * User Management (Module 1, ADR-033): only the Admin manages accounts. The last active Admin can
 * never be disabled or demoted. A new or reset account must change its password at first sign-in.
 * Never a password hash, a lock count or a token in a response.
 */
final class UserService
{
    public function __construct(private readonly AuditLogger $audit) {}

    /**
     * @return list<array<string, mixed>> by name; Staff get only `id`, `name` and `role`
     */
    public function list(bool $admin): array
    {
        return array_values(User::query()->orderBy('name')->orderBy('id')->get()->map(fn (User $u): array => self::shape($u, $admin))->all());
    }

    /** @return array<string, mixed> */
    public function find(int $id, bool $admin): array
    {
        return self::shape($this->user($id), $admin);
    }

    /** The first active Admin, for a signature line. */
    public function principalName(): ?string
    {
        return Row::str((object) ['n' => DB::table('users')->where('role', 'admin')->whereNull('deactivated_at')->orderBy('id')->value('name')], 'n');
    }

    /**
     * @param  array<string, mixed>  $in
     * @return array<string, mixed>
     */
    public function save(array $in, ?int $id, int $actorId): array
    {
        $existing = $id === null ? null : $this->user($id);
        $name = trim((string) preg_replace('/\s+/u', ' ', Row::text($in['name'] ?? '')));
        $username = trim(Row::text($in['username'] ?? ''));
        $role = Row::text($in['role'] ?? '');
        $errors = [];
        if ($name === '' || mb_strlen($name) > 120) {
            $errors['name'] = 'Enter the full name (at most 120 characters).';
        }
        if (mb_strlen($username) < 3 || mb_strlen($username) > 50 || preg_match('/\s/u', $username) === 1) {
            $errors['username'] = 'Enter a username of 3 to 50 characters, without spaces.';
        }
        if (! in_array($role, ['staff', 'admin'], true)) {
            $errors['role'] = 'Choose Staff or Admin/Principal.';
        }
        $picture = $in['profilePicture'] ?? null;
        $picture = is_string($picture) && $picture !== '' ? $picture : null;
        if ($picture !== null && preg_match('#\Adata:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+\z#', $picture) !== 1) {
            $errors['profilePicture'] = 'Choose a JPEG, PNG, or WebP image.';
        }
        $temporary = trim(Row::text($in['temporaryPassword'] ?? ''));
        if ($existing === null && mb_strlen($temporary) < 8) {
            $errors['temporaryPassword'] = 'Password must be at least 8 characters.';
        }
        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }
        // Sign-in compares usernames ignoring case, so a second account with the same one could never sign in.
        if (DB::table('users')->whereRaw('LOWER(username) = ?', [mb_strtolower($username)])->when($id !== null, fn ($q) => $q->where('id', '!=', $id))->exists()) {
            throw new BusinessRuleViolation('duplicate_username', 'Another account already uses this username.');
        }
        if ($existing !== null && $role !== 'admin' && $this->isLastActiveAdmin($existing)) {
            throw self::lastAdmin();
        }

        $savedId = DB::transaction(function () use ($existing, $name, $username, $role, $picture, $temporary, $actorId): int {
            $now = CarbonImmutable::now();
            $row = ['name' => $name, 'username' => $username, 'role' => $role, 'profile_picture' => $picture];
            if ($existing === null) {
                $id = DB::table('users')->insertGetId($row + ['password_hash' => Hash::make($temporary), 'must_change_password' => 1]);
                $this->log($actorId, AuditAction::Create, $id, null, $now);

                return $id;
            }
            $before = self::shape($existing, true);
            DB::table('users')->where('id', $existing->id)->update($row);
            $after = self::shape($this->user($existing->id), true);
            $changed = array_values(array_filter(['name', 'username', 'role', 'profilePicture'], fn (string $f): bool => $before[$f] !== $after[$f]));
            $this->log($actorId, AuditAction::Update, $existing->id, DatabaseAuditLogger::changedSummary($changed), $now);

            return $existing->id;
        });

        return self::shape($this->user($savedId), true);
    }

    /**
     * Disabled accounts stay listed; the account check ends their sessions (ADR-048). Nothing is
     * written when nothing changes.
     *
     * @return array<string, mixed>
     */
    public function setActive(int $id, bool $active, int $actorId): array
    {
        $user = $this->user($id);
        if (! $active && $this->isLastActiveAdmin($user)) {
            throw self::lastAdmin();
        }
        if ($active === ($user->deactivated_at === null)) {
            return self::shape($user, true);
        }
        DB::transaction(function () use ($user, $active, $actorId): void {
            $now = CarbonImmutable::now();
            DB::table('users')->where('id', $user->id)->update(['deactivated_at' => $active ? null : $now]);
            $this->log($actorId, AuditAction::Update, $user->id, $active ? 'Enabled account' : 'Disabled account', $now);
        });

        return self::shape($this->user($id), true);
    }

    /** A temporary password that must be changed at the next sign-in; clears the history and the lock. */
    public function resetPassword(int $id, string $temporary, int $actorId): void
    {
        $user = $this->user($id);
        $temporary = trim($temporary);
        if (mb_strlen($temporary) < 8) {
            throw ValidationException::withMessages(['temporaryPassword' => 'Password must be at least 8 characters.']);
        }
        DB::transaction(function () use ($user, $temporary, $actorId): void {
            DB::table('users')->where('id', $user->id)->update(['password_hash' => Hash::make($temporary), 'must_change_password' => 1, 'failed_login_count' => 0, 'locked_until' => null]);
            DB::table('password_histories')->where('user_id', $user->id)->delete();
            $this->log($actorId, AuditAction::Update, $user->id, 'Reset password', CarbonImmutable::now());
        });
    }

    /**
     * The first Admin, from the console (`cliniq:create-admin`). Returns the generated one-time
     * password, which is shown once and never stored in plain text or logged.
     */
    public function createFirstAdmin(string $name, string $username): string
    {
        $password = self::generatePassword();
        $this->save(['name' => $name, 'username' => $username, 'role' => 'admin', 'temporaryPassword' => $password], null, 0);

        return $password;
    }

    /**
     * The offline break-glass for an Administrator (Environment-Setup.md, ADR-073): a temporary password
     * that must be changed at the next sign-in; clears the lock; audited by action only.
     */
    public function breakGlass(string $username, string $temporary): void
    {
        $user = User::query()->whereRaw('LOWER(username) = ?', [mb_strtolower(trim($username))])->where('role', 'admin')->first();
        if ($user === null) {
            throw ValidationException::withMessages(['username' => 'No Administrator account has that username.']);
        }
        $temporary = trim($temporary);
        if (mb_strlen($temporary) < 8) {
            throw ValidationException::withMessages(['temporaryPassword' => 'Password must be at least 8 characters.']);
        }
        DB::transaction(function () use ($user, $temporary): void {
            DB::table('users')->where('id', $user->id)->update(['password_hash' => Hash::make($temporary), 'must_change_password' => 1, 'failed_login_count' => 0, 'locked_until' => null]);
            $this->audit->record(new AuditEvent(
                actorId: null, actorRole: null, action: AuditAction::Update, targetType: AuditTarget::User, targetId: (string) $user->id,
                targetLabel: null, at: CarbonImmutable::now(), summary: 'Reset password with the break-glass command',
            ));
        });
    }

    /** 16 characters from an unambiguous alphabet. */
    public static function generatePassword(): string
    {
        $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
        $out = '';
        for ($i = 0; $i < 16; $i++) {
            $out .= $alphabet[random_int(0, strlen($alphabet) - 1)];
        }

        return $out;
    }

    private function isLastActiveAdmin(User $user): bool
    {
        return $user->role === 'admin' && $user->deactivated_at === null
            && ! DB::table('users')->where('id', '!=', $user->id)->where('role', 'admin')->whereNull('deactivated_at')->exists();
    }

    private function user(int $id): User
    {
        $user = User::query()->find($id);
        abort_if($user === null, 404);

        return $user;
    }

    /** @return array<string, mixed> `User`, or `{ id, name, role }` for Staff */
    private static function shape(User $u, bool $admin): array
    {
        $base = ['id' => (string) $u->id, 'name' => $u->name, 'role' => $u->role];
        if (! $admin) {
            return $base;
        }

        return $base + [
            'username' => $u->username, 'profilePicture' => $u->profile_picture,
            'lastLogin' => $u->last_login_at === null ? null : ClinicTime::iso($u->last_login_at),
            'deactivatedAt' => $u->deactivated_at === null ? null : ClinicTime::iso($u->deactivated_at),
        ];
    }

    private static function lastAdmin(): BusinessRuleViolation
    {
        return new BusinessRuleViolation('last_admin', 'This is the only active Admin/Principal account. Add or enable another Admin first.');
    }

    /** `$actorId` 0 is the console (the first Admin), which has no account to name. */
    private function log(int $actorId, AuditAction $action, int $id, ?string $summary, CarbonImmutable $now): void
    {
        $this->audit->record(new AuditEvent(
            actorId: $actorId === 0 ? null : (string) $actorId, actorRole: $actorId === 0 ? null : 'admin', action: $action,
            targetType: AuditTarget::User, targetId: (string) $id, targetLabel: null, at: $now, summary: $actorId === 0 ? 'Created from the console' : $summary,
        ));
    }
}
