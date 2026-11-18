<?php

declare(strict_types=1);

namespace App\Modules\ClinicVisits\Services;

use App\Modules\InventoryTracker\Services\StockService;
use App\Shared\AuditLog\AuditAction;
use App\Shared\AuditLog\AuditEvent;
use App\Shared\AuditLog\AuditLogger;
use App\Shared\AuditLog\AuditTarget;
use App\Shared\AuditLog\DatabaseAuditLogger;
use App\Shared\FollowUps\FollowUpService;
use App\Shared\Http\BusinessRuleViolation;
use App\Shared\Support\ClinicTime;
use App\Shared\Support\Row;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Clinic visits (Module 3): `recordVisit`, `updateVisit`, `markVisitEnteredInError`, `listVisits`,
 * `getVisit`. One write saves the visit, its medicine lines (through the Inventory module's
 * `StockService`), its follow-up, its letter draft and every audit entry.
 *
 * @phpstan-import-type Draft from ExcuseLetterService
 */
final class VisitService
{
    public const LATE_ENTRY_MINUTES = 30;

    public const COMPLAINT_MAX = 60;

    private const DISPOSITIONS = ['returned_to_class', 'resting_in_clinic', 'sent_home', 'referred_to_hospital'];

    /** Visit fields compared for the audit summary (ADR-017: names, never values). */
    private const AUDITED = ['dateTime', 'complaint', 'extraComplaints', 'treatment', 'disposition', 'eventTag', 'itemsGiven', 'excuseLetterDraft', 'referredTo', 'collectedBy', 'temperatureC', 'timeOut', 'assistedBy', 'parentGuardian', 'remarks'];

    public function __construct(
        private readonly StockService $stock,
        private readonly ExcuseLetterService $letters,
        private readonly FollowUpService $followUps,
        private readonly AuditLogger $audit,
    ) {}

    /** @return list<array<string, mixed>> `Visit[]`, newest first */
    public function list(?string $from, ?string $to, bool $includeEnteredInError): array
    {
        $rows = DB::table('visits')
            ->when($from !== null, fn ($q) => $q->where('visited_at', '>=', "{$from} 00:00:00"))
            ->when($to !== null, fn ($q) => $q->where('visited_at', '<=', "{$to} 23:59:59"))
            ->when(! $includeEnteredInError, fn ($q) => $q->whereNull('entered_in_error_at'))
            ->orderByDesc('visited_at')->orderByDesc('id')->get()->values()->all();

        return $this->shape($rows);
    }

    /** @return list<array<string, mixed>> one patient's visits, newest first (the history) */
    public function forPatient(string $column, int $id, int $limit): array
    {
        return $this->shape(DB::table('visits')->where($column, $id)->orderByDesc('visited_at')->orderByDesc('id')->limit($limit)->get()->values()->all());
    }

    /** ADR-036: the incident a visit was escalated to; the Emergency Response module calls this (ERD M-1). */
    public function markEscalated(int $visitId, int $incidentId, int $userId, CarbonImmutable $now): void
    {
        DB::table('visits')->where('id', $visitId)->update(['escalated_incident_id' => $incidentId]);
        $this->log($userId, AuditAction::Update, $visitId, 'Escalated to incident', $now);
    }

    /** @return array<string, mixed> */
    public function find(int $id): array
    {
        $row = DB::table('visits')->where('id', $id)->first();
        abort_if($row === null, 404);

        return $this->shape([$row])[0];
    }

