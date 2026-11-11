<?php

declare(strict_types=1);

namespace App\Modules\UserManagement\Controllers;

use App\Modules\UserManagement\Models\User;
use App\Modules\UserManagement\Services\AuthService;
use App\Shared\AuditLog\AuditAction;
use App\Shared\AuditLog\AuditEvent;
use App\Shared\AuditLog\AuditLogger;
use App\Shared\Http\Middleware\FixedSessionLifetime;
use App\Shared\Http\Middleware\IdleSignOut;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;

/** `POST /api/auth/login`, `logout`, `GET /api/auth/me`, `POST /api/auth/password` (API-Contract Module 1). */
final class AuthController
{
    public function __construct(private readonly AuthService $auth) {}

    public function login(Request $request): JsonResponse
    {
        $request->validate(['username' => ['required', 'string', 'max:50'], 'password' => ['required', 'string', 'max:255']]);
        $user = $this->auth->attempt($request->string('username')->value(), $request->string('password')->value());

        Auth::guard('web')->login($user);
        $request->session()->regenerate();
        $request->session()->put(FixedSessionLifetime::KEY, now()->getTimestamp());

        return response()->json(['data' => ['user' => self::sessionUser($user), 'mustChangePassword' => $user->must_change_password]]);
    }

    public function logout(Request $request, AuditLogger $audit): Response
    {
        $request->validate(['reason' => ['nullable', 'string', 'in:Signed out (idle)']]);
        $user = self::user($request);
        $audit->record(new AuditEvent(
            actorId: (string) $user->id,
            actorRole: $user->role,
            action: AuditAction::Logout,
            targetType: null,
            targetId: null,
            targetLabel: $request->filled('reason') ? $request->string('reason')->value() : 'Signed out',
            at: CarbonImmutable::now(),
        ));
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->noContent();
    }

    public function me(Request $request): JsonResponse
    {
        $user = self::user($request);

        return response()->json(['data' => [
            'user' => self::sessionUser($user),
            'mustChangePassword' => $user->must_change_password,
            'idleSignoutMinutes' => IdleSignOut::minutesFor($user),
            'idleSecondsLeft' => IdleSignOut::secondsLeft($request),
        ]]);
    }

    public function password(Request $request): Response
    {
        $request->validate(['currentPassword' => ['nullable', 'string', 'max:255'], 'nextPassword' => ['required', 'string', 'max:255']]);
        $current = $request->filled('currentPassword') ? $request->string('currentPassword')->value() : null;
        $this->auth->changeOwnPassword(self::user($request), $current, $request->string('nextPassword')->value());

        return response()->noContent();
    }

    /** `SessionUser` in the frontend types. */
    /** @return array{id: string, name: string, role: string} */
    public static function sessionUser(User $user): array
    {
        return ['id' => (string) $user->id, 'name' => $user->name, 'role' => $user->role];
    }

    public static function user(Request $request): User
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        return $user;
    }
}
