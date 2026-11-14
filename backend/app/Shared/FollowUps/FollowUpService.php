<?php

declare(strict_types=1);

namespace App\Shared\FollowUps;

use App\Shared\AuditLog\AuditAction;
use App\Shared\AuditLog\AuditEvent;
use App\Shared\AuditLog\AuditLogger;
use App\Shared\AuditLog\AuditTarget;
use App\Shared\Http\BusinessRuleViolation;
use App\Shared\Settings\SettingsService;
use App\Shared\Support\ClinicTime;
use App\Shared\Support\Lrn;
use App\Shared\Support\Row;
use Carbon\CarbonImmutable;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Follow-ups (ADR-051), shared by visits and incidents. A pending follow-up more than
 * `follow_up_auto_close_days` past its date reads as Missed; `cliniq:close-missed-follow-ups` writes it
 * daily (contract Q7). A Missed one with a new date leaves the list; the record stays.
 *
 * @phpstan-type Input array{followUpDate: string, reason: string, notes: string|null, stayHomeUntilCleared: bool, stayHomeNote: string|null}
 */
final class FollowUpService
{
    public function __construct(private readonly AuditLogger $audit, private readonly SettingsService $settings) {}

    public static function autoClosedReason(int $days): string
    {
        return "No response (closed automatically after {$days} days)";
    }

    /**
     * @param  array{studentId: int|null, personnelId: int|null}  $patient
     * @param  Input  $input
     * @return array<string, mixed>
     */
    public function create(array $patient, string $sourceType, int $sourceId, array $input, int $userId, CarbonImmutable $now): array
    {
        $date = $input['followUpDate'];
        $d = \DateTimeImmutable::createFromFormat('!Y-m-d', $date);
        if ($d === false || $d->format('Y-m-d') !== $date) {
            throw ValidationException::withMessages(['followUp.followUpDate' => 'Choose the follow-up date.']);
        }
        $reason = trim($input['reason']);
        if ($reason === '') {
            throw ValidationException::withMessages(['followUp.reason' => 'Give the reason for the follow-up.']);
        }
        $id = DB::table('follow_ups')->insertGetId([
            'student_id' => $patient['studentId'], 'personnel_id' => $patient['personnelId'],
            ($sourceType === 'visit' ? 'visit_id' : 'incident_id') => $sourceId,
            'follow_up_date' => $date, 'reason' => mb_substr($reason, 0, 255), 'notes' => trim((string) $input['notes']) ?: null,
            'stay_home_until_cleared' => $input['stayHomeUntilCleared'] ? 1 : 0,
            'stay_home_note' => $input['stayHomeUntilCleared'] ? (trim((string) $input['stayHomeNote']) ?: null) : null,
            'created_by_user_id' => $userId, 'created_at' => $now,
        ]);
        $this->record($userId, $id, null, $now, AuditAction::Create);

        return $this->find($id);
    }

    /** @return list<array<string, mixed>> `FollowUpView[]` by date, masked number, with `dueState` */
    public function list(string $status): array
    {
        $rows = $this->rows(DB::table('follow_ups as f')->orderBy('f.follow_up_date')->orderBy('f.id'));
        $out = [];
        foreach ($rows as $f) {
            if ($status !== '' && $f['status'] !== $status) {
                continue;
            }
            if ($f['status'] === 'missed' && $this->hasLater($f)) {
                continue;
            }
            $out[] = $f + ['dueState' => $this->dueState($f)];
        }

        return $out;
    }

    /** @return list<array<string, mixed>> a staff patient's follow-ups, newest date first (the history) */
    public function forPersonnel(int $personnelId, int $limit): array
    {
        $rows = $this->rows(DB::table('follow_ups as f')->where('f.personnel_id', $personnelId)->orderByDesc('f.follow_up_date')->orderByDesc('f.id')->limit($limit));

        return array_map(function (array $f): array {
            unset($f['patient']);

            return $f;
        }, $rows);
    }