    /**
     * @param  array<string, mixed>  $in  validated `RecordVisitInput`
     * @return array{visit: array<string, mixed>, followUp: array<string, mixed>|null, belowZero: list<string>}
     */
    public function record(array $in, int $userId): array
    {
        $patient = self::patient($in);
        $draft = self::draftInput($in['excuseLetterDraft'] ?? null);
        if ($patient['personnelId'] !== null && $draft !== null) {
            throw new BusinessRuleViolation('wrong_patient', 'An excuse letter is only for a student.');
        }
        [$visitedAt, $late] = self::visitTime(is_string($in['dateTime'] ?? null) ? $in['dateTime'] : null);
        $disposition = self::disposition($in);
        $fields = $this->fields($in, $disposition, $draft, $visitedAt, null) + [
            'visited_at' => $visitedAt->format('Y-m-d H:i:s'),
            'late_entry' => $late ? 1 : 0,
            'late_entry_reason' => $late ? (mb_substr(trim(self::text($in, 'lateEntryReason')), 0, 200) ?: null) : null,
        ];
        $extras = $this->extraComplaints(Row::text($fields['complaint']), $in['extraComplaints'] ?? []);
        $lines = self::lines($in['itemsGiven'] ?? []);
        $followUp = self::followUpInput($in['followUp'] ?? null);

        return DB::transaction(function () use ($patient, $fields, $extras, $lines, $followUp, $draft, $in, $userId, $late): array {
            $now = CarbonImmutable::now();
            $grade = $patient['studentId'] === null ? null : DB::table('students as s')->leftJoin('grade_levels as g', 'g.id', '=', 's.grade_level_id')
                ->where('s.id', $patient['studentId'])->first(['g.name', 's.section']);
            $id = DB::table('visits')->insertGetId($fields + [
                'student_id' => $patient['studentId'], 'personnel_id' => $patient['personnelId'], 'logged_by_user_id' => $userId,
                'grade_level_at_time' => $grade === null ? null : Row::str($grade, 'name'), 'section_at_time' => $grade === null ? null : Row::str($grade, 'section'),
            ]);
            $this->saveExtras($id, $extras);
            $this->log($userId, AuditAction::Submit, $id, $late ? 'Late entry' : null, $now);
            $belowZero = $this->stock->apply($patient + ['visitId' => $id, 'incidentId' => null], $lines, 'dispense', $userId, 'staff');
            $created = $followUp === null ? null : $this->followUps->create($patient, 'visit', $id, $followUp, $userId, $now);
            $this->letters->saveDraft($id, $draft, $userId);
            if (($in['approveExcuseLetterNow'] ?? false) === true) {
                $this->approveDraft($id, $userId);
            }

            return ['visit' => $this->find($id), 'followUp' => $created, 'belowZero' => $belowZero];
        });
    }

    /**
     * @param  array<string, mixed>  $in  validated `VisitPatch`
     * @return array{visit: array<string, mixed>, belowZero: list<string>}
     */
    public function update(int $id, array $in, int $userId): array
    {
        $before = $this->find($id);
        if ($before['enteredInError'] !== null) {
            throw new BusinessRuleViolation('visit_entered_in_error', 'This visit was marked entered in error and can no longer be edited.');
        }
        $visitedAt = CarbonImmutable::parse(Row::text(DB::table('visits')->where('id', $id)->value('visited_at')));
        if (is_string($in['dateTime'] ?? null) && substr($in['dateTime'], 0, 16) !== substr(Row::text($before['dateTime']), 0, 16)) {
            $visitedAt = self::visitTime(substr($in['dateTime'], 0, 16))[0];
        }
        $draft = array_key_exists('excuseLetterDraft', $in) ? self::draftInput($in['excuseLetterDraft']) : $this->letters->draft($id);
        $disposition = self::disposition($in);
        $merged = $in;
        foreach (['referredTo', 'collectedBy', 'temperatureC', 'timeOut', 'assistedBy', 'parentGuardian', 'remarks'] as $key) {
            if (! array_key_exists($key, $in)) {
                $merged[$key] = $before[$key];
            }
        }
        $fields = $this->fields($merged, $disposition, $draft, $visitedAt, $id) + ['visited_at' => $visitedAt->format('Y-m-d H:i:s'), 'updated_by_user_id' => $userId];
        $extras = array_key_exists('extraComplaints', $in) ? $this->extraComplaints(Row::text($fields['complaint']), $in['extraComplaints']) : null;
        $lines = array_key_exists('itemsGiven', $in) ? self::lines($in['itemsGiven']) : null;

        return DB::transaction(function () use ($id, $before, $fields, $extras, $lines, $draft, $in, $userId): array {
            $now = CarbonImmutable::now();
            DB::table('visits')->where('id', $id)->update($fields);
            if ($extras !== null) {
                DB::table('visit_extra_complaints')->where('visit_id', $id)->delete();
                $this->saveExtras($id, $extras);
            }
            $belowZero = $lines === null ? [] : $this->stock->apply(
                ['studentId' => Row::toInt($before['studentId']), 'personnelId' => Row::toInt($before['personnelId']), 'visitId' => $id, 'incidentId' => null],
                $lines, 'adjust', $userId, 'staff',
            );
            $this->letters->saveDraft($id, $draft, $userId);
            $after = $this->find($id);
            $changed = array_values(array_filter(self::AUDITED, fn (string $f): bool => json_encode($before[$f]) !== json_encode($after[$f])));
            $this->log($userId, AuditAction::Update, $id, DatabaseAuditLogger::changedSummary($changed), $now);
            if (($in['approveExcuseLetterNow'] ?? false) === true) {
                $this->approveDraft($id, $userId);
            }

            return ['visit' => $this->find($id), 'belowZero' => $belowZero];
        });
    }

