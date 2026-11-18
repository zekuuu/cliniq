<?php

declare(strict_types=1);

namespace App\Shared\Database;

use Illuminate\Support\ServiceProvider;

final class SharedDatabaseServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/Migrations');
    }
}
