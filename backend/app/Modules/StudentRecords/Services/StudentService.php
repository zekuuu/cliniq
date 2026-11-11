<?php

declare(strict_types=1);

namespace App\Modules\StudentRecords\Services;

use App\Shared\AuditLog\AuditAction;
use App\Shared\AuditLog\AuditEvent;
use App\Shared\AuditLog\AuditLogger;
use App\Shared\AuditLog\AuditTarget;
use App\Shared\AuditLog\DatabaseAuditLogger;
use App\Shared\Http\BusinessRuleViolation;
use App\Shared\Support\ClinicTime;
use App\Shared\Support\Lrn;
use App\Shared\Support\PersonName;
use App\Shared\Support\Row;
use App\Shared\Support\SchoolYears;
use Carbon\CarbonImmutable;
use Illuminate\Database\Query\Builder;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Student Records (Module 2): `listStudents`, `searchStudents`, `getStudent`, `checkStudentDuplicates`,
 * `saveStudent`, `archiveStudent` and `getIncompleteRecordQueue` in the mock API. Lists carry the
 * masked LRN and no birthdate, health field or contact (ADR-004, ADR-040, ADR-054).
 */
final class StudentService
{
    private const NAME_MAX = ['firstName' => 50, 'lastName' => 50, 'middleName' => 40];

    private const NAME_LABELS = ['firstName' => 'first name', 'lastName' => 'last name', 'middleName' => 'middle name'];

    /** Fields compared for the audit summary, by their API names (ADR-017: names, never values). */
    private const AUDITED = ['firstName', 'lastName', 'middleName', 'gradeLevel', 'section', 'sex', 'birthDate', 'allergies', 'medicalConditions', 'emergencyContacts'];

    public function __construct(private readonly AuditLogger $audit, private readonly SchoolYears $schoolYears) {}

    // ---- reads ----------------------------------------------------------------------------

    /** @return list<array<string, mixed>> `StudentListRow[]`, by last, first and middle name */
    public function list(string $search, string $gradeLevel, bool $includeArchived, string $recordStatus, ?int $limit): array
    {
        $search = mb_strtolower(trim($search));
        $digits = preg_match('/\A\d+\z/', $search) === 1;
        $rows = $this->records(fn (Builder $q) => $q
            ->when(! $includeArchived, fn (Builder $w) => $w->whereNull('s.archived_at'))
            ->when($gradeLevel !== '', fn (Builder $w) => $w->where('g.name', $gradeLevel)))
            ->filter(fn (StudentRecord $s): bool => $search === '' || PersonName::matches($s->fullName, $search) || ($digits && str_starts_with($s->lrn, $search)))
            ->filter(fn (StudentRecord $s): bool => $recordStatus === '' || $s->complete() === ($recordStatus === 'complete'));

        return array_values($rows->take($limit ?? $rows->count())->map(fn (StudentRecord $s): array => $s->row())->all());
    }

    /**
     * Active students by LRN prefix first, then by name (every word, ADR-064); never a roster.
     *
     * @return list<array{id: string, lrn: string, fullName: string, gradeLevel: string}>
     */
    public function search(string $query, int $limit): array
    {
        $q = mb_strtolower(trim($query));
        if ($q === '') {
            return [];
        }
        $digits = (string) preg_replace('/[\s-]/', '', $q);
        $lrnQuery = preg_match('/\A[\d\s-]+\z/', $q) === 1 && $digits !== '';
        $active = $this->records(fn (Builder $w) => $w->whereNull('s.archived_at'), withDetails: false);
        $byLrn = $active->filter(fn (StudentRecord $s): bool => $lrnQuery && str_starts_with($s->lrn, $digits));
        $byName = $active->filter(fn (StudentRecord $s): bool => ! $byLrn->has($s->id) && PersonName::matches($s->fullName, $q));

        return array_values($byLrn->merge($byName)->take($limit)->map(fn (StudentRecord $s): array => $s->match())->all());
    }

