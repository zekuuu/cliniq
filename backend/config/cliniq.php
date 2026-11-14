<?php

declare(strict_types=1);

return [

    /*
    | The session ends this many days after sign-in, however active the user
    | is, for both roles (ADR-015, ADR-057).
    */
    'session_days' => 7,

    /* Wrong passwords before an account locks (ADR-015). */
    'failed_attempts' => 5,

    /* How long a locked account stays locked (ADR-015, lowered to 5 on Sunday, November 8, 2026). */
    'lock_minutes' => 5,

    /*
    | Each role is signed out after this many idle minutes, 10 to 240 (ADR-048, ADR-078). Defaults
    | until B1 reads `idle_signout_minutes_staff` and `idle_signout_minutes_admin` from `system_settings`.
    */
    'idle_signout_minutes_staff' => (int) env('CLINIQ_IDLE_SIGNOUT_MINUTES_STAFF', 60),
    'idle_signout_minutes_admin' => (int) env('CLINIQ_IDLE_SIGNOUT_MINUTES_ADMIN', 30),

    /* Digits in a Learner Reference Number (ADR-028). */
    'lrn_length' => 12,

    /*
    | Where the monthly holiday sync reads nationwide Philippine holidays, in the format of the bundled
    | `holidays-ph.json` (ADR-020; Zean, November 13, 2026). Empty turns the sync off.
    */
    /* The mysqldump that backups run (ADR-052, ADR-079); XAMPP's by default. */
    'mysqldump_path' => (string) env('CLINIQ_MYSQLDUMP_PATH', 'C:\\xampp\\mysql\\bin\\mysqldump.exe'),

    'holiday_source_url' => (string) env('CLINIQ_HOLIDAY_SOURCE_URL', 'https://raw.githubusercontent.com/xKurty06/cliniq/main/frontend/src/lib/mock-db/holidays-ph.json'),

];
