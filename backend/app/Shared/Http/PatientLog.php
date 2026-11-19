<?php

declare(strict_types=1);

namespace App\Shared\Http;

use App\Shared\Support\Lrn;
use App\Shared\Support\Row;
use Illuminate\Database\Query\Builder;

/**
 * The parts the Visit Log and the Incident Log share (ADR-082): the patient's number (the masked
 * LRN or the Staff No., never the name: ADR-004, ADR-043), the Everyone / Students / Staff filter,
 * the search box and the number sort, all in SQL. `$t` is the log table's alias.
 */
final class PatientLog
{
    /**
     * Joins the student (with the current grade) and the staff patient of each row.
     *
     * @param  literal-string  $t
     */
    public static function join(Builder $query, string $t): Builder
    {
        return $query->leftJoin('students as s', 's.id', '=', "{$t}.student_id")
            ->leftJoin('grade_levels as g', 'g.id', '=', 's.grade_level_id')
            ->leftJoin('personnel as p', 'p.id', '=', "{$t}.personnel_id");
    }

    /**
     * The grade at the time of the record (ADR-047), else the current grade; a staff row shows the staff type.
     *
     * @param  literal-string  $t
     * @return literal-string
     */
    public static function gradeSql(string $t): string
    {
        return "COALESCE({$t}.grade_level_at_time, g.name, p.type, '')";
    }

    /**
     * `everyone` (the default), `students` or `staff`.
     *
     * @param  literal-string  $t
     */
    public static function patient(Builder $query, string $t, string $patient): Builder
    {
        return match ($patient) {
            'students' => $query->whereNotNull("{$t}.student_id"),
            'staff' => $query->whereNotNull("{$t}.personnel_id"),
            default => $query,
        };
    }

    /**
     * The log's search box (frontend `lrnMatchesSearch`, ADR-080 item 7): typed digits find the last
     * 4 of the masked LRN (a few digits found in them, or a longer entry ending with them); the Staff
     * No. matches by its start; the grade or staff type and the given text columns match anywhere.
     *
     * @param  literal-string  $t
     * @param  list<literal-string>  $textColumns
     */
    public static function search(Builder $query, string $t, string $search, array $textColumns): Builder
    {
        $search = mb_strtolower(trim($search));
        if ($search === '') {
            return $query;
        }
        $digits = (string) preg_replace('/[\s-]/', '', $search);
        $like = '%'.addcslashes($search, '%_\\').'%';

        return $query->where(function (Builder $w) use ($t, $search, $digits, $like, $textColumns): void {
            if ($digits !== '' && preg_match('/\A\d+\z/', $digits) === 1) {
                $w->orWhere(fn (Builder $l) => strlen($digits) <= 4
                    ? $l->whereRaw('RIGHT(s.lrn, 4) LIKE ?', ['%'.$digits.'%'])
                    : $l->whereRaw('RIGHT(s.lrn, 4) = ?', [substr($digits, -4)]));
            }
            $w->orWhereRaw('LOWER(p.staff_number) LIKE ?', [addcslashes((string) preg_replace('/\s/', '', $search), '%_\\').'%'])
                ->orWhereRaw('LOWER('.self::gradeSql($t).') LIKE ?', [$like]);
            foreach ($textColumns as $column) {
                $w->orWhereRaw("LOWER({$t}.{$column}) LIKE ?", [$like]);
            }
        });
    }

    /**
     * The "LRN or Staff No." sort: kind, then the shown number (the last 4 of the LRN).
     *
     * @param  literal-string  $t
     * @param  'asc'|'desc'  $direction
     */
    public static function orderByNumber(Builder $query, string $t, string $direction): Builder
    {
        return $query->orderByRaw("CASE WHEN {$t}.student_id IS NOT NULL THEN 'student' ELSE 'personnel' END {$direction}")
            ->orderByRaw("COALESCE(RIGHT(s.lrn, 4), p.staff_number) {$direction}");
    }

    /** @return array{kind: 'student'|'personnel', number: string} */
    public static function number(\stdClass $row): array
    {
        $lrn = Row::str($row, 'lrn');

        return $lrn !== null ? ['kind' => 'student', 'number' => Lrn::mask($lrn)] : ['kind' => 'personnel', 'number' => (string) Row::str($row, 'staff_number')];
    }
}
