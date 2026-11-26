<?php

declare(strict_types=1);

namespace App\Modules\EmergencyResponse\Services;

use App\Modules\ClinicVisits\Services\VisitService;
use App\Modules\InventoryTracker\Services\StockService;
use App\Shared\AuditLog\AuditAction;
use App\Shared\AuditLog\AuditEvent;
use App\Shared\AuditLog\AuditLogger;
use App\Shared\AuditLog\AuditTarget;
use App\Shared\FollowUps\FollowUpService;
use App\Shared\Http\BusinessRuleViolation;
use App\Shared\Http\PatientLog;
use App\Shared\Sequences\Sequences;
use App\Shared\Support\ClinicTime;
use App\Shared\Support\Row;
use Carbon\CarbonImmutable;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Emergency Response (Module 4): Stage 1 fast capture, Stage 2 completion, parent notifications,
 * approval and the trail. A staff patient's incident does not exist for the Admin (ADR-043, `visibleTo`).
 * Vitals are stored as readings; the API merges the latest value of each (G13).
 */
final class IncidentService
{
    private const VITALS = ['temperatureC' => 'temperature_c', 'pulseBpm' => 'pulse_bpm', 'bloodPressure' => 'blood_pressure', 'oxygenSaturationPct' => 'spo2_percent'];

    private const OUTCOMES = ['reached', 'no_answer', 'left_message_or_voicemail', 'wrong_number'];

    public function __construct(
        private readonly StockService $stock,
        private readonly FollowUpService $followUps,
        private readonly VisitService $visits,
        private readonly AuditLogger $audit,
    ) {}

    /**
     * The Incident Log's rows (`IncidentLogRow`, ADR-082), filtered, searched and sorted in SQL. The
     * Admin never sees a staff patient's incident (ADR-043).
     *
     * @param  array{from: ?string, to: ?string, admin: bool, completion: string, patient: string, search: string}  $f
     * @param  'asc'|'desc'  $direction
     */
    public function logQuery(array $f, string $sort, string $direction): Builder
    {
        $query = PatientLog::join(DB::table('incidents as i'), 'i')
            ->select(['i.id', 'i.occurred_at', 'i.complaint', 'i.stage', 'i.event_tag', 's.lrn', 'p.staff_number'])
            ->selectRaw(PatientLog::gradeSql('i').' AS grade')
            ->when($f['admin'], fn ($q) => $q->whereNull('i.personnel_id'))
            ->when($f['from'] !== null, fn ($q) => $q->where('i.occurred_at', '>=', "{$f['from']} 00:00:00"))
            ->when($f['to'] !== null, fn ($q) => $q->where('i.occurred_at', '<=', "{$f['to']} 23:59:59"))
            ->when($f['completion'] === 'needs_completion', fn ($q) => $q->where('i.stage', 1))
            ->when($f['completion'] === 'complete', fn ($q) => $q->where('i.stage', '<>', 1));
        PatientLog::patient($query, 'i', $f['patient']);
        PatientLog::search($query, 'i', $f['search'], ['complaint', 'event_tag']);

        match ($sort) {
            'student' => PatientLog::orderByNumber($query, 'i', $direction),
            'complaint' => $query->orderBy('i.complaint', $direction),
            // By the shown words: "Complete" (stage 2) before "Needs completion" (stage 1) when ascending.
            'status' => $query->orderBy('i.stage', $direction === 'asc' ? 'desc' : 'asc'),
            default => $query->orderBy('i.occurred_at', $direction),
        };

        // Equal values keep the log's own order, newest first, as the screen's stable sort did.
        return $sort === 'time' ? $query->orderBy('i.id', $direction) : $query->orderByDesc('i.occurred_at')->orderByDesc('i.id');
    }

    /** @return array<string, mixed> one `IncidentLogRow` */
    public function logRow(\stdClass $r): array
    {
        return [
            'id' => (string) Row::int($r, 'id'), 'patient' => PatientLog::number($r), 'gradeLevel' => (string) Row::str($r, 'grade'),
            'time' => ClinicTime::iso(CarbonImmutable::parse((string) Row::str($r, 'occurred_at'))), 'complaint' => (string) Row::str($r, 'complaint'),
            'completion' => Row::int($r, 'stage') === 1 ? 'needs_completion' : 'complete', 'eventTag' => Row::str($r, 'event_tag'),
        ];
    }

