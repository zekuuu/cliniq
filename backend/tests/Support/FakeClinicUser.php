<?php

declare(strict_types=1);

namespace Tests\Support;

use App\Shared\Auth\ClinicUser;
use Illuminate\Auth\GenericUser;

/** Stands in for the users table until B1 (ADR-056). */
final class FakeClinicUser extends GenericUser implements ClinicUser
{
    public static function staff(): self
    {
        return new self(['id' => 1, 'role' => 'staff', 'remember_token' => null]);
    }

    public static function admin(): self
    {
        return new self(['id' => 2, 'role' => 'admin', 'remember_token' => null]);
    }

    public function clinicRole(): string
    {
        $role = $this->attributes['role'];
        assert(is_string($role));

        return $role;
    }
}
