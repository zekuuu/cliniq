<?php

declare(strict_types=1);

namespace App\Shared\FollowUps;

use App\Modules\UserManagement\Controllers\AuthController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Follow-ups (API-Contract "Follow-Ups", ADR-051). Staff only. */
final class FollowUpController
{
    public function __construct(private readonly FollowUpService $followUps) {}

    public function index(Request $request): JsonResponse
    {
        $request->validate(['status' => ['nullable', 'in:pending,completed,missed,cancelled']]);

        return response()->json(['data' => $this->followUps->list($request->string('status')->value())]);
    }

    public function status(Request $request, int $id): JsonResponse
    {
        $request->validate(['status' => ['required', 'in:pending,completed,missed,cancelled'], 'reason' => ['nullable', 'string', 'max:300']]);

        return response()->json(['data' => $this->followUps->setStatus($id, $request->string('status')->value(), $request->string('reason')->value(), AuthController::user($request)->id)]);
    }

    public function reschedule(Request $request, int $id): JsonResponse
    {
        $request->validate(['followUpDate' => ['required', 'date_format:Y-m-d']], ['followUpDate' => "The new date can't be in the past."]);

        return response()->json(['data' => $this->followUps->reschedule($id, $request->string('followUpDate')->value(), AuthController::user($request)->id)], 201);
    }
}
