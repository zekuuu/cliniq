<?php

declare(strict_types=1);

/*
 * B1 database checks, re-runnable:
 *   php tools/db-checks.php
 *
 * Uses the testing environment (.env.testing, the migration account). It creates two
 * scratch databases, cliniq_check_ref and cliniq_check_mig, and drops both at the end:
 *   1. Loads Reference-Schema.sql into cliniq_check_ref.
 *   2. Runs this app's migrations into cliniq_check_mig.
 *   3. Compares tables, columns, indexes and CHECKs (information_schema). Expects 48 and 462.
 *   4. Runs Checks/constraint-tests.sql against cliniq_check_mig. Expects 0 failed.
 * The password goes to mysql.exe through a temporary options file, never the command line.
 * Exit code 0 = all pass.
 */

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

putenv('APP_ENV=testing');
$_ENV['APP_ENV'] = $_SERVER['APP_ENV'] = 'testing';

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

$dbDir = realpath(__DIR__.'/../../CLINIQ-Knowledge-Base/02-Architecture/Database');
$mysql = getenv('CLINIQ_MYSQL_BIN') ?: 'C:\\xampp\\mysql\\bin\\mysql.exe';
$conn = config('database.default');
$cfg = config("database.connections.$conn");
$ref = 'cliniq_check_ref';
$mig = 'cliniq_check_mig';

$opts = tempnam(sys_get_temp_dir(), 'cnf');
file_put_contents($opts, "[client]\nuser=\"{$cfg['username']}\"\npassword=\"{$cfg['password']}\"\nhost=\"{$cfg['host']}\"\nport={$cfg['port']}\n");

function mysqlRun(string $mysql, string $opts, string $db, string $file, array $extra = []): array
{
    $p = proc_open(
        array_merge([$mysql, "--defaults-extra-file=$opts", '--default-character-set=utf8mb4'], $extra, [$db]),
        [0 => ['file', $file, 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']],
        $pipes,
    );
    $out = stream_get_contents($pipes[1]);
    $err = stream_get_contents($pipes[2]);

    return [proc_close($p), $out, $err];
}

function shape(string $db): array
{
    $q = fn (string $sql) => array_map(fn ($r) => implode(' | ', (array) $r), DB::select($sql, [$db]));

    return [
        'tables' => $q('SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_name <> "migrations" ORDER BY 1'),
        'columns' => $q('SELECT table_name, column_name, column_type, is_nullable, IFNULL(column_default, "<null>"), extra, IFNULL(generation_expression, "") FROM information_schema.columns WHERE table_schema = ? AND table_name <> "migrations" ORDER BY 1, 2'),
        'indexes' => $q('SELECT table_name, index_name, non_unique, GROUP_CONCAT(column_name ORDER BY seq_in_index) FROM information_schema.statistics WHERE table_schema = ? AND table_name <> "migrations" GROUP BY 1, 2, 3 ORDER BY 1, 2'),
        'checks' => $q('SELECT table_name, constraint_name, check_clause FROM information_schema.check_constraints WHERE constraint_schema = ? ORDER BY 1, 2'),
        'foreign keys' => $q('SELECT table_name, constraint_name, referenced_table_name, update_rule, delete_rule FROM information_schema.referential_constraints WHERE constraint_schema = ? ORDER BY 1, 2'),
    ];
}

$fail = 0;
try {
    foreach ([$ref, $mig] as $db) {
        DB::statement("DROP DATABASE IF EXISTS `$db`");
        DB::statement("CREATE DATABASE `$db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    }

    [$code, , $err] = mysqlRun($mysql, $opts, $ref, "$dbDir/Reference-Schema.sql");
    if ($code !== 0) {
        throw new RuntimeException("Reference-Schema.sql failed to load: $err");
    }

    config(["database.connections.$conn.database" => $mig]);
    DB::purge($conn);
    Artisan::call('migrate', ['--force' => true]);

    $a = shape($ref);
    $b = shape($mig);
    printf("reference: %d tables, %d columns | migrated: %d tables, %d columns\n",
        count($a['tables']), count($a['columns']), count($b['tables']), count($b['columns']));
    if (count($b['tables']) !== 48 || count($b['columns']) !== 462) {
        echo "FAIL counts: expected 48 tables and 462 columns\n";
        $fail++;
    }
    foreach ($a as $part => $rows) {
        $missing = array_diff($rows, $b[$part]);
        $extra = array_diff($b[$part], $rows);
        foreach ($missing as $r) {
            echo "FAIL $part only in reference: $r\n";
        }
        foreach ($extra as $r) {
            echo "FAIL $part only in migrations: $r\n";
        }
        $fail += count($missing) + count($extra);
        printf("%-13s %s\n", $part, $missing || $extra ? 'DIFFER' : 'match ('.count($rows).')');
    }

    [$code, $out, $err] = mysqlRun($mysql, $opts, $mig, "$dbDir/Checks/constraint-tests.sql", ['--table']);
    echo $out;
    if ($code !== 0 || $err !== '' || str_contains($out, 'FAILED') || str_contains($out, 'UNTESTED')) {
        echo "FAIL constraint tests $err\n";
        $fail++;
    }
} finally {
    @unlink($opts);
    config(["database.connections.$conn.database" => $ref]);
    DB::purge($conn);
    foreach ([$ref, $mig] as $db) {
        DB::statement("DROP DATABASE IF EXISTS `$db`");
    }
}

echo $fail === 0 ? "ALL PASS\n" : "$fail FAILURE(S)\n";
exit($fail === 0 ? 0 : 1);