    /** @return list<array<string, mixed>> `Incident[]`, newest first */
    public function list(?string $from, ?string $to, bool $admin, ?int $studentId = null, ?int $personnelId = null, ?int $limit = null): array
    {
        $rows = DB::table('incidents')
            ->when($admin, fn ($q) => $q->whereNull('personnel_id'))
            ->when($from !== null, fn ($q) => $q->where('occurred_at', '>=', "{$from} 00:00:00"))
            ->when($to !== null, fn ($q) => $q->where('occurred_at', '<=', "{$to} 23:59:59"))
            ->when($studentId !== null, fn ($q) => $q->where('student_id', $studentId))
            ->when($personnelId !== null, fn ($q) => $q->where('personnel_id', $personnelId))
            ->orderByDesc('occurred_at')->orderByDesc('id')->when($limit !== null, fn ($q) => $q->limit((int) $limit))->get()->values()->all();

        return $this->shape($rows);
    }

    /** @return array<string, mixed> */
    public function find(int $id, bool $admin): array
    {
        $row = DB::table('incidents')->where('id', $id)->when($admin, fn ($q) => $q->whereNull('personnel_id'))->first();
        abort_if($row === null, 404);

        return $this->shape([$row])[0];
    }

    /**
     * Stage 1: save the patient, complaint, event time and optional notes quickly.
     *
     * @param  array<string, mixed>  $in
     * @return array<string, mixed>
     */
    public function stageOne(array $in, int $userId): array
    {
        $student = Row::toInt($in['studentId'] ?? null);
        $personnel = Row::toInt($in['personnelId'] ?? null);
        if (($student === null) === ($personnel === null)) {
            throw ValidationException::withMessages(['studentId' => 'Choose one patient: a student or a staff member.']);
        }
        abort_unless($student !== null ? DB::table('students')->where('id', $student)->exists() : DB::table('personnel')->where('id', $personnel)->exists(), 404);
        $complaint = self::complaint($in);
        $now = CarbonImmutable::now();
        $at = $now;
        if (is_string($in['time'] ?? null) && $in['time'] !== '') {
            $at = self::parseTime($in['time'], 'time');
        }
        if (is_array($in['vitals'] ?? null) && $in['vitals'] !== []) {
            throw ValidationException::withMessages(['vitals' => 'Record readings in Stage 2.']);
        }
        $notes = trim(Row::text($in['generalNotes'] ?? '')) ?: null;
        $sourceId = Row::toInt($in['sourceVisitId'] ?? null);
        $carriedTemperature = $in['carriedTemperatureC'] ?? null;
        if ($sourceId !== null) {
            $source = DB::table('visits')->where('id', $sourceId)->first();
            abort_if($source === null, 404);
            if (Row::int($source, 'student_id') !== $student || Row::int($source, 'personnel_id') !== $personnel) {
                throw new BusinessRuleViolation('wrong_patient', 'The escalated visit belongs to another patient.');
            }
            if (Row::str($source, 'entered_in_error_at') !== null) {
                throw new BusinessRuleViolation('visit_entered_in_error', 'A visit entered in error cannot be escalated.');
            }
            if (Row::str($source, 'escalated_incident_id') !== null) {
                throw new BusinessRuleViolation('incident_stage', 'This visit was already escalated to an incident.');
            }
            $carriedTemperature = Row::str($source, 'temperature_c');
            if (! is_string($in['time'] ?? null) || $in['time'] === '') {
                $at = self::parseTime((string) Row::str($source, 'visited_at'), 'time');
            }
        }

        if ($at->greaterThan($now)) {
            throw ValidationException::withMessages(['time' => "The incident time can't be in the future."]);
        }

        if ($carriedTemperature !== null && (! is_numeric($carriedTemperature) || (float) $carriedTemperature < 0 || (float) $carriedTemperature >= 1000)) {
            throw ValidationException::withMessages(['carriedTemperatureC' => 'Check the carried temperature.']);
        }

        return DB::transaction(function () use ($student, $personnel, $complaint, $at, $carriedTemperature, $notes, $sourceId, $userId, $now): array {
            $grade = $student === null ? null : DB::table('students as s')->leftJoin('grade_levels as g', 'g.id', '=', 's.grade_level_id')->where('s.id', $student)->first(['g.name', 's.section']);
            $id = DB::table('incidents')->insertGetId([
                'student_id' => $student, 'personnel_id' => $personnel, 'occurred_at' => $at->format('Y-m-d H:i:s'), 'complaint' => $complaint,
                'treatment_notes' => null, 'general_notes' => $notes, 'source_visit_id' => $sourceId, 'created_by_user_id' => $userId,
                'grade_level_at_time' => $grade === null ? null : Row::str($grade, 'name'), 'section_at_time' => $grade === null ? null : Row::str($grade, 'section'),
                'created_at' => $now, 'updated_at' => $now,
            ]);
            if ($carriedTemperature !== null) {
                $this->saveReading($id, 1, ['temperatureC' => round((float) $carriedTemperature, 2)], $userId, $at);
            }
            if ($sourceId !== null) {
                $this->visits->markEscalated($sourceId, $id, $userId, $now);
            }
            $this->log($userId, AuditAction::Submit, AuditTarget::IncidentStageOne, (string) $id, $notes === null ? null : 'Included additional notes', $now);

            return $this->find($id, false);
        });
    }

