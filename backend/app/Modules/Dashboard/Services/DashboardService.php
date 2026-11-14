<?php

declare(strict_types=1);

namespace App\Modules\Dashboard\Services;

use App\Modules\InventoryTracker\Services\InventoryService;
use App\Modules\ReportsGeneration\Services\MonthlyReportService;
use App\Modules\StudentRecords\Services\StudentService;
use App\Shared\FollowUps\FollowUpService;
use App\Shared\Settings\SettingsService;
use App\Shared\Support\ClinicTime;
use App\Shared\Support\Lrn;
use App\Shared\Support\Row;
use App\Shared\Support\SchoolYears;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * The Dashboard (Module 9; `buildDashboardSummary` in `lib/mock-db/dashboard.ts`), computed on each
 * call. Masked, never a full LRN (ADR-074). The Admin's totals leave staff incidents out (ADR-053),
 * the Admin gets no cluster alerts (ADR-050) and no school-year reminder (ADR-075).
 *
 * @phpstan-type Event array{date: string, hour: int, complaint: string, eventTag: string|null, sex: string|null, gradeLevel: string|null, kind: string, staff: bool, stage: int}
 */
final class DashboardService
{
    private const PRESETS = ['today', 'last7', 'last30', 'thisMonth', 'thisYear', 'all', 'custom'];

    private const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    public function __construct(
        private readonly SettingsService $settings,
        private readonly FollowUpService $followUps,
        private readonly InventoryService $inventory,
        private readonly StudentService $students,
        private readonly SchoolYears $schoolYears,
        private readonly CalendarService $calendar,
    ) {}

    /**
     * @return array{preset: string, from: string, to: string} the range a preset means today (`rangeForPreset`)
     */
    public static function range(string $preset, ?string $from, ?string $to): array
    {
        $today = ClinicTime::today();
        $t = CarbonImmutable::parse($today);
        if (! in_array($preset, self::PRESETS, true)) {
            throw ValidationException::withMessages(['preset' => 'Choose a date range.']);
        }
        if ($preset === 'custom') {
            if ($from === null || $to === null || $to < $from) {
                throw ValidationException::withMessages(['from' => 'Choose a start and an end date, the end not before the start.']);
            }

            return ['preset' => $preset, 'from' => $from, 'to' => $to];
        }

        return ['preset' => $preset, 'to' => $today, 'from' => match ($preset) {
            'today' => $today,
            'last7' => $t->subDays(6)->format('Y-m-d'),
            'last30' => $t->subDays(29)->format('Y-m-d'),
            'thisMonth' => $t->startOfMonth()->format('Y-m-d'),
            'thisYear' => $t->startOfYear()->format('Y-m-d'),
            default => '1900-01-01',
        }];
    }

