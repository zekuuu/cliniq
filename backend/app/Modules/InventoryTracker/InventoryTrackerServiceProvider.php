<?php

declare(strict_types=1);

namespace App\Modules\InventoryTracker;

use Illuminate\Support\ServiceProvider;

final class InventoryTrackerServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/Database/Migrations');
    }
}
