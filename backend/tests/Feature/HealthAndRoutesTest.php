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
        'DELETE api/calendar/events/{id}',
        'GET|HEAD api/archive/staff',
        'GET|HEAD api/archive/students',
        'GET|HEAD api/archive/years',
        'GET|HEAD api/audit-log',
        'GET|HEAD api/auth/authenticator',
        'GET|HEAD api/auth/me',
        'GET|HEAD api/auth/profile',
        'GET|HEAD api/backups/folders',
        'GET|HEAD api/backups/locations',
        'GET|HEAD api/backups/status',
        'GET|HEAD api/calendar/days',
        'GET|HEAD api/calendar/events',
        'GET|HEAD api/calendar/holidays',
        'GET|HEAD api/dashboard/cluster-alerts',
        'GET|HEAD api/dashboard/summary',
        'GET|HEAD api/excuse-letters/pending',
        'GET|HEAD api/excuse-letters/{id}',
        'GET|HEAD api/follow-ups',
        'GET|HEAD api/health',
        'GET|HEAD api/incidents',
        'GET|HEAD api/incidents/approved-ids',
        'GET|HEAD api/incidents/{id}',
        'GET|HEAD api/incidents/{id}/trail',
        'GET|HEAD api/inventory',
        'GET|HEAD api/inventory/movements',
        'GET|HEAD api/inventory/{id}',
        'GET|HEAD api/inventory/{id}/history',
        'GET|HEAD api/issue-reports',
        'GET|HEAD api/patients/{kind}/{id}',
        'GET|HEAD api/personnel',
        'GET|HEAD api/personnel/incomplete',
        'GET|HEAD api/personnel/search',
        'GET|HEAD api/personnel/{id}',
        'GET|HEAD api/personnel/{id}/history',
        'GET|HEAD api/reference/grade-levels',
        'GET|HEAD api/reference/incident-complaint-types',
        'GET|HEAD api/reference/large-write-off-percent',
        'GET|HEAD api/reference/medical-certificate-after-days',
        'GET|HEAD api/reference/personnel-departments',
        'GET|HEAD api/reference/personnel-types',
        'GET|HEAD api/reference/unusual-age-years',
        'GET|HEAD api/reference/visit-complaint-suggestions',
        'GET|HEAD api/reference/visit-complaint-types',
        'GET|HEAD api/reference/vitals-ranges',
        'GET|HEAD api/reports/latest-month',
        'GET|HEAD api/reports/monthly',
        'GET|HEAD api/school-years',
        'GET|HEAD api/school-years/reminder',
        'GET|HEAD api/settings/idle-signout',
        'GET|HEAD api/sports-reports',
        'GET|HEAD api/sports-reports/{id}',
        'GET|HEAD api/sports-reports/{id}/content',
        'GET|HEAD api/students/incomplete',
        'GET|HEAD api/students/{id}',
        'GET|HEAD api/students/{id}/excuse-letters',
        'GET|HEAD api/students/{id}/history',
        'GET|HEAD api/users',
        'GET|HEAD api/users/principal-name',
        'GET|HEAD api/users/{id}',
        'GET|HEAD api/visits',
        'GET|HEAD api/visits/{id}',
        'GET|HEAD api/visits/{id}/excuse-letter',
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
        'POST api/backups/locations',
        'POST api/backups/run',
        'POST api/backups/verify-latest',
        'POST api/calendar/events',
        'POST api/follow-ups/{id}/reschedule',
        'POST api/incidents',
        'POST api/incidents/{id}/approve',
        'POST api/incidents/{id}/parent-notifications',
        'POST api/inventory',
        'POST api/inventory/{id}/adjust',
        'POST api/inventory/{id}/dispense',
        'POST api/inventory/{id}/restock',
        'POST api/issue-reports',
        'POST api/patients/search',
        'POST api/pe-referrals',
        'POST api/personnel',
        'POST api/personnel/import',
        'POST api/personnel/import/preview',
        'POST api/personnel/{id}/archive',
        'POST api/school-years/end',
        'POST api/school-years/start',
        'POST api/session/keepalive',
        'POST api/sports-reports',
        'POST api/sports-reports/{id}/duplicate',
        'POST api/students',
        'POST api/students/check-duplicates',
        'POST api/students/import',
        'POST api/students/import/preview',
        'POST api/students/query',
        'POST api/students/search',
        'POST api/students/{id}/archive',
        'POST api/users',
        'POST api/users/{id}/reset-password',
        'POST api/visits',
        'POST api/visits/{id}/entered-in-error',
        'POST api/visits/{id}/excuse-letter/approve',
        'POST api/visits/{id}/excuse-letter/replacement',
        'PUT api/auth/profile',
        'PUT api/backups/locations/{id}/enabled',
        'PUT api/calendar/events/{id}',
        'PUT api/follow-ups/{id}/status',
        'PUT api/incidents/{id}/stage-two',
        'PUT api/inventory/{id}',
        'PUT api/personnel/{id}',
        'PUT api/school-years/settings',
        'PUT api/settings/idle-signout',
        'PUT api/sports-reports/{id}',
        'PUT api/sports-reports/{id}/archived',
        'PUT api/students/{id}',
        'PUT api/users/{id}',
        'PUT api/users/{id}/active',
        'PUT api/visits/{id}',
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
