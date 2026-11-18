<?php

declare(strict_types=1);

namespace App\Modules\ReportsGeneration\Services;

use App\Shared\AuditLog\AuditAction;
use App\Shared\AuditLog\AuditEvent;
use App\Shared\AuditLog\AuditLogger;
use App\Shared\AuditLog\AuditTarget;
use App\Shared\AuditLog\DatabaseAuditLogger;
use App\Shared\Support\ClinicTime;
use App\Shared\Support\PersonName;
use App\Shared\Support\Row;
use App\Shared\Support\SchoolYears;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Sports Reports (ADR-034): Staff only. Only the list of students is stored; the content is computed
 * when asked, never with notes, vitals, medicines, contacts or letters.
 */
final class SportsReportService
{
    public const TEXT_MAX = 120;

    /** API window => stored `look_back` (contract G23). */
    private const WINDOWS = [30 => '30_days', 60 => '60_days', 90 => '90_days', 'school_year' => 'school_year'];

    private const OUTCOMES = ['returned_to_class' => 'Returned to class', 'sent_home' => 'Sent home', 'referred_to_hospital' => 'Referred to hospital', 'resting_in_clinic' => 'Resting in clinic'];

    public function __construct(private readonly AuditLogger $audit, private readonly SchoolYears $schoolYears) {}

    /** @return list<array<string, mixed>> `SportsReportSummary[]`, newest first */
    public function list(): array
    {
        return array_values(DB::table('sports_reports as r')->leftJoin('sports_report_students as s', 's.sports_report_id', '=', 'r.id')
            ->groupBy('r.id', 'r.title', 'r.activity', 'r.requested_by', 'r.updated_at', 'r.archived_at')->orderByDesc('r.updated_at')->orderByDesc('r.id')
            ->get(['r.id', 'r.title', 'r.activity', 'r.requested_by', 'r.updated_at', 'r.archived_at', DB::raw('COUNT(s.id) AS n')])
            ->map(fn (object $r): array => [
                'id' => (string) Row::int($r, 'id'), 'title' => (string) Row::str($r, 'title'), 'activity' => Row::str($r, 'activity'),
                'requestedBy' => (string) Row::str($r, 'requested_by'), 'studentCount' => (int) Row::int($r, 'n'),
                'updatedAt' => ClinicTime::iso(CarbonImmutable::parse((string) Row::str($r, 'updated_at'))), 'archived' => Row::str($r, 'archived_at') !== null,
            ])->all());
    }

    /** @return array<string, mixed> `SportsReportDetail`: the students with name and grade for recognition, no medical field */
    public function detail(int $id): array
    {
        $report = $this->find($id);
        $report['students'] = array_map(function (array $s): array {
            $st = DB::table('students as s')->leftJoin('grade_levels as g', 'g.id', '=', 's.grade_level_id')->where('s.id', $s['studentId'])->first(['s.*', 'g.name as grade']);

            return $st === null
                ? ['studentId' => $s['studentId'], 'fullName' => null, 'gradeLevel' => null, 'status' => 'missing']
                : ['studentId' => $s['studentId'], 'fullName' => PersonName::format((string) Row::str($st, 'first_name'), Row::str($st, 'middle_name'), (string) Row::str($st, 'last_name')),
                    'gradeLevel' => Row::str($st, 'grade'), 'status' => Row::str($st, 'archived_at') !== null ? 'archived' : 'active'];
        }, $report['students']);

        return $report;
    }

