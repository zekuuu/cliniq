<?php

declare(strict_types=1);

namespace App\Shared\FollowUps;

use Illuminate\Support\ServiceProvider;

final class FollowUpsServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/Database/Migrations');
    }
}