    /** @return array<string, mixed> the `Student` type, full LRN (ADR-040) */
    public function show(int $id): array
    {
        return $this->find($id)->toArray();
    }

    /** @return array{lrnTaken: bool, nameMatches: list<array{id: string, lrn: string, fullName: string, gradeLevel: string}>} */
    public function checkDuplicates(string $lrn, string $fullName): array
    {
        $lrn = Lrn::normalize($lrn);
        $key = PersonName::key($fullName);

        return [
            'lrnTaken' => Lrn::isLrn($lrn) && DB::table('students')->where('lrn', $lrn)->exists(),
            'nameMatches' => $key === '' ? [] : $this->nameMatches($key, null),
        ];
    }

    /** @return list<array<string, mixed>> `IncompleteRecord[]`: open (incomplete) and resolved rows, masked */
    public function incompleteQueue(): array
    {
        $reviews = DB::table('student_record_reviews as r')
            ->leftJoin('users as u', 'u.id', '=', 'r.resolved_by_user_id')
            ->leftJoin('student_import_batches as b', 'b.id', '=', 'r.import_batch_id')
            ->orderBy('r.id')
            ->get(['r.student_id', 'r.source', 'r.opened_at', 'r.resolved_by_user_id', 'r.resolved_at', 'u.name as resolved_by_name', 'b.label as batch_label'])
            ->keyBy(fn (object $r): int => (int) Row::int($r, 'student_id')); // the latest review per student

        $out = [];
        foreach ($this->records(fn (Builder $w) => $w->whereNull('s.archived_at')) as $s) {
            $review = $reviews->get($s->id);
            $resolvedAt = $review === null ? null : Row::str($review, 'resolved_at');
            if ($s->complete() && $resolvedAt === null) {
                continue;
            }
            $out[] = [
                'student' => $s->row(),
                'missingFields' => $s->missingFields,
                'review' => $review === null ? null : [
                    'studentId' => (string) $s->id,
                    'importedAt' => substr((string) Row::str($review, 'opened_at'), 0, 10),
                    'importedBy' => Row::str($review, 'source') === 'flagged_in_clinic' ? 'Flagged in CLINIQ' : (Row::str($review, 'batch_label') ?? 'Registrar import'),
                    'resolvedByUserId' => Row::str($review, 'resolved_by_user_id'),
                    'resolvedAt' => $resolvedAt === null ? null : ClinicTime::iso(CarbonImmutable::parse($resolvedAt)),
                ],
                'status' => $resolvedAt === null ? 'open' : 'resolved',
                'resolvedByName' => $review === null ? null : Row::str($review, 'resolved_by_name'),
            ];
        }

        return $out;
    }

    // ---- writes ---------------------------------------------------------------------------

