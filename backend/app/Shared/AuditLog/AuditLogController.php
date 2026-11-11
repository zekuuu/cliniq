<?php

declare(strict_types=1);

namespace App\Shared\AuditLog;

use App\Shared\Auth\ClinicUser;
use App\Shared\Support\ClinicTime;
use App\Shared\Support\Lrn;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * The Audit Log viewer and the two shared audit actions (API-Contract.md, Module 11).
 * Reading the log writes nothing (ADR-016), except its printout with `fullLrn=1` (ADR-044).
 * No route updates or deletes an entry.
 */
final class AuditLogController
{
    /** The filter buckets (mock `auditTargetTypes`). */
    public const BUCKETS = ['student', 'visit', 'incident', 'inventory', 'user', 'report', 'backup', 'follow-up',
        'calendar-event', 'sports-report', 'staff', 'backup-location', 'school-year'];

    /** Display word per recorded kind (mock `AUDIT_RECORD_KINDS`). */
    private const KINDS = [
        'student' => 'Student', 'visit' => 'Visit', 'incident' => 'Incident', 'incident-stage-1' => 'Incident',
        'incident-stage-2' => 'Incident', 'incident-report' => 'Incident report',
        'incident-escalation' => 'Incident escalation', 'parent-notification' => 'Parent notification',
        'excuse-letter' => 'Excuse letter', 'pe-sports-referral' => 'PE/Sports referral', 'inventory' => 'Inventory',
        'inventory-restock' => 'Inventory', 'inventory-dispense' => 'Inventory', 'inventory-dispensation' => 'Inventory',
        'inventory-adjustment' => 'Inventory', 'user' => 'User', 'follow-up' => 'Follow-up', 'followup' => 'Follow-up',
        'report' => 'Report', 'backup' => 'Backup', 'issue-report' => 'Issue report', 'calendar-event' => 'Calendar event',
        'sports-report' => 'Sports Report', 'staff' => 'Staff', 'backup-location' => 'Backup location',
        'school-year' => 'School year', 'print-document' => 'Printed document',
    ];

    /** Fixed print keys and the titles the server builds (contract Q18). */
    public const PRINTS = [
        'audit-log' => 'Audit Log', 'recovery-codes' => 'CLINIQ recovery codes', 'excuse-letter' => 'Clinic Excuse Letter',
        'incident-report' => 'Incident Report', 'sports-report' => 'Sports Report',
        'student-health-record' => 'Student Health Record', 'visit-details' => 'Visit Details',
        'student-profile' => 'Student profile', 'symptom-summary' => 'Symptom summary',
        'incident-register' => 'Incident register', 'monthly-clinic-report' => 'Monthly Clinic Report',
        'monthly-inventory' => 'Monthly Inventory',
    ];

    private const VIEWS = [
        'student' => ['students', 'Opened student profile'],
        'staff' => ['personnel', 'Opened staff profile'],
        'incident' => ['incidents', 'Opened incident report'],
    ];

    public function __construct(private readonly AuditLogger $audit) {}

