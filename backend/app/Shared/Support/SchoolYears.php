<?php

declare(strict_types=1);

namespace App\Shared\Support;

use App\Shared\Settings\SettingsService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * `frontend/src/lib/schoolYear.ts` (ADR-072, ADR-075). A year runs from the day Staff started it until
 * the day before the next start; dates before the first recorded start fall back to the date settings
 * (default June 15 to April 14). Dates are `YYYY-MM-DD` strings in Asia/Manila.
 *
 * @phpstan-type Year array{label: string, startYear: int, from: string, to: string, lastClassDay: string, started: bool, endedOn: string|null}
 * @phpstan-type Settings array{schoolYearStartMonth: int, schoolYearStartDay: int, schoolYearEndMonth: int, schoolYearEndDay: int}
 * @phpstan-type Start object{id: int, label: string, started_on: string, ended_on: string|null, started_by_user_id: int, ended_by_user_id: int|null}
 */
final class SchoolYears
{
    /** February counts as 28 days, so a setting works every year. */
    private const DAYS_IN = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

    public function __construct(private readonly SettingsService $settings) {}

    public static function label(int $startYear): string
    {
        return $startYear.'–'.($startYear + 1);
    }

    /** @return Settings */
    public function settings(): array
    {
        return [
            'schoolYearStartMonth' => $this->settings->int('school_year_start_month'),
            'schoolYearStartDay' => $this->settings->int('school_year_start_day'),
            'schoolYearEndMonth' => $this->settings->int('school_year_end_month'),
            'schoolYearEndDay' => $this->settings->int('school_year_end_day'),
        ];
    }

    /** @return Collection<int, Start> the recorded starts, oldest first */
    public function starts(): Collection
    {
        /** @var Collection<int, Start> */
        return DB::table('school_years')->orderBy('started_on')->get()->map(fn (object $r): object => (object) [
            'id' => (int) Row::int($r, 'id'), 'label' => (string) Row::str($r, 'label'),
            'started_on' => (string) Row::str($r, 'started_on'), 'ended_on' => Row::str($r, 'ended_on'),
            'started_by_user_id' => (int) Row::int($r, 'started_by_user_id'), 'ended_by_user_id' => Row::int($r, 'ended_by_user_id'),
        ]);
    }

    public function labelOn(string $date): string
    {
        return $this->of($date)['label'];
    }

    /** @return Year the school year `$date` belongs to (`schoolYearOf`) */
    public function of(string $date): array
    {
        $settings = $this->settings();
        $starts = $this->starts()->values();
        $index = -1;
        foreach ($starts as $i => $s) {
            if ($s->started_on <= $date) {
                $index = $i;
            }
        }
        if ($index < 0) {
            $planned = self::planned($date, $settings);
            $first = $starts->first();
            if ($first === null || $planned['label'] < $first->label) {
                return $first !== null && $planned['to'] >= $first->started_on ? ['to' => self::addDays($first->started_on, -1)] + $planned : $planned;
            }
            $before = self::planned(((int) substr($first->label, 0, 4) - 1).'-'.self::monthDay($settings['schoolYearStartMonth'], $settings['schoolYearStartDay']), $settings);

            return ['to' => self::addDays($first->started_on, -1)] + $before;
        }
        $start = $starts->get($index);
        if ($start === null) {
            throw new \LogicException('A found start index must exist.');
        }
        $next = $starts->get($index + 1);
        $startYear = (int) substr($start->label, 0, 4);
        $planned = self::planned($startYear.'-'.self::monthDay($settings['schoolYearStartMonth'], $settings['schoolYearStartDay']), $settings);

        return [
            'label' => $start->label,
            'startYear' => $startYear,
            'from' => $start->started_on,
            'to' => $next !== null ? self::addDays($next->started_on, -1) : max($date, $planned['to']),
            'lastClassDay' => $start->ended_on ?? $planned['lastClassDay'],
            'started' => true,
            'endedOn' => $start->ended_on,
        ];
    }

    /** @return Year */
    public function current(): array
    {
        return $this->of(ClinicTime::today());
    }

