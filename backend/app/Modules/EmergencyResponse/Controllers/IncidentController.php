<?php

declare(strict_types=1);

namespace App\Modules\EmergencyResponse\Controllers;

use App\Modules\ClinicVisits\Services\VisitService;
use App\Modules\EmergencyResponse\Services\IncidentService;
use App\Modules\UserManagement\Controllers\AuthController;
use App\Shared\FollowUps\FollowUpService;
use App\Shared\Http\Paging;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

/** Emergency Response (API-Contract Module 4) and the student and staff history. */
final class IncidentController
{
    private const STAGE_RULES = [
        'complaint' => ['present', 'nullable', 'string', 'max:500'], 'vitals' => ['nullable', 'array'], 'generalNotes' => ['nullable', 'string', 'max:5000'],
        'studentId' => ['nullable'], 'personnelId' => ['nullable'], 'time' => ['nullable', 'string', 'max:40'], 'sourceVisitId' => ['nullable'],
        'hospitalReferral' => ['nullable', 'array'], 'newParentNotifications' => ['nullable', 'array', 'max:50'], 'followUp' => ['nullable', 'array'],
        'itemsGiven' => ['nullable', 'array', 'max:50'], 'bodyPart' => ['nullable', 'string', 'max:60'], 'noFurtherActionReason' => ['nullable', 'string', 'max:200'],
    ];

    public function __construct(private readonly IncidentService $incidents) {}

    public function index(Request $request): JsonResponse
    {
        $request->validate(['from' => ['nullable', 'date_format:Y-m-d'], 'to' => ['nullable', 'date_format:Y-m-d']]);

        return Paging::json($request, $this->incidents->list(
            $request->filled('from') ? $request->string('from')->value() : null,
            $request->filled('to') ? $request->string('to')->value() : null,
            AuthController::user($request)->role === 'admin',
        ));
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate(self::STAGE_RULES);

        return response()->json(['data' => $this->incidents->stageOne(self::input($request), AuthController::user($request)->id)], 201);
    }

    /** A staff patient's incident answers 404 to the Admin, as in the mock (ADR-038). */
    public function show(Request $request, int $id): JsonResponse
    {
        return response()->json(['data' => $this->incidents->find($id, AuthController::user($request)->role === 'admin')]);
    }

    public function stageTwo(Request $request, int $id): JsonResponse
    {
        $request->validate(self::STAGE_RULES);

        return response()->json(['data' => $this->incidents->stageTwo($id, self::input($request), AuthController::user($request)->id)]);
    }

    public function notify(Request $request, int $id): JsonResponse
    {
        $request->validate(['outcome' => ['nullable', 'string'], 'calledContact' => ['nullable', 'array']]);

        return response()->json(['data' => $this->incidents->addNotification($id, self::input($request, ['outcome', 'calledContact']), AuthController::user($request)->id)], 201);
    }

    public function approvedIds(): JsonResponse
    {
        return response()->json(['data' => $this->incidents->approvedIds()]);
    }

    public function trail(int $id): JsonResponse
    {
        return response()->json(['data' => $this->incidents->trail($id)]);
    }

    public function approve(Request $request, int $id): Response
    {
        $this->incidents->approve($id, AuthController::user($request)->id);

        return response()->noContent();
    }

    /** `GET /api/students/{id}/history`: `{ visits, incidents }`, newest first. */
    public function studentHistory(Request $request, int $id, VisitService $visits): JsonResponse
    {
        abort_unless(DB::table('students')->where('id', $id)->exists(), 404);
        $limit = self::limit($request);

        return response()->json(['data' => [
            'visits' => $visits->forPatient('student_id', $id, $limit),
            'incidents' => $this->incidents->list(null, null, false, studentId: $id, limit: $limit),
        ]]);
    }

    /** `GET /api/personnel/{id}/history`: `{ visits, incidents, followUps }`; Staff only. */
    public function personnelHistory(Request $request, int $id, VisitService $visits, FollowUpService $followUps): JsonResponse
    {
        abort_unless(DB::table('personnel')->where('id', $id)->exists(), 404);
        $limit = self::limit($request);

        return response()->json(['data' => [
            'visits' => $visits->forPatient('personnel_id', $id, $limit),
            'incidents' => $this->incidents->list(null, null, false, personnelId: $id, limit: $limit),
            'followUps' => $followUps->forPersonnel($id, $limit),
        ]]);
    }

    private static function limit(Request $request): int
    {
        $request->validate(['limit' => ['nullable', 'integer', 'min:1', 'max:200']]);

        return $request->filled('limit') ? $request->integer('limit') : 8;
    }

    /**
     * @param  list<string>|null  $keys
     * @return array<string, mixed> the sent keys only, so an omitted field stays
     */
    private static function input(Request $request, ?array $keys = null): array
    {
        $out = [];
        foreach ($keys ?? array_keys(self::STAGE_RULES) as $key) {
            if ($request->exists($key)) {
                $out[$key] = $request->input($key);
            }
        }

        return $out;
    }
}
