<?php

declare(strict_types=1);

namespace App\Shared\Http\Middleware;

use App\Shared\AuditLog\AuditAction;
use App\Shared\AuditLog\AuditEvent;
use App\Shared\AuditLog\AuditLogger;
use App\Shared\Auth\ClinicUser;
use App\Shared\Http\ApiError;
use App\Shared\Settings\SettingsService;
use Carbon\CarbonImmutable;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Signs each role out after its own idle minutes (ADR-048, ADR-078; API-Contract "Idle sign-out").
 * Every authenticated call counts as activity. The session keeps the limit in force at the last
 * counted call, so a changed setting applies from the next request and a running countdown keeps the
 * limit it started with. A keep-alive within a minute of the last counted call changes nothing.
 * Limits come from `system_settings` through the cached SettingsService.
 */
final class IdleSignOut
{
    use EndsSession;

    public const LAST = 'cliniq.last_request_at';

    public const LIMIT = 'cliniq.idle_limit_minutes';

    public const KEEPALIVE_WINDOW_SECONDS = 60;

    /** @param Closure(Request): Response $next */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user instanceof ClinicUser) {
            return $next($request);
        }

        $session = $request->session();
        $now = now()->getTimestamp();
        $last = $session->get(self::LAST);
        $limit = $session->get(self::LIMIT);
        $limit = is_int($limit) ? $limit : self::minutesFor($user);

        if (is_int($last) && $now - $last >= $limit * 60) {
            app(AuditLogger::class)->record(new AuditEvent(
                actorId: ($id = Auth::id()) === null ? null : (string) $id,
                actorRole: $user->clinicRole(),
                action: AuditAction::Logout,
                targetType: null,
                targetId: null,
                targetLabel: 'Signed out (idle)',
                at: CarbonImmutable::now(),
            ));
            $this->endSession($request);

            throw ApiError::sessionIdle($limit);
        }

        $keepAliveTooSoon = $request->routeIs('session.keepalive') && is_int($last) && $now - $last < self::KEEPALIVE_WINDOW_SECONDS;
        if (! $keepAliveTooSoon) {
            $session->put(self::LAST, $now);
            $session->put(self::LIMIT, self::minutesFor($user));
        }

        return $next($request);
    }

    public static function minutesFor(ClinicUser $user): int
    {
        return app(SettingsService::class)->int($user->clinicRole() === ClinicUser::ADMIN
            ? 'idle_signout_minutes_admin'
            : 'idle_signout_minutes_staff');
    }

    /** Seconds until this session is signed out for inactivity. */
    public static function secondsLeft(Request $request): int
    {
        $session = $request->session();
        $last = $session->get(self::LAST);
        $limit = $session->get(self::LIMIT);
        $user = $request->user();
        if (! is_int($limit) && $user instanceof ClinicUser) {
            $limit = self::minutesFor($user);
        }
        if (! is_int($last) || ! is_int($limit)) {
            return 0;
        }

        return max(0, $limit * 60 - (now()->getTimestamp() - $last));
    }
}
