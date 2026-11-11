<?php

declare(strict_types=1);

namespace App\Shared\Http\Middleware;

use App\Modules\UserManagement\Models\User;
use App\Shared\Http\ApiError;
use Closure;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * The session guard re-reads the account on every request, so a disabled account is refused at once
 * (ADR-048). While a password change is forced, only the change, sign-out and `me` answer.
 */
final class EnsureActiveAccount
{
    use EndsSession;

    private const ALLOWED_DURING_CHANGE = ['auth.me', 'auth.password', 'auth.logout'];

    /** @param Closure(Request): Response $next */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (! $user instanceof User) {
            return $next($request);
        }
        if ($user->deactivated_at !== null) {
            $this->endSession($request);
            throw new AuthenticationException;
        }
        if ($user->must_change_password && ! $request->routeIs(...self::ALLOWED_DURING_CHANGE)) {
            throw ApiError::passwordChangeRequired();
        }

        return $next($request);
    }
}
