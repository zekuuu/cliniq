<?php

declare(strict_types=1);

namespace Tests;

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    public function createApplication(): Application
    {
        // A developer's own .env must not steer the tests: .env.testing (the test database,
        // cliniq_testing) when it exists, else the committed .env.example.
        $app = require __DIR__.'/../bootstrap/app.php';
        $app->loadEnvironmentFrom(file_exists(__DIR__.'/../.env.testing') ? '.env.testing' : '.env.example');
        $app->make(Kernel::class)->bootstrap();

        // No key is committed anywhere: each test run makes its own.
        $app['config']->set('app.key', 'base64:'.base64_encode(random_bytes(32)));

        return $app;
    }
}
