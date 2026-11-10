<?php

declare(strict_types=1);

namespace App\Modules\Dashboard;

use Illuminate\Support\ServiceProvider;

final class DashboardServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/Database/Migrations');
    }
}