    /**
     * Create (`$id` null) or update. On create a name and grade match on an active record answers
     * `duplicate` until confirmed. On update the LRN is locked and a changed name needs a reason.
     *
     * @param  array<string, mixed>  $input  validated `StudentInput`
     * @return array<string, mixed>
     */
    public function save(array $input, ?int $id, bool $confirmDuplicate, ?string $nameCorrectionReason, int $userId, string $role): array
    {
        $lrn = Lrn::normalize(self::text($input, 'lrn'));
        if (! Lrn::isLrn($lrn)) {
            throw ValidationException::withMessages(['lrn' => 'The LRN must be exactly 12 digits.']);
        }
        $current = $id === null ? null : $this->find($id);
        if ($current !== null && $current->lrn !== $lrn) {
            throw new BusinessRuleViolation('lrn_locked', "The LRN is the student's identifier and can't be changed.");
        }
        $name = self::cleanName($input, "the student's");
        $fullName = PersonName::format($name['firstName'], $name['middleName'], $name['lastName']);
        $nameChanged = $current !== null && $current->fullName !== $fullName;
        $reason = trim((string) $nameCorrectionReason);
        if ($nameChanged && mb_strlen($reason) < 3) {
            throw ValidationException::withMessages(['nameCorrectionReason' => 'Enter a reason for the name correction (at least 3 characters).']);
        }
        if (DB::table('students')->where('lrn', $lrn)->when($id !== null, fn (Builder $q) => $q->where('id', '!=', $id))->exists()) {
            throw self::duplicateLrn();
        }
        $grade = trim(self::text($input, 'gradeLevel'));
        if ($id === null && ! $confirmDuplicate) {
            $matches = $this->nameMatches(PersonName::key($fullName), $grade);
            if ($matches !== []) {
                return ['status' => 'duplicate', 'matches' => $matches];
            }
        }
        $birthDate = self::birthDate(self::text($input, 'birthDate'));
        $gradeId = $grade === '' ? null : DB::table('grade_levels')->where('name', $grade)->value('id');
        if ($grade !== '' && $gradeId === null) {
            throw ValidationException::withMessages(['gradeLevel' => 'Choose the grade level.']);
        }
        $section = trim(self::text($input, 'section'));
        $sex = self::text($input, 'sex');
        $row = [
            'lrn' => $lrn, 'first_name' => $name['firstName'], 'last_name' => $name['lastName'], 'middle_name' => $name['middleName'],
            'grade_level_id' => $gradeId, 'section' => $section === '' ? null : $section, 'sex' => $sex === '' ? null : $sex, 'birth_date' => $birthDate,
        ];
        $health = ['allergy' => self::labels($input['allergies'] ?? []), 'condition' => self::labels($input['medicalConditions'] ?? [])];
        $contacts = self::contacts($input['emergencyContacts'] ?? []);

        try {
            $studentId = DB::transaction(function () use ($id, $row, $health, $contacts, $current, $nameChanged, $reason, $userId, $role): int {
                $now = CarbonImmutable::now();
                if ($id === null) {
                    $id = DB::table('students')->insertGetId($row + ['created_by_user_id' => $userId]);
                } else {
                    DB::table('students')->where('id', $id)->update($row + ($nameChanged ? ['name_correction_reason' => mb_substr($reason, 0, 300)] : []));
                }
                $this->writeDetails($id, $health, $contacts, $userId, $now);
                $saved = $this->find($id);
                $this->audit->record(new AuditEvent(
                    actorId: (string) $userId, actorRole: $role, action: $current === null ? AuditAction::Create : AuditAction::Update,
                    targetType: AuditTarget::Student, targetId: (string) $id, targetLabel: null, at: $now,
                    subjectStudentId: (string) $id, summary: $current === null ? null : self::summary($current, $saved, $nameChanged ? $reason : null),
                ));
                if ($current !== null && ! $current->complete() && $saved->complete()) {
                    $this->resolveReview($id, $userId, $now);
                }

                return $id;
            });
        } catch (UniqueConstraintViolationException) {
            throw self::duplicateLrn(); // two saves raced past the check above
        }

        return ['status' => 'saved', 'student' => $this->show($studentId), 'action' => $current === null ? 'create' : 'update'];
    }

    /** @return array<string, mixed> */
    public function archive(int $id, string $reason, int $userId, string $role): array
    {
        $this->find($id);
        $reason = mb_substr(PersonName::clean($reason), 0, 80);
        if ($reason === '') {
            throw ValidationException::withMessages(['reason' => 'Give the reason for archiving.']);
        }
        DB::transaction(function () use ($id, $reason, $userId, $role): void {
            $now = CarbonImmutable::now();
            DB::table('students')->where('id', $id)->update([
                'archived_at' => $now, 'archived_by_user_id' => $userId, 'archive_reason' => $reason,
                'archived_school_year' => $this->schoolYears->labelOn(ClinicTime::date($now)),
            ]);
            $this->audit->record(new AuditEvent(
                actorId: (string) $userId, actorRole: $role, action: AuditAction::Archive, targetType: AuditTarget::Student,
                targetId: (string) $id, targetLabel: null, at: $now, subjectStudentId: (string) $id,
            ));
        });

        return $this->show($id);
    }

    // ---- helpers --------------------------------------------------------------------------

