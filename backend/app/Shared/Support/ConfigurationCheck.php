<?php

declare(strict_types=1);

namespace App\Shared\Support;

/**
 * Refuses to start on a setting that would leak or silently break sign-in (Backend-Loop-Engineering B2):
 * the secure-cookie flag must match the scheme of APP_URL; debug is off and the database account is
 * not `root` outside `local`.
 */
final class ConfigurationCheck
{
    /** @return list<string> what is wrong; names settings, never their values */
    public static function problems(string $environment, string $appUrl, bool $secureCookie, bool $debug, string $dbUser): array
    {
        $problems = [];
        $https = str_starts_with(strtolower($appUrl), 'https://');
        if ($secureCookie !== $https) {
            $problems[] = 'SESSION_SECURE_COOKIE must be true exactly when APP_URL starts with https://.';
        }
        if ($environment !== 'local' && $debug) {
            $problems[] = 'APP_DEBUG must be false outside the local environment.';
        }
        if ($environment !== 'local' && strtolower($dbUser) === 'root') {
            $problems[] = 'DB_USERNAME must not be root outside the local environment; use cliniq_app.';
        }

        return $problems;
    }

    public static function enforce(): void
    {
        $user = config('database.connections.'.config()->string('database.default').'.username');
        $user = is_string($user) ? $user : '';
        $problems = self::problems(
            (string) app()->environment(),
            config()->string('app.url'),
            (bool) config('session.secure'),
            config()->boolean('app.debug'),
            $user,
        );
        if ($problems !== []) {
            throw new \RuntimeException('CLINIQ will not start: '.implode(' ', $problems));
        }
    }
}
