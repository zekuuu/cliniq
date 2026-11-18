<?php

declare(strict_types=1);

namespace App\Modules\StudentRecords\Services;

use App\Shared\AuditLog\AuditAction;
use App\Shared\AuditLog\AuditEvent;
use App\Shared\AuditLog\AuditLogger;
use App\Shared\AuditLog\AuditTarget;
use App\Shared\Support\ClinicTime;
use App\Shared\Support\Lrn;
use App\Shared\Support\PersonName;
use App\Shared\Support\Row;
use App\Shared\Support\SchoolYears;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

/**
 * The yearly student list (ADR-047; `previewStudentImport`, `applyStudentImport`). Rows arrive already
 * mapped and split into name parts by the screen. A flagged row is left out; missing students are
 * archived only when ticked; a list that changes nothing writes nothing.
 *
 * @phpstan-type ImportRow array{lrn: string, firstName: string, lastName: string, middleName: string, gradeLevel: string, section: string, sex: string, birthDate: string}
 */
final class StudentImportService
{
    public function __construct(private readonly StudentService $students, private readonly AuditLogger $audit, private readonly SchoolYears $schoolYears) {}

    /**
     * @param  list<ImportRow>  $rows
     * @return array{newCount: int, continuingCount: int, changedCount: int, missing: list<array{id: string, fullName: string, lrn: string, gradeLevel: string}>, problems: list<array{line: int, lrn: string, problem: string}>}
     */
    public function preview(array $rows): array
    {
        [$good, $problems] = $this->check($rows);
        $known = $this->known();
        $continuing = array_filter($good, fn (array $r): bool => isset($known[$r['lrn']]));
        $listed = array_flip(array_map(fn (array $r): string => Lrn::normalize($r['lrn']), $rows));

        return [
            'newCount' => count($good) - count($continuing),
            'continuingCount' => count($continuing),
            'changedCount' => count(array_filter($continuing, fn (array $r): bool => self::changes($known[$r['lrn']], $r))),
            'missing' => $this->missing($listed),
            'problems' => $problems,
        ];
    }

    /**
     * @param  list<ImportRow>  $rows
     * @param  list<int>  $archiveIds
     * @return array{created: int, updated: int, archived: int, flagged: int}
     */
    public function apply(array $rows, string $fileName, array $archiveIds, int $userId): array
    {
        [$good, $problems] = $this->check($rows);
        $known = $this->known();
        $listed = array_flip(array_map(fn (array $r): string => Lrn::normalize($r['lrn']), $rows));
        $create = array_values(array_filter($good, fn (array $r): bool => ! isset($known[$r['lrn']])));
        $update = array_values(array_filter($good, fn (array $r): bool => isset($known[$r['lrn']]) && self::changes($known[$r['lrn']], $r)));
        $archive = array_values(array_intersect($archiveIds, array_map(fn (array $m): int => (int) $m['id'], $this->missing($listed))));
        $result = ['created' => count($create), 'updated' => count($update), 'archived' => count($archive), 'flagged' => count($problems)];
        if ($create === [] && $update === [] && $archive === []) {
            return $result;
        }

        DB::transaction(function () use ($create, $update, $archive, $known, $rows, $result, $fileName, $userId): void {
            $now = CarbonImmutable::now();
            $year = $this->schoolYears->labelOn(ClinicTime::date($now));
            $grades = DB::table('grade_levels')->pluck('id', 'name');
            $batch = DB::table('student_import_batches')->insertGetId([
                'label' => mb_substr(trim($fileName) !== '' ? trim($fileName) : 'Student list', 0, 80), 'school_year' => $year,
                'source_file_name' => mb_substr($fileName, 0, 255) ?: null, 'rows_total' => count($rows), 'rows_created' => $result['created'],
                'rows_updated' => $result['updated'], 'rows_archived' => $result['archived'], 'rows_flagged' => $result['flagged'],
                'imported_by_user_id' => $userId, 'imported_at' => $now,
            ]);
            foreach ($create as $r) {
                $id = DB::table('students')->insertGetId([
                    'lrn' => $r['lrn'], 'first_name' => PersonName::clean($r['firstName']), 'last_name' => PersonName::clean($r['lastName']),
                    'middle_name' => PersonName::clean($r['middleName']) ?: null, 'grade_level_id' => $grades->get($r['gradeLevel']),
                    'section' => trim($r['section']) ?: null, 'sex' => self::sex($r['sex']), 'birth_date' => $r['birthDate'] ?: null,
                    'import_batch_id' => $batch, 'created_by_user_id' => $userId,
                ]);
                // A new record has no emergency contact yet, so it opens in the Incomplete Records queue.
                DB::table('student_record_reviews')->insert(['student_id' => $id, 'source' => 'registrar_import', 'import_batch_id' => $batch, 'opened_at' => $now]);
            }
            foreach ($update as $r) {
                DB::table('students')->where('id', $known[$r['lrn']]['id'])->update(['grade_level_id' => $grades->get($r['gradeLevel']), 'section' => trim($r['section']) ?: null]);
            }
            if ($archive !== []) {
                DB::table('students')->whereIn('id', $archive)->whereNull('archived_at')->update([
                    'archived_at' => $now, 'archived_by_user_id' => $userId, 'archive_reason' => 'Not on the new list', 'archived_school_year' => $year,
                ]);
            }
            $this->audit->record(new AuditEvent(
                actorId: (string) $userId, actorRole: 'staff', action: AuditAction::Submit, targetType: AuditTarget::StudentImport,
                targetId: (string) $batch, targetLabel: null, at: $now,
                summary: "{$result['created']} added, {$result['updated']} updated, {$result['archived']} archived, {$result['flagged']} flagged",
            ));
        });

        return $result;
    }