    /** Kept, never deleted: stock returns, the letter is voided, pending follow-ups are cancelled. Never audits the reason. */
    /** @return array<string, mixed> */
    public function markEnteredInError(int $id, string $reason, int $userId): array
    {
        $visit = $this->find($id);
        $why = trim($reason);
        if ($why === '') {
            throw ValidationException::withMessages(['reason' => 'Give the reason this visit was entered in error.']);
        }
        if ($visit['enteredInError'] !== null) {
            throw new BusinessRuleViolation('visit_entered_in_error', 'This visit is already marked entered in error.');
        }
        DB::transaction(function () use ($id, $visit, $why, $userId): void {
            $now = CarbonImmutable::now();
            $this->stock->apply(['studentId' => Row::toInt($visit['studentId']), 'personnelId' => Row::toInt($visit['personnelId']), 'visitId' => $id, 'incidentId' => null], [], 'adjust', $userId, 'staff');
            DB::table('visits')->where('id', $id)->update(['entered_in_error_at' => $now, 'entered_in_error_by_user_id' => $userId, 'entered_in_error_reason' => mb_substr($why, 0, 300)]);
            $this->log($userId, AuditAction::Update, $id, 'Marked entered in error', $now);
            $this->letters->void($id, $why, $userId, $now);
            $this->followUps->cancelForVisit($id, $why, $userId, $now);
        });

        return $this->find($id);
    }

    // ---- input ---------------------------------------------------------------------------

    /** @param array<string, mixed> $in
     * @return array{studentId: int|null, personnelId: int|null} exactly one, and it exists */
    private static function patient(array $in): array
    {
        $student = self::int($in['studentId'] ?? null);
        $personnel = self::int($in['personnelId'] ?? null);
        if (($student === null) === ($personnel === null)) {
            throw ValidationException::withMessages(['studentId' => 'Choose one patient: a student or a staff member.']);
        }
        abort_unless($student !== null ? DB::table('students')->where('id', $student)->exists() : DB::table('personnel')->where('id', $personnel)->exists(), 404);

        return ['studentId' => $student, 'personnelId' => $personnel];
    }

    /** @return array{0: CarbonImmutable, 1: bool} the visit time ("YYYY-MM-DDTHH:MM", never future; now when omitted) and whether it is a late entry */
    private static function visitTime(?string $value): array
    {
        $now = CarbonImmutable::now();
        if ($value === null || $value === '') {
            return [$now->startOfMinute(), false];
        }
        $at = preg_match('/\A\d{4}-\d{2}-\d{2}T\d{2}:\d{2}\z/', $value) === 1 ? CarbonImmutable::createFromFormat('!Y-m-d\TH:i', $value, ClinicTime::ZONE) : null;
        if ($at === null || $at->format('Y-m-d\TH:i') !== $value) {
            throw ValidationException::withMessages(['dateTime' => 'Enter the visit date and time.']);
        }
        if ($at->greaterThan($now)) {
            throw ValidationException::withMessages(['dateTime' => "The visit date and time can't be in the future."]);
        }

        return [$at, $now->diffInMinutes($at, true) > self::LATE_ENTRY_MINUTES];
    }

    /** @param array<string, mixed> $in */
    private static function disposition(array $in): string
    {
        $d = self::text($in, 'disposition');
        if (! in_array($d, self::DISPOSITIONS, true)) {
            throw ValidationException::withMessages(['disposition' => 'Choose where the patient went after the visit.']);
        }

        return $d;
    }

