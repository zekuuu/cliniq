<?php

declare(strict_types=1);

namespace App\Shared\Sequences;

use Illuminate\Support\ServiceProvider;

final class SequencesServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/Database/Migrations');
    }
}