    /**
     * Stage 2: completes the record. Every field is optional (ADR-065). Medicines dispense only on the
     * first completion; Additional notes can be corrected until the report is approved (ADR-049).
     *
     * @param  array<string, mixed>  $in
     * @return array{incident: array<string, mixed>, followUp: array<string, mixed>|null, belowZero: list<string>}
     */
    public function stageTwo(int $id, array $in, int $userId): array
    {
        $before = $this->find($id, false);
        $complaint = self::complaint($in);
        $vitals = self::vitals($in['vitals'] ?? []);
        $approved = DB::table('incident_report_approvals')->where('incident_id', $id)->exists();
        $nowForValidation = CarbonImmutable::now();
        $at = is_string($in['time'] ?? null) && $in['time'] !== '' ? self::parseTime($in['time'], 'time') : self::parseTime(Row::text($before['time'] ?? null), 'time');
        if ($at->greaterThan($nowForValidation)) {
            throw ValidationException::withMessages(['time' => "The incident time can't be in the future."]);
        }
        $arrivalValue = array_key_exists('arrivedAtClinic', $in) ? $in['arrivedAtClinic'] : $before['arrivedAtClinic'];
        $arrival = is_string($arrivalValue) && $arrivalValue !== '' ? self::parseTime($arrivalValue, 'arrivedAtClinic') : null;
        if ($arrival?->greaterThan($nowForValidation)) {
            throw ValidationException::withMessages(['arrivedAtClinic' => "The clinic arrival time can't be in the future."]);
        }
        $readingTimes = [];
        foreach ($vitals['readings'] as $key => $_) {
            $value = is_array($in['readingTimes'] ?? null) ? ($in['readingTimes'][$key] ?? null) : null;
            $readingAt = is_string($value) && $value !== '' ? self::parseTime($value, "readingTimes.{$key}") : $nowForValidation;
            if ($readingAt->greaterThan($nowForValidation)) {
                throw ValidationException::withMessages(["readingTimes.{$key}" => "The reading time can't be in the future."]);
            }
            $readingTimes[$key] = $readingAt;
        }
        $timeChanged = $at->format('Y-m-d H:i') !== self::parseTime(Row::text($before['time'] ?? null), 'time')->format('Y-m-d H:i');
        $arrivalChanged = ($arrival?->format('Y-m-d H:i:s')) !== ($before['arrivedAtClinic'] === null ? null : self::parseTime(Row::text($before['arrivedAtClinic']), 'arrivedAtClinic')->format('Y-m-d H:i:s'));
        if (! $timeChanged) {
            $at = self::parseTime(Row::text($before['time'] ?? null), 'time');
        }
        if ($approved && ($timeChanged || $arrivalChanged || $vitals['readings'] !== [])) {
            throw new BusinessRuleViolation('incident_approved', 'This incident report is approved, so its event times and readings can no longer be changed.');
        }
        $notes = array_key_exists('generalNotes', $in) ? (trim(Row::text($in['generalNotes'])) ?: null) : $before['generalNotes'];
        $notesChanged = $notes !== $before['generalNotes'];
        if ($notesChanged && $approved) {
            throw new BusinessRuleViolation('incident_approved', 'This incident report is approved, so its Additional notes can no longer be changed.');
        }
        $lines = [];
        foreach (is_array($in['itemsGiven'] ?? null) ? $in['itemsGiven'] : [] as $l) {
            $l = is_array($l) ? $l : [];
            $q = $l['quantity'] ?? null;
            $lines[] = ['itemId' => (int) Row::toInt($l['itemId'] ?? null), 'quantity' => is_int($q) ? $q : 0, 'instructions' => is_string($l['instructions'] ?? null) ? $l['instructions'] : null];
        }
        if ($before['stage'] === 2 && array_key_exists('itemsGiven', $in)) {
            $old = array_map(fn (mixed $l): string => is_array($l) ? Row::text($l['itemId'] ?? '').':'.Row::text($l['quantity'] ?? '') : '', is_array($before['itemsGiven']) ? $before['itemsGiven'] : []);
            $new = array_map(fn (array $l): string => $l['itemId'].':'.$l['quantity'], $lines);
            sort($old);
            sort($new);
            if ($old !== $new) {
                throw new BusinessRuleViolation('stock_rule', "Medicines on a completed incident can't be changed.");
            }
        }
        $referral = is_array($in['hospitalReferral'] ?? null) ? $in['hospitalReferral'] : null;
        $departed = null;
        if ($referral !== null) {
            $departed = self::parseTime(Row::text($referral['departureTime'] ?? ''), 'hospitalReferral.departureTime');
        }
        $attempts = [];
        foreach (is_array($in['newParentNotifications'] ?? null) ? $in['newParentNotifications'] : [] as $a) {
            $attempts[] = self::attempt(is_array($a) ? $a : []);
        }
        $followUp = is_array($in['followUp'] ?? null) ? $in['followUp'] : null;
        $bodyPart = mb_substr(trim(Row::text($in['bodyPart'] ?? '')), 0, 60) ?: null;
        $nothingFurther = mb_substr(trim(Row::text($in['noFurtherActionReason'] ?? '')), 0, 200) ?: null;
        $patient = ['studentId' => Row::toInt($before['studentId']), 'personnelId' => Row::toInt($before['personnelId'])];

        return DB::transaction(function () use ($id, $before, $complaint, $vitals, $readingTimes, $at, $arrival, $timeChanged, $arrivalChanged, $notes, $notesChanged, $lines, $referral, $departed, $attempts, $followUp, $bodyPart, $nothingFurther, $patient, $userId): array {
            $now = CarbonImmutable::now();
            $first = $before['stage'] === 1;
            DB::table('incidents')->where('id', $id)->update([
                'complaint' => $complaint, 'treatment_notes' => $vitals['treatmentNotes'], 'stage' => 2, 'body_part' => $bodyPart,
                'no_further_action_reason' => $nothingFurther, 'general_notes' => $notes,
                'occurred_at' => $at->format('Y-m-d H:i:s'), 'arrived_at_clinic_at' => $arrival?->format('Y-m-d H:i:s'),
            ] + ($first ? ['completed_by_user_id' => $userId, 'completed_at' => $now] : []));
            $this->saveReading($id, 2, $vitals['readings'], $userId, $now, $readingTimes);
            DB::table('hospital_referrals')->where('incident_id', $id)->delete();
            if ($referral !== null) {
                DB::table('hospital_referrals')->insert([
                    'incident_id' => $id, 'destination' => mb_substr(trim(Row::text($referral['destination'] ?? '')), 0, 150),
                    'transport_mode' => mb_substr(trim(Row::text($referral['transportMode'] ?? '')), 0, 80),
                    'departed_at' => $departed->format('Y-m-d H:i:s'), 'created_by_user_id' => $userId,
                ]);
            }
            $belowZero = $first ? $this->stock->apply($patient + ['visitId' => null, 'incidentId' => $id], $lines, 'dispense', $userId, 'staff') : [];
            $named = implode(' and ', array_filter([
                $bodyPart !== null ? 'body part affected' : null, $nothingFurther !== null ? 'nothing further was needed or done' : null,
                $notesChanged ? 'corrected additional notes' : null,
                $timeChanged ? 'corrected when it happened' : null,
                $arrivalChanged ? 'updated clinic arrival time' : null,
                $vitals['readings'] !== [] ? 'recorded readings and their times' : null,
            ]));
            $this->log($userId, AuditAction::Update, AuditTarget::IncidentStageTwo, (string) $id, 'Completed Stage 2 details'.($named !== '' ? "; included {$named}" : ''), $now);
            foreach ($attempts as $attempt) {
                $this->saveAttempt($id, $attempt, $userId, $now);
            }
            $created = $followUp === null ? null : $this->followUps->create($patient, 'incident', $id, [
                'followUpDate' => Row::text($followUp['followUpDate'] ?? ''), 'reason' => Row::text($followUp['reason'] ?? ''),
                'notes' => Row::text($followUp['notes'] ?? '') ?: null, 'stayHomeUntilCleared' => ($followUp['stayHomeUntilCleared'] ?? false) === true,
                'stayHomeNote' => Row::text($followUp['stayHomeNote'] ?? '') ?: null,
            ], $userId, $now);

            return ['incident' => $this->find($id, false), 'followUp' => $created, 'belowZero' => $belowZero];
        });
    }

