<?php

declare(strict_types=1);

namespace App\Modules\ClinicVisits\Controllers;

use App\Modules\ClinicVisits\Services\ExcuseLetterService;
use App\Modules\ClinicVisits\Services\VisitService;
use App\Modules\UserManagement\Controllers\AuthController;
use App\Shared\AuditLog\AuditAction;
use App\Shared\AuditLog\AuditEvent;
use App\Shared\AuditLog\AuditLogger;
use App\Shared\AuditLog\AuditTarget;
use App\Shared\Http\BusinessRuleViolation;
use App\Shared\Http\Paging;
use App\Shared\Support\ClinicTime;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/** Clinic visits, excuse letters and PE referrals (API-Contract Module 3). Staff only. */
final class VisitController
{
    private const VISIT_RULES = [
        'studentId' => ['nullable'], 'personnelId' => ['nullable'],
        'complaint' => ['present', 'nullable', 'string', 'max:500'], 'treatment' => ['nullable', 'string', 'max:5000'],
        'disposition' => ['present', 'nullable', 'string'], 'eventTag' => ['nullable', 'string', 'max:80'],
        'referredTo' => ['nullable', 'string', 'max:150'], 'dateTime' => ['nullable', 'string', 'max:25'], 'lateEntryReason' => ['nullable', 'string', 'max:200'],
        'temperatureC' => ['nullable', 'numeric', 'min:0', 'max:999'], 'timeOut' => ['nullable', 'string', 'max:5'],
        'assistedBy' => ['nullable', 'string', 'max:120'], 'parentGuardian' => ['nullable', 'string', 'max:120'], 'remarks' => ['nullable', 'string', 'max:2000'],
        'collectedBy' => ['nullable', 'array'], 'collectedBy.name' => ['nullable', 'string', 'max:120'], 'collectedBy.relationship' => ['nullable', 'string', 'max:40'], 'collectedBy.time' => ['nullable', 'string', 'max:5'],
        'extraComplaints' => ['nullable', 'array', 'max:20'], 'extraComplaints.*' => ['string', 'max:500'],
        'itemsGiven' => ['nullable', 'array', 'max:50'], 'itemsGiven.*.itemId' => ['required'], 'itemsGiven.*.quantity' => ['required'], 'itemsGiven.*.instructions' => ['nullable', 'string', 'max:500'],
        'excuseLetterDraft' => ['nullable', 'array'], 'excuseLetterDraft.excusedFrom' => ['nullable', 'string', 'max:10'], 'excuseLetterDraft.excusedUntil' => ['nullable', 'string', 'max:10'],
        'excuseLetterDraft.note' => ['nullable', 'string', 'max:500'], 'excuseLetterDraft.stayHomeUntilCleared' => ['nullable', 'boolean'], 'excuseLetterDraft.stayHomeNote' => ['nullable', 'string', 'max:255'],
        'followUp' => ['nullable', 'array'], 'followUp.followUpDate' => ['nullable', 'string', 'max:10'], 'followUp.reason' => ['nullable', 'string', 'max:255'],
        'followUp.notes' => ['nullable', 'string', 'max:5000'], 'followUp.stayHomeUntilCleared' => ['nullable', 'boolean'], 'followUp.stayHomeNote' => ['nullable', 'string', 'max:255'],
        'approveExcuseLetterNow' => ['nullable', 'boolean'],
    ];

    public function __construct(private readonly VisitService $visits, private readonly ExcuseLetterService $letters) {}

    public function index(Request $request): JsonResponse
    {
        $request->validate(['from' => ['nullable', 'date_format:Y-m-d'], 'to' => ['nullable', 'date_format:Y-m-d'], 'includeEnteredInError' => ['nullable', 'in:0,1,true,false']]);

        return Paging::json($request, $this->visits->list(
            $request->filled('from') ? $request->string('from')->value() : null,
            $request->filled('to') ? $request->string('to')->value() : null,
            $request->boolean('includeEnteredInError'),
        ));
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate(self::VISIT_RULES);

        return response()->json(['data' => $this->visits->record(self::input($request), AuthController::user($request)->id)], 201);
    }

    public function show(int $id): JsonResponse
    {
        return response()->json(['data' => $this->visits->find($id)]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $request->validate(self::VISIT_RULES);

        return response()->json(['data' => $this->visits->update($id, self::input($request), AuthController::user($request)->id)]);
    }

    public function enteredInError(Request $request, int $id): JsonResponse
    {
        $request->validate(['reason' => ['nullable', 'string', 'max:300']]);

        return response()->json(['data' => $this->visits->markEnteredInError($id, $request->string('reason')->value(), AuthController::user($request)->id)]);
    }

    public function letter(int $id): JsonResponse
    {
        abort_unless(DB::table('visits')->where('id', $id)->exists(), 404);

        return response()->json(['data' => $this->letters->forVisit($id)]);
    }

    public function approveLetter(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'excusedFrom' => ['nullable', 'string', 'max:10'], 'excusedUntil' => ['nullable', 'string', 'max:10'], 'note' => ['nullable', 'string', 'max:500'],
            'recipient' => ['nullable', 'string', 'max:150'], 'body' => ['nullable', 'string', 'max:20000'],
            'stayHomeUntilCleared' => ['nullable', 'boolean'], 'stayHomeNote' => ['nullable', 'string', 'max:255'],
        ]);
        $input = [
            'excusedFrom' => $request->string('excusedFrom')->value(), 'excusedUntil' => $request->string('excusedUntil')->value(),
            'note' => $request->filled('note') ? $request->string('note')->value() : null,
            'recipient' => $request->filled('recipient') ? $request->string('recipient')->value() : null,
            'body' => $request->filled('body') ? $request->string('body')->value() : null,
            'stayHomeUntilCleared' => $request->boolean('stayHomeUntilCleared'),
            'stayHomeNote' => $request->filled('stayHomeNote') ? $request->string('stayHomeNote')->value() : null,
        ];
        $userId = AuthController::user($request)->id;

