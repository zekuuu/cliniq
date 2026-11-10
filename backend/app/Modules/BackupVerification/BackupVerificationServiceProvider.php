<?php

declare(strict_types=1);

namespace App\Modules\BackupVerification;

use Illuminate\Support\ServiceProvider;

final class BackupVerificationServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/Database/Migrations');
    }
}