    /**
     * @param  array<string, mixed>  $in
     * @return array<string, mixed> `ParentNotificationAttempt`
     */
    public function addNotification(int $id, array $in, int $userId): array
    {
        $this->find($id, false);
        $attempt = self::attempt(['outcome' => $in['outcome'] ?? null, 'calledContact' => $in['calledContact'] ?? null]);

        return DB::transaction(fn (): array => $this->saveAttempt($id, $attempt, $userId, CarbonImmutable::now()));
    }

    /** Only a completed (Stage 2) record is signed off, once (contract Q9). */
    public function approve(int $id, int $userId): void
    {
        $incident = $this->find($id, false);
        if ($incident['stage'] === 1) {
            throw new BusinessRuleViolation('incident_stage', 'Complete Stage 2 before approving this report.');
        }
        if (DB::table('incident_report_approvals')->where('incident_id', $id)->exists()) {
            throw new BusinessRuleViolation('incident_stage', 'This incident report is already approved.');
        }
        DB::transaction(function () use ($id, $userId): void {
            $now = CarbonImmutable::now();
            $year = substr(ClinicTime::today(), 0, 4);
            DB::table('incident_report_approvals')->insert([
                'incident_id' => $id, 'reference_no' => sprintf('IR-%s-%04d', $year, Sequences::next('incident_report', $year)),
                'approved_by_user_id' => $userId, 'approved_at' => $now,
            ]);
            $this->log($userId, AuditAction::Approve, AuditTarget::IncidentReport, (string) $id, null, $now);
        });
    }

