<?php

declare(strict_types=1);

namespace App\Shared\Database;

use App\Modules\BackupVerification\Services\BackupService;
use App\Modules\ReportsGeneration\Services\SportsReportService;
use App\Shared\Database\DemoSchool\LoadGenerator;
use App\Shared\Support\Row;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use RuntimeException;

/**
 * The fictional demo school (LoadGenerator), development only, built up to Sunday, February 28, 2027:
 *   php artisan migrate:fresh --seeder="App\Shared\Database\DemoSchoolSeeder" --env=testing --force
 *
 * Options come from the environment (db:seed takes no custom flags): DEMO_SCHOOL_STUDENTS (900),
 * DEMO_SCHOOL_STAFF (60), DEMO_SCHOOL_YEARS (5), DEMO_SCHOOL_AUDIT (0), DEMO_SCHOOL_SEED (20261116),
 * DEMO_SCHOOL_UNTIL (DEFAULT_UNTIL; a date means the end of that day). Each school year runs June 15 to
 * April 14; the school stops at `until`, and a later `until` keeps every earlier row. Rows after the
 * real date are demo data (Zean, November 21, 2026: the screens always have data): the Backup page's
 * "last backup" and the Audit Log show dates that have not happened yet, so user-acceptance writes go
 * on a copy of the database.
 *
 * Refuses production, any database but cliniq_testing, cliniq_load and the cliniq_check_* scratch
 * databases, and a database that is not freshly migrated and empty. It never runs migrate:fresh itself.
 */
final class DemoSchoolSeeder extends Seeder
{
    public const ALLOWED = ['cliniq_testing', 'cliniq_load'];

    /** The fixed end of the demo school: the last class day is Friday, February 26, 2027. */
    public const DEFAULT_UNTIL = '2027-02-28';

    /** @param array{students: int, staff: int, years: int, audit: int, seed: int, until: CarbonImmutable}|null $options */
    public function run(?array $options = null): void
    {
        $o = $options ?? self::optionsFromEnv();
        $db = DB::getDatabaseName();
        $refused = self::refusal($db, app()->isProduction() || getenv('APP_ENV') === 'production');
        if ($refused !== null) {
            throw new RuntimeException($refused);
        }
        if (self::hasForeignRows()) {
            throw new RuntimeException("Refused: {$db} holds accounts or students this tool did not make.");
        }
        if (! Schema::hasTable('users') || DB::table('users')->exists() || DB::table('students')->exists() || DB::table('personnel')->exists() || DB::table('inventory_items')->exists()) {
            throw new RuntimeException("Refused: {$db} is not freshly migrated and empty. Run `php artisan migrate:fresh --env=testing` first.");
        }
        $this->command?->info(sprintf('Demo school on %s: %d students, %d staff, %d years, audit %s, seed %d, until %s',
            $db, $o['students'], $o['staff'], $o['years'], $o['audit'] > 0 ? (string) $o['audit'] : 'as generated', $o['seed'], $o['until']->format('Y-m-d H:i')));

        DB::disableQueryLog();
        $t = microtime(true);
        (new LoadGenerator($o, fn (string $line) => $this->command?->line($line)))->run();
        $this->extras();
        $this->command?->info(sprintf('Seeded in %.1f s, peak %.0f MB', microtime(true) - $t, memory_get_peak_usage(true) / 1048576));
    }

    /** @return string|null why the database is refused, or null when it is allowed */
    public static function refusal(string $db, bool $production): ?string
    {
        if ($production) {
            return 'Refused: the demo school never runs in production.';
        }
        // cliniq_check_*: the scratch databases of Pest and db-checks, emptied by them anyway.
        if (in_array($db, self::ALLOWED, true) || str_starts_with($db, 'cliniq_check_')) {
            return null;
        }

        return "Refused: the database {$db} is not one of ".implode(', ', self::ALLOWED).' or cliniq_check_*.';
    }

    /** @return array{students: int, staff: int, years: int, audit: int, seed: int, until: CarbonImmutable} */
    public static function optionsFromEnv(): array
    {
        $int = fn (string $k, int $d): int => is_numeric(getenv($k)) ? (int) getenv($k) : $d;

        return [
            'students' => $int('DEMO_SCHOOL_STUDENTS', 900), 'staff' => $int('DEMO_SCHOOL_STAFF', 60), 'years' => $int('DEMO_SCHOOL_YEARS', 5),
            'audit' => $int('DEMO_SCHOOL_AUDIT', 0), 'seed' => $int('DEMO_SCHOOL_SEED', 20261116), 'until' => self::until((string) getenv('DEMO_SCHOOL_UNTIL')),
        ];
    }

    /** `until`: empty is DEFAULT_UNTIL; a date is the end of that day; a date and time is that minute. Future dates are accepted. */
    public static function until(string $value): CarbonImmutable
    {
        $value = trim($value) === '' ? self::DEFAULT_UNTIL : trim($value);
        $until = CarbonImmutable::parse($value, 'Asia/Manila');

        return preg_match('/\A\d{4}-\d{2}-\d{2}\z/', $value) === 1 ? $until->endOfDay() : $until;
    }

    private static function hasForeignRows(): bool
    {
        return Schema::hasTable('users') && (
            DB::table('users')->where('username', 'not like', 'load.%')->whereNotIn('username', LoadGenerator::DEMO_USERNAMES)->exists()
            || DB::table('students')->where('lrn', 'not like', LoadGenerator::LRN_PREFIX.'%')->exists());
    }

    /**
     * Added by hand to cliniq_testing for the screenshots (screenshots/INDEX.md, November 18, 2026), now
     * part of the seed, through the same services as the app's forms, on the real clock: one backup
     * location (a row only, no file written) and one Sports Report on the active Grade 10 students.
     */
    private function extras(): void
    {
        $nurse = Row::toInt(DB::table('users')->where('username', 'demo.nurse')->value('id')) ?? 0;
        app(BackupService::class)->addLocation('External drive', 'D:\\', $nurse, 'staff');
        $grade10 = DB::table('students')->join('grade_levels', 'grade_levels.id', '=', 'students.grade_level_id')
            ->where('grade_levels.name', 'Grade 10')->whereNull('students.archived_at')->orderBy('students.id')->pluck('students.id');
        app(SportsReportService::class)->save([
            'title' => 'Grade 10 basketball try-outs', 'activity' => 'Intramurals 2026, Boys Basketball', 'requestedBy' => 'PE instructor',
            'window' => 90, 'includeConditions' => false, 'students' => $grade10->map(fn (mixed $id): array => ['studentId' => Row::toInt($id)])->all(),
        ], null, $nurse);
    }
}
