<?php

declare(strict_types=1);

namespace App\Modules\FirstAidChecklist;

use Illuminate\Support\ServiceProvider;

final class FirstAidChecklistServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/Database/Migrations');
    }
}
