<?php

declare(strict_types=1);

use App\Modules\BackupVerification\Services\BackupService;
use App\Modules\Dashboard\Services\CalendarService;
use App\Modules\UserManagement\Services\UserService;
use App\Shared\FollowUps\FollowUpService;
use App\Shared\Http\ApiError;
use App\Shared\Http\BusinessRuleViolation;
use App\Shared\Support\Row;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use Illuminate\Validation\ValidationException;

// ADR-051, contract Q7: a pending follow-up past the auto-close limit is written Missed once a day.
Artisan::command('cliniq:close-missed-follow-ups', function (FollowUpService $followUps): void {
    $this->info($followUps->closeMissed().' follow-ups closed as missed.');
})->purpose('Write Missed on pending follow-ups past the auto-close limit');

Schedule::command('cliniq:close-missed-follow-ups')->dailyAt('00:15');

// ADR-020 (Zean, November 13, 2026): once a month when online; a failed try (no internet) runs again the next day.
Artisan::command('cliniq:sync-holidays {--force : Fetch even if the last good sync is recent} {--file= : Import a local holidays-ph.json instead}', function (CalendarService $calendar): void {
    $file = Row::text($this->option('file'));
    $result = $calendar->sync((bool) $this->option('force'), $file !== '' ? $file : null);
    $this->info($result['message']);
})->purpose('Sync the nationwide Philippine holidays when the last good sync is 30 or more days old');

// The first Admin (ADR-079): a generated one-time password, shown once here, never logged; it must be changed at first sign-in.
Artisan::command('cliniq:create-admin {username} {--name=Administrator}', function (UserService $users): int {
    try {
        $password = $users->createFirstAdmin(Row::text($this->option('name')) ?: 'Administrator', Row::text($this->argument('username')));
    } catch (ValidationException|BusinessRuleViolation $e) {
        $this->error($e->getMessage());

        return 1;
    }
    $this->info('Admin account created. One-time password (shown once, change it at first sign-in):');
    $this->line($password);

    return 0;
})->purpose('Create an Admin/Principal account with a one-time password');

// Break-glass (Environment-Setup.md): asks at the console, never takes the password as an argument.
Artisan::command('cliniq:reset-admin-password', function (UserService $users): int {
    $username = Row::text($this->ask('Administrator username'));
    $password = Row::text($this->secret('Temporary password (at least 8 characters)'));
    try {
        $users->breakGlass($username, $password);
    } catch (ValidationException $e) {
        $this->error($e->getMessage());

        return 1;
    }
    $this->info('Done. The Administrator must choose a new password at the next sign-in. Record this use on paper with the Principal.');

    return 0;
})->purpose('Offline break-glass: reset the Administrator password');

// The nightly backup (ADR-037) to every enabled location; at 18:00 while the clinic PC is still on.
Artisan::command('cliniq:backup', function (BackupService $backups): int {
    try {
        $status = $backups->run(null, 'system');
    } catch (BusinessRuleViolation|ApiError $e) {
        $this->error($e->getMessage());

        return 1;
    }
    $latest = is_array($status['latest']) ? $status['latest'] : [];
    $this->info('Backup '.(($latest['status'] ?? '') === 'ok' ? 'finished.' : 'failed; see the Backup page.'));

    return 0;
})->purpose('Back up the database to every enabled backup location');

Schedule::command('cliniq:backup')->dailyAt('18:00')->withoutOverlapping();

// Hourly while the clinic PC is on, so a day the PC was off at the usual time still syncs.
Schedule::command('cliniq:sync-holidays')->hourly()->between('7:00', '18:00')->withoutOverlapping();
