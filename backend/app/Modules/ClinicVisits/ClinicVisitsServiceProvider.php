<?php

declare(strict_types=1);

namespace App\Modules\ClinicVisits;

use Illuminate\Support\ServiceProvider;

final class ClinicVisitsServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/Database/Migrations');
    }
}