    /**
     * @param  array{preset: string, from: string, to: string}  $range
     * @return array<string, mixed> `DashboardSummary`
     */
    public function summary(array $range, ?string $sex, ?string $gradeLevel, bool $admin): array
    {
        $today = ClinicTime::today();
        ['from' => $from, 'to' => $to] = $range;
        $visits = $this->visits();
        $incidents = $this->incidents($admin);
        $inRange = fn (array $e): bool => $e['date'] >= $from && $e['date'] <= $to;
        $visitsInRange = array_values(array_filter($visits, $inRange));
        $incidentsInRange = array_values(array_filter($incidents, $inRange));
        $students = array_values(array_filter([...$visits, ...$incidents], fn (array $e): bool => ! $e['staff']));
        $trend = array_values(array_filter($students, fn (array $e): bool => ($sex === null || $e['sex'] === $sex) && ($gradeLevel === null || $e['gradeLevel'] === $gradeLevel)));

        $firstRecord = DB::query()->fromSub(
            DB::table('visits')->whereNull('entered_in_error_at')->selectRaw('MIN(DATE(visited_at)) AS d')->union(DB::table('incidents')->selectRaw('MIN(DATE(occurred_at)) AS d')),
            'x',
        )->min('d');
        $firstRecord = is_string($firstRecord) ? $firstRecord : null;
        $length = CarbonImmutable::parse($from)->diffInDays(CarbonImmutable::parse($to)) + 1;
        $prevFrom = CarbonImmutable::parse($from)->subDays((int) $length)->format('Y-m-d');
        $prevTo = CarbonImmutable::parse($from)->subDay()->format('Y-m-d');
        $comparable = $range['preset'] !== 'all' && $firstRecord !== null && $prevFrom >= $firstRecord;
        $inPrev = fn (array $e): bool => $e['date'] >= $prevFrom && $e['date'] <= $prevTo;
        $inClinic = DB::table('visits')->whereNull('entered_in_error_at')->where('disposition', 'resting_in_clinic')->whereNull('time_out')
            ->whereBetween('visited_at', ["{$today} 00:00:00", "{$today} 23:59:59"])->get(['student_id', 'personnel_id']);
        $inventory = $this->inventory->list('', '', false, '');

        return [
            'today' => $today,
            'generatedAt' => ClinicTime::iso(CarbonImmutable::now()),
            'range' => ['from' => $from, 'to' => $to],
            'oldestRecordDate' => $firstRecord,
            'counts' => [
                'visits' => count($visitsInRange),
                'incidents' => count($incidentsInRange),
                'incidentsAtStage1' => count(array_filter($incidentsInRange, fn (array $e): bool => $e['stage'] === 1)),
                'pendingRecords' => count(array_filter($this->students->incompleteQueue(), fn (array $r): bool => $r['status'] === 'open')),
                'lowStockItems' => count(array_filter($inventory, fn (array $i): bool => in_array('low_stock', (array) $i['flags'], true))),
                'activeStudents' => DB::table('students')->whereNull('archived_at')->count(),
                'inClinicNow' => $inClinic->count(),
                'incidentsAwaitingStage2' => count(array_filter($incidents, fn (array $e): bool => $e['stage'] === 1)),
                'split' => [
                    'visits' => self::split($visitsInRange), 'incidents' => self::split($incidentsInRange),
                    'inClinicNow' => ['students' => $inClinic->whereNotNull('student_id')->count(), 'staff' => $inClinic->whereNotNull('personnel_id')->count()],
                ],
            ],
            'previousCounts' => $comparable ? ['visits' => count(array_filter($visits, $inPrev)), 'incidents' => count(array_filter($incidents, $inPrev))] : null,
            'dueFollowUps' => $this->dueFollowUps($admin),
            'upcomingWindowDays' => $this->settings->int('upcoming_follow_up_days'),
            'frequentVisitors' => $this->frequentVisitors($from, $to),
            'frequentVisitorMinVisits' => $this->settings->int('frequent_visitor_min_visits'),
            'showFrequentVisitors' => DB::table('reference_settings')->where('setting_key', 'show_frequent_visitors')->value('setting_value') !== 'false',
            'percentMinPriorCount' => $this->settings->int('percent_min_prior_count'),
            'backupAlert' => $this->backupAlert(),
            'schoolYearReminder' => $this->schoolYears->reminder($today, $admin ? 'admin' : 'staff'),
            'inventoryAlerts' => self::inventoryAlerts($inventory, $today),
            'complaintTrends' => $this->trends($trend, $range),
            'demographics' => $this->demographics(
                [...array_filter($students, $inRange), ...array_filter([...$visitsInRange, ...$incidentsInRange], fn (array $e): bool => $e['staff'])],
                $sex, $gradeLevel,
            ),
        ];
    }

