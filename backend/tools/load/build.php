<?php

declare(strict_types=1);

/*
 * Builds the fictional load-test school from nothing, deterministically (08-Logs/Load-Test-Nov16).
 *   php tools/load/build.php --students=900 --staff=60 --years=5 [--audit=100000] [--seed=20261116]
 *
 * Runs as the testing environment (.env.testing: the migration account). The database is
 * cliniq_testing unless DB_DATABASE names cliniq_load. It refuses: production; any other database;
 * a database whose users or students did not come from this tool (it would be wiped). It never
 * touches cliniq. Pest's RefreshDatabase empties cliniq_testing, so rebuild after `composer test`.
 */

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

const ALLOWED = ['cliniq_testing', 'cliniq_load'];

if (getenv('APP_ENV') === 'production') {
    fwrite(STDERR, "Refused: APP_ENV is production.\n");
    exit(1);
}
putenv('APP_ENV=testing');
$_ENV['APP_ENV'] = $_SERVER['APP_ENV'] = 'testing';
require __DIR__.'/../../vendor/autoload.php';
$app = require __DIR__.'/../../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
require __DIR__.'/Generator.php';
require __DIR__.'/checks.php';

$opt = ['students' => 900, 'staff' => 60, 'years' => 5, 'audit' => 0, 'seed' => 20261116];
foreach (array_slice($argv, 1) as $arg) {
    if (preg_match('/\A--(students|staff|years|audit|seed)=(\d+)\z/', $arg, $m) !== 1) {
        fwrite(STDERR, "Unknown option {$arg}\n");
        exit(1);
    }
    $opt[$m[1]] = (int) $m[2];
}

$db = DB::getDatabaseName();
if (app()->isProduction() || ! in_array($db, ALLOWED, true)) {
    fwrite(STDERR, "Refused: the database {$db} is not one of ".implode(', ', ALLOWED).".\n");
    exit(1);
}
if (Schema::hasTable('users') && (DB::table('users')->where('username', 'not like', 'load.%')->exists()
    || DB::table('students')->where('lrn', 'not like', LoadGenerator::LRN_PREFIX.'%')->exists())) {
    fwrite(STDERR, "Refused: {$db} holds accounts or students this tool did not make.\n");
    exit(1);
}

$t0 = microtime(true);
printf("Building on %s: %d students, %d staff, %d years, audit %s, seed %d\n", $db, $opt['students'], $opt['staff'], $opt['years'], $opt['audit'] ?: 'as generated', $opt['seed']);
$t = microtime(true);
Artisan::call('migrate:fresh', ['--force' => true]);
printf("%-22s %7.1f s\n", 'migrate:fresh', microtime(true) - $t);
DB::disableQueryLog();

$gen = new LoadGenerator($opt, fn (string $line) => print ($line."\n"));
$gen->run();
foreach ($gen->counts as $k => $v) {
    printf("  %-30s %6d\n", $k, $v);
}
printf("Built in %.1f s, peak %.0f MB\n", microtime(true) - $t0, memory_get_peak_usage(true) / 1048576);

loadCounts();
exit(loadChecks() === 0 ? 0 : 1);