    /** @return list<string> approved report ids; may include staff incidents, ids only (Q8) */
    public function approvedIds(): array
    {
        return array_values(DB::table('incident_report_approvals')->orderBy('id')->pluck('incident_id')->map(fn (mixed $v): string => Row::text($v))->all());
    }

    /**
     * Who recorded, completed and approved it, read from the audit log (`getIncidentTrail`).
     *
     * @return array{recorded: array{by: string, at: string}|null, completed: array{by: string, at: string}|null, approved: array{by: string, at: string}|null}
     */
    public function trail(int $id): array
    {
        abort_unless(DB::table('incidents')->where('id', $id)->exists(), 404);
        $find = function (string $action, array $types) use ($id): ?array {
            $e = DB::table('audit_logs as a')->leftJoin('users as u', 'u.id', '=', 'a.actor_user_id')
                ->where('a.action_type', $action)->whereIn('a.target_type', $types)->where('a.target_id', $id)->orderBy('a.id')->first(['u.name', 'a.occurred_at']);

            return $e === null ? null : ['by' => Row::str($e, 'name') ?? 'Unknown user', 'at' => ClinicTime::iso(CarbonImmutable::parse((string) Row::str($e, 'occurred_at')))];
        };

        return [
            'recorded' => $find('submit', ['incident', 'incident-stage-1']),
            'completed' => $find('update', ['incident-stage-2']),
            'approved' => $find('approve', ['incident-report']),
        ];
    }

    // ---- helpers -------------------------------------------------------------------------

    /** @param array<string, mixed> $in */
    private static function complaint(array $in): string
    {
        $complaint = mb_substr(trim((string) preg_replace('/\s+/u', ' ', Row::text($in['complaint'] ?? ''))), 0, 150);
        if ($complaint === '') {
            throw ValidationException::withMessages(['complaint' => 'Enter the complaint.']);
        }

        return $complaint;
    }

    private static function parseTime(string $value, string $field): CarbonImmutable
    {
        try {
            return CarbonImmutable::parse($value)->setTimezone(ClinicTime::ZONE);
        } catch (\Throwable) {
            throw ValidationException::withMessages([$field => 'Enter a real date and time.']);
        }
    }

