<?php

declare(strict_types=1);

namespace App\Shared\Feedback;

use App\Modules\UserManagement\Controllers\AuthController;
use App\Shared\AuditLog\AuditAction;
use App\Shared\AuditLog\AuditEvent;
use App\Shared\AuditLog\AuditLogger;
use App\Shared\AuditLog\AuditTarget;
use App\Shared\Support\ClinicTime;
use App\Shared\Support\Row;
use Carbon\CarbonImmutable;
use Illuminate\Database\Query\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/** "Report an issue" (`createIssueReport`, `listIssueReports`): both roles (Q12). */
final class IssueReportController
{
    public function store(Request $request, AuditLogger $audit): JsonResponse
    {
        $request->validate(['description' => ['nullable', 'string', 'max:5000'], 'route' => ['nullable', 'string', 'max:255'], 'pageName' => ['nullable', 'string', 'max:120']]);
        $user = AuthController::user($request);
        $description = trim($request->string('description')->value());
        if ($description === '') {
            throw ValidationException::withMessages(['description' => 'Issue description is required.']);
        }
        $id = DB::transaction(function () use ($request, $user, $description, $audit): int {
            $now = CarbonImmutable::now();
            $id = DB::table('issue_reports')->insertGetId([
                'description' => $description, 'route' => $request->string('route')->value(), 'page_name' => $request->string('pageName')->value(),
                'reporter_role' => $user->role, 'reported_by_user_id' => $user->id, 'created_at' => $now,
            ]);
            $audit->record(new AuditEvent(actorId: (string) $user->id, actorRole: $user->role, action: AuditAction::Create, targetType: AuditTarget::IssueReport, targetId: (string) $id, targetLabel: null, at: $now));

            return $id;
        });

        return response()->json(['data' => self::rows(DB::table('issue_reports')->where('id', $id))[0]], 201);
    }

    public function index(): JsonResponse
    {
        return response()->json(['data' => self::rows(DB::table('issue_reports')->orderByDesc('created_at')->orderByDesc('id'))]);
    }

    /** @return list<array<string, mixed>> `IssueReport` */
    private static function rows(Builder $query): array
    {
        return array_values($query->get()->map(fn (object $r): array => [
            'id' => (string) Row::int($r, 'id'), 'description' => (string) Row::str($r, 'description'), 'route' => (string) Row::str($r, 'route'),
            'pageName' => (string) Row::str($r, 'page_name'), 'role' => (string) Row::str($r, 'reporter_role'),
            'reportedByUserId' => (string) Row::int($r, 'reported_by_user_id'), 'createdAt' => ClinicTime::iso(CarbonImmutable::parse((string) Row::str($r, 'created_at'))),
        ])->all());
    }
}
