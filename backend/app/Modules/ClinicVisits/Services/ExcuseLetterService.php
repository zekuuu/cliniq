<?php

declare(strict_types=1);

namespace App\Modules\ClinicVisits\Services;

use App\Shared\AuditLog\AuditAction;
use App\Shared\AuditLog\AuditEvent;
use App\Shared\AuditLog\AuditLogger;
use App\Shared\AuditLog\AuditTarget;
use App\Shared\Http\BusinessRuleViolation;
use App\Shared\Sequences\Sequences;
use App\Shared\Support\ClinicTime;
use App\Shared\Support\Lrn;
use App\Shared\Support\PersonName;
use App\Shared\Support\Row;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Excuse letters (ADR-049). One row per letter in `excuse_letters`: a visit's draft, then the same row
 * approved with its final wording stored; a replacement supersedes it and opens a new draft; a visit
 * entered in error voids it. At most one draft or approved letter per visit (`live_visit_id`).
 *
 * @phpstan-type Draft array{excusedFrom: string, excusedUntil: string, note: string|null, stayHomeUntilCleared: bool, stayHomeNote: string|null}
 */
final class ExcuseLetterService
{
    public const RECIPIENT = 'Class Adviser';

    public function __construct(private readonly AuditLogger $audit) {}

    /** `excusedPeriodError`. */
    public static function periodError(string $from, string $until): ?string
    {
        if ($from === '' || $until === '') {
            return 'Excused from and Excused until are both required.';
        }
        foreach ([$from, $until] as $date) {
            $d = \DateTimeImmutable::createFromFormat('!Y-m-d', $date);
            if ($d === false || $d->format('Y-m-d') !== $date) {
                return 'Excused from and Excused until are both required.';
            }
        }

        return $until < $from ? "Excused until can't be before Excused from." : null;
    }

    /** @return Draft|null the visit's draft, as `Visit.excuseLetterDraft` */
    public function draft(int $visitId): ?array
    {
        $row = DB::table('excuse_letters')->where('visit_id', $visitId)->where('status', 'draft')->first();

        return $row === null ? null : self::draftShape($row);
    }

    public function hasApproval(int $visitId): bool
    {
        return DB::table('excuse_letters')->where('visit_id', $visitId)->where('status', 'approved')->exists();
    }

    /**
     * Saves (or clears, with null) the visit's draft.
     *
     * @param  Draft|null  $draft
     */
    public function saveDraft(int $visitId, ?array $draft, int $userId): void
    {
        if ($draft === null) {
            DB::table('excuse_letters')->where('visit_id', $visitId)->where('status', 'draft')->delete();

            return;
        }
        $values = [
            'excused_from' => $draft['excusedFrom'], 'excused_until' => $draft['excusedUntil'], 'teacher_note' => $draft['note'],
            'stay_home_until_cleared' => $draft['stayHomeUntilCleared'] ? 1 : 0, 'stay_home_note' => $draft['stayHomeUntilCleared'] ? $draft['stayHomeNote'] : null,
        ];
        $existing = DB::table('excuse_letters')->where('visit_id', $visitId)->where('status', 'draft')->value('id');
        if ($existing !== null) {
            DB::table('excuse_letters')->where('id', $existing)->update($values);
        } else {
            DB::table('excuse_letters')->insert($values + ['visit_id' => $visitId, 'status' => 'draft', 'prepared_by_user_id' => $userId]);
        }
    }

    /**
     * Approves and stores a letter with its final wording; the draft becomes the approved letter (ADR-049, D6).
     *
     * @param  array{excusedFrom: string, excusedUntil: string, note: string|null, recipient: string|null, body: string|null, stayHomeUntilCleared: bool, stayHomeNote: string|null}  $input
     * @return array<string, mixed>
     */
    public function approve(int $visitId, array $input, int $userId): array
    {
        $visit = DB::table('visits')->where('id', $visitId)->first();
        abort_if($visit === null, 404);
        if (Row::int($visit, 'personnel_id') !== null) {
            throw new BusinessRuleViolation('wrong_patient', 'An excuse letter is only for a student.');
        }
        if (Row::str($visit, 'entered_in_error_at') !== null) {
            throw new BusinessRuleViolation('visit_entered_in_error', 'This visit was entered in error, so its excuse letter is void.');
        }
        $invalid = self::periodError($input['excusedFrom'], $input['excusedUntil']);
        if ($invalid !== null) {
            throw ValidationException::withMessages(['excusedFrom' => $invalid]);
        }
        if ($this->hasApproval($visitId)) {
            throw new BusinessRuleViolation('excuse_letter', 'This excuse letter is already approved and stored.');
        }
        $now = CarbonImmutable::now();
        $student = DB::table('students')->where('id', Row::int($visit, 'student_id'))->first();
        $name = $student === null ? '' : PersonName::format((string) Row::str($student, 'first_name'), Row::str($student, 'middle_name'), (string) Row::str($student, 'last_name'));
        $body = trim((string) $input['body']) !== '' ? trim((string) $input['body'])
            : self::body($name, substr((string) Row::str($visit, 'visited_at'), 0, 10), $input['excusedFrom'], $input['excusedUntil']);
        $year = ClinicTime::today();
        $values = [
            'status' => 'approved', 'excused_from' => $input['excusedFrom'], 'excused_until' => $input['excusedUntil'],
            'teacher_note' => trim((string) $input['note']) ?: null,
            'stay_home_until_cleared' => $input['stayHomeUntilCleared'] ? 1 : 0, 'stay_home_note' => $input['stayHomeUntilCleared'] ? (trim((string) $input['stayHomeNote']) ?: null) : null,
            'recipient' => trim((string) $input['recipient']) ?: self::RECIPIENT, 'snapshot_text' => $body,
            'approved_by_user_id' => $userId, 'approved_at' => $now,
            'reference_no' => sprintf('EL-%s-%04d', substr($year, 0, 4), Sequences::next('excuse_letter', substr($year, 0, 4))),
        ];
        $draft = DB::table('excuse_letters')->where('visit_id', $visitId)->where('status', 'draft')->value('id');
        if ($draft !== null) {
            DB::table('excuse_letters')->where('id', $draft)->update($values);
            $id = (int) (is_numeric($draft) ? $draft : 0);
        } else {
            $id = DB::table('excuse_letters')->insertGetId($values + ['visit_id' => $visitId, 'prepared_by_user_id' => $userId]);
        }
        $this->record($userId, AuditAction::Approve, $id, null, $now);

        return $this->byId($id);
    }

