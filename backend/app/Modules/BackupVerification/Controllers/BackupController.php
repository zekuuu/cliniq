<?php

declare(strict_types=1);

namespace App\Modules\BackupVerification\Controllers;

use App\Modules\BackupVerification\Services\BackupService;
use App\Modules\UserManagement\Controllers\AuthController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Backup Verification (API-Contract Module 10): both roles, the same abilities (ADR-037). */
final class BackupController
{
    public function __construct(private readonly BackupService $backups) {}

    public function status(): JsonResponse
    {
        return response()->json(['data' => $this->backups->status()]);
    }

    public function verifyLatest(Request $request): JsonResponse
    {
        $user = AuthController::user($request);

        return response()->json(['data' => $this->backups->verifyLatest($user->id, $user->role)]);
    }

    public function run(Request $request): JsonResponse
    {
        $user = AuthController::user($request);

        return response()->json(['data' => $this->backups->run($user->id, $user->role)]);
    }

    public function folders(Request $request): JsonResponse
    {
        $request->validate(['path' => ['nullable', 'string', 'max:255']]);

        return response()->json(['data' => $this->backups->folders($request->string('path')->value())]);
    }

    public function locations(): JsonResponse
    {
        return response()->json(['data' => $this->backups->locations()]);
    }

    public function addLocation(Request $request): JsonResponse
    {
        $request->validate(['label' => ['nullable', 'string', 'max:500'], 'path' => ['nullable', 'string', 'max:500']]);
        $user = AuthController::user($request);

        return response()->json(['data' => $this->backups->addLocation($request->string('label')->value(), $request->string('path')->value(), $user->id, $user->role)], 201);
    }

    public function enabled(Request $request, int $id): JsonResponse
    {
        $request->validate(['enabled' => ['required', 'boolean']]);
        $user = AuthController::user($request);

        return response()->json(['data' => $this->backups->setEnabled($id, $request->boolean('enabled'), $user->id, $user->role)]);
    }
}
