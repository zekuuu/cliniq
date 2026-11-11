<?php

declare(strict_types=1);

namespace App\Shared\Http;

use RuntimeException;

/** A failure with its own status and code in the error table of API-Contract.md. */
final class ApiError extends RuntimeException
{
    /** @param array<string, string|int> $extra */
    public function __construct(
        public readonly int $status,
        public readonly string $errorCode,
        string $message,
        public readonly array $extra = [],
    ) {
        parent::__construct($message);
    }

    /** `$minutes` is the limit that ran out, as Login words it (ADR-078). */
    public static function sessionIdle(int $minutes): self
    {
        return new self(401, 'session_idle', "You were signed out after {$minutes} minutes of inactivity. Sign in again.");
    }

    /** The fixed 7 days from sign-in have passed (ADR-057). */
    public static function sessionExpired(): self
    {
        return new self(401, 'session_expired', 'Your session ended 7 days after you signed in. Sign in again.');
    }

    public static function invalidCredentials(int $attemptsLeft): self
    {
        return new self(401, 'invalid_credentials', 'Unable to sign in with those credentials.', ['attempts_left' => $attemptsLeft]);
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