    /**
     * ADR-050: `cluster_min_students` or more students with one complaint and one grade (at the time)
     * in the last `cluster_window_days` days; students only; a flag, nothing more. None for the Admin.
     *
     * @return list<array{complaint: string, gradeLevel: string, students: int, from: string, to: string}>
     */
    public function clusters(bool $admin): array
    {
        if ($admin) {
            return [];
        }
        $to = ClinicTime::today();
        $from = CarbonImmutable::parse($to)->subDays($this->settings->int('cluster_window_days') - 1)->format('Y-m-d');
        $groups = [];
        $rows = MonthlyReportService::counted()->whereNotNull('visits.student_id')->whereBetween('visited_at', ["{$from} 00:00:00", "{$to} 23:59:59"])
            ->leftJoin('students as s', 's.id', '=', 'visits.student_id')->leftJoin('grade_levels as g', 'g.id', '=', 's.grade_level_id')
            ->get(['visits.student_id', 'visits.complaint', 'visits.grade_level_at_time as at_time', 'g.name as now_grade'])
            ->merge(DB::table('incidents as i')->whereNotNull('i.student_id')->whereBetween('i.occurred_at', ["{$from} 00:00:00", "{$to} 23:59:59"])
                ->leftJoin('students as s', 's.id', '=', 'i.student_id')->leftJoin('grade_levels as g', 'g.id', '=', 's.grade_level_id')
                ->get(['i.student_id', 'i.complaint', 'i.grade_level_at_time as at_time', 'g.name as now_grade']));
        foreach ($rows as $r) {
            $grade = Row::str($r, 'at_time') ?? Row::str($r, 'now_grade') ?? '';
            $complaint = trim((string) Row::str($r, 'complaint'));
            $key = mb_strtolower($complaint).'|'.$grade;
            $groups[$key] ??= ['complaint' => $complaint, 'gradeLevel' => $grade, 'students' => []];
            $groups[$key]['students'][(int) Row::int($r, 'student_id')] = true;
        }
        $min = $this->settings->int('cluster_min_students');
        $order = $this->gradeOrder();
        $out = array_values(array_map(fn (array $g): array => ['complaint' => $g['complaint'], 'gradeLevel' => $g['gradeLevel'], 'students' => count($g['students']), 'from' => $from, 'to' => $to],
            array_filter($groups, fn (array $g): bool => count($g['students']) >= $min)));
        usort($out, fn (array $a, array $b): int => $b['students'] <=> $a['students'] ?: ($order[$a['gradeLevel']] ?? 999) <=> ($order[$b['gradeLevel']] ?? 999) ?: strcmp($a['complaint'], $b['complaint']));

        return $out;
    }

    /**
     * Visit and incident counts, events and tags per day (`buildCalendarDays`). May include staff incidents (Q8).
     *
     * @return list<array{date: string, visits: int, incidents: int, events: list<array{id: string, title: string, startDate: string, endDate: string|null}>, eventTags: list<string>}>
     */
    public function calendarDays(string $from, string $to): array
    {
        $counts = [];
        $tags = [];
        foreach ([...$this->visits(), ...$this->incidents(false)] as $e) {
            $counts[$e['date']][$e['kind']] = ($counts[$e['date']][$e['kind']] ?? 0) + 1;
            if ($e['eventTag'] !== null) {
                $tags[$e['date']][$e['eventTag']] = true;
            }
        }
        $events = $this->calendar->events($from, $to);
        $out = [];
        for ($d = CarbonImmutable::parse($from); $d->format('Y-m-d') <= $to; $d = $d->addDay()) {
            $date = $d->format('Y-m-d');
            $mine = array_values(array_filter($events, fn (array $e): bool => $e['startDate'] <= $date && ($e['endDate'] ?? $e['startDate']) >= $date));
            $titles = array_map(fn (array $e): string => mb_strtolower($e['title']), $mine);
            $out[] = [
                'date' => $date, 'visits' => $counts[$date]['visit'] ?? 0, 'incidents' => $counts[$date]['incident'] ?? 0, 'events' => $mine,
                // A tag that repeats an event's title is shown once, as the event.
                'eventTags' => array_values(array_filter(array_map('strval', array_keys($tags[$date] ?? [])), fn (string $t): bool => ! in_array(mb_strtolower($t), $titles, true))),
            ];
        }

        return $out;
    }

    // ---- helpers -------------------------------------------------------------------------

    /** @return list<Event> counted visits (ADR-036) */
    private function visits(): array
    {
        return array_values(MonthlyReportService::counted()->leftJoin('students as s', 's.id', '=', 'visits.student_id')->leftJoin('personnel as p', 'p.id', '=', 'visits.personnel_id')
            ->leftJoin('grade_levels as g', 'g.id', '=', 's.grade_level_id')
            ->get(['visits.visited_at as at', 'visits.complaint', 'visits.event_tag', 'visits.personnel_id', 'visits.grade_level_at_time', 'g.name as grade', 's.sex as ssex', 'p.sex as psex'])
            ->map(fn (object $r): array => self::event($r, 'visit'))->all());
    }

    /** @return list<Event> the Admin's leave staff incidents out (ADR-053) */
    private function incidents(bool $admin): array
    {
        return array_values(DB::table('incidents as i')->when($admin, fn ($q) => $q->whereNull('i.personnel_id'))
            ->leftJoin('students as s', 's.id', '=', 'i.student_id')->leftJoin('personnel as p', 'p.id', '=', 'i.personnel_id')->leftJoin('grade_levels as g', 'g.id', '=', 's.grade_level_id')
            ->get(['i.occurred_at as at', 'i.complaint', 'i.event_tag', 'i.personnel_id', 'i.grade_level_at_time', 'i.stage', 'g.name as grade', 's.sex as ssex', 'p.sex as psex'])
            ->map(fn (object $r): array => ['stage' => (int) Row::int($r, 'stage')] + self::event($r, 'incident'))->all());
    }

