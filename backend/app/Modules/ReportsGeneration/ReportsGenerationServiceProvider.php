<?php

declare(strict_types=1);

namespace App\Modules\ReportsGeneration;

use Illuminate\Support\ServiceProvider;

final class ReportsGenerationServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/Database/Migrations');
    }
}
