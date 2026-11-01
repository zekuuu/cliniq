<?php

declare(strict_types=1);

namespace App\Shared\Http\Middleware;

use Closure;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Laravel's session lifetime renews on each request. ADR-015 and ADR-057 want a fixed 7 days from
 * sign-in, so the sign-in time is kept in the session and checked here. B2 writes it at sign-in;
 * a signed-in session without one starts its 7 days now, so no session is ever unbounded.
 */
final class FixedSessionLifetime
{
    use EndsSession;

    public const KEY = 'cliniq.signed_in_at';

    /** @param Closure(Request): Response $next */
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user() === null) {
            throw new AuthenticationException;
        }

        $session = $request->session();
        $now = now()->getTimestamp();
        $signedIn = $session->get(self::KEY);

        if (! is_int($signedIn)) {
            $session->put(self::KEY, $now);
        } elseif ($now - $signedIn >= config()->integer('cliniq.session_days') * 86400) {
            $this->endSession($request);

            throw new AuthenticationException;
        }

        return $next($request);
    }
}
