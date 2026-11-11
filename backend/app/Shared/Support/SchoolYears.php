<?php

declare(strict_types=1);

namespace App\Shared\Support;

use App\Shared\Settings\SettingsService;
use Illuminate\Support\Facades\DB;

/**
 * `schoolYearOf` in `frontend/src/lib/schoolYear.ts` (ADR-075): a year runs from the day Staff
 * started it until the next start; dates before the first recorded start fall back to the settings
 * (default June 15).
 */
final class SchoolYears
{
    public function __construct(private readonly SettingsService $settings) {}

    public static function label(int $startYear): string
    {
        return $startYear.'–'.($startYear + 1);
    }

    /** The label of the school year `$date` (YYYY-MM-DD) belongs to. */
    public function labelOn(string $date): string
    {
        $starts = DB::table('school_years')->orderBy('started_on')->get(['label', 'started_on']);
        $current = $starts->last(fn (object $s): bool => Row::str($s, 'started_on') <= $date);
        if ($current !== null) {
            return (string) Row::str($current, 'label');
        }
        $year = (int) substr($date, 0, 4);
        $start = sprintf('%02d-%02d', $this->settings->int('school_year_start_month'), $this->settings->int('school_year_start_day'));
        $planned = substr($date, 5) >= $start ? $year : $year - 1;
        $first = $starts->first();
        $firstYear = $first === null ? null : (int) substr((string) Row::str($first, 'label'), 0, 4);
        if ($firstYear !== null && $planned >= $firstYear) {
            $planned = $firstYear - 1;
        }

        return self::label($planned);
    }
}
