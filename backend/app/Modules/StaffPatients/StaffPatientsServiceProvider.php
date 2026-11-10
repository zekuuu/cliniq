<?php

declare(strict_types=1);

namespace App\Modules\StaffPatients;

use Illuminate\Support\ServiceProvider;

final class StaffPatientsServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/Database/Migrations');
    }
}