    /**
     * What Staff do next (`schoolYearStep`): end the year in session, or start the next.
     *
     * @return array{kind: string, label: string, dueOn: string, due: bool, soon: bool}
     */
    public function step(string $today): array
    {
        $settings = $this->settings();
        $current = $this->of($today);
        $notice = $this->settings->int('school_year_notice_days');
        $soon = fn (string $dueOn): bool => $today < $dueOn && $today >= self::addDays($dueOn, -$notice);
        if ($current['started'] && $current['endedOn'] === null) {
            $dueOn = self::planned($current['from'], $settings)['lastClassDay'];

            return ['kind' => 'end', 'label' => $current['label'], 'dueOn' => $dueOn, 'due' => $today > $dueOn, 'soon' => $soon($dueOn) || $today === $dueOn];
        }
        if (! $current['started'] && $today <= $current['lastClassDay']) {
            // No start recorded for a year already in its class days (a new install): that year is the one to start.
            return ['kind' => 'start', 'label' => $current['label'], 'dueOn' => $current['from'], 'due' => true, 'soon' => false];
        }
        $after = $current['endedOn'] ?? $current['from'];
        $md = self::monthDay($settings['schoolYearStartMonth'], $settings['schoolYearStartDay']);
        $sameYear = substr($after, 0, 4).'-'.$md;
        $dueOn = $sameYear > $after ? $sameYear : ((int) substr($after, 0, 4) + 1).'-'.$md;

        return ['kind' => 'start', 'label' => self::label($current['startYear'] + 1), 'dueOn' => $dueOn, 'due' => $today >= $dueOn, 'soon' => $soon($dueOn)];
    }

    /**
     * The Dashboard and sidebar reminder (`schoolYearReminderOf`): from the notice days before a step is due; never for the Admin.
     *
     * @return array{kind: string, label: string, dueOn: string, overdue: bool, dueToday: bool}|null
     */
    public function reminder(string $today, string $role): ?array
    {
        $step = $this->step($today);
        if ($role === 'admin' || ! ($step['due'] || $step['soon'])) {
            return null;
        }

        return ['kind' => $step['kind'], 'label' => $step['label'], 'dueOn' => $step['dueOn'], 'overdue' => $today > $step['dueOn'], 'dueToday' => $today === $step['dueOn']];
    }

    /**
     * `schoolYearSettingsError`: the first problem, or null.
     *
     * @param  Settings  $s
     */
    public static function settingsError(array $s): ?string
    {
        foreach ([$s['schoolYearStartMonth'], $s['schoolYearEndMonth']] as $month) {
            if ($month < 1 || $month > 12) {
                return 'Choose a month from January to December.';
            }
        }
        if ($s['schoolYearStartDay'] < 1 || $s['schoolYearStartDay'] > self::DAYS_IN[$s['schoolYearStartMonth'] - 1]) {
            return 'The start day is not a date in that month.';
        }
        if ($s['schoolYearEndDay'] < 1 || $s['schoolYearEndDay'] > self::DAYS_IN[$s['schoolYearEndMonth'] - 1]) {
            return 'The end day is not a date in that month.';
        }
        if (self::monthDay($s['schoolYearStartMonth'], $s['schoolYearStartDay']) === self::monthDay($s['schoolYearEndMonth'], $s['schoolYearEndDay'])) {
            return 'The last class day must fall before the next school year starts.';
        }

        return null;
    }

    /**
     * The year `$date` would fall in by the date settings alone.
     *
     * @param  Settings  $settings
     * @return Year
     */
    private static function planned(string $date, array $settings): array
    {
        $start = self::monthDay($settings['schoolYearStartMonth'], $settings['schoolYearStartDay']);
        $year = (int) substr($date, 0, 4);
        $startYear = substr($date, 5) >= $start ? $year : $year - 1;
        $end = self::monthDay($settings['schoolYearEndMonth'], $settings['schoolYearEndDay']);
        $endYear = $end > $start ? $startYear : $startYear + 1;

        return [
            'label' => self::label($startYear), 'startYear' => $startYear, 'from' => "{$startYear}-{$start}",
            'to' => self::addDays(($startYear + 1)."-{$start}", -1), 'lastClassDay' => "{$endYear}-{$end}", 'started' => false, 'endedOn' => null,
        ];
    }

    private static function monthDay(int $month, int $day): string
    {
        return sprintf('%02d-%02d', $month, $day);
    }

    private static function addDays(string $date, int $days): string
    {
        return CarbonImmutable::parse($date)->addDays($days)->format('Y-m-d');
    }
}