    private function find(int $id): StudentRecord
    {
        $student = $this->records(fn (Builder $w) => $w->where('s.id', $id))->first();
        abort_if($student === null, 404);

        return $student;
    }

    /**
     * Students in name order, keyed by id.
     *
     * @param  callable(Builder): mixed  $where
     * @return Collection<int, StudentRecord>
     */
    private function records(callable $where, bool $withDetails = true): Collection
    {
        $query = DB::table('students as s')->leftJoin('grade_levels as g', 'g.id', '=', 's.grade_level_id')->select(['s.*', 'g.name as grade_level']);
        $where($query);
        // ponytail: name matching scans the active students in PHP (~900). Add a search index past ~20,000.
        $rows = $query->get()->sort(PersonName::compare(...))->values();
        $ids = $rows->map(fn (object $r): int => (int) Row::int($r, 'id'))->all();
        $detailIds = $withDetails ? $ids : []; // an empty whereIn reads nothing
        $health = DB::table('student_health_entries')->whereIn('student_id', $detailIds)->orderBy('sort_order')->get();
        $contacts = DB::table('emergency_contacts')->whereIn('student_id', $detailIds)->orderBy('sort_order')->get();

        return $rows->mapWithKeys(function (object $r) use ($health, $contacts): array {
            $id = (int) Row::int($r, 'id');
            $labels = fn (string $kind): array => array_values($health
                ->filter(fn (object $h): bool => Row::int($h, 'student_id') === $id && Row::str($h, 'kind') === $kind)
                ->map(fn (object $h): string => (string) Row::str($h, 'label'))->all());
            $mine = array_values($contacts->filter(fn (object $c): bool => Row::int($c, 'student_id') === $id)
                ->map(fn (object $c): array => [
                    'name' => (string) Row::str($c, 'name'), 'relationship' => Row::str($c, 'relationship') ?? '',
                    'phone' => (string) Row::str($c, 'phone'), 'verified' => Row::str($c, 'is_verified') === '1',
                ])->all());

            return [$id => StudentRecord::fromRow($r, $labels('allergy'), $labels('condition'), $mine)];
        });
    }

    /** @return list<array{id: string, lrn: string, fullName: string, gradeLevel: string}> active students with this name key, masked */
    private function nameMatches(string $key, ?string $grade): array
    {
        return array_values($this->records(fn (Builder $w) => $w->whereNull('s.archived_at'), withDetails: false)
            ->filter(fn (StudentRecord $s): bool => PersonName::key($s->fullName) === $key && ($grade === null || $s->gradeLevel === $grade))
            ->map(fn (StudentRecord $s): array => $s->match())->all());
    }

