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
        'DELETE api/auth/authenticator',
        'GET|HEAD api/audit-log',
        'GET|HEAD api/auth/authenticator',
        'GET|HEAD api/auth/me',
        'GET|HEAD api/auth/profile',
        'GET|HEAD api/health',
        'GET|HEAD api/settings/idle-signout',
        'GET|HEAD api/students/incomplete',
        'GET|HEAD api/students/{id}',
        'GET|HEAD sanctum/csrf-cookie',
        'POST api/audit/prints',
        'POST api/audit/views',
        'POST api/auth/authenticator/confirm',
        'POST api/auth/authenticator/setup',
        'POST api/auth/login',
        'POST api/auth/logout',
        'POST api/auth/password',
        'POST api/auth/recovery/check',
        'POST api/auth/recovery/reset',
        'POST api/auth/recovery/verify',
        'POST api/session/keepalive',
        'POST api/students',
        'POST api/students/check-duplicates',
        'POST api/students/query',
        'POST api/students/search',
        'POST api/students/{id}/archive',
        'PUT api/auth/profile',
        'PUT api/settings/idle-signout',
        'PUT api/students/{id}',
    ]);
});

it('puts sign-in, both session checks, the account check and a role rule on every route but the public ones', function () {
    $public = ['api/health', 'sanctum/csrf-cookie', 'api/auth/login', 'api/auth/recovery/check', 'api/auth/recovery/verify', 'api/auth/recovery/reset'];
    $unguarded = collect(Route::getRoutes()->getRoutes())
        ->reject(fn (RoutingRoute $route): bool => in_array($route->uri(), $public, true))
        ->filter(function (RoutingRoute $route): bool {
            $m = $route->gatherMiddleware();

            return ! in_array('auth:sanctum', $m, true) || ! in_array('session.fixed', $m, true)
                || ! in_array('session.idle', $m, true) || ! in_array('account.active', $m, true)
                || ! collect($m)->contains(fn ($x): bool => is_string($x) && str_starts_with($x, 'role:'));
        })
        ->map(fn (RoutingRoute $route): string => $route->uri())->values()->all();

    expect($unguarded)->toBe([]);
});
