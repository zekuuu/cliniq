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

    /* How long a locked account stays locked (ADR-015). */
    'lock_minutes' => 30,

    /* The Admin is signed out after this many idle minutes; Staff never are (ADR-048). */
    'admin_idle_minutes' => (int) env('CLINIQ_ADMIN_IDLE_MINUTES', 30),

    /* Digits in a Learner Reference Number (ADR-028). */
    'lrn_length' => 12,

];