    /**
     * The columns from the visit's own fields, checked as `dispositionFields` and `logbookFields`.
     *
     * @param  array<string, mixed>  $in
     * @param  Draft|null  $draft
     * @return array<string, mixed>
     */
    private function fields(array $in, string $disposition, ?array $draft, CarbonImmutable $visitedAt, ?int $visitId): array
    {
        $complaint = $this->complaint(self::text($in, 'complaint'));
        if ($complaint === '') {
            throw ValidationException::withMessages(['complaint' => 'Enter the symptom.']);
        }
        if ($draft !== null) {
            if ($disposition === 'returned_to_class' || $disposition === 'resting_in_clinic') {
                throw ValidationException::withMessages(['excuseLetterDraft' => 'Only a Sent home or Referred visit has an excuse letter.']);
            }
            $invalid = ExcuseLetterService::periodError($draft['excusedFrom'], $draft['excusedUntil']);
            if ($invalid !== null) {
                throw ValidationException::withMessages(['excuseLetterDraft' => $invalid]);
            }
            if ($visitId !== null && $this->letters->hasApproval($visitId)) {
                throw new BusinessRuleViolation('excuse_letter', 'This visit already has an approved excuse letter. Its period is fixed.');
            }
        }
        $referred = trim(self::text($in, 'referredTo'));
        if ($referred !== '' && $disposition !== 'referred_to_hospital') {
            throw ValidationException::withMessages(['referredTo' => 'Only a Referred to hospital visit has "Referred to".']);
        }
        $collected = is_array($in['collectedBy'] ?? null) ? $in['collectedBy'] : [];
        $cName = mb_substr(trim(self::text($collected, 'name')), 0, 120);
        $cRel = mb_substr(trim(self::text($collected, 'relationship')), 0, 40);
        $cTime = trim(self::text($collected, 'time'));
        if ($cTime !== '' && preg_match('/\A\d{2}:\d{2}\z/', $cTime) !== 1) {
            throw ValidationException::withMessages(['collectedBy.time' => 'The collection time must be HH:MM.']);
        }
        if ($cTime !== '' && $visitedAt->format('Y-m-d')."T{$cTime}" > CarbonImmutable::now()->format('Y-m-d\TH:i')) {
            throw ValidationException::withMessages(['collectedBy.time' => "The collection time can't be in the future."]);
        }
        $leftClinic = in_array($disposition, ['sent_home', 'referred_to_hospital'], true) && ($cName !== '' || $cRel !== '');
        $timeOut = trim(self::text($in, 'timeOut'));
        if ($timeOut !== '' && preg_match('/\A\d{2}:\d{2}\z/', $timeOut) !== 1) {
            throw ValidationException::withMessages(['timeOut' => 'Time out must be HH:MM.']);
        }
        if ($timeOut !== '' && $timeOut < $visitedAt->format('H:i')) {
            throw ValidationException::withMessages(['timeOut' => "Time out can't be earlier than the time in."]);
        }
        $temperature = $in['temperatureC'] ?? null;
        if ($temperature !== null && ! is_numeric($temperature)) {
            throw ValidationException::withMessages(['temperatureC' => 'Body temperature must be a number.']);
        }
        $text = fn (string $key, int $max): ?string => ($v = mb_substr(trim(self::text($in, $key)), 0, $max)) === '' ? null : $v;
        $type = DB::table('complaint_types')->where('label', $complaint)->where('used_in_visits', 1)->value('id');

        return [
            'complaint' => $complaint, 'complaint_type_id' => $type, 'treatment_notes' => trim(self::text($in, 'treatment')) ?: null,
            'disposition' => $disposition, 'referred_to' => $referred === '' ? null : mb_substr($referred, 0, 150), 'event_tag' => $text('eventTag', 80),
            'temperature_c' => $temperature === null ? null : round((float) $temperature, 2), 'time_out' => $timeOut === '' ? null : $timeOut,
            'assisted_by' => $text('assistedBy', 120), 'parent_guardian' => $text('parentGuardian', 120), 'remarks' => $text('remarks', 2000),
            'collected_by_name' => $leftClinic ? ($cName ?: null) : null, 'collected_by_relationship' => $leftClinic ? ($cRel ?: null) : null,
            'collected_by_time' => $leftClinic && $cTime !== '' ? $cTime : null,
        ];
    }

