<?php

declare(strict_types=1);

use Illuminate\Database\Eloquent\Model;

it('holds the business numbers', function () {
    expect(config('cliniq.session_days'))->toBe(7)
        ->and(config('cliniq.failed_attempts'))->toBe(5)
        ->and(config('cliniq.lock_minutes'))->toBe(30)
        ->and(config('cliniq.admin_idle_minutes'))->toBe(30)
        ->and(config('cliniq.lrn_length'))->toBe(12);
});

it('runs in Philippine time and English', function () {
    expect(config('app.timezone'))->toBe('Asia/Manila')
        ->and(config('app.locale'))->toBe('en');
});

it('uses the session cookie settings of D4', function () {
    expect(config('session.lifetime'))->toBe(10080)
        ->and(config('session.http_only'))->toBeTrue()
        ->and(config('session.same_site'))->toBe('lax');
});

it('defaults to the file drivers and MariaDB', function () {
    $saved = [$_ENV, $_SERVER];
    unset($_ENV['SESSION_DRIVER'], $_SERVER['SESSION_DRIVER'], $_ENV['CACHE_STORE'], $_SERVER['CACHE_STORE'], $_ENV['DB_CONNECTION'], $_SERVER['DB_CONNECTION']);
    putenv('SESSION_DRIVER');
    putenv('CACHE_STORE');
    putenv('DB_CONNECTION');

    $session = require config_path('session.php');
    $cache = require config_path('cache.php');
    $database = require config_path('database.php');

    [$_ENV, $_SERVER] = $saved;

    expect($session['driver'])->toBe('file')
        ->and($cache['default'])->toBe('file')
        ->and($database['default'])->toBe('mariadb')
        ->and($database['connections']['mariadb']['timezone'])->toBe('+08:00');
});

it('keeps models strict outside production', function () {
    expect(Model::preventsLazyLoading())->toBeTrue()
        ->and(Model::isUnguarded())->toBeFalse();
});
