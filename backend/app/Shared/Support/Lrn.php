<?php

declare(strict_types=1);

namespace App\Shared\Support;

/** frontend/src/lib/lrn.ts (ADR-028). Output must stay identical. */
final class Lrn
{
    public static function normalize(string $value): string
    {
        return substr((string) preg_replace('/\D/', '', $value), 0, config()->integer('cliniq.lrn_length'));
    }

    public static function isLrn(string $value): bool
    {
        return preg_match('/\A\d{12}\z/', $value) === 1;
    }

    /** U+25CF, as the frontend: applying it twice gives the same text. */
    public static function mask(string $lrn): string
    {
        return '●●●●●●●●'.mb_substr($lrn, -4);
    }

    public static function label(string $lrn): string
    {
        return 'LRN ending in '.mb_substr($lrn, -4);
    }
}