    /** `normalizeComplaint`: cleaned, and spelled as a known complaint when one matches. */
    private function complaint(string $text): string
    {
        $clean = trim(mb_substr((string) preg_replace('/\s+/u', ' ', trim($text)), 0, self::COMPLAINT_MAX));
        $known = DB::table('complaint_types')->where('used_in_visits', 1)->pluck('label')
            ->merge(DB::table('visits')->distinct()->pluck('complaint'))->filter(fn (mixed $v): bool => is_string($v));
        $match = $known->first(fn (string $label): bool => mb_strtolower($label) === mb_strtolower($clean));

        return is_string($match) ? $match : $clean;
    }

    /** @return list<string> cleaned, without repeats or the main one; more than 3 is refused (ADR-053) */
    private function extraComplaints(string $main, mixed $extras): array
    {
        $out = [];
        foreach (is_array($extras) ? $extras : [] as $text) {
            $clean = $this->complaint(is_string($text) ? $text : '');
            $lower = array_map(mb_strtolower(...), $out);
            if ($clean !== '' && mb_strtolower($clean) !== mb_strtolower($main) && ! in_array(mb_strtolower($clean), $lower, true)) {
                $out[] = $clean;
            }
        }
        if (count($out) > 3) {
            throw ValidationException::withMessages(['extraComplaints' => 'Add at most 3 extra complaints.']);
        }

        return $out;
    }

    /** @return Draft|null */
    private static function draftInput(mixed $draft): ?array
    {
        if (! is_array($draft)) {
            return null;
        }

        return [
            'excusedFrom' => self::text($draft, 'excusedFrom'), 'excusedUntil' => self::text($draft, 'excusedUntil'),
            'note' => mb_substr(trim(self::text($draft, 'note')), 0, 500) ?: null,
            'stayHomeUntilCleared' => ($draft['stayHomeUntilCleared'] ?? false) === true,
            'stayHomeNote' => mb_substr(trim(self::text($draft, 'stayHomeNote')), 0, 255) ?: null,
        ];
    }

    /** @return array{followUpDate: string, reason: string, notes: string|null, stayHomeUntilCleared: bool, stayHomeNote: string|null}|null */
    private static function followUpInput(mixed $f): ?array
    {
        if (! is_array($f)) {
            return null;
        }

        return [
            'followUpDate' => self::text($f, 'followUpDate'), 'reason' => self::text($f, 'reason'), 'notes' => self::text($f, 'notes') ?: null,
            'stayHomeUntilCleared' => ($f['stayHomeUntilCleared'] ?? false) === true, 'stayHomeNote' => self::text($f, 'stayHomeNote') ?: null,
        ];
    }

    /** @return list<array{itemId: int, quantity: int, instructions: string|null}> */
    private static function lines(mixed $lines): array
    {
        $out = [];
        foreach (is_array($lines) ? $lines : [] as $l) {
            $l = is_array($l) ? $l : [];
            $out[] = ['itemId' => (int) self::int($l['itemId'] ?? null), 'quantity' => is_int($l['quantity'] ?? null) ? $l['quantity'] : 0, 'instructions' => is_string($l['instructions'] ?? null) ? $l['instructions'] : null];
        }

        return $out;
    }

    // ---- helpers -------------------------------------------------------------------------

    private function approveDraft(int $id, int $userId): void
    {
        $draft = $this->letters->draft($id);
        if ($draft === null) {
            throw new BusinessRuleViolation('excuse_letter', 'Prepare the excuse letter before approving it.');
        }
        $this->letters->approve($id, $draft + ['recipient' => null, 'body' => null], $userId);
    }

    /** @param list<string> $extras */
    private function saveExtras(int $id, array $extras): void
    {
        foreach ($extras as $i => $text) {
            DB::table('visit_extra_complaints')->insert(['visit_id' => $id, 'complaint' => $text, 'sort_order' => $i]);
        }
    }

