<?php

declare(strict_types=1);

namespace App\Shared\Support;

/** Typed reads of one query-builder row (MariaDB hands back scalars or null). */
final class Row
{
    public static function str(object $row, string $col): ?string
    {
        $v = $row->{$col} ?? null;

        return is_scalar($v) ? (string) $v : null;
    }

    public static function int(object $row, string $col): ?int
    {
        $v = $row->{$col} ?? null;

        return is_numeric($v) ? (int) $v : null;
    }

    /** A loosely typed value (a decoded field) as text; anything not scalar is "". */
    public static function text(mixed $v): string
    {
        return is_scalar($v) ? (string) $v : '';
    }

    public static function toInt(mixed $v): ?int
    {
        return is_numeric($v) ? (int) $v : null;
    }
}