    /** @return array<string, mixed> `SportsReportContent`, computed now (ADR-034) */
    public function content(int $id): array
    {
        $report = $this->find($id);
        $to = ClinicTime::today();
        $window = $report['window'];
        $from = $window === 'school_year' ? $this->schoolYears->current()['from'] : CarbonImmutable::parse($to)->subDays((int) $window - 1)->format('Y-m-d');
        $ids = array_map(fn (array $s): int => (int) $s['studentId'], $report['students']);
        $students = DB::table('students as s')->leftJoin('grade_levels as g', 'g.id', '=', 's.grade_level_id')->whereIn('s.id', $ids === [] ? [0] : $ids)
            ->get(['s.*', 'g.name as grade'])->keyBy(fn (object $s): int => (int) Row::int($s, 'id'));
        $between = ["{$from} 00:00:00", "{$to} 23:59:59"];
        $leftOut = ['archived' => 0, 'missing' => 0];
        $rows = [];
        foreach ($ids as $sid) {
            $st = $students->get($sid);
            if ($st === null || Row::str($st, 'archived_at') !== null) {
                $leftOut[$st === null ? 'missing' : 'archived']++;

                continue;
            }
            $entries = [
                ...DB::table('visits')->where('student_id', $sid)->whereNull('entered_in_error_at')->whereBetween('visited_at', $between)->get()
                    ->map(fn (object $v): array => ['id' => (string) Row::int($v, 'id'), 'dateTime' => ClinicTime::iso(CarbonImmutable::parse((string) Row::str($v, 'visited_at'))),
                        'kind' => 'Visit', 'what' => (string) Row::str($v, 'complaint'), 'outcome' => self::OUTCOMES[(string) Row::str($v, 'disposition')] ?? '']),
                ...DB::table('incidents as i')->leftJoin('hospital_referrals as h', 'h.incident_id', '=', 'i.id')->where('i.student_id', $sid)->whereBetween('i.occurred_at', $between)->get(['i.id', 'i.occurred_at', 'i.complaint', 'h.id as referral'])
                    ->map(fn (object $i): array => ['id' => (string) Row::int($i, 'id'), 'dateTime' => ClinicTime::iso(CarbonImmutable::parse((string) Row::str($i, 'occurred_at'))),
                        'kind' => 'Incident', 'what' => (string) Row::str($i, 'complaint'), 'outcome' => Row::int($i, 'referral') !== null ? 'Referred to hospital' : 'No hospital referral recorded']),
            ];
            usort($entries, fn (array $a, array $b): int => strcmp($b['dateTime'], $a['dateTime']));
            $row = ['studentId' => (string) $sid, 'sort' => $st, 'fullName' => PersonName::format((string) Row::str($st, 'first_name'), Row::str($st, 'middle_name'), (string) Row::str($st, 'last_name')),
                'gradeLevel' => Row::str($st, 'grade') ?? '', 'entries' => $entries];
            if ($report['includeConditions'] === true) {
                $labels = fn (string $kind): array => array_values(DB::table('student_health_entries')->where('student_id', $sid)->where('kind', $kind)->orderBy('sort_order')->pluck('label')->map(fn (mixed $l): string => Row::text($l))->all());
                $row['conditions'] = ['medicalConditions' => $labels('condition'), 'allergies' => $labels('allergy')];
            }
            $rows[] = $row;
        }
        usort($rows, fn (array $a, array $b): int => PersonName::compare($a['sort'], $b['sort']));

        return [
            'report' => array_intersect_key($report, array_flip(['id', 'title', 'activity', 'requestedBy', 'window', 'includeConditions', 'archived'])),
            'from' => $from, 'to' => $to, 'asOf' => ClinicTime::iso(CarbonImmutable::now()),
            'rows' => array_map(function (array $r): array {
                unset($r['sort']);

                return $r;
            }, $rows),
            'leftOut' => $leftOut,
        ];
    }

    /**
     * @param  array<string, mixed>  $in
     * @return array<string, mixed>
     */
    public function save(array $in, ?int $id, int $userId): array
    {
        $before = $id === null ? null : $this->find($id);
        $clean = self::clean($in);

        return DB::transaction(function () use ($before, $id, $clean, $userId): array {
            [$row, $students] = $clean;
            if ($id === null) {
                $id = DB::table('sports_reports')->insertGetId($row + ['created_by_user_id' => $userId]);
            } else {
                DB::table('sports_reports')->where('id', $id)->update($row + ['updated_at' => CarbonImmutable::now()]);
                DB::table('sports_report_students')->where('sports_report_id', $id)->delete();
            }
            foreach ($students as $sid) {
                DB::table('sports_report_students')->insert(['sports_report_id' => $id, 'student_id' => $sid]);
            }
            $after = $this->find($id);
            $changed = $before === null ? [] : array_values(array_filter(['title', 'activity', 'requestedBy', 'window', 'includeConditions', 'students'], fn (string $f): bool => json_encode($before[$f]) !== json_encode($after[$f])));
            $this->log($userId, $before === null ? AuditAction::Create : AuditAction::Update, $id, $before === null ? null : DatabaseAuditLogger::changedSummary($changed));

            return $after;
        });
    }

    /** @return array<string, mixed> a new, active copy for the next event */
    public function duplicate(int $id, int $userId): array
    {
        $source = $this->find($id);

        return DB::transaction(function () use ($source, $userId): array {
            $new = DB::table('sports_reports')->insertGetId([
                'title' => mb_substr('Copy of '.$source['title'], 0, self::TEXT_MAX), 'activity' => $source['activity'], 'requested_by' => $source['requestedBy'],
                'look_back' => self::WINDOWS[$source['window']], 'include_conditions' => $source['includeConditions'] === true ? 1 : 0, 'created_by_user_id' => $userId,
            ]);
            foreach ($source['students'] as $s) {
                DB::table('sports_report_students')->insert(['sports_report_id' => $new, 'student_id' => (int) $s['studentId']]);
            }
            $this->log($userId, AuditAction::Create, $new, 'Duplicated from another Sports Report');

            return $this->find($new);
        });
    }

