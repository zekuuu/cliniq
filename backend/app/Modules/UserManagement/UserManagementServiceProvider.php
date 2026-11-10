<?php

declare(strict_types=1);

namespace App\Modules\UserManagement;

use Illuminate\Support\ServiceProvider;

final class UserManagementServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/Database/Migrations');
    }
}
