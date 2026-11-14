<?php

declare(strict_types=1);

namespace App\Shared\Support;

/** `frontend/src/lib/complaints.ts`: how Reports group complaints (ADR-050). */
final class Complaints
{
    public static function clean(string $text): string
    {
        return trim(mb_substr(trim((string) preg_replace('/\s+/u', ' ', $text)), 0, 60));
    }

    /** Case, spacing and trailing punctuation are ignored: "head ache", "Headache." and "headache" fall together. */
    public static function groupKey(string $text): string
    {
        return (string) preg_replace('/\s+/u', '', (string) preg_replace('/[.,;:!?]+$/u', '', mb_strtolower(self::clean($text))));
    }

    /**
     * The group a complaint is counted under: the matching complaint type's spelling, else its own cleaned text.
     *
     * @param  list<string>  $known
     */
    public static function reportLabel(string $text, array $known): string
    {
        $key = self::groupKey($text);
        foreach ($known as $label) {
            if (self::groupKey($label) === $key) {
                return $label;
            }
        }

        return (string) preg_replace('/[.,;:!?]+$/u', '', self::clean($text));
    }
}