    /** @return array<string, mixed> */
    public function find(int $id): array
    {
        $row = $this->rows(DB::table('follow_ups as f')->where('f.id', $id))[0] ?? null;
        abort_if($row === null, 404);
        unset($row['patient']);

        return $row;
    }

    /** Cancelled needs a reason; Missed's is optional. The reason stays on the record, not in the audit. */
    /** @return array<string, mixed> */
    public function setStatus(int $id, string $status, ?string $reason, int $userId): array
    {
        $current = $this->find($id);
        $why = trim((string) $reason);
        if ($status === 'cancelled' && $why === '') {
            throw ValidationException::withMessages(['reason' => "Give the reason this follow-up is {$status}."]);
        }
        $now = CarbonImmutable::now();
        DB::transaction(function () use ($id, $status, $why, $userId, $now, $current): void {
            DB::table('follow_ups')->where('id', $id)->update(['status' => $status, 'status_updated_at' => $now, 'status_updated_by_user_id' => $userId]
                + (in_array($status, ['missed', 'cancelled'], true) ? ['status_reason' => $why === '' ? null : mb_substr($why, 0, 340)] : []));
            $this->record($userId, $id, $current['status'] === $status ? null : "Marked {$status}", $now, AuditAction::Update);
        });

        return $this->find($id);
    }

    /** "Set a new date" after Missed, or once a pending one reads as Missed (ADR-051); written Missed then. */
    /** @return array<string, mixed> */
    public function reschedule(int $id, string $date, int $userId): array
    {
        $old = $this->find($id);
        if ($old['status'] !== 'missed') {
            throw new BusinessRuleViolation('follow_up_state', 'Only a missed follow-up gets a new date.');
        }
        if ($this->hasLater($old)) {
            throw new BusinessRuleViolation('follow_up_state', 'This follow-up already has a new date.');
        }
        if ($date === '' || $date < ClinicTime::today()) {
            throw ValidationException::withMessages(['followUpDate' => "The new date can't be in the past."]);
        }
        $now = CarbonImmutable::now();

        return DB::transaction(function () use ($old, $id, $date, $userId, $now): array {
            DB::table('follow_ups')->where('id', $id)->update(['status' => 'missed', 'status_reason' => $old['statusReason']]);
            $source = is_array($old['relatedRecord']) ? $old['relatedRecord'] : [];
            $notes = Row::text($old['notes']);
            $stayNote = Row::text($old['stayHomeNote']);

            return $this->create(
                ['studentId' => Row::toInt($old['studentId']), 'personnelId' => Row::toInt($old['personnelId'])],
                Row::text($source['type'] ?? ''), (int) Row::toInt($source['id'] ?? null),
                ['followUpDate' => $date, 'reason' => Row::text($old['reason']), 'notes' => $notes === '' ? null : $notes, 'stayHomeUntilCleared' => $old['stayHomeUntilCleared'] === true, 'stayHomeNote' => $stayNote === '' ? null : $stayNote],
                $userId, $now,
            );
        });
    }

    /** A visit entered in error cancels its pending follow-ups with the reason. */
    public function cancelForVisit(int $visitId, string $reason, int $userId, CarbonImmutable $now): void
    {
        foreach (DB::table('follow_ups')->where('visit_id', $visitId)->where('status', 'pending')->pluck('id') as $id) {
            DB::table('follow_ups')->where('id', $id)->update(['status' => 'cancelled', 'status_reason' => mb_substr("Visit entered in error: {$reason}", 0, 340), 'status_updated_at' => $now, 'status_updated_by_user_id' => $userId]);
            $this->record($userId, (int) (is_numeric($id) ? $id : 0), 'Marked cancelled: visit entered in error', $now, AuditAction::Update);
        }
    }

