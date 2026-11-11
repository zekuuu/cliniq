<?php

declare(strict_types=1);

namespace App\Shared\Support;

use Illuminate\Support\Str;

/** `frontend/src/lib/personName.ts` (ADR-064): name parts, the joined full name, matching and order. */
final class PersonName
{
    public static function clean(?string $part): string
    {
        return trim((string) preg_replace('/\s+/u', ' ', (string) $part));
    }

    public static function format(string $first, ?string $middle, string $last): string
    {
        return implode(' ', array_filter([self::clean($first), self::clean($middle), self::clean($last)], fn (string $p): bool => $p !== ''));
    }

    /** Case-, accent- and space-insensitive ("José  Peña" equals "jose pena"). */
    public static function key(string $value): string
    {
        return mb_strtolower(Str::ascii(self::clean($value)));
    }

    /** Every word of the query appears somewhere in the full name. */
    public static function matches(string $fullName, string $query): bool
    {
        $name = self::key($fullName);
        $words = array_filter(explode(' ', self::key($query)), fn (string $w): bool => $w !== '');

        return $words !== [] && array_all($words, fn (string $w): bool => str_contains($name, $w));
    }

    /** Last name, then first, then middle; rows with `first_name`, `last_name`, `middle_name`. */
    public static function compare(object $a, object $b): int
    {
        $k = fn (object $r, string $col): string => self::key((string) Row::str($r, $col));

        return strcmp($k($a, 'last_name'), $k($b, 'last_name'))
            ?: strcmp($k($a, 'first_name'), $k($b, 'first_name'))
            ?: strcmp($k($a, 'middle_name'), $k($b, 'middle_name'));
    }
}
