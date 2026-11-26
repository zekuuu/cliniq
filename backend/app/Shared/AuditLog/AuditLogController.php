<?php

declare(strict_types=1);

namespace App\Shared\AuditLog;

use App\Shared\Auth\ClinicUser;
use App\Shared\Http\Paging;
use App\Shared\Support\ClinicTime;
use App\Shared\Support\Lrn;
use App\Shared\Support\Row;
use Carbon\CarbonImmutable;
use Illuminate\Database\Query\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;
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
        $this->validateFilters($request);
        $user = $this->clinicUser($request);
        $fullLrn = $request->boolean('fullLrn');
        if ($fullLrn && $user->clinicRole() !== ClinicUser::STAFF) {
            throw new AccessDeniedHttpException;
        }

        $query = $this->filteredQuery($request);
        if (Paging::wanted($request)) {
            [$sort, $direction] = Paging::sort($request, ['timestamp', 'user', 'action', 'module', 'record'], '-timestamp');
            match ($sort) {
                'user' => $query->orderByRaw("COALESCE(u.name, 'Unknown user') {$direction}"),
                'action' => $query->orderByRaw(self::ACTION_SQL." {$direction}"),
                'module' => $query->orderByRaw(self::KIND_SQL." {$direction}"),
                'record' => $query->orderByRaw(self::LABEL_SQL." {$direction}"),
                default => $query->orderBy('a.occurred_at', $direction)->orderBy('a.id', $direction),
            };
            [$rows, $meta] = Paging::sql($request, $query->orderByDesc('a.occurred_at')->orderByDesc('a.id'), fn (\stdClass $r): array => $this->row($r, false));

            return response()->json(['data' => ['rows' => $rows, 'users' => $this->users()], 'meta' => $meta]);
        }

        // The whole list: the printout (with `fullLrn`) and the mock's contract (Q19).
        $rows = $query->orderByDesc('a.occurred_at')->orderByDesc('a.id')->get()->map(fn (\stdClass $r): array => $this->row($r, $fullLrn))->values();
        if ($fullLrn) {
            $this->audit->record($this->event($request, AuditAction::Print, AuditTarget::PrintDocument, null, self::PRINTS['audit-log']));
        }

        // `{ data: AuditLogList }` like every other success (contract "Format"; fixed for the frontend switch-over, ADR-080).
        return response()->json(['data' => ['rows' => $rows, 'users' => $this->users()]]);
    }

    private function validateFilters(Request $request): void
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
            'search' => ['nullable', 'string', 'max:120'],
        ]);
    }

    private function filteredQuery(Request $request): Builder
    {
        $buckets = self::strings($request->array('targetTypes'));
        $actions = self::strings($request->array('actionTypes'));
        $query = DB::table('audit_logs as a')
            ->leftJoin('users as u', 'u.id', '=', 'a.actor_user_id')
            ->leftJoin('students as s', 's.id', '=', 'a.subject_student_id')
            ->leftJoin('personnel as p', 'p.id', '=', 'a.subject_personnel_id')
            ->select(['a.*', 'u.name as user_name', 'u.role as user_role', 's.lrn', 'p.staff_number'])
            ->whereBetween('a.occurred_at', [$request->string('from').' 00:00:00', $request->string('to').' 23:59:59'])
            ->when($request->integer('userId'), fn ($w, int $id) => $w->where('a.actor_user_id', $id))
            ->when($actions, fn ($w, array $types) => $w->whereIn('a.action_type', $types))
            ->when($buckets, fn ($w, array $chosen) => $w->whereNotNull('a.target_type')->whereIn(DB::raw(self::BUCKET_SQL), $chosen));
        $search = mb_strtolower(trim($request->string('search')->value()));
        if ($search !== '') {
            // The shown words only (the screen's rule): never a hidden student detail (ADR-082).
            $like = '%'.addcslashes($search, '%_\\').'%';
            $query->where(function (Builder $w) use ($like): void {
                foreach ([
                    "COALESCE(u.name, 'Unknown user')", "CASE u.role WHEN 'staff' THEN 'School Clinician' WHEN 'admin' THEN 'Admin / Principal' ELSE '' END",
                    self::ACTION_SQL, "COALESCE(a.summary, '')", self::KIND_SQL, self::LABEL_SQL,
                ] as $text) {
                    $w->orWhereRaw("LOWER({$text}) LIKE ?", [$like]);
                }
            });
        }

        return $query;
    }

    /** A single Staff-only, bounded-memory A4 print document for every matching entry. */
    public function printDocument(Request $request): StreamedResponse
    {
        $this->validateFilters($request);
        if ($this->clinicUser($request)->clinicRole() !== ClinicUser::STAFF) {
            throw new AccessDeniedHttpException;
        }
        $query = $this->filteredQuery($request);
        // Freeze the result before writing its own audit entry, so the new print does not appear
        // halfway through the document or change the count while chunks are being read.
        $lastId = Row::toInt(DB::table('audit_logs')->max('id')) ?? 0;
        $query->where('a.id', '<=', $lastId);
        $total = (clone $query)->count();
        [$sort, $direction] = Paging::sort($request, ['timestamp', 'user', 'action', 'module', 'record'], '-timestamp');
        match ($sort) {
            'user' => $query->orderByRaw("COALESCE(u.name, 'Unknown user') {$direction}"),
            'action' => $query->orderByRaw(self::ACTION_SQL." {$direction}"),
            'module' => $query->orderByRaw(self::KIND_SQL." {$direction}"),
            'record' => $query->orderByRaw(self::LABEL_SQL." {$direction}"),
            default => null,
        };
        $query->orderBy('a.occurred_at', $sort === 'timestamp' ? $direction : 'desc')
            ->orderBy('a.id', $sort === 'timestamp' ? $direction : 'desc');
        $scope = $this->printScope($request);
        $nonce = base64_encode(random_bytes(16));
        $this->audit->record($this->event($request, AuditAction::Print, AuditTarget::PrintDocument, null, self::PRINTS['audit-log']));

        return response()->stream(function () use ($query, $total, $scope, $nonce): void {
            echo AuditPrintHtml::start($total, $scope);
            $printed = 0;
            foreach ($query->lazy(1000) as $raw) {
                echo AuditPrintHtml::row($this->row($raw, true));
                $printed++;
                if ($printed % 1000 === 0) {
                    if (ob_get_level() > 0) {
                        ob_flush();
                    }
                    flush();
                }
            }
            echo AuditPrintHtml::end($nonce);
        }, 200, [
            'Content-Type' => 'text/html; charset=UTF-8',
            'Cache-Control' => 'no-store, private',
            'Content-Security-Policy' => "default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'nonce-{$nonce}'; base-uri 'none'; frame-ancestors 'none'",
            'X-Content-Type-Options' => 'nosniff',
            'Referrer-Policy' => 'no-referrer',
            'X-Accel-Buffering' => 'no',
        ]);
    }

    private function printScope(Request $request): string
    {
        $parts = [
            'Dates '.$request->string('from')->value().' to '.$request->string('to')->value(),
            $request->filled('userId')
                ? 'user '.Row::text(DB::table('users')->where('id', $request->integer('userId'))->value('name') ?? 'Unknown user')
                : 'all users',
            $request->array('actionTypes') === [] ? 'all actions' : 'actions '.implode(', ', self::strings($request->array('actionTypes'))),
            $request->array('targetTypes') === [] ? 'all targets' : 'targets '.implode(', ', self::strings($request->array('targetTypes'))),
        ];
        if ($request->filled('search')) {
            $parts[] = 'search "'.trim($request->string('search')->value()).'"';
        }

        return implode('; ', $parts);
    }

    /** @return Collection<int, array{id: ?string, name: ?string}> */
    private function users(): Collection
    {
        return DB::table('users')->orderBy('name')->get(['id', 'name'])
            ->map(fn (\stdClass $u): array => ['id' => self::col($u, 'id'), 'name' => self::col($u, 'name')]);
    }

    /** `bucket()` in SQL, for the Module filter. Keep the IN list equal to `BUCKETS`. */
    private const BUCKET_SQL = "(CASE WHEN a.target_type LIKE 'inventory%' THEN 'inventory' WHEN a.target_type = 'followup' THEN 'follow-up'"
        ." WHEN a.target_type LIKE 'incident-stage%' OR a.target_type = 'incident-report' THEN 'incident'"
        ." WHEN a.target_type IN ('student', 'visit', 'incident', 'inventory', 'user', 'report', 'backup', 'follow-up', 'calendar-event', 'sports-report', 'staff', 'backup-location', 'school-year')"
        ." THEN a.target_type ELSE 'report' END)";

    /** The Module column's word (`KINDS`, kept equal); no target reads "No record", as on the screen. */
    private const KIND_SQL = "(CASE WHEN a.target_type IS NULL THEN 'No record' ELSE (CASE a.target_type"
        ." WHEN 'student' THEN 'Student' WHEN 'visit' THEN 'Visit' WHEN 'incident' THEN 'Incident' WHEN 'incident-stage-1' THEN 'Incident'"
        ." WHEN 'incident-stage-2' THEN 'Incident' WHEN 'incident-report' THEN 'Incident report' WHEN 'incident-escalation' THEN 'Incident escalation'"
        ." WHEN 'parent-notification' THEN 'Parent notification' WHEN 'excuse-letter' THEN 'Excuse letter' WHEN 'pe-sports-referral' THEN 'PE/Sports referral'"
        ." WHEN 'inventory' THEN 'Inventory' WHEN 'inventory-restock' THEN 'Inventory' WHEN 'inventory-dispense' THEN 'Inventory'"
        ." WHEN 'inventory-dispensation' THEN 'Inventory' WHEN 'inventory-adjustment' THEN 'Inventory' WHEN 'user' THEN 'User'"
        ." WHEN 'follow-up' THEN 'Follow-up' WHEN 'followup' THEN 'Follow-up' WHEN 'report' THEN 'Report' WHEN 'backup' THEN 'Backup'"
        ." WHEN 'issue-report' THEN 'Issue report' WHEN 'calendar-event' THEN 'Calendar event' WHEN 'sports-report' THEN 'Sports Report'"
        ." WHEN 'staff' THEN 'Staff' WHEN 'backup-location' THEN 'Backup location' WHEN 'school-year' THEN 'School year'"
        ." WHEN 'print-document' THEN 'Printed document' ELSE 'Record' END) END)";

    /** The Record column as shown: the masked LRN, the Staff No., or the stored label. */
    private const LABEL_SQL = "(CASE WHEN a.target_type IS NULL THEN '' WHEN s.lrn IS NOT NULL THEN CONCAT('●●●●●●●●', RIGHT(s.lrn, 4))"
        ." WHEN p.staff_number IS NOT NULL THEN p.staff_number ELSE COALESCE(a.target_label, '') END)";

    /** The Action column's words (frontend `AUDIT_ACTION_LABELS`). */
    private const ACTION_SQL = "(CASE a.action_type WHEN 'login' THEN 'Login' WHEN 'logout' THEN 'Logout' WHEN 'submit' THEN 'Submit' WHEN 'approve' THEN 'Approve'"
        ." WHEN 'create' THEN 'Create' WHEN 'update' THEN 'Update' WHEN 'delete' THEN 'Delete' WHEN 'archive' THEN 'Archive'"
        ." WHEN 'print' THEN 'Print / Save as PDF' WHEN 'view' THEN 'Viewed a record' ELSE a.action_type END)";

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
