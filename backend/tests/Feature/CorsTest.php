<?php

declare(strict_types=1);

use Illuminate\Testing\TestResponse;

function preflight(string $origin): TestResponse
{
    return test()->call('OPTIONS', '/api/health', [], [], [], [
        'HTTP_ORIGIN' => $origin,
        'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'GET',
    ]);
}

it('answers a preflight from the allowed origin with credentials and methods', function () {
    $response = preflight('http://localhost:5173');

    expect($response->headers->get('Access-Control-Allow-Origin'))->toBe('http://localhost:5173')
        ->and($response->headers->get('Access-Control-Allow-Credentials'))->toBe('true')
        ->and($response->headers->get('Access-Control-Allow-Methods'))->toContain('GET');
});

it('gives another origin nothing', function () {
    $response = preflight('http://evil.example');

    expect($response->headers->has('Access-Control-Allow-Origin'))->toBeFalse()
        ->and($response->headers->has('Access-Control-Allow-Credentials'))->toBeFalse();
});

it('covers the API and the CSRF cookie, with no wildcard', function () {
    expect(config('cors.paths'))->toBe(['api/*', 'sanctum/csrf-cookie'])
        ->and(config('cors.supports_credentials'))->toBeTrue()
        ->and(config('cors.allowed_origins'))->not->toContain('*')
        ->and(config('cors.allowed_methods'))->not->toContain('*')
        ->and(config('cors.allowed_headers'))->not->toContain('*')
        ->and(config('cors.allowed_origins_patterns'))->toBe([])
        ->and(config('cors.max_age'))->toBeGreaterThan(0);
});

it('drops a wildcard written into the environment', function () {
    $_ENV['CORS_ALLOWED_ORIGINS'] = $_SERVER['CORS_ALLOWED_ORIGINS'] = '*, http://192.168.1.10, https://*.example.com';

    $cors = require config_path('cors.php');

    unset($_ENV['CORS_ALLOWED_ORIGINS'], $_SERVER['CORS_ALLOWED_ORIGINS']);

    expect($cors['allowed_origins'])->toBe(['http://192.168.1.10']);
});

it('takes the stateful domains from the environment', function () {
    expect(config('sanctum.stateful'))->toContain('localhost:5173');
});
