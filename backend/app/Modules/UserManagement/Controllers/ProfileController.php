<?php

declare(strict_types=1);

namespace App\Modules\UserManagement\Controllers;

use App\Modules\UserManagement\Models\User;
use App\Modules\UserManagement\Services\AuthService;
use App\Shared\AuditLog\AuditAction;
use App\Shared\Support\ClinicTime;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/** `GET` and `PUT /api/auth/profile`: the signed-in account only (`getOwnAccount`, `updateOwnProfile`, ADR-066). */
final class ProfileController
{
    private const NAME_MAX = 120;

    /** MEDIUMTEXT, the column's limit. */
    private const PICTURE_MAX = 16777215;

    public function show(Request $request): JsonResponse
    {
        return response()->json(['data' => self::ownAccount(AuthController::user($request))]);
    }

    public function update(Request $request, AuthService $auth): JsonResponse
    {
        $user = AuthController::user($request);
        $request->validate(['name' => ['present', 'nullable', 'string'], 'profilePicture' => ['present', 'nullable', 'string']]);
        $name = (string) preg_replace('/\s+/u', ' ', trim($request->string('name')->value()));
        if ($name === '') {
            throw ValidationException::withMessages(['name' => 'Enter your full name.']);
        }
        if (mb_strlen($name) > self::NAME_MAX) {
            throw ValidationException::withMessages(['name' => 'Keep your name to 120 characters or fewer.']);
        }
        $picture = $request->filled('profilePicture') ? $request->string('profilePicture')->value() : null;
        if ($picture !== null && (strlen($picture) > self::PICTURE_MAX || preg_match('#\Adata:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+\z#', $picture) !== 1)) {
            throw ValidationException::withMessages(['profilePicture' => 'Choose a JPEG, PNG, or WebP image.']);
        }

        DB::transaction(function () use ($user, $name, $picture, $auth): void {
            if ($name !== $user->name) {
                $user->forceFill(['name' => $name])->save();
                $auth->record($user, AuditAction::Update, 'Changed own name');
            }
            if ($picture !== $user->profile_picture) {
                $user->forceFill(['profile_picture' => $picture])->save();
                $auth->record($user, AuditAction::Update, 'Changed own profile picture');
            }
        });

        return response()->json(['data' => self::ownAccount($user)]);
    }

    /** @return array{name: string, username: string, role: string, profilePicture: string|null, lastLogin: string|null} */
    private static function ownAccount(User $user): array
    {
        return [
            'name' => $user->name,
            'username' => $user->username,
            'role' => $user->role,
            'profilePicture' => $user->profile_picture,
            'lastLogin' => $user->last_login_at === null ? null : ClinicTime::iso($user->last_login_at),
        ];
    }
}
