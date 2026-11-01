<?php

declare(strict_types=1);

namespace App\Shared\Http\Middleware;

use App\Shared\Auth\ClinicUser;
use Closure;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

/** `role:staff,admin`. No sign-in is 401, a wrong role is 403. */
final class EnsureRole
{
    /** @param Closure(Request): Response $next */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if ($user === null) {
            throw new AuthenticationException;
        }
        if (! $user instanceof ClinicUser || ! in_array($user->clinicRole(), $roles, true)) {
            throw new AccessDeniedHttpException;
        }

        return $next($request);
    }
}
