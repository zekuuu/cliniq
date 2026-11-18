<?php

declare(strict_types=1);

namespace App\Shared\Feedback;

use Illuminate\Support\ServiceProvider;

final class FeedbackServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/Database/Migrations');
    }
}