        return response()->json(['data' => DB::transaction(fn (): array => $this->letters->approve($id, $input, $userId))], 201);
    }

    public function replaceLetter(Request $request, int $id): Response
    {
        $request->validate(['reason' => ['nullable', 'string', 'max:300']]);
        $userId = AuthController::user($request)->id;
        DB::transaction(fn () => $this->letters->replace($id, $request->string('reason')->value(), $userId));

        return response()->noContent();
    }

    public function pendingLetters(): JsonResponse
    {
        return response()->json(['data' => $this->letters->pending()]);
    }

    public function letterById(int $id): JsonResponse
    {
        return response()->json(['data' => $this->letters->byId($id)]);
    }

    public function studentLetters(int $id): JsonResponse
    {
        abort_unless(DB::table('students')->where('id', $id)->exists(), 404);

        return response()->json(['data' => $this->letters->forStudent($id)]);
    }

    /** `POST /api/pe-referrals` (`submitPeReferral`): students only (ADR-043 item 7). */
    public function peReferral(Request $request, AuditLogger $audit): JsonResponse
    {
        $request->validate([
            'studentId' => ['required'], 'referredBy' => ['nullable', 'string', 'max:120'], 'activity' => ['nullable', 'string', 'max:150'],
            'injurySummary' => ['nullable', 'string', 'max:500'], 'clinicalAssessment' => ['nullable', 'string', 'max:500'], 'treatment' => ['nullable', 'string', 'max:500'],
            'disposition' => ['required', 'in:returned_to_class,sent_home,referred_to_hospital'],
        ]);
        $studentId = is_numeric($request->input('studentId')) ? $request->integer('studentId') : 0;
        abort_unless(DB::table('students')->where('id', $studentId)->exists(), 404);
        $user = AuthController::user($request);
        $text = fn (string $k): string => trim($request->string($k)->value());

        $referral = DB::transaction(function () use ($request, $studentId, $user, $text, $audit): array {
            $now = CarbonImmutable::now();
            $row = [
                'student_id' => $studentId, 'referred_by' => $text('referredBy'), 'logged_by_user_id' => $user->id, 'activity' => $text('activity'),
                'injury_summary' => $text('injurySummary'), 'clinical_assessment' => $text('clinicalAssessment'), 'treatment' => $text('treatment'),
                'disposition' => $request->string('disposition')->value(), 'created_at' => $now,
            ];
            $id = DB::table('pe_referrals')->insertGetId($row);
            $event = fn (AuditAction $a, AuditTarget $t): AuditEvent => new AuditEvent(actorId: (string) $user->id, actorRole: 'staff', action: $a, targetType: $t, targetId: (string) $id, targetLabel: null, at: $now, subjectStudentId: (string) $studentId);
            $audit->record($event(AuditAction::Submit, AuditTarget::PeSportsReferral));
            if ($row['disposition'] === 'referred_to_hospital') {
                $audit->record($event(AuditAction::Create, AuditTarget::IncidentEscalation));
            }

            return [
                'id' => (string) $id, 'studentId' => (string) $studentId, 'referredBy' => $row['referred_by'], 'activity' => $row['activity'],
                'injurySummary' => $row['injury_summary'], 'clinicalAssessment' => $row['clinical_assessment'], 'treatment' => $row['treatment'],
                'disposition' => $row['disposition'], 'createdAt' => ClinicTime::iso($now),
            ];
        });

        return response()->json(['data' => $referral], 201);
    }

    /** @return array<string, mixed> the validated keys that were sent (an omitted field of a patch stays) */
    private static function input(Request $request): array
    {
        $input = [];
        foreach (array_keys(self::VISIT_RULES) as $key) {
            if (! str_contains($key, '.') && $request->exists($key)) {
                $input[$key] = $request->input($key);
            }
        }
        if (isset($input['itemsGiven']) && is_array($input['itemsGiven'])) {
            foreach ($input['itemsGiven'] as $line) {
                $q = is_array($line) ? ($line['quantity'] ?? null) : null;
                if (! is_int($q) || $q < 1) {
                    throw new BusinessRuleViolation('stock_rule', 'Quantities must be whole numbers of at least 1.');
                }
            }
        }
        if (array_key_exists('temperatureC', $input) && $input['temperatureC'] !== null && ! is_numeric($input['temperatureC'])) {
            throw ValidationException::withMessages(['temperatureC' => 'Body temperature must be a number.']);
        }

        return $input;
    }
}
