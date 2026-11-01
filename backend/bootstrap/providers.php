<?php

declare(strict_types=1);

use App\Providers\AppServiceProvider;
use App\Shared\AuditLog\AuditServiceProvider;

return [
    AppServiceProvider::class,
    AuditServiceProvider::class,
];
