<?php

declare(strict_types=1);

namespace App\Modules\BackupVerification\Services;

use App\Shared\AuditLog\AuditAction;
use App\Shared\AuditLog\AuditEvent;
use App\Shared\AuditLog\AuditLogger;
use App\Shared\AuditLog\AuditTarget;
use App\Shared\Http\ApiError;
use App\Shared\Http\BusinessRuleViolation;
use App\Shared\Settings\SettingsService;
use App\Shared\Support\ClinicTime;
use App\Shared\Support\Row;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Backups (ADR-037, ADR-039, ADR-052, ADR-079): one database dump per run, zipped with a manifest and
 * copied to every enabled location under `<location>\.cliniq\backups\YYYY\MM\`, keeping the latest
 * `backup_keep_last`. `mysqldump` runs from an argument list (never a shell string), with the password in
 * a temporary options file (never on the command line). Locations are added and disabled, never edited
 * or deleted. Both roles have the same abilities.
 */
final class BackupService
{
    public function __construct(private readonly AuditLogger $audit, private readonly SettingsService $settings) {}

    /** @return array<string, mixed> `BackupStatusView`: latest, needsVerification, recentFailure, history, verifiedByName */
    public function status(): array
    {
        $names = DB::table('backup_location_results as r')->join('backup_locations as l', 'l.id', '=', 'r.backup_location_id')->orderBy('r.id')
            ->get(['r.backup_log_id', 'l.label'])->groupBy(fn (object $r): int => (int) Row::int($r, 'backup_log_id'));
        $history = array_values(DB::table('backup_logs')->orderByDesc('ran_at')->orderByDesc('id')->get()->map(fn (object $b): array => [
            'id' => (string) Row::int($b, 'id'), 'lastRun' => ClinicTime::iso(CarbonImmutable::parse((string) Row::str($b, 'ran_at'))),
            'fileSizeBytes' => (int) Row::int($b, 'file_size_bytes'), 'status' => (string) Row::str($b, 'status'),
            'verifiedByUserId' => Row::str($b, 'verified_by_user_id'),
            'locationNames' => array_values(array_map(fn (mixed $n): string => is_object($n) ? (string) Row::str($n, 'label') : '', ($names->get((int) Row::int($b, 'id')) ?? collect())->all())),
        ])->all());
        $latest = $history[0] ?? null;
        $verifier = $latest === null || $latest['verifiedByUserId'] === null ? null : DB::table('users')->where('id', $latest['verifiedByUserId'])->value('name');

        return [
            'latest' => $latest,
            'needsVerification' => $latest !== null && $latest['status'] === 'ok' && $latest['verifiedByUserId'] === null,
            'recentFailure' => array_values(array_filter($history, fn (array $b): bool => $b['status'] === 'failed'))[0] ?? null,
            'history' => $history,
            'verifiedByName' => is_string($verifier) ? $verifier : null,
        ];
    }

    /** @return array<string, mixed> */
    public function verifyLatest(int $userId, string $role): array
    {
        $latest = DB::table('backup_logs')->orderByDesc('ran_at')->orderByDesc('id')->first();
        abort_if($latest === null, 404);
        if (Row::str($latest, 'status') === 'failed') {
            throw new BusinessRuleViolation('backup_failed', 'The latest backup failed, so it cannot be verified.');
        }
        DB::transaction(function () use ($latest, $userId, $role): void {
            $now = CarbonImmutable::now();
            DB::table('backup_logs')->where('id', Row::int($latest, 'id'))->update(['verified_by_user_id' => $userId, 'verified_at' => $now]);
            $this->log($userId, $role, AuditAction::Update, AuditTarget::Backup, (string) Row::int($latest, 'id'), 'Verified backup', $now);
        });

        return $this->status();
    }

    /**
     * One run to every enabled location; ok when any location succeeded. `$userId` null is the nightly job.
     *
     * @return array<string, mixed>
     */
    public function run(?int $userId, string $role): array
    {
        $locations = DB::table('backup_locations')->where('enabled', 1)->orderBy('id')->get();
        if ($locations->isEmpty()) {
            throw new BusinessRuleViolation('no_backup_location', 'Enable at least one backup location first.');
        }
        if (! class_exists(\ZipArchive::class)) {
            throw new ApiError(503, 'server_error', "Backups need PHP's zip extension. Turn on extension=zip in php.ini and restart the server.");
        }
        $now = CarbonImmutable::now();
        $stamp = $now->format('Y-m-d_Hi');
        $work = storage_path('app/backup-work/'.Str::random(16));
        @mkdir($work, 0700, true);
        $results = [];
        $error = null;
        $zip = null;
        try {
            $dump = $this->dump($work);
            $zip = $this->zip($work, $dump, $now);
            foreach ($locations as $location) {
                $results[(int) Row::int($location, 'id')] = $this->copyTo((string) Row::str($location, 'path'), $zip, "cliniq-{$stamp}.zip", $now);
            }
        } catch (\Throwable $e) {
            $error = mb_substr($e->getMessage(), 0, 500);
            foreach ($locations as $location) {
                $results[(int) Row::int($location, 'id')] ??= ['ok' => false, 'error' => 'The database could not be dumped.'];
            }
        }
        $ok = array_filter($results, fn (array $r): bool => $r['ok']) !== [];

        DB::transaction(function () use ($results, $ok, $error, $zip, $stamp, $now, $userId, $role): void {
            $log = DB::table('backup_logs')->insertGetId([
                'run_key' => $stamp.'-'.Str::lower(Str::random(6)), 'ran_at' => $now, 'file_name' => $zip === null ? null : "cliniq-{$stamp}.zip",
                'file_size_bytes' => $zip === null ? null : (int) filesize($zip), 'sha256' => $zip === null ? null : hash_file('sha256', $zip),
                'status' => $ok ? 'ok' : 'failed', 'error_message' => $ok ? null : ($error ?? 'No location could be written.'),
            ]);
            foreach ($results as $locationId => $r) {
                DB::table('backup_location_results')->insert(['backup_log_id' => $log, 'backup_location_id' => $locationId, 'status' => $r['ok'] ? 'ok' : 'failed', 'error_message' => $r['ok'] ? null : mb_substr((string) $r['error'], 0, 500)]);
                DB::table('backup_locations')->where('id', $locationId)->update(['last_backup_at' => $now, 'last_result' => $r['ok'] ? 'ok' : 'failed']);
            }
            $count = count($results);
            $summary = ($userId === null ? 'Nightly backup' : 'Backup started from the Backup page').' ('.$count.' '.($count === 1 ? 'location' : 'locations').')';
            $this->log($userId, $role, AuditAction::Create, AuditTarget::Backup, (string) $log, $summary, $now);
        });
        self::removeTree($work);

        return $this->status();
    }

    /** @return array{locations: list<array<string, mixed>>, keepLast: int} the status of each path is checked now */
    public function locations(): array
    {
        $out = [];
        foreach (DB::table('backup_locations')->orderBy('id')->get() as $l) {
            $status = self::pathStatus((string) Row::str($l, 'path'));
            if ($status !== Row::str($l, 'status')) {
                DB::table('backup_locations')->where('id', Row::int($l, 'id'))->update(['status' => $status]);
            }
            $at = Row::str($l, 'last_backup_at');
            $out[] = [
                'id' => (string) Row::int($l, 'id'), 'label' => (string) Row::str($l, 'label'), 'path' => (string) Row::str($l, 'path'),
                'enabled' => Row::str($l, 'enabled') === '1', 'status' => $status,
                'lastBackupAt' => $at === null ? null : ClinicTime::iso(CarbonImmutable::parse($at)), 'lastResult' => Row::str($l, 'last_result'),
            ];
        }

        return ['locations' => $out, 'keepLast' => $this->settings->int('backup_keep_last')];
    }

    /** @return array<string, mixed> `BackupLocation`; a location is never edited (add a new one, disable the old) */
    public function addLocation(string $label, string $path, int $userId, string $role): array
    {
        $label = trim($label);
        $path = trim($path);
        $errors = [];
        if ($label === '' || mb_strlen($label) > 80) {
            $errors['label'] = $label === '' ? 'Enter a label for the location.' : 'Keep the label to 80 characters or fewer.';
        }
        if ($path === '' || mb_strlen($path) > 255) {
            $errors['path'] = $path === '' ? 'Enter the folder or drive path.' : 'Keep the path to 255 characters or fewer.';
        }
        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }
        $id = DB::transaction(function () use ($label, $path, $userId, $role): int {
            $id = DB::table('backup_locations')->insertGetId(['label' => $label, 'path' => $path, 'enabled' => 1, 'status' => self::pathStatus($path)]);
            $this->log($userId, $role, AuditAction::Create, AuditTarget::BackupLocation, (string) $id, null, CarbonImmutable::now());

            return $id;
        });

        return $this->location($id);
    }

    /** @return array<string, mixed> never deleted; the last enabled location cannot be disabled (R32) */
    public function setEnabled(int $id, bool $enabled, int $userId, string $role): array
    {
        $location = $this->location($id);
        if ($location['enabled'] === $enabled) {
            return $location;
        }
        if (! $enabled && DB::table('backup_locations')->where('enabled', 1)->count() === 1) {
            throw ValidationException::withMessages(['enabled' => 'Enable another backup location before disabling the last one.']);
        }
        DB::transaction(function () use ($id, $enabled, $userId, $role): void {
            DB::table('backup_locations')->where('id', $id)->update(['enabled' => $enabled ? 1 : 0]);
            $this->log($userId, $role, AuditAction::Update, AuditTarget::BackupLocation, (string) $id, $enabled ? 'Enabled' : 'Disabled', CarbonImmutable::now());
        });

        return $this->location($id);
    }

    /**
     * The clinic PC's drives, and the folders directly inside `$path`, to choose a location (ADR-052).
     *
     * @return array{drives: list<array{root: string, name: string, kind: string, freeSpace: string}>, folders: list<string>}
     */
    public function folders(string $path): array
    {
        $drives = [];
        foreach (range('A', 'Z') as $letter) {
            $root = $letter.':\\';
            if (@is_dir($root)) {
                $free = @disk_free_space($root);
                $drives[] = ['root' => $root, 'name' => $letter.':', 'kind' => $letter === 'C' ? 'internal' : 'other',
                    'freeSpace' => $free === false ? '' : round($free / 1_073_741_824).' GB free'];
            }
        }
        $folders = [];
        $path = trim($path);
        if ($path !== '' && @is_dir($path)) {
            foreach (@scandir($path) ?: [] as $entry) {
                if ($entry[0] !== '.' && $entry[0] !== '$' && $entry !== 'System Volume Information' && @is_dir($path.DIRECTORY_SEPARATOR.$entry)) {
                    $folders[] = $entry;
                }
            }
        }

        return ['drives' => $drives, 'folders' => $folders];
    }

    // ---- the run -------------------------------------------------------------------------

    /** The dump, through an options file so the password never reaches the command line or a log. */
    private function dump(string $work): string
    {
        $connection = config()->string('database.default');
        $c = fn (string $key): string => Row::text(config("database.connections.{$connection}.{$key}"));
        $options = $work.DIRECTORY_SEPARATOR.'client.cnf';
        file_put_contents($options, "[client]\nuser=\"".addcslashes($c('username'), '"\\')."\"\npassword=\"".addcslashes($c('password'), '"\\')."\"\nhost=\"".addcslashes($c('host'), '"\\')."\"\nport=".((int) $c('port'))."\n");
        @chmod($options, 0600);
        $dump = $work.DIRECTORY_SEPARATOR.'cliniq.sql';
        try {
            $result = Process::timeout(600)->run([
                config()->string('cliniq.mysqldump_path'), '--defaults-extra-file='.$options, '--single-transaction', '--routines', '--triggers',
                '--default-character-set=utf8mb4', '--result-file='.$dump, $c('database'),
            ]);
        } finally {
            @unlink($options);
        }
        if (! $result->successful() || ! is_file($dump)) {
            throw new \RuntimeException('mysqldump failed (exit '.$result->exitCode().').');
        }

        return $dump;
    }

    private function zip(string $work, string $dump, CarbonImmutable $now): string
    {
        $path = $work.DIRECTORY_SEPARATOR.'backup.zip';
        $zip = new \ZipArchive;
        if ($zip->open($path, \ZipArchive::CREATE | \ZipArchive::OVERWRITE) !== true) {
            throw new \RuntimeException('The backup file could not be created.');
        }
        $zip->addFile($dump, 'cliniq.sql');
        $zip->addFromString('manifest.json', (string) json_encode([
            'app' => 'CLINIQ', 'version' => config()->string('app.version', '1'), 'createdAt' => ClinicTime::iso($now),
            'database' => ['file' => 'cliniq.sql', 'sha256' => hash_file('sha256', $dump)],
        ], JSON_PRETTY_PRINT));
        $zip->close();

        return $path;
    }

    /** @return array{ok: bool, error: string|null} */
    private function copyTo(string $location, string $zip, string $name, CarbonImmutable $now): array
    {
        try {
            $root = rtrim($location, '\\/').DIRECTORY_SEPARATOR.'.cliniq';
            $folder = $root.DIRECTORY_SEPARATOR.'backups'.DIRECTORY_SEPARATOR.$now->format('Y').DIRECTORY_SEPARATOR.$now->format('m');
            if (! @is_dir($location)) {
                return ['ok' => false, 'error' => 'The location was not found.'];
            }
            foreach ([$folder, $root.DIRECTORY_SEPARATOR.'logs'] as $dir) {
                if (! @is_dir($dir) && ! @mkdir($dir, 0700, true)) {
                    return ['ok' => false, 'error' => 'The location is not writable.'];
                }
            }
            $marker = $root.DIRECTORY_SEPARATOR.'cliniq.json';
            if (! is_file($marker)) {
                file_put_contents($marker, (string) json_encode(['app' => 'CLINIQ', 'school' => config()->string('app.name'), 'structureVersion' => 1, 'createdOn' => $now->format('Y-m-d')], JSON_PRETTY_PRINT));
            }
            if (! @copy($zip, $folder.DIRECTORY_SEPARATOR.$name)) {
                return ['ok' => false, 'error' => 'The backup file could not be written.'];
            }
            @file_put_contents($root.DIRECTORY_SEPARATOR.'logs'.DIRECTORY_SEPARATOR.'backup-'.$now->format('Y-m').'.log', ClinicTime::iso($now)." ok {$name}\n", FILE_APPEND);
            $this->prune($root.DIRECTORY_SEPARATOR.'backups');

            return ['ok' => true, 'error' => null];
        } catch (\Throwable $e) {
            return ['ok' => false, 'error' => mb_substr($e->getMessage(), 0, 500)];
        }
    }

    /** The oldest backups beyond the latest `backup_keep_last` (ADR-052). */
    private function prune(string $backups): void
    {
        $files = glob($backups.DIRECTORY_SEPARATOR.'*'.DIRECTORY_SEPARATOR.'*'.DIRECTORY_SEPARATOR.'cliniq-*.zip') ?: [];
        usort($files, fn (string $a, string $b): int => strcmp(basename($b), basename($a)));
        foreach (array_slice($files, $this->settings->int('backup_keep_last')) as $old) {
            @unlink($old);
        }
    }

    private static function pathStatus(string $path): string
    {
        if (! @is_dir($path)) {
            return 'not_found';
        }

        return @is_writable($path) ? 'found' : 'not_writable';
    }

    private static function removeTree(string $dir): void
    {
        foreach (glob($dir.DIRECTORY_SEPARATOR.'*') ?: [] as $f) {
            @unlink($f);
        }
        @rmdir($dir);
    }

    /** @return array<string, mixed> */
    private function location(int $id): array
    {
        $found = array_values(array_filter($this->locations()['locations'], fn (array $l): bool => $l['id'] === (string) $id));
        abort_if($found === [], 404);

        return $found[0];
    }

    private function log(?int $userId, string $role, AuditAction $action, AuditTarget $target, string $id, ?string $summary, CarbonImmutable $now): void
    {
        $this->audit->record(new AuditEvent(
            actorId: $userId === null ? null : (string) $userId, actorRole: $userId === null ? null : $role, action: $action,
            targetType: $target, targetId: $id, targetLabel: null, at: $now, summary: $summary,
        ));
    }
}