    /** "Issue a replacement" (panel review EX-3): supersede the approved letter and open a draft with its period. */
    public function replace(int $visitId, string $reason, int $userId): void
    {
        $visit = DB::table('visits')->where('id', $visitId)->first();
        abort_if($visit === null, 404);
        $why = trim($reason);
        if ($why === '') {
            throw ValidationException::withMessages(['reason' => 'Give the reason for the replacement.']);
        }
        $old = $this->current($visitId);
        if ($old === null) {
            throw new BusinessRuleViolation('excuse_letter', 'Only an approved letter can be replaced.');
        }
        if (Row::str($old, 'status') === 'voided' || Row::str($visit, 'entered_in_error_at') !== null) {
            throw new BusinessRuleViolation('excuse_letter', 'A voided letter cannot be replaced.');
        }
        $now = CarbonImmutable::now();
        $id = (int) Row::int($old, 'id');
        DB::table('excuse_letters')->where('id', $id)->update(['status' => 'superseded', 'superseded_at' => $now, 'superseded_by_user_id' => $userId, 'superseded_reason' => mb_substr($why, 0, 300)]);
        DB::table('excuse_letters')->insert([
            'visit_id' => $visitId, 'status' => 'draft', 'excused_from' => Row::str($old, 'excused_from'), 'excused_until' => Row::str($old, 'excused_until'),
            'teacher_note' => Row::str($old, 'teacher_note'), 'stay_home_until_cleared' => Row::int($old, 'stay_home_until_cleared') ?? 0,
            'stay_home_note' => Row::str($old, 'stay_home_note'), 'prepared_by_user_id' => $userId,
        ]);
        $this->record($userId, AuditAction::Update, $id, 'Superseded; replacement draft opened', $now);
    }

    /** A visit entered in error voids its letter, draft or approved. */
    public function void(int $visitId, string $reason, int $userId, CarbonImmutable $now): void
    {
        $letter = DB::table('excuse_letters')->where('visit_id', $visitId)->whereIn('status', ['draft', 'approved'])->first();
        if ($letter === null) {
            return;
        }
        $id = (int) Row::int($letter, 'id');
        DB::table('excuse_letters')->where('id', $id)->update(['status' => 'voided', 'voided_at' => $now, 'voided_by_user_id' => $userId, 'voided_reason' => mb_substr($reason, 0, 300)]);
        $this->record($userId, AuditAction::Update, $id, 'Voided: visit entered in error', $now);
    }

    /** @return array<string, mixed>|null the visit's current letter: approved or voided, never superseded or a draft */
    public function forVisit(int $visitId): ?array
    {
        $row = $this->current($visitId);

        return $row === null ? null : self::approval($row);
    }

    /** @return array<string, mixed> */
    public function byId(int $id): array
    {
        $row = DB::table('excuse_letters')->where('id', $id)->first();
        abort_if($row === null, 404);

        return self::approval($row);
    }

    /** @return list<array{visitId: string, visitDateTime: string, lrn: string, excusedFrom: string, excusedUntil: string}> drafts for active students, oldest visit first, masked */
    public function pending(): array
    {
        return array_values(DB::table('excuse_letters as l')->join('visits as v', 'v.id', '=', 'l.visit_id')->join('students as s', 's.id', '=', 'v.student_id')
            ->where('l.status', 'draft')->whereNull('s.archived_at')->whereNull('v.entered_in_error_at')->orderBy('v.visited_at')
            ->get(['v.id', 'v.visited_at', 's.lrn', 'l.excused_from', 'l.excused_until'])
            ->map(fn (object $r): array => [
                'visitId' => (string) Row::int($r, 'id'), 'visitDateTime' => ClinicTime::iso(CarbonImmutable::parse((string) Row::str($r, 'visited_at'))),
                'lrn' => Lrn::mask((string) Row::str($r, 'lrn')), 'excusedFrom' => (string) Row::str($r, 'excused_from'), 'excusedUntil' => (string) Row::str($r, 'excused_until'),
            ])->all());
    }

