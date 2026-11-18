<?php

declare(strict_types=1);

namespace App\Modules\UserManagement\Controllers;

use App\Modules\UserManagement\Models\User;
use App\Modules\UserManagement\Services\UserService;
use App\Shared\Http\ApiError;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/** User Management (API-Contract Module 1, ADR-033): the Admin manages; Staff read names only. */
final class UserController
{
    public function __construct(private readonly UserService $users) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->users->list(AuthController::user($request)->role === 'admin')]);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        return response()->json(['data' => $this->users->find($id, AuthController::user($request)->role === 'admin')]);
    }

    public function principalName(): JsonResponse
    {
        return response()->json(['data' => $this->users->principalName()]);
    }

    public function store(Request $request): JsonResponse
    {
        $admin = self::admin($request);

        return response()->json(['data' => $this->users->save(self::input($request, true), null, $admin->id)], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $admin = self::admin($request);

        return response()->json(['data' => $this->users->save(self::input($request, false), $id, $admin->id)]);
    }

    public function active(Request $request, int $id): JsonResponse
    {
        $admin = self::admin($request);
        $request->validate(['active' => ['required', 'boolean']]);

        return response()->json(['data' => $this->users->setActive($id, $request->boolean('active'), $admin->id)]);
    }

    public function resetPassword(Request $request, int $id): Response
    {
        $admin = self::admin($request);
        $request->validate(['temporaryPassword' => ['nullable', 'string', 'max:255']]);
        $this->users->resetPassword($id, $request->string('temporaryPassword')->value(), $admin->id);

        return response()->noContent();
    }

    private static function admin(Request $request): User
    {
        $user = AuthController::user($request);
        if ($user->role !== 'admin') {
            throw new ApiError(403, 'forbidden', 'Only the Admin/Principal can manage accounts.');
        }

        return $user;
    }

    /** @return array<string, mixed> */
    private static function input(Request $request, bool $create): array
    {
        $request->validate(['name' => ['nullable', 'string', 'max:500'], 'username' => ['nullable', 'string', 'max:200'], 'role' => ['nullable', 'string'],
            'profilePicture' => ['nullable', 'string', 'max:16777215'], 'temporaryPassword' => ['nullable', 'string', 'max:255']]);

        return ['name' => $request->input('name'), 'username' => $request->input('username'), 'role' => $request->input('role'),
            'profilePicture' => $request->input('profilePicture')] + ($create ? ['temporaryPassword' => $request->input('temporaryPassword')] : []);
    }
}