    /** @return Event */
    private static function event(object $r, string $kind): array
    {
        $staff = Row::int($r, 'personnel_id') !== null;
        $at = (string) Row::str($r, 'at');

        return [
            'date' => substr($at, 0, 10), 'hour' => (int) substr($at, 11, 2), 'complaint' => (string) Row::str($r, 'complaint'), 'eventTag' => Row::str($r, 'event_tag'),
            'sex' => Row::str($r, $staff ? 'psex' : 'ssex'), 'gradeLevel' => $staff ? null : (Row::str($r, 'grade_level_at_time') ?? Row::str($r, 'grade')),
            'kind' => $kind, 'staff' => $staff, 'stage' => 0,
        ];
    }

    /**
     * @param  list<Event>  $rows
     * @return array{students: int, staff: int}
     */
    private static function split(array $rows): array
    {
        $staff = 0;
        $all = 0;
        foreach ($rows as $r) {
            $all++;
            $staff += $r['staff'] ? 1 : 0;
        }

        return ['students' => $all - $staff, 'staff' => $staff];
    }

    /** @return list<array<string, mixed>> pending follow-ups due by today plus the upcoming window; masked; none of a staff patient for the Admin */
    private function dueFollowUps(bool $admin): array
    {
        $today = CarbonImmutable::parse(ClinicTime::today());
        $horizon = $today->addDays($this->settings->int('upcoming_follow_up_days'))->format('Y-m-d');
        $out = [];
        foreach ($this->followUps->list('pending') as $f) {
            $date = Row::text($f['followUpDate']);
            if ($date > $horizon || ($admin && $f['personnelId'] !== null) || $f['dueState'] === null) {
                continue;
            }
            $patient = is_array($f['patient']) ? $f['patient'] : [];
            $out[] = [
                'followUp' => ['id' => $f['id'], 'followUpDate' => $date, 'reason' => $f['reason'], 'status' => $f['status'], 'relatedRecord' => $f['relatedRecord']],
                'patient' => ['kind' => $patient['kind'] ?? 'student', 'id' => Row::text($f['studentId'] ?? $f['personnelId']), 'number' => $patient['number'] ?? ''],
                'dueState' => $f['dueState'],
                'daysFromToday' => (int) $today->diffInDays(CarbonImmutable::parse($date), false),
            ];
        }

        return $out;
    }

    /** @return list<array{student: array{id: string, lrn: string}, visitCount: int}> students only, masked */
    private function frequentVisitors(string $from, string $to): array
    {
        return array_values(MonthlyReportService::counted()->join('students as s', 's.id', '=', 'visits.student_id')
            ->whereBetween('visited_at', ["{$from} 00:00:00", "{$to} 23:59:59"])->groupBy('s.id', 's.lrn')
            ->havingRaw('COUNT(*) >= ?', [$this->settings->int('frequent_visitor_min_visits')])->orderByRaw('COUNT(*) DESC')->orderBy('s.lrn')
            ->get(['s.id', 's.lrn', DB::raw('COUNT(*) AS n')])
            ->map(fn (object $r): array => ['student' => ['id' => (string) Row::int($r, 'id'), 'lrn' => Lrn::mask((string) Row::str($r, 'lrn'))], 'visitCount' => (int) Row::int($r, 'n')])->all());
    }

    /**
     * @param  list<array<string, mixed>>  $views
     * @return list<array<string, mixed>> items with a flag, the expired first
     */
    private static function inventoryAlerts(array $views, string $today): array
    {
        $rows = [];
        foreach ($views as $v) {
            $flags = array_values(array_map(fn (mixed $f): string => Row::text($f), (array) $v['flags']));
            if ($flags === []) {
                continue;
            }
            $expiry = $v['expirationDate'] ?? $v['oldestExpiredDate'];
            $rows[] = [
                'item' => ['id' => $v['id'], 'name' => $v['name'], 'category' => $v['category'], 'unit' => $v['unit'], 'lowStockThreshold' => $v['lowStockThreshold'], 'currentStock' => $v['currentStock'], 'expirationDate' => $expiry],
                'flags' => $flags,
                'daysUntilExpiry' => is_string($expiry) ? (int) CarbonImmutable::parse($today)->diffInDays(CarbonImmutable::parse($expiry), false) : null,
            ];
        }
        $severity = fn (array $r): int => (in_array('expired', (array) $r['flags'], true) ? 4 : 0) + count((array) $r['flags']);
        usort($rows, fn (array $a, array $b): int => $severity($b) <=> $severity($a) ?: strcmp(Row::text($a['item']['name']), Row::text($b['item']['name'])));

        return $rows;
    }

