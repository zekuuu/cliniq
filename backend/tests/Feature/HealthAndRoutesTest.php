<?php

declare(strict_types=1);

use Illuminate\Routing\Route as RoutingRoute;
use Illuminate\Support\Facades\Route;

it('says the app is up and nothing else', function () {
    $this->getJson('/api/health')->assertOk()->assertExactJson(['data' => ['status' => 'ok']]);
});

it('needs no sign-in for health and answers without a database', function () {
    config(['database.default' => 'does-not-exist']);

    $this->getJson('/api/health')->assertOk();
});

it('issues the CSRF cookie', function () {
    $response = $this->get('/sanctum/csrf-cookie');

    $response->assertNoContent();
    $response->assertCookie('XSRF-TOKEN');
});

it('fails when an undocumented route appears', function () {
    $routes = collect(Route::getRoutes()->getRoutes())
        ->map(fn (RoutingRoute $route): string => implode('|', $route->methods()).' '.$route->uri())
        ->sort()->values()->all();

    expect($routes)->toBe([
        'GET|HEAD api/health',
        'GET|HEAD sanctum/csrf-cookie',
    ]);
});