    public static function bucket(string $recordType): string
    {
        return match (true) {
            str_starts_with($recordType, 'inventory') => 'inventory',
            $recordType === 'followup' => 'follow-up',
            str_starts_with($recordType, 'incident-stage'), $recordType === 'incident-report' => 'incident',
            in_array($recordType, self::BUCKETS, true) => $recordType,
            default => 'report',
        };
    }

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'from' => ['required', 'date_format:Y-m-d'],
            'to' => ['required', 'date_format:Y-m-d', 'after_or_equal:from'],
            'userId' => ['nullable', 'integer'],
            'actionTypes' => ['array'],
            'actionTypes.*' => [Rule::enum(AuditAction::class)],
            'targetTypes' => ['array'],
            'targetTypes.*' => [Rule::in(self::BUCKETS)],
            'fullLrn' => ['sometimes', 'boolean'],
        ]);
        $user = $this->clinicUser($request);
        $fullLrn = $request->boolean('fullLrn');
        if ($fullLrn && $user->clinicRole() !== ClinicUser::STAFF) {
            throw new AccessDeniedHttpException;
        }

        $buckets = self::strings($request->array('targetTypes'));
        $actions = self::strings($request->array('actionTypes'));
        // ponytail: whole list, no paging; add page/perPage (contract Q19) when the log nears 12,000 rows.
        $rows = DB::table('audit_logs as a')
            ->leftJoin('users as u', 'u.id', '=', 'a.actor_user_id')
            ->leftJoin('students as s', 's.id', '=', 'a.subject_student_id')
            ->leftJoin('personnel as p', 'p.id', '=', 'a.subject_personnel_id')
            ->whereBetween('a.occurred_at', [$request->string('from').' 00:00:00', $request->string('to').' 23:59:59'])
            ->when($request->integer('userId'), fn ($w, int $id) => $w->where('a.actor_user_id', $id))
            ->when($actions, fn ($w, array $types) => $w->whereIn('a.action_type', $types))
            ->orderByDesc('a.occurred_at')->orderByDesc('a.id')
            ->get(['a.*', 'u.name as user_name', 'u.role as user_role', 's.lrn', 'p.staff_number'])
            ->filter(fn (\stdClass $r): bool => $buckets === []
                || (($t = self::col($r, 'target_type')) !== null && in_array(self::bucket($t), $buckets, true)))
            ->map(fn (\stdClass $r): array => $this->row($r, $fullLrn))
            ->values();

        if ($fullLrn) {
            $this->audit->record($this->event($request, AuditAction::Print, AuditTarget::PrintDocument, null, self::PRINTS['audit-log']));
        }

        return response()->json([
            'rows' => $rows,
            'users' => DB::table('users')->orderBy('name')->get(['id', 'name'])
                ->map(fn (\stdClass $u): array => ['id' => self::col($u, 'id'), 'name' => self::col($u, 'name')]),
        ]);
    }

    public function view(Request $request): Response
    {
        $in = $request->validate(['type' => ['required', Rule::in(array_keys(self::VIEWS))], 'id' => ['required', 'integer']]);
        $type = $request->string('type')->value();
        $id = $request->integer('id');
        [$table, $summary] = self::VIEWS[$type];
        $record = DB::table($table)->find($id);
        if ($record === null) {
            throw new NotFoundHttpException;
        }

        $seen = 'cliniq.viewed.'.$type.'.'.$id;
        if (! $request->session()->has($seen)) {
            $request->session()->put($seen, true);
            $this->audit->record($this->event(
                $request, AuditAction::View, AuditTarget::from($type), (string) $id, null, $summary,
                student: $type === 'student' ? (string) $id : ($type === 'incident' ? self::col($record, 'student_id') : null),
                personnel: $type === 'staff' ? (string) $id : ($type === 'incident' ? self::col($record, 'personnel_id') : null),
            ));
        }

        return response()->noContent();
    }

    public function print(Request $request): Response
    {
        $in = $request->validate([
            'document' => ['required', Rule::in(array_keys(self::PRINTS))],
            'month' => ['nullable', 'date_format:Y-m'],
            'record' => ['nullable', 'array'],
            'record.type' => ['required_with:record', Rule::enum(AuditTarget::class)],
            'record.id' => ['required_with:record', 'integer'],
        ]);
        $title = self::PRINTS[$request->string('document')->value()];
        if ($request->filled('month')) {
            $title .= ' — '.CarbonImmutable::createFromFormat('!Y-m', $request->string('month')->value())?->format('F Y');
        }
        $record = $request->filled('record') ? [$request->string('record.type')->value(), $request->integer('record.id')] : null;
        $this->audit->record($record === null
            ? $this->event($request, AuditAction::Print, AuditTarget::PrintDocument, null, $title)
            : $this->event($request, AuditAction::Print, AuditTarget::from($record[0]), (string) $record[1], null, 'Printed '.$title));

        return response()->noContent();
    }

    /** @return array<string, mixed> */
    private function row(\stdClass $r, bool $fullLrn): array
    {
        $c = fn (string $col): ?string => self::col($r, $col);
        $at = CarbonImmutable::parse((string) $c('occurred_at'), config()->string('app.timezone'));
        $type = $c('target_type');
        $lrn = $c('lrn');
        $staffNumber = $c('staff_number');
        $label = $c('target_label');
        $target = null;
        if ($type !== null) {
            $target = array_filter([
                'type' => self::bucket($type),
                'recordType' => $type,
                'kind' => self::KINDS[$type] ?? 'Record',
                'id' => $c('target_id') ?? $label ?? '',
                'label' => match (true) {
                    $lrn !== null => $fullLrn ? $lrn : Lrn::mask($lrn),
                    $staffNumber !== null => $staffNumber,
                    default => $label ?? '',
                },
                'studentId' => $c('subject_student_id'),
            ], fn (?string $v): bool => $v !== null);
        }

        return array_filter([
            'id' => (string) $c('id'),
            'timestamp' => ClinicTime::date($at),
            'dateTime' => ClinicTime::iso($at),
            'userId' => $c('actor_user_id') ?? '',
            'userName' => $c('user_name') ?? 'Unknown user',
            'userRole' => $c('user_role'),
            'actionType' => $c('action_type'),
            'summary' => $c('summary') ?? ($type === null ? $label : null),
            'target' => $target,
        ], fn (mixed $v, string $k): bool => $v !== null || in_array($k, ['userRole', 'target'], true), ARRAY_FILTER_USE_BOTH);
    }

    /** One column of a query row as text (MariaDB hands back scalars or null). */
    private static function col(mixed $row, string $col): ?string
    {
        $v = is_object($row) ? ($row->{$col} ?? null) : null;

        return is_scalar($v) ? (string) $v : null;
    }

    /**
     * @param  array<mixed>  $values
     * @return list<string>
     */
    private static function strings(array $values): array
    {
        return array_values(array_filter($values, is_string(...)));
    }

    private function event(Request $request, AuditAction $action, AuditTarget $type, ?string $id, ?string $label,
        ?string $summary = null, ?string $student = null, ?string $personnel = null): AuditEvent
    {
        $user = $this->clinicUser($request);
        $actorId = $request->user()?->getAuthIdentifier();

        return new AuditEvent(
            actorId: is_scalar($actorId) ? (string) $actorId : null,
            actorRole: $user->clinicRole(),
            action: $action,
            targetType: $type,
            targetId: $id,
            targetLabel: $label,
            at: ClinicTime::now(),
            subjectStudentId: $student,
            subjectPersonnelId: $personnel,
            summary: $summary,
        );
    }

    private function clinicUser(Request $request): ClinicUser
    {
        $user = $request->user();
        assert($user instanceof ClinicUser);

        return $user;
    }
}
