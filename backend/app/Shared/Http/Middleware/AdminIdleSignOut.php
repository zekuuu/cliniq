<?php

declare(strict_types=1);

namespace App\Shared\Http\Middleware;

use App\Shared\Auth\ClinicUser;
use App\Shared\Http\ApiError;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Signs the Admin out after the idle limit (ADR-048). Staff have no idle timeout (ADR-015). */
final class AdminIdleSignOut
{
    use EndsSession;

    public const KEY = 'cliniq.last_request_at';

    /** @param Closure(Request): Response $next */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user instanceof ClinicUser || $user->clinicRole() !== ClinicUser::ADMIN) {
            return $next($request);
        }

        $session = $request->session();
        $now = now()->getTimestamp();
        $last = $session->get(self::KEY);

        if (is_int($last) && $now - $last >= config()->integer('cliniq.admin_idle_minutes') * 60) {
            $this->endSession($request);

            throw ApiError::sessionIdle();
        }

        $session->put(self::KEY, $now);

        return $next($request);
    }
}
