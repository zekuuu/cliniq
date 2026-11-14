<?php

declare(strict_types=1);

namespace App\Shared\Sequences;

use Illuminate\Support\Facades\DB;

/** Gapless counters in `number_sequences`, never reused: one atomic statement per number. */
final class Sequences
{
    public static function next(string $name, string $scope = 'all'): int
    {
        // LAST_INSERT_ID(expr) hands this connection the new value without a second read racing another.
        DB::statement(
            'INSERT INTO number_sequences (sequence_name, scope, last_value) VALUES (?, ?, LAST_INSERT_ID(1))
             ON DUPLICATE KEY UPDATE last_value = LAST_INSERT_ID(last_value + 1)',
            [$name, $scope],
        );
        $value = DB::selectOne('SELECT LAST_INSERT_ID() AS v');

        return is_object($value) && is_numeric($value->v ?? null) ? (int) $value->v : 0;
    }
}