    /**
     * The `Visit` type for many rows at once.
     *
     * @param  array<int, object>  $rows
     * @return list<array<string, mixed>>
     */
    private function shape(array $rows): array
    {
        $ids = array_values(array_map(fn (object $r): int => (int) Row::int($r, 'id'), $rows));
        $lines = $this->stock->linesFor('visit_id', $ids);
        $extras = DB::table('visit_extra_complaints')->whereIn('visit_id', $ids === [] ? [0] : $ids)->orderBy('sort_order')->get()
            ->groupBy(fn (object $e): int => (int) Row::int($e, 'visit_id'));
        $drafts = DB::table('excuse_letters')->whereIn('visit_id', $ids === [] ? [0] : $ids)->where('status', 'draft')->get()
            ->keyBy(fn (object $d): int => (int) Row::int($d, 'visit_id'));
        $out = [];
        foreach ($rows as $r) {
            $id = (int) Row::int($r, 'id');
            $draft = $drafts->get($id);
            $at = CarbonImmutable::parse((string) Row::str($r, 'visited_at'));
            $hm = fn (string $col): ?string => ($v = Row::str($r, $col)) === null ? null : substr($v, 0, 5);
            $error = Row::str($r, 'entered_in_error_at');
            $temp = Row::str($r, 'temperature_c');
            $collected = Row::str($r, 'collected_by_name') !== null || Row::str($r, 'collected_by_relationship') !== null;
            $out[] = [
                'id' => (string) $id, 'studentId' => Row::str($r, 'student_id'), 'personnelId' => Row::str($r, 'personnel_id'),
                'dateTime' => ClinicTime::iso($at), 'complaint' => (string) Row::str($r, 'complaint'),
                'extraComplaints' => array_values(array_map(fn (object $e): string => (string) Row::str($e, 'complaint'), $extras->get($id)?->all() ?? [])),
                'treatment' => Row::str($r, 'treatment_notes') ?? '', 'disposition' => (string) Row::str($r, 'disposition'),
                'loggedByUserId' => (string) Row::int($r, 'logged_by_user_id'), 'eventTag' => Row::str($r, 'event_tag'),
                'itemsGiven' => $lines[$id] ?? [],
                'excuseLetterDraft' => $draft === null ? null : [
                    'excusedFrom' => (string) Row::str($draft, 'excused_from'), 'excusedUntil' => (string) Row::str($draft, 'excused_until'), 'note' => Row::str($draft, 'teacher_note'),
                    'stayHomeUntilCleared' => Row::str($draft, 'stay_home_until_cleared') === '1', 'stayHomeNote' => Row::str($draft, 'stay_home_note'),
                ],
                'referredTo' => Row::str($r, 'referred_to'), 'temperatureC' => $temp === null ? null : (float) $temp, 'timeOut' => $hm('time_out'),
                'assistedBy' => Row::str($r, 'assisted_by'), 'parentGuardian' => Row::str($r, 'parent_guardian'), 'remarks' => Row::str($r, 'remarks'),
                'lateEntry' => Row::str($r, 'late_entry') === '1', 'lateEntryReason' => Row::str($r, 'late_entry_reason'),
                'enteredInError' => $error === null ? null : ['reason' => (string) Row::str($r, 'entered_in_error_reason'), 'at' => ClinicTime::iso(CarbonImmutable::parse($error)), 'byUserId' => (string) Row::int($r, 'entered_in_error_by_user_id')],
                'escalatedIncidentId' => Row::str($r, 'escalated_incident_id'),
                'collectedBy' => $collected ? ['name' => Row::str($r, 'collected_by_name'), 'relationship' => Row::str($r, 'collected_by_relationship'), 'time' => $hm('collected_by_time')] : null,
                'gradeLevelAtTime' => Row::str($r, 'grade_level_at_time'), 'sectionAtTime' => Row::str($r, 'section_at_time'),
            ];
        }

        return $out;
    }

    private function log(int $userId, AuditAction $action, int $id, ?string $summary, CarbonImmutable $now): void
    {
        $this->audit->record(new AuditEvent(
            actorId: (string) $userId, actorRole: 'staff', action: $action, targetType: AuditTarget::Visit,
            targetId: (string) $id, targetLabel: null, at: $now, summary: $summary,
        ));
    }

    /** @param array<mixed> $in */
    private static function text(array $in, string $key): string
    {
        $v = $in[$key] ?? null;

        return is_string($v) ? $v : '';
    }

    private static function int(mixed $v): ?int
    {
        return is_numeric($v) ? (int) $v : null;
    }
}
