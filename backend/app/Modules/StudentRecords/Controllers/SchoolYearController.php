<?php

declare(strict_types=1);

namespace App\Modules\StudentRecords\Controllers;

use App\Modules\UserManagement\Controllers\AuthController;
use App\Modules\UserManagement\Models\User;
use App\Shared\AuditLog\AuditAction;
use App\Shared\AuditLog\AuditEvent;
use App\Shared\AuditLog\AuditLogger;
use App\Shared\AuditLog\AuditTarget;
use App\Shared\AuditLog\DatabaseAuditLogger;
use App\Shared\Http\ApiError;
use App\Shared\Http\BusinessRuleViolation;
use App\Shared\Settings\SettingsService;
use App\Shared\Support\ClinicTime;
use App\Shared\Support\SchoolYears;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * School years, started and ended by hand by Staff (ADR-075); the Admin reads only. The year rows
 * live in `school_years`; the four dates in `system_settings`.
 */
final class SchoolYearController
{
    private const SETTING_KEYS = [
        'schoolYearStartMonth' => 'school_year_start_month', 'schoolYearStartDay' => 'school_year_start_day',
        'schoolYearEndMonth' => 'school_year_end_month', 'schoolYearEndDay' => 'school_year_end_day',
    ];

    public function __construct(private readonly SchoolYears $years, private readonly AuditLogger $audit) {}

    /** `GET /api/school-years`: `{ current, step, settings, years }`. */
    public function index(): JsonResponse
    {
        $today = ClinicTime::today();
        $current = $this->years->current();
        $names = DB::table('users')->pluck('name', 'id');
        $name = fn (?int $id): ?string => $id === null ? null : (is_string($n = $names->get($id)) ? $n : 'Unknown user');
        $starts = $this->years->starts();
        $row = $starts->firstWhere('label', $current['label']);

        return response()->json(['data' => [
            'current' => [
                'label' => $current['label'], 'from' => $current['from'], 'to' => $current['to'], 'endedOn' => $current['endedOn'],
                'startedBy' => $name($row?->started_by_user_id), 'endedBy' => $name($row?->ended_by_user_id),
            ],
            'step' => $this->years->step($today),
            'settings' => $this->years->settings(),
            'years' => $starts->reverse()->map(fn (object $s): array => [
                'label' => $s->label, 'startedOn' => $s->started_on, 'endedOn' => $s->ended_on,
                'startedBy' => $name($s->started_by_user_id), 'endedBy' => $name($s->ended_by_user_id),
            ])->values()->all(),
        ]]);
    }

    public function reminder(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->years->reminder(ClinicTime::today(), AuthController::user($request)->role)]);
    }

    public function saveSettings(Request $request, SettingsService $settings): JsonResponse
    {
        $user = self::staff($request, 'Only the clinic staff can change the school year dates.');
        $request->validate(array_fill_keys(array_keys(self::SETTING_KEYS), ['required', 'integer']), ['*' => 'Choose a month from January to December.']);
        $next = [
            'schoolYearStartMonth' => $request->integer('schoolYearStartMonth'), 'schoolYearStartDay' => $request->integer('schoolYearStartDay'),
            'schoolYearEndMonth' => $request->integer('schoolYearEndMonth'), 'schoolYearEndDay' => $request->integer('schoolYearEndDay'),
        ];
        $problem = SchoolYears::settingsError($next);
        if ($problem !== null) {
            throw new ApiError(422, 'validation_failed', $problem, ['errors' => ['schoolYearStartMonth' => [$problem]]]);
        }
        $before = $this->years->settings();
        $changed = array_values(array_filter(array_keys($next), fn (string $k): bool => $before[$k] !== $next[$k]));
        if ($changed !== []) {
            DB::transaction(function () use ($changed, $next, $settings, $user): void {
                $settings->save(array_combine(array_map(fn (string $k): string => self::SETTING_KEYS[$k], $changed), array_map(fn (string $k): int => $next[$k], $changed)), $user->id);
                $this->record($user->id, AuditAction::Update, (string) DatabaseAuditLogger::changedSummary($changed));
            });
        }

        return response()->json(['data' => $this->years->settings()]);
    }

    /** Today is the last class day; the break begins tomorrow. */
    public function end(Request $request): JsonResponse
    {
        $user = self::staff($request, 'Only the clinic staff can end a school year.');
        $today = ClinicTime::today();
        $current = $this->years->of($today);
        $row = $this->years->starts()->firstWhere('label', $current['label']);
        if ($row === null) {
            throw new BusinessRuleViolation('school_year', 'Start a school year before ending one.');
        }
        if ($row->ended_on !== null) {
            throw new BusinessRuleViolation('school_year', "School year {$current['label']} has already ended.");
        }
        DB::transaction(function () use ($row, $today, $user, $current): void {
            DB::table('school_years')->where('id', $row->id)->update(['ended_on' => $today, 'ended_by_user_id' => $user->id]);
            $this->record($user->id, AuditAction::Update, "Ended school year {$current['label']}");
        });

        return response()->json(['data' => $this->years->of($today)]);
    }

    /** Starts today; the year before, with its break, ends yesterday. No undo. */
    public function start(Request $request): JsonResponse
    {
        $user = self::staff($request, 'Only the clinic staff can start a school year.');
        $today = ClinicTime::today();
        $current = $this->years->of($today);
        $refuse = match (true) {
            $current['started'] && $current['endedOn'] === null => "End school year {$current['label']} first.",
            $current['started'] && $current['from'] === $today => 'A school year was already started today.',
            $current['endedOn'] === $today => "School year {$current['label']} ended today. Start the next one from tomorrow.",
            default => null,
        };
        if ($refuse !== null) {
            throw new BusinessRuleViolation('school_year', $refuse);
        }
        $label = $this->years->step($today)['label'];
        DB::transaction(function () use ($label, $today, $user): void {
            DB::table('school_years')->insert(['label' => $label, 'started_on' => $today, 'started_by_user_id' => $user->id]);
            $this->record($user->id, AuditAction::Create, "Started school year {$label}");
        });

        return response()->json(['data' => $this->years->of($today)]);
    }

    private static function staff(Request $request, string $message): User
    {
        $user = AuthController::user($request);
        if ($user->role !== 'staff') {
            throw new ApiError(403, 'forbidden', $message);
        }

        return $user;
    }

    private function record(int $userId, AuditAction $action, string $summary): void
    {
        $this->audit->record(new AuditEvent(
            actorId: (string) $userId, actorRole: 'staff', action: $action, targetType: AuditTarget::SchoolYear,
            targetId: null, targetLabel: 'school-year', at: CarbonImmutable::now(), summary: $summary,
        ));
    }
}
