<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Shared\Database\SimulationSeeder;
use Illuminate\Database\Seeder;

/** The default local seed is the small, fictional Simulation data set. */
final class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(SimulationSeeder::class);
    }
}