    /**
     * Only the readings taken; `treatmentNotes` rides along in the same object.
     *
     * @return array{readings: array<string, string|float|int>, treatmentNotes: string|null}
     */
    private static function vitals(mixed $vitals): array
    {
        $v = is_array($vitals) ? $vitals : [];
        $readings = [];
        foreach (self::VITALS as $key => $_) {
            $value = $v[$key] ?? null;
            if ($value === null || $value === '') {
                continue;
            }
            $ok = match ($key) {
                'temperatureC' => is_numeric($value) && (float) $value >= 0 && (float) $value < 1000,
                'pulseBpm' => is_numeric($value) && (int) $value >= 0 && (int) $value <= 1000,
                'oxygenSaturationPct' => is_numeric($value) && (int) $value >= 0 && (int) $value <= 100,
                default => is_string($value) && mb_strlen($value) <= 20,
            };
            if (! $ok) {
                throw ValidationException::withMessages(["vitals.{$key}" => 'Check this reading.']);
            }
            $number = is_numeric($value) ? $value + 0 : 0;
            $readings[$key] = $key === 'bloodPressure' ? trim(Row::text($value)) : ($key === 'temperatureC' ? round((float) $number, 2) : (int) $number);
        }

        return ['readings' => $readings, 'treatmentNotes' => trim(Row::text($v['treatmentNotes'] ?? '')) ?: null];
    }

    /**
     * @param  array<string, string|float|int>  $readings
     * @param  array<string, CarbonImmutable>  $times
     */
    private function saveReading(int $id, int $stage, array $readings, int $userId, CarbonImmutable $now, array $times = []): void
    {
        if ($readings === []) {
            return;
        }
        foreach ($readings as $key => $value) {
            DB::table('incident_vital_readings')->insert([
                'incident_id' => $id, 'stage' => $stage, 'recorded_at' => $times[$key] ?? $now,
                'recorded_by_user_id' => $userId, self::VITALS[$key] => $value,
            ]);
        }
    }

    /**
     * @param  array<mixed>  $a
     * @return array{outcome: string, contact: array{name: string, relationship: string|null, phone: string, source: string}|null}
     */
    private static function attempt(array $a): array
    {
        $outcome = Row::text($a['outcome'] ?? '');
        if (! in_array($outcome, self::OUTCOMES, true)) {
            throw ValidationException::withMessages(['outcome' => 'Choose how the call went.']);
        }
        $c = is_array($a['calledContact'] ?? null) ? $a['calledContact'] : null;
        $contact = $c === null ? null : [
            'name' => mb_substr(trim(Row::text($c['name'] ?? '')), 0, 120), 'relationship' => mb_substr(trim(Row::text($c['relationship'] ?? '')), 0, 40) ?: null,
            'phone' => mb_substr(trim(Row::text($c['phone'] ?? '')), 0, 30), 'source' => ($c['source'] ?? '') === 'emergency_contact' ? 'emergency_contact' : 'other',
        ];

        return ['outcome' => $outcome, 'contact' => $contact];
    }

    /**
     * @param  array{outcome: string, contact: array{name: string, relationship: string|null, phone: string, source: string}|null}  $attempt
     * @return array<string, mixed>
     */
    private function saveAttempt(int $id, array $attempt, int $userId, CarbonImmutable $now): array
    {
        $c = $attempt['contact'];
        $rowId = DB::table('parent_notification_attempts')->insertGetId([
            'incident_id' => $id, 'outcome' => $attempt['outcome'], 'attempted_at' => $now, 'logged_by_user_id' => $userId,
            'called_name' => $c['name'] ?? null, 'called_relationship' => $c['relationship'] ?? null, 'phone_dialed' => $c['phone'] ?? null, 'called_source' => $c['source'] ?? null,
        ]);
        $this->log($userId, AuditAction::Create, AuditTarget::ParentNotification, (string) $rowId, null, $now);

        return ['outcome' => $attempt['outcome'], 'timestamp' => ClinicTime::iso($now), 'calledContact' => $c];
    }

