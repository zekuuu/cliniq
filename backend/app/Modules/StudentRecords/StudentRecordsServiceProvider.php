<?php

declare(strict_types=1);

namespace App\Modules\StudentRecords;

use Illuminate\Support\ServiceProvider;

final class StudentRecordsServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/Database/Migrations');
    }
}
