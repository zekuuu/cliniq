<?php

declare(strict_types=1);

namespace App\Modules\ReportsGeneration\Controllers;

use App\Modules\ReportsGeneration\Services\MonthlyReportService;
use App\Modules\ReportsGeneration\Services\SportsReportService;
use App\Modules\UserManagement\Controllers\AuthController;
use App\Modules\UserManagement\Models\User;
use App\Shared\AuditLog\AuditAction;
use App\Shared\AuditLog\AuditEvent;
use App\Shared\AuditLog\AuditLogger;
use App\Shared\AuditLog\AuditTarget;
use App\Shared\Http\ApiError;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** The monthly reports (ADR-074, ADR-077) and Sports Reports (ADR-034). */
final class ReportController
{
    public function __construct(private readonly MonthlyReportService $monthly, private readonly SportsReportService $sports) {}

    /** Staff and Admin read; `fullLrn=1` is Staff's printout only, and writes its print entry (ADR-044). */
    public function monthly(Request $request, AuditLogger $audit): JsonResponse
    {
        $request->validate(['month' => ['required', 'date_format:Y-m'], 'fullLrn' => ['nullable', 'in:0,1,true,false']], ['month' => 'Choose a month as YYYY-MM.']);
        $user = AuthController::user($request);
        $month = $request->string('month')->value();
        $fullLrn = $request->boolean('fullLrn');
        if ($fullLrn && $user->role !== 'staff') {
            throw new ApiError(403, 'forbidden', 'Printing is done by the clinician.');
        }
        if ($fullLrn) {
            $title = 'Monthly Clinic Report — '.CarbonImmutable::createFromFormat('!Y-m', $month)?->format('F Y');
            $audit->record(new AuditEvent(actorId: (string) $user->id, actorRole: 'staff', action: AuditAction::Print, targetType: AuditTarget::PrintDocument,
                targetId: null, targetLabel: $title, at: CarbonImmutable::now()));
        }

        return response()->json(['data' => $this->monthly->report($month, $fullLrn)]);
    }

    public function latestMonth(): JsonResponse
    {
        return response()->json(['data' => ['month' => $this->monthly->latestMonth()]]);
    }

    public function sportsIndex(Request $request): JsonResponse
    {
        self::staff($request);

        return response()->json(['data' => $this->sports->list()]);
    }

    public function sportsStore(Request $request): JsonResponse
    {
        $user = self::staff($request);

        return response()->json(['data' => $this->sports->save(self::input($request), null, $user->id)], 201);
    }

    public function sportsShow(Request $request, int $id): JsonResponse
    {
        self::staff($request);

        return response()->json(['data' => $this->sports->detail($id)]);
    }

    public function sportsUpdate(Request $request, int $id): JsonResponse
    {
        $user = self::staff($request);

        return response()->json(['data' => $this->sports->save(self::input($request), $id, $user->id)]);
    }

    public function sportsContent(Request $request, int $id): JsonResponse
    {
        self::staff($request);

        return response()->json(['data' => $this->sports->content($id)]);
    }

    public function sportsDuplicate(Request $request, int $id): JsonResponse
    {
        $user = self::staff($request);

        return response()->json(['data' => $this->sports->duplicate($id, $user->id)], 201);
    }

    public function sportsArchived(Request $request, int $id): JsonResponse
    {
        $user = self::staff($request);
        $request->validate(['archived' => ['required', 'boolean']]);

        return response()->json(['data' => $this->sports->setArchived($id, $request->boolean('archived'), $user->id)]);
    }

    /** ADR-034: the Admin gets 403 with the mock's message on every Sports Report endpoint. */
    private static function staff(Request $request): User
    {
        $user = AuthController::user($request);
        if ($user->role !== 'staff') {
            throw new ApiError(403, 'forbidden', 'Only the clinic staff can open Sports Reports.');
        }

        return $user;
    }

    /** @return array<string, mixed> */
    private static function input(Request $request): array
    {
        $request->validate(['title' => ['nullable', 'string', 'max:500'], 'activity' => ['nullable', 'string', 'max:500'], 'requestedBy' => ['nullable', 'string', 'max:500'],
            'window' => ['nullable'], 'includeConditions' => ['nullable', 'boolean'], 'students' => ['nullable', 'array', 'max:500']]);

        return ['title' => $request->input('title'), 'activity' => $request->input('activity'), 'requestedBy' => $request->input('requestedBy'),
            'window' => $request->input('window'), 'includeConditions' => $request->boolean('includeConditions'), 'students' => $request->input('students', [])];
    }
}