    /** The daily job: writes Missed on pending follow-ups past the auto-close limit. Returns how many. */
    public function closeMissed(): int
    {
        $days = $this->settings->int('follow_up_auto_close_days');

        return DB::table('follow_ups')->where('status', 'pending')->where('follow_up_date', '<', CarbonImmutable::parse(ClinicTime::today())->subDays($days)->format('Y-m-d'))
            ->update(['status' => 'missed', 'status_reason' => self::autoClosedReason($days), 'status_updated_at' => CarbonImmutable::now()]);
    }

    /**
     * @return list<array<string, mixed>> `FollowUp` with the auto-close applied on read, plus `patient`
     */
    private function rows(Builder $query): array
    {
        $days = $this->settings->int('follow_up_auto_close_days');
        $today = ClinicTime::today();
        $rows = $query->leftJoin('students as s', 's.id', '=', 'f.student_id')->leftJoin('personnel as p', 'p.id', '=', 'f.personnel_id')
            ->get(['f.*', 's.lrn', 'p.staff_number']);
        $out = [];
        foreach ($rows as $f) {
            $status = (string) Row::str($f, 'status');
            $reason = Row::str($f, 'status_reason');
            $date = (string) Row::str($f, 'follow_up_date');
            if ($status === 'pending' && CarbonImmutable::parse($date)->diffInDays(CarbonImmutable::parse($today), false) > $days) {
                [$status, $reason] = ['missed', self::autoClosedReason($days)];
            }
            $visit = Row::int($f, 'visit_id');
            $out[] = [
                'id' => (string) Row::int($f, 'id'), 'studentId' => Row::str($f, 'student_id'), 'personnelId' => Row::str($f, 'personnel_id'),
                'relatedRecord' => ['type' => $visit !== null ? 'visit' : 'incident', 'id' => (string) ($visit ?? Row::int($f, 'incident_id'))],
                'followUpDate' => $date, 'reason' => (string) Row::str($f, 'reason'), 'status' => $status, 'notes' => Row::str($f, 'notes'),
                'createdByUserId' => (string) Row::int($f, 'created_by_user_id'), 'statusReason' => $reason,
                'stayHomeUntilCleared' => Row::str($f, 'stay_home_until_cleared') === '1', 'stayHomeNote' => Row::str($f, 'stay_home_note'),
                'patient' => Row::str($f, 'lrn') !== null
                    ? ['kind' => 'student', 'number' => Lrn::mask((string) Row::str($f, 'lrn'))]
                    : ['kind' => 'personnel', 'number' => (string) Row::str($f, 'staff_number')],
            ];
        }

        return $out;
    }

    /** @param array<string, mixed> $f */
    private function dueState(array $f): ?string
    {
        if ($f['status'] !== 'pending') {
            return null;
        }
        $passed = (int) CarbonImmutable::parse(Row::text($f['followUpDate']))->diffInDays(CarbonImmutable::parse(ClinicTime::today()), false);

        return match (true) {
            $passed < 0 => 'upcoming',
            $passed === 0 => 'due_today',
            $passed <= $this->settings->int('follow_up_overdue_after_days') => 'due',
            default => 'overdue',
        };
    }

    /**
     * A later follow-up with the same patient, record and reason (no link field in the ERD).
     *
     * @param  array<string, mixed>  $f
     */
    private function hasLater(array $f): bool
    {
        $source = is_array($f['relatedRecord']) ? $f['relatedRecord'] : [];

        return DB::table('follow_ups')->where('id', '>', (int) Row::toInt($f['id']))->where('reason', $f['reason'])
            ->where(($source['type'] ?? '') === 'visit' ? 'visit_id' : 'incident_id', $source['id'] ?? 0)
            ->where('student_id', $f['studentId'])->where('personnel_id', $f['personnelId'])->exists();
    }

    private function record(int $userId, int $id, ?string $summary, CarbonImmutable $now, AuditAction $action): void
    {
        $this->audit->record(new AuditEvent(
            actorId: (string) $userId, actorRole: 'staff', action: $action, targetType: AuditTarget::FollowUp,
            targetId: (string) $id, targetLabel: null, at: $now, summary: $summary,
        ));
    }
}
