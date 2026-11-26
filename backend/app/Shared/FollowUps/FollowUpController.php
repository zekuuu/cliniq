<?php

declare(strict_types=1);

namespace App\Shared\FollowUps;

use App\Modules\UserManagement\Controllers\AuthController;
use App\Shared\Http\Paging;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Follow-ups (API-Contract "Follow-Ups", ADR-051). Staff only. */
final class FollowUpController
{
    public function __construct(private readonly FollowUpService $followUps) {}

    public function index(Request $request): JsonResponse
    {
        $request->validate(['status' => ['nullable', 'in:pending,completed,missed,cancelled'], 'patient' => ['nullable', 'in:everyone,students,staff']]);
        if (! Paging::wanted($request)) {
            return response()->json(['data' => $this->followUps->list($request->string('status')->value())]);
        }
        // One page (ADR-082); the Follow-Up List opens on Status, newest-due first.
        [$sort, $direction] = Paging::sort($request, ['student', 'reason', 'due', 'status'], '-status');
        [$rows, $meta] = Paging::sql($request, $this->followUps->listQuery(
            $request->string('status')->value(), $request->string('patient')->value(), $sort, $direction,
        ), $this->followUps->listRow(...));

        return response()->json(['data' => $rows, 'meta' => $meta]);
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

    public function undoReschedule(Request $request, int $id): JsonResponse
    {
        return response()->json(['data' => $this->followUps->undoReschedule($id, AuthController::user($request)->id)]);
    }
}
