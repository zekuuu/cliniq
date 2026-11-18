<?php

declare(strict_types=1);

namespace App\Modules\UserManagement\Models;

use App\Modules\UserManagement\Database\Factories\UserFactory;
use App\Shared\Auth\ClinicUser;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;

/**
 * A CLINIQ account (Staff or Admin). The password column is `password_hash`; the TOTP secret is
 * encrypted at rest and never serialised (ADR-073).
 *
 * @property int $id
 * @property string $name
 * @property string $username
 * @property string $role
 * @property string $password_hash
 * @property bool $must_change_password
 * @property CarbonImmutable|null $locked_until
 * @property CarbonImmutable|null $deactivated_at
 * @property int $failed_login_count
 * @property string|null $profile_picture
 * @property bool $is_head_nurse
 * @property CarbonImmutable|null $last_login_at
 * @property CarbonImmutable|null $password_changed_at
 * @property string|null $totp_secret
 * @property CarbonImmutable|null $totp_confirmed_at
 * @property int|null $last_totp_step
 */
final class User extends Authenticatable implements ClinicUser
{
    /** @use HasFactory<UserFactory> */
    use HasFactory;

    protected $guarded = ['id'];

    protected $hidden = ['password_hash', 'totp_secret', 'last_totp_step', 'remember_token'];

    protected $rememberTokenName = '';

    public function clinicRole(): string
    {
        return $this->role;
    }

    public function getAuthPassword(): string
    {
        return $this->password_hash;
    }

    protected static function newFactory(): UserFactory
    {
        return UserFactory::new();
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'is_head_nurse' => 'boolean',
            'must_change_password' => 'boolean',
            'password_changed_at' => 'immutable_datetime',
            'locked_until' => 'immutable_datetime',
            'last_login_at' => 'immutable_datetime',
            'deactivated_at' => 'immutable_datetime',
            'totp_secret' => 'encrypted',
            'totp_confirmed_at' => 'immutable_datetime',
        ];
    }
}
