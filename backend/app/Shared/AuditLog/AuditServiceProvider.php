<?php

declare(strict_types=1);

namespace App\Shared\AuditLog;

use Illuminate\Support\ServiceProvider;

final class AuditServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(AuditLogger::class, InMemoryAuditLogger::class);
    }
}