    /** @return array{kind: string, lastSuccessAt: string|null, staleAfterHours: int}|null no good backup, a failed latest run, or a stale one */
    private function backupAlert(): ?array
    {
        $hours = $this->settings->int('stale_backup_hours');
        $locations = DB::table('backup_locations')->exists();
        $last = $locations
            ? DB::table('backup_locations')->where('enabled', 1)->where('last_result', 'ok')->max('last_backup_at')
            : DB::table('backup_logs')->where('status', 'ok')->max('ran_at');
        $lastAt = is_string($last) ? ClinicTime::iso(CarbonImmutable::parse($last)) : null;
        $base = ['lastSuccessAt' => $lastAt, 'staleAfterHours' => $hours];
        if ($lastAt === null) {
            return ['kind' => 'never'] + $base;
        }
        if (DB::table('backup_logs')->orderByDesc('ran_at')->orderByDesc('id')->value('status') === 'failed') {
            return ['kind' => 'failed'] + $base;
        }

        return CarbonImmutable::parse((string) $last)->diffInHours(CarbonImmutable::now()) > $hours ? ['kind' => 'stale'] + $base : null;
    }

    /**
     * Trend buckets and the top complaints (`buildComplaintTrends`); a month range adds the weekday comparison.
     *
     * @param  list<Event>  $events
     * @param  array{preset: string, from: string, to: string}  $range
     * @return array<string, mixed>
     */
    private function trends(array $events, array $range): array
    {
        $from = $range['from'];
        $to = $range['to'];
        if ($range['preset'] === 'all') {
            $from = array_reduce($events, fn (string $min, array $e): string => min($min, $e['date']), $to);
        }
        $days = (int) CarbonImmutable::parse($from)->diffInDays(CarbonImmutable::parse($to)) + 1;
        $granularity = match ($range['preset']) {
            'today' => 'hour', 'last7', 'last30', 'thisMonth' => 'day', 'thisYear' => 'month',
            'all' => $days <= 732 ? 'month' : 'year',
            default => $days <= 1 ? 'hour' : ($days <= 31 ? 'day' : ($days <= 120 ? 'week' : ($days <= 732 ? 'month' : 'year'))),
        };
        $buckets = $granularity === 'hour' ? self::hourBuckets($to, array_column(array_filter($events, fn (array $e): bool => $e['date'] === $to), 'hour')) : self::buckets($from, $to, $granularity);
        $series = [];
        foreach ($events as $e) {
            foreach ($buckets as $i => $b) {
                if ($e['date'] >= $b['from'] && $e['date'] <= $b['to'] && (! isset($b['hour']) || $b['hour'] === $e['hour'])) {
                    $series[$e['complaint']] ??= array_fill(0, count($buckets), 0);
                    $series[$e['complaint']][$i]++;

                    break;
                }
            }
        }
        $minCount = $this->settings->int('cluster_min_count');
        $ratio = (float) Row::text(DB::table('system_settings')->where('setting_key', 'cluster_ratio')->value('setting_value'));
        $all = array_map(fn (string $c, array $counts): array => ['complaint' => $c, 'counts' => $counts, 'total' => array_sum($counts), 'clusterBuckets' => self::clusterBuckets($counts, $minCount, $ratio)], array_keys($series), array_values($series));
        usort($all, fn (array $a, array $b): int => $b['total'] <=> $a['total'] ?: strcmp($a['complaint'], $b['complaint']));
        $top = $this->settings->int('top_complaints');
        $out = ['granularity' => $granularity, 'buckets' => $buckets, 'series' => array_slice($all, 0, $top), 'otherComplaints' => array_slice($all, $top)];
        $start = CarbonImmutable::parse($range['from']);
        if ($range['from'] === $start->startOfMonth()->format('Y-m-d') && ($range['preset'] === 'thisMonth' || $range['to'] === CarbonImmutable::parse($range['to'])->endOfMonth()->format('Y-m-d'))) {
            $out['weekdayComparison'] = $this->weekdays($events, $range['from'], $range['to']);
        }

        return $out;
    }

