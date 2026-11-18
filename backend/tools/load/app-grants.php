<?php

declare(strict_types=1);

/*
 * Prints the GRANT statements that give the app account (cliniq_app) the same rights on a
 * load or restore database as it has on cliniq: SELECT, INSERT on the database, and UPDATE,
 * DELETE on every table except audit_logs (append-only, ERD section 13) and migrations.
 *   php tools/load/app-grants.php cliniq_testing > storage/load/grants.sql
 * Run the output as root (the migration account has no GRANT OPTION). The tables must exist.
 * Table grants survive DROP TABLE, so a later migrate:fresh keeps them.
 */

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;

$db = $argv[1] ?? '';
if (! preg_match('/^cliniq_[a-z0-9_]+$/', $db)) {
    fwrite(STDERR, "Usage: php tools/load/app-grants.php <cliniq_database>\n");
    exit(1);
}

putenv('APP_ENV=testing');
$_ENV['APP_ENV'] = $_SERVER['APP_ENV'] = 'testing';
require __DIR__.'/../../vendor/autoload.php';
$app = require __DIR__.'/../../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

$tables = array_column(DB::select(
    "SELECT table_name AS t FROM information_schema.tables WHERE table_schema = ? AND table_name NOT IN ('audit_logs', 'migrations') ORDER BY 1",
    [$db],
), 't');

echo "GRANT SELECT, INSERT ON `$db`.* TO 'cliniq_app'@'localhost';\n";
foreach ($tables as $t) {
    echo "GRANT UPDATE, DELETE ON `$db`.`$t` TO 'cliniq_app'@'localhost';\n";
}
fwrite(STDERR, count($tables)." tables (expected 47)\n");
