<?php

declare(strict_types=1);

namespace App\Shared\Http;

use RuntimeException;

/** A failure with its own status and code in the error table of API-Contract.md. */
final class ApiError extends RuntimeException
{
    /** @param array<string, string> $extra */
    public function __construct(
        public readonly int $status,
        public readonly string $errorCode,
        string $message,
        public readonly array $extra = [],
    ) {
        parent::__construct($message);
    }

    public static function sessionIdle(): self
    {
        return new self(401, 'session_idle', 'You were signed out after '.config()->integer('cliniq.admin_idle_minutes').' minutes of inactivity.');
    }

    public static function invalidCredentials(): self
    {
        return new self(401, 'invalid_credentials', 'Unable to sign in with those credentials.');
    }

    public static function passwordChangeRequired(): self
    {
        return new self(403, 'password_change_required', 'Change your password to continue.');
    }

    public static function accountLocked(string $lockedUntil): self
    {
        return new self(423, 'account_locked', 'This account is temporarily locked after repeated failed attempts.', ['locked_until' => $lockedUntil]);
    }
}
