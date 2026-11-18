<?php

declare(strict_types=1);

namespace App\Shared\Auth;

/** What middleware needs from a signed-in user. The users table implements it in B1. */
interface ClinicUser
{
    public const ADMIN = 'admin';

    public const STAFF = 'staff';

    public function clinicRole(): string;
}