    /**
     * The `Incident` type for many rows at once.
     *
     * @param  array<int, object>  $rows
     * @return list<array<string, mixed>>
     */
    private function shape(array $rows): array
    {
        $ids = array_values(array_map(fn (object $r): int => (int) Row::int($r, 'id'), $rows));
        $in = $ids === [] ? [0] : $ids;
        $lines = $this->stock->linesFor('incident_id', $ids);
        $readings = DB::table('incident_vital_readings')->whereIn('incident_id', $in)->orderBy('id')->get();
        $referrals = DB::table('hospital_referrals')->whereIn('incident_id', $in)->get()->keyBy(fn (object $r): int => (int) Row::int($r, 'incident_id'));
        $calls = DB::table('parent_notification_attempts')->whereIn('incident_id', $in)->orderBy('id')->get();
        $out = [];
        foreach ($rows as $r) {
            $id = (int) Row::int($r, 'id');
            $vitals = [];
            $readingTimes = [];
            foreach ($readings as $reading) {
                if (Row::int($reading, 'incident_id') !== $id) {
                    continue;
                }
                foreach (self::VITALS as $key => $col) {
                    $v = Row::str($reading, $col);
                    if ($v !== null) {
                        $vitals[$key] = $key === 'bloodPressure' ? $v : ($key === 'temperatureC' ? (float) $v : (int) $v);
                        $readingTimes[$key] = ClinicTime::iso(CarbonImmutable::parse((string) Row::str($reading, 'recorded_at')));
                    }
                }
            }
            if (($notes = Row::str($r, 'treatment_notes')) !== null) {
                $vitals['treatmentNotes'] = $notes;
            }
            $ref = $referrals->get($id);
            $out[] = [
                'id' => (string) $id, 'studentId' => Row::str($r, 'student_id'), 'personnelId' => Row::str($r, 'personnel_id'),
                'time' => ClinicTime::iso(CarbonImmutable::parse((string) Row::str($r, 'occurred_at'))), 'complaint' => (string) Row::str($r, 'complaint'),
                'recordedAt' => ClinicTime::iso(CarbonImmutable::parse((string) Row::str($r, 'created_at'))),
                'arrivedAtClinic' => Row::str($r, 'arrived_at_clinic_at') === null ? null : ClinicTime::iso(CarbonImmutable::parse((string) Row::str($r, 'arrived_at_clinic_at'))),
                'readingTimes' => (object) $readingTimes,
                'vitals' => (object) $vitals,
                'hospitalReferral' => $ref === null ? null : [
                    'destination' => (string) Row::str($ref, 'destination'), 'transportMode' => (string) Row::str($ref, 'transport_mode'),
                    'departureTime' => ClinicTime::iso(CarbonImmutable::parse((string) Row::str($ref, 'departed_at'))),
                ],
                'parentNotifications' => array_values(array_map(fn (object $c): array => [
                    'outcome' => (string) Row::str($c, 'outcome'), 'timestamp' => ClinicTime::iso(CarbonImmutable::parse((string) Row::str($c, 'attempted_at'))),
                    'calledContact' => Row::str($c, 'phone_dialed') === null && Row::str($c, 'called_name') === null ? null : [
                        'name' => (string) Row::str($c, 'called_name'), 'relationship' => Row::str($c, 'called_relationship'),
                        'phone' => (string) Row::str($c, 'phone_dialed'), 'source' => Row::str($c, 'called_source') ?? 'other',
                    ],
                ], array_filter($calls->all(), fn (object $c): bool => Row::int($c, 'incident_id') === $id))),
                'stage' => (int) Row::int($r, 'stage'), 'eventTag' => Row::str($r, 'event_tag'), 'itemsGiven' => $lines[$id] ?? [],
                'generalNotes' => Row::str($r, 'general_notes'), 'sourceVisitId' => Row::str($r, 'source_visit_id'),
                'gradeLevelAtTime' => Row::str($r, 'grade_level_at_time'), 'sectionAtTime' => Row::str($r, 'section_at_time'),
                'bodyPart' => Row::str($r, 'body_part'), 'noFurtherActionReason' => Row::str($r, 'no_further_action_reason'),
            ];
        }

        return $out;
    }

    private function log(int $userId, AuditAction $action, AuditTarget $target, string $id, ?string $summary, CarbonImmutable $now): void
    {
        $this->audit->record(new AuditEvent(
            actorId: (string) $userId, actorRole: 'staff', action: $action, targetType: $target,
            targetId: $id, targetLabel: null, at: $now, summary: $summary,
        ));
    }
}