    /** @return list<array{key: string, label: string, from: string, to: string}> */
    private static function buckets(string $from, string $to, string $granularity): array
    {
        $cursor = CarbonImmutable::parse($from);
        $cursor = match ($granularity) {
            'week' => $cursor->subDays($cursor->dayOfWeek), 'month' => $cursor->startOfMonth(), 'year' => $cursor->startOfYear(), default => $cursor
        };
        $out = [];
        while ($cursor->format('Y-m-d') <= $to) {
            $end = match ($granularity) {
                'week' => $cursor->addDays(6), 'month' => $cursor->endOfMonth(), 'year' => $cursor->endOfYear(), default => $cursor
            };
            $bFrom = max($cursor->format('Y-m-d'), $from);
            $out[] = [
                'key' => $cursor->format('Y-m-d'),
                'label' => match ($granularity) {
                    'month' => $cursor->format('M Y'), 'year' => $cursor->format('Y'), default => CarbonImmutable::parse($bFrom)->format('M j')
                },
                'from' => $bFrom, 'to' => min($end->format('Y-m-d'), $to),
            ];
            $cursor = $end->addDay()->startOfDay();
        }

        return $out;
    }

    /** @param list<int> $hours
     * @return list<array{key: string, label: string, from: string, to: string, hour: int}> a school day's hours, 7 AM to 5 PM at least */
    private static function hourBuckets(string $date, array $hours): array
    {
        $first = min(7, ...($hours === [] ? [7] : $hours));
        $last = max(17, ...($hours === [] ? [17] : $hours));

        return array_map(fn (int $h): array => ['key' => $date.'T'.sprintf('%02d', $h), 'label' => ($h % 12 ?: 12).' '.($h < 12 ? 'AM' : 'PM'), 'from' => $date, 'to' => $date, 'hour' => $h], range($first, $last));
    }

    /** @param list<int> $counts
     * @return list<int> `detectClusters` */
    private static function clusterBuckets(array $counts, int $minCount, float $ratio): array
    {
        if (count($counts) < 2) {
            return [];
        }
        $total = array_sum($counts);
        $out = [];
        foreach ($counts as $i => $c) {
            if ($c >= $minCount && $c >= ($total - $c) / (count($counts) - 1) * $ratio) {
                $out[] = $i;
            }
        }

        return $out;
    }

    /**
     * This month by weekday against the month before, each weekday's busiest day annotated with its tags, events and holidays.
     *
     * @param  list<Event>  $events
     * @return array<string, mixed>
     */
    private function weekdays(array $events, string $from, string $to): array
    {
        $prevFrom = CarbonImmutable::parse($from)->subDay()->startOfMonth();
        $prevTo = $to === CarbonImmutable::parse($to)->endOfMonth()->format('Y-m-d') ? $prevFrom->endOfMonth() : $prevFrom->addDays((int) CarbonImmutable::parse($from)->diffInDays(CarbonImmutable::parse($to)));
        $windows = [[$from, $to], [$prevFrom->format('Y-m-d'), $prevTo->format('Y-m-d')]];
        $calendar = $this->calendar->events($windows[1][0], $to);
        $holidays = $this->calendar->holidays($windows[1][0], $to)['holidays'];
        $summaries = array_map(function (array $w) use ($events, $calendar, $holidays): array {
            $out = [];
            foreach (range(0, 6) as $weekday) {
                $byDate = [];
                foreach ($events as $e) {
                    if ($e['date'] < $w[0] || $e['date'] > $w[1] || CarbonImmutable::parse($e['date'])->dayOfWeek !== $weekday) {
                        continue;
                    }
                    $byDate[$e['date']] ??= ['count' => 0, 'tags' => []];
                    $byDate[$e['date']]['count']++;
                    if ($e['eventTag'] !== null) {
                        $byDate[$e['date']]['tags'][] = $e['eventTag'];
                    }
                }
                uksort($byDate, fn (string $a, string $b): int => $byDate[$b]['count'] <=> $byDate[$a]['count'] ?: strcmp($a, $b));
                $peakDate = array_key_first($byDate);
                $peak = null;
                if ($peakDate !== null) {
                    $labels = array_values(array_unique(array_filter($byDate[$peakDate]['tags'])));
                    foreach ($calendar as $c) {
                        if ($c['startDate'] <= $peakDate && ($c['endDate'] ?? $c['startDate']) >= $peakDate && ! in_array($c['title'], $labels, true)) {
                            $labels[] = $c['title'];
                        }
                    }
                    foreach ($holidays as $h) {
                        if ($h['date'] === $peakDate && ! in_array($h['name'], $labels, true)) {
                            $labels[] = $h['name'];
                        }
                    }
                    $peak = ['date' => $peakDate, 'count' => $byDate[$peakDate]['count'], 'annotations' => $labels];
                }
                $out[] = ['total' => array_sum(array_column($byDate, 'count')), 'peak' => $peak];
            }

            return $out;
        }, $windows);

        return [
            'currentLabel' => CarbonImmutable::parse($from)->format('F Y'),
            'previousLabel' => $prevFrom->format('F Y'),
            'rows' => array_map(fn (int $i): array => ['label' => self::WEEKDAYS[$i], 'current' => $summaries[0][$i]['total'], 'previous' => $summaries[1][$i]['total'],
                'currentPeak' => $summaries[0][$i]['peak'], 'previousPeak' => $summaries[1][$i]['peak']], range(0, 6)),
        ];
    }