    /**
     * Sorts the rows into usable and flagged, in the mock's order of checks.
     *
     * @param  list<ImportRow>  $rows
     * @return array{0: list<ImportRow>, 1: list<array{line: int, lrn: string, problem: string}>}
     */
    private function check(array $rows): array
    {
        $grades = array_flip(DB::table('grade_levels')->pluck('name')->filter(fn (mixed $v): bool => is_string($v))->all());
        $counts = array_count_values(array_map(fn (array $r): string => Lrn::normalize($r['lrn']), $rows));
        $good = [];
        $problems = [];
        foreach ($rows as $i => $row) {
            $row['lrn'] = Lrn::normalize($row['lrn']);
            $birth = $row['birthDate'];
            $realBirth = $birth === '' || (($d = \DateTimeImmutable::createFromFormat('!Y-m-d', $birth)) !== false && $d->format('Y-m-d') === $birth && $birth <= ClinicTime::today());
            $problem = match (true) {
                ! Lrn::isLrn($row['lrn']) => 'The LRN must be exactly 12 digits.',
                $counts[$row['lrn']] > 1 => 'This LRN appears more than once in the file.',
                PersonName::clean($row['firstName']) === '' || PersonName::clean($row['lastName']) === '' => 'The name is incomplete.',
                mb_strlen(PersonName::clean($row['firstName'])) > 50 || mb_strlen(PersonName::clean($row['lastName'])) > 50 || mb_strlen(PersonName::clean($row['middleName'])) > 40 => 'The name is too long.',
                ! isset($grades[$row['gradeLevel']]) => "\"{$row['gradeLevel']}\" is not a grade level.",
                self::sex($row['sex']) === null => 'Sex must be Male or Female.',
                ! $realBirth => 'The birth date is not a real past date (use YYYY-MM-DD).',
                mb_strlen(trim($row['section'])) > 60 => 'The section can be at most 60 characters.',
                default => null,
            };
            if ($problem === null) {
                $good[] = $row;
            } else {
                $problems[] = ['line' => $i + 2, 'lrn' => Lrn::isLrn($row['lrn']) ? Lrn::mask($row['lrn']) : mb_substr($row['lrn'], 0, 20), 'problem' => $problem];
            }
        }

        return [$good, $problems];
    }

    /** @return array<string, array{id: int, gradeLevel: string, section: string}> every student by LRN, archived included */
    private function known(): array
    {
        $out = [];
        foreach (DB::table('students as s')->leftJoin('grade_levels as g', 'g.id', '=', 's.grade_level_id')->get(['s.id', 's.lrn', 's.section', 'g.name as grade']) as $s) {
            $out[(string) Row::str($s, 'lrn')] = ['id' => (int) Row::int($s, 'id'), 'gradeLevel' => Row::str($s, 'grade') ?? '', 'section' => Row::str($s, 'section') ?? ''];
        }

        return $out;
    }

    /**
     * Active students not in the new list, by last name, masked (archived only after review).
     *
     * @param  array<string, int>  $listed
     * @return list<array{id: string, fullName: string, lrn: string, gradeLevel: string}>
     */
    private function missing(array $listed): array
    {
        $out = [];
        foreach ($this->students->activeRecords() as $s) {
            if (! isset($listed[$s->lrn])) {
                $out[] = ['id' => (string) $s->id, 'fullName' => $s->fullName, 'lrn' => Lrn::mask($s->lrn), 'gradeLevel' => $s->gradeLevel];
            }
        }

        return $out;
    }

    /** @param array{id: int, gradeLevel: string, section: string} $record
     * @param ImportRow $row */
    private static function changes(array $record, array $row): bool
    {
        return $record['gradeLevel'] !== $row['gradeLevel'] || $record['section'] !== trim($row['section']);
    }

    private static function sex(string $value): ?string
    {
        return match (true) {
            preg_match('/\Am(ale)?\z/i', trim($value)) === 1 => 'male',
            preg_match('/\Af(emale)?\z/i', trim($value)) === 1 => 'female',
            default => null,
        };
    }
}
