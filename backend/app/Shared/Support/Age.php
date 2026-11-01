<?php

declare(strict_types=1);

namespace App\Shared\Support;

/** frontend/src/lib/age.ts (ADR-054). Calculated, never stored. Dates are `YYYY-MM-DD`. */
final class Age
{
    /** Comparing "MM-DD" makes a 29 February birthdate turn on 1 March in a year with none. */
    public static function on(?string $birthDate, string $onDate): ?int
    {
        if ($birthDate === null || $birthDate === '' || $birthDate > $onDate) {
            return null;
        }

        $years = (int) substr($onDate, 0, 4) - (int) substr($birthDate, 0, 4);

        return substr($onDate, 5) < substr($birthDate, 5) ? $years - 1 : $years;
    }

    public static function text(int $age): string
    {
        return $age.' year'.($age === 1 ? '' : 's').' old';
    }

    /** Kinder 5, Grade n is n + 5. Null for any other label. */
    public static function usualForGrade(string $gradeLevel): ?int
    {
        if ($gradeLevel === 'Kinder') {
            return 5;
        }

        return preg_match('/\AGrade (\d+)\z/', $gradeLevel, $match) === 1 ? (int) $match[1] + 5 : null;
    }

    /** A soft note, never a block (ADR-018, ADR-054). */
    public static function unusualNote(?string $birthDate, string $gradeLevel, string $onDate, int $unusualAgeYears): ?string
    {
        $age = self::on($birthDate, $onDate);
        $usual = self::usualForGrade($gradeLevel);

        if ($age === null || $usual === null || abs($age - $usual) <= $unusualAgeYears) {
            return null;
        }

        return "Age {$age} is unusual for {$gradeLevel}. Check the birthdate.";
    }
}
