<?php

declare(strict_types=1);

namespace App\Modules\EmergencyResponse;

use Illuminate\Support\ServiceProvider;

final class EmergencyResponseServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/Database/Migrations');
    }
}