    /**
     * @param  array<string, list<string>>  $health
     * @param  list<array{name: string, relationship: string, phone: string, verified: bool}>  $contacts
     */
    private function writeDetails(int $id, array $health, array $contacts, int $userId, CarbonImmutable $now): void
    {
        DB::table('student_health_entries')->where('student_id', $id)->delete();
        foreach ($health as $kind => $labels) {
            foreach ($labels as $i => $label) {
                DB::table('student_health_entries')->insert(['student_id' => $id, 'kind' => $kind, 'label' => $label, 'sort_order' => $i, 'created_by_user_id' => $userId]);
            }
        }
        // ponytail: contacts are replaced on each save, so a kept "verified" gets a new verified_at.
        DB::table('emergency_contacts')->where('student_id', $id)->delete();
        foreach ($contacts as $i => $c) {
            DB::table('emergency_contacts')->insert([
                'student_id' => $id, 'name' => $c['name'], 'relationship' => $c['relationship'] === '' ? null : $c['relationship'],
                'phone' => $c['phone'], 'is_primary' => $i === 0 ? 1 : 0, 'sort_order' => $i,
                'is_verified' => $c['verified'] ? 1 : 0, 'verified_at' => $c['verified'] ? $now : null, 'verified_by_user_id' => $c['verified'] ? $userId : null,
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $input
     * @return array{firstName: string, lastName: string, middleName: string|null}
     */
    private static function cleanName(array $input, string $whose): array
    {
        $middle = PersonName::clean(self::text($input, 'middleName'));
        $name = ['firstName' => PersonName::clean(self::text($input, 'firstName')), 'lastName' => PersonName::clean(self::text($input, 'lastName')), 'middleName' => $middle === '' ? null : $middle];
        if ($name['firstName'] === '') {
            throw ValidationException::withMessages(['firstName' => "Enter {$whose} first name."]);
        }
        if ($name['lastName'] === '') {
            throw ValidationException::withMessages(['lastName' => "Enter {$whose} last name."]);
        }
        foreach (self::NAME_MAX as $key => $max) {
            if (mb_strlen((string) $name[$key]) > $max) {
                throw ValidationException::withMessages([$key => 'The '.self::NAME_LABELS[$key]." can be at most {$max} characters."]);
            }
        }

        return $name;
    }

    private static function birthDate(string $value): ?string
    {
        if ($value === '') {
            return null;
        }
        $date = \DateTimeImmutable::createFromFormat('!Y-m-d', $value);
        if ($date === false || $date->format('Y-m-d') !== $value) {
            throw ValidationException::withMessages(['birthDate' => 'Enter a real birthdate.']);
        }
        if ($value > ClinicTime::today()) {
            throw ValidationException::withMessages(['birthDate' => "The birthdate can't be in the future."]);
        }

        return $value;
    }

    /** @param array<mixed> $input */
    private static function text(array $input, string $key): string
    {
        $v = $input[$key] ?? null;

        return is_string($v) ? $v : '';
    }

    /**
     * Trimmed, blanks dropped, each label once (ignoring case).
     *
     * @return list<string>
     */
    private static function labels(mixed $values): array
    {
        $out = [];
        foreach (is_array($values) ? $values : [] as $value) {
            $clean = PersonName::clean(is_string($value) ? $value : '');
            if ($clean !== '' && ! in_array(mb_strtolower($clean), array_map(mb_strtolower(...), $out), true)) {
                $out[] = $clean;
            }
        }

        return $out;
    }

    /** @return list<array{name: string, relationship: string, phone: string, verified: bool}> */
    private static function contacts(mixed $values): array
    {
        $out = [];
        foreach (is_array($values) ? $values : [] as $c) {
            $c = is_array($c) ? $c : [];
            $out[] = [
                'name' => PersonName::clean(self::text($c, 'name')), 'relationship' => trim(self::text($c, 'relationship')),
                'phone' => trim(self::text($c, 'phone')), 'verified' => ($c['verified'] ?? false) === true,
            ];
        }

        return $out;
    }

    /** "Updated last name. Name corrected; reason: …" (ADR-058, ADR-064); the audit copy never carries an LRN or an email. */
    private static function summary(StudentRecord $before, StudentRecord $after, ?string $reason): ?string
    {
        $old = $before->toArray();
        $new = $after->toArray();
        $summary = DatabaseAuditLogger::changedSummary(array_values(array_filter(self::AUDITED, fn (string $f): bool => $old[$f] !== $new[$f])));
        if ($reason === null) {
            return $summary;
        }

        return mb_substr(($summary ?? 'Updated name').'. Name corrected; reason: '.preg_replace('/\d{12,}|@/', '…', $reason), 0, 255);
    }

    private function resolveReview(int $studentId, int $userId, CarbonImmutable $now): void
    {
        $open = DB::table('student_record_reviews')->where('student_id', $studentId)->whereNull('resolved_at')->value('id');
        if ($open === null) {
            $open = DB::table('student_record_reviews')->insertGetId(['student_id' => $studentId, 'source' => 'flagged_in_clinic', 'opened_at' => $now]);
        }
        DB::table('student_record_reviews')->where('id', $open)->update(['resolved_by_user_id' => $userId, 'resolved_at' => $now]);
    }

    private static function duplicateLrn(): BusinessRuleViolation
    {
        return new BusinessRuleViolation('duplicate_lrn', 'This LRN is already used by another student record.');
    }
}