    /** @return list<array<string, mixed>> `StudentExcuseLetter[]`, newest period first */
    public function forStudent(int $studentId): array
    {
        return array_values(DB::table('excuse_letters as l')->join('visits as v', 'v.id', '=', 'l.visit_id')->where('v.student_id', $studentId)
            ->orderByDesc('l.excused_from')->orderByDesc('l.id')
            ->get(['l.id', 'l.visit_id', 'l.status', 'l.excused_from', 'l.excused_until', 'v.disposition', 'v.entered_in_error_at'])
            ->map(function (object $r): array {
                $status = match (Row::str($r, 'status')) {
                    'draft' => 'pending', 'superseded' => 'superseded', 'voided' => 'voided',
                    default => Row::str($r, 'entered_in_error_at') !== null ? 'voided' : 'approved',
                };
                $disposition = (string) Row::str($r, 'disposition');

                return [
                    'id' => (string) Row::int($r, 'id'), 'visitId' => (string) Row::int($r, 'visit_id'), 'disposition' => $disposition,
                    'excusedFrom' => (string) Row::str($r, 'excused_from'), 'excusedUntil' => (string) Row::str($r, 'excused_until'), 'status' => $status,
                    'outcomeChanged' => $status === 'approved' && ! in_array($disposition, ['sent_home', 'referred_to_hospital'], true),
                ];
            })->all());
    }

    /** `excuseLetterBody` in `frontend/src/lib/excuseLetter.ts`. */
    public static function body(string $fullName, string $visitDate, string $from, string $until): string
    {
        $fmt = fn (string $d): string => CarbonImmutable::parse($d)->format('M j, Y');
        $dates = $from === $until ? 'on '.$fmt($from) : 'from '.$fmt($from).' to '.$fmt($until);

        return implode("\n\n", [
            "This is to confirm that {$fullName} visited the school clinic on {$fmt($visitDate)}.",
            "The student was assessed by the clinic staff and is excused {$dates}.",
            'This clinic excuse letter is for school attendance documentation only.',
        ]);
    }

    private function current(int $visitId): ?object
    {
        return DB::table('excuse_letters')->where('visit_id', $visitId)->whereIn('status', ['approved', 'voided'])->orderByDesc('id')->first();
    }

    /** @return Draft */
    private static function draftShape(object $r): array
    {
        return [
            'excusedFrom' => (string) Row::str($r, 'excused_from'), 'excusedUntil' => (string) Row::str($r, 'excused_until'), 'note' => Row::str($r, 'teacher_note'),
            'stayHomeUntilCleared' => Row::str($r, 'stay_home_until_cleared') === '1', 'stayHomeNote' => Row::str($r, 'stay_home_note'),
        ];
    }

    /** @return array<string, mixed> `ExcuseLetterApproval` */
    private static function approval(object $r): array
    {
        $at = fn (string $col): ?string => ($v = Row::str($r, $col)) === null ? null : ClinicTime::iso(CarbonImmutable::parse($v));

        return [
            'id' => (string) Row::int($r, 'id'), 'visitId' => (string) Row::int($r, 'visit_id'), 'status' => Row::str($r, 'status'),
            'referenceNo' => Row::str($r, 'reference_no'), 'approvedByUserId' => Row::str($r, 'approved_by_user_id'), 'approvedAt' => $at('approved_at'),
            'excusedFrom' => Row::str($r, 'excused_from'), 'excusedUntil' => Row::str($r, 'excused_until'), 'note' => Row::str($r, 'teacher_note'),
            'recipient' => Row::str($r, 'recipient'), 'body' => Row::str($r, 'snapshot_text'),
            'stayHomeUntilCleared' => Row::str($r, 'stay_home_until_cleared') === '1', 'stayHomeNote' => Row::str($r, 'stay_home_note'),
            'voided' => $at('voided_at') === null ? null : ['reason' => Row::str($r, 'voided_reason'), 'at' => $at('voided_at'), 'byUserId' => Row::str($r, 'voided_by_user_id')],
            'superseded' => $at('superseded_at') === null ? null : ['reason' => Row::str($r, 'superseded_reason'), 'at' => $at('superseded_at'), 'byUserId' => Row::str($r, 'superseded_by_user_id')],
        ];
    }

    private function record(int $userId, AuditAction $action, int $letterId, ?string $summary, CarbonImmutable $now): void
    {
        $this->audit->record(new AuditEvent(
            actorId: (string) $userId, actorRole: 'staff', action: $action, targetType: AuditTarget::ExcuseLetter,
            targetId: (string) $letterId, targetLabel: null, at: $now, summary: $summary,
        ));
    }
}