    /** @return array<string, mixed> archived reports are hidden and can be restored; nothing is deleted */
    public function setArchived(int $id, bool $archived, int $userId): array
    {
        $this->find($id);
        DB::transaction(function () use ($id, $archived, $userId): void {
            DB::table('sports_reports')->where('id', $id)->update(['archived_at' => $archived ? CarbonImmutable::now() : null, 'updated_at' => CarbonImmutable::now()]);
            $this->log($userId, $archived ? AuditAction::Archive : AuditAction::Update, $id, $archived ? null : 'Restored from the archive');
        });

        return $this->find($id);
    }

    /**
     * @return array{id: string, title: string, activity: string|null, requestedBy: string, window: int|string, includeConditions: bool, students: list<array{studentId: string}>, archived: bool, createdByUserId: string, createdAt: string, updatedAt: string} `SportsReport`
     */
    private function find(int $id): array
    {
        $r = DB::table('sports_reports')->where('id', $id)->first();
        abort_if($r === null, 404);
        $window = (string) Row::str($r, 'look_back');
        $at = fn (string $c): string => ClinicTime::iso(CarbonImmutable::parse((string) Row::str($r, $c)));

        return [
            'id' => (string) $id, 'title' => (string) Row::str($r, 'title'), 'activity' => Row::str($r, 'activity'), 'requestedBy' => (string) Row::str($r, 'requested_by'),
            'window' => $window === 'school_year' ? 'school_year' : (int) $window, 'includeConditions' => Row::str($r, 'include_conditions') === '1',
            'students' => array_values(DB::table('sports_report_students')->where('sports_report_id', $id)->orderBy('id')->pluck('student_id')->map(fn (mixed $s): array => ['studentId' => Row::text($s)])->all()),
            'archived' => Row::str($r, 'archived_at') !== null, 'createdByUserId' => (string) Row::int($r, 'created_by_user_id'), 'createdAt' => $at('created_at'), 'updatedAt' => $at('updated_at'),
        ];
    }

    /**
     * `validateSportsReport`: every field message at once (422 with field `errors`).
     *
     * @param  array<string, mixed>  $in
     * @return array{0: array<string, mixed>, 1: list<int>}
     */
    private static function clean(array $in): array
    {
        $title = trim(Row::text($in['title'] ?? ''));
        $activity = trim(Row::text($in['activity'] ?? ''));
        $by = trim(Row::text($in['requestedBy'] ?? ''));
        $window = $in['window'] ?? null;
        $errors = [];
        if ($title === '') {
            $errors['title'] = 'Enter a title for the report.';
        } elseif (mb_strlen($title) > self::TEXT_MAX) {
            $errors['title'] = 'Keep the title to '.self::TEXT_MAX.' characters or fewer.';
        }
        if (mb_strlen($activity) > self::TEXT_MAX) {
            $errors['activity'] = 'Keep the activity to '.self::TEXT_MAX.' characters or fewer.';
        }
        if ($by === '') {
            $errors['requestedBy'] = 'Enter the name of the instructor who asked for the report.';
        } elseif (mb_strlen($by) > self::TEXT_MAX) {
            $errors['requestedBy'] = 'Keep the name to '.self::TEXT_MAX.' characters or fewer.';
        }
        $windowKey = is_int($window) ? $window : Row::text($window);
        if (! array_key_exists($windowKey, self::WINDOWS)) {
            $errors['window'] = 'Choose a look-back window.';
        }
        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }
        $ids = [];
        foreach (is_array($in['students'] ?? null) ? $in['students'] : [] as $s) {
            $sid = Row::toInt(is_array($s) ? ($s['studentId'] ?? null) : null);
            if ($sid !== null && ! in_array($sid, $ids, true)) {
                $ids[] = $sid;
            }
        }
        $known = array_map(fn (mixed $v): int => (int) Row::toInt($v), DB::table('students')->whereIn('id', $ids === [] ? [0] : $ids)->pluck('id')->all());
        if (count($known) !== count($ids)) {
            throw ValidationException::withMessages(['students' => 'One of the students is no longer in CLINIQ.']);
        }

        return [['title' => $title, 'activity' => $activity === '' ? null : $activity, 'requested_by' => $by, 'look_back' => self::WINDOWS[$windowKey], 'include_conditions' => ($in['includeConditions'] ?? false) === true ? 1 : 0], $ids];
    }

    private function log(int $userId, AuditAction $action, int $id, ?string $summary): void
    {
        $this->audit->record(new AuditEvent(
            actorId: (string) $userId, actorRole: 'staff', action: $action, targetType: AuditTarget::SportsReport,
            targetId: (string) $id, targetLabel: null, at: CarbonImmutable::now(), summary: $summary,
        ));
    }
}