    /**
     * Sex rows (Female, Male, and "No sex recorded" when any) with students and staff parts; grade rows students only.
     *
     * @param  array<int, Event>  $events
     * @return array{sex: list<array<string, mixed>>, gradeLevel: list<array<string, mixed>>}
     */
    private function demographics(array $events, ?string $sex, ?string $grade): array
    {
        $sexEvents = array_values(array_filter($events, fn (array $e): bool => $grade === null || $e['gradeLevel'] === $grade));
        $gradeEvents = array_values(array_filter($events, fn (array $e): bool => ($sex === null || $e['sex'] === $sex) && $e['gradeLevel'] !== null));
        $sexLabels = ['female' => 'Female', 'male' => 'Male'];
        if (array_filter($sexEvents, fn (array $e): bool => $e['sex'] === null) !== []) {
            $sexLabels['none'] = 'No sex recorded';
        }
        $order = $this->gradeOrder();
        $grades = array_unique([...array_keys($order), ...array_map(fn (array $e): string => (string) $e['gradeLevel'], $gradeEvents)]);
        usort($grades, fn (string $a, string $b): int => ($order[$a] ?? 999) <=> ($order[$b] ?? 999) ?: strnatcmp($a, $b));

        return ['sex' => self::demographicRows($sexEvents, 'sex', $sexLabels), 'gradeLevel' => self::demographicRows($gradeEvents, 'gradeLevel', array_combine($grades, $grades))];
    }

    /**
     * @param  list<Event>  $group
     * @param  array<string, string>  $labels
     * @return list<array<string, mixed>>
     */
    private static function demographicRows(array $group, string $key, array $labels): array
    {
        $total = count($group);
        $out = [];
        foreach ($labels as $value => $label) {
            $mine = array_filter($group, fn (array $e): bool => ($key === 'sex' ? ($e['sex'] ?? 'none') : ($e['gradeLevel'] ?? 'none')) === (string) $value);
            $visits = count(array_filter($mine, fn (array $e): bool => $e['kind'] === 'visit'));
            $row = ['key' => (string) $value, 'label' => $label, 'count' => count($mine), 'visits' => $visits, 'incidents' => count($mine) - $visits, 'share' => $total === 0 ? 0 : count($mine) / $total];
            if ($key === 'sex') {
                $staff = count(array_filter($mine, fn (array $e): bool => $e['staff']));
                $row += ['students' => count($mine) - $staff, 'staff' => $staff];
            }
            $out[] = $row;
        }

        return $out;
    }

    /** @return array<string, int> active grade levels by their order (`compareGradeLevels`: Kinder first) */
    private function gradeOrder(): array
    {
        $out = [];
        foreach (DB::table('grade_levels')->where('is_active', 1)->orderBy('sort_order')->get(['name', 'sort_order']) as $g) {
            $out[(string) Row::str($g, 'name')] = (int) Row::int($g, 'sort_order');
        }

        return $out;
    }
}
