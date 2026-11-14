<?php

declare(strict_types=1);

use App\Modules\UserManagement\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Routing\Route as RoutingRoute;
use Illuminate\Support\Facades\Route;

uses(RefreshDatabase::class);

/*
 * Phase 2 audit (Backend-Loop-Engineering.md): the Access Summary of Module-Overview.md against every
 * route, and "records are never deleted" against the code. Deterministic, so a new route or a stray
 * delete fails here instead of slipping through.
 */

const PUBLIC_ROUTES = ['api/health', 'sanctum/csrf-cookie', 'api/auth/login', 'api/auth/recovery/check', 'api/auth/recovery/verify', 'api/auth/recovery/reset'];

/**
 * What the Admin/Principal may call (ADR-033, ADR-037, ADR-038, ADR-042, ADR-043, ADR-072, ADR-077).
 * Everything else answers the Admin 403. The detail of a staff patient answers 404 instead (ADR-038).
 */
const ADMIN_MAY = [
    // own sign-in and account (ADR-066, ADR-073)
    'POST api/auth/logout', 'GET api/auth/me', 'POST api/auth/password', 'GET api/auth/profile', 'PUT api/auth/profile',
    'GET api/auth/authenticator', 'POST api/auth/authenticator/setup', 'POST api/auth/authenticator/confirm', 'DELETE api/auth/authenticator',
    'POST api/session/keepalive', 'GET api/settings/idle-signout',
    // accounts (ADR-033)
    'GET api/users', 'GET api/users/principal-name', 'GET api/users/{id}', 'POST api/users', 'PUT api/users/{id}', 'PUT api/users/{id}/active', 'POST api/users/{id}/reset-password',
    // student list and profile, read (ADR-038)
    'POST api/students/query', 'GET api/students/{id}', 'GET api/students/{id}/history', 'GET api/patients/{kind}/{id}', 'GET api/reference/grade-levels',
    // incidents, read (ADR-038)
    'GET api/incidents', 'GET api/incidents/{id}', 'GET api/incidents/approved-ids', 'GET api/incidents/{id}/trail',
    // reports, view only (ADR-077), Dashboard and calendar (ADR-042 writes events)
    'GET api/reports/monthly', 'GET api/reports/latest-month', 'GET api/dashboard/summary', 'GET api/dashboard/cluster-alerts',
    'GET api/calendar/days', 'GET api/calendar/holidays', 'GET api/calendar/events', 'POST api/calendar/events', 'PUT api/calendar/events/{id}', 'DELETE api/calendar/events/{id}',
    // school years and the Archive, read (ADR-072, ADR-075)
    'GET api/school-years', 'GET api/school-years/reminder', 'GET api/archive/years', 'GET api/archive/students',
    // backups, full (ADR-037); audit log, view; issue reports (Q12)
    'GET api/backups/status', 'POST api/backups/verify-latest', 'POST api/backups/run', 'GET api/backups/folders', 'GET api/backups/locations', 'POST api/backups/locations', 'PUT api/backups/locations/{id}/enabled',
    'GET api/audit-log', 'POST api/audit/views', 'POST api/issue-reports', 'GET api/issue-reports',
];

/** @return list<array{0: string, 1: string, 2: string}> method, uri template, request uri */
function everyRoute(): array
{
    $out = [];
    foreach (Route::getRoutes()->getRoutes() as $route) {
        /** @var RoutingRoute $route */
        $method = $route->methods()[0];
        $uri = $route->uri();
        if (in_array($uri, PUBLIC_ROUTES, true)) {
            continue;
        }
        $out[] = [$method, $uri, '/'.str_replace(['{id}', '{kind}'], ['999999', 'student'], $uri)];
    }

    return $out;
}

it('answers 401 to every guarded route without a sign-in', function () {
    $this->withoutMiddleware(ThrottleRequests::class);
    $wrong = [];
    foreach (everyRoute() as [$method, $uri, $path]) {
        $status = $this->json($method, $path)->status();
        if ($status !== 401) {
            $wrong[] = "{$method} {$uri} → {$status}";
        }
    }
    expect($wrong)->toBe([]);
});

it('lets the Admin call only what the access matrix allows, and refuses the rest with 403', function () {
    $this->travelTo('2026-11-10 09:00:00');
    $this->withoutMiddleware(ThrottleRequests::class);
    signIn(User::factory()->admin()->create());
    $wrong = [];
    foreach (everyRoute() as [$method, $uri, $path]) {
        if ($uri === 'api/auth/logout') {
            continue; // would end this test's session
        }
        $status = $this->json($method, $path)->status();
        $allowed = in_array("{$method} {$uri}", ADMIN_MAY, true);
        if ($allowed === ($status === 403)) {
            $wrong[] = "{$method} {$uri} → {$status} (".($allowed ? 'should be allowed' : 'should be 403').')';
        }
    }
    expect($wrong)->toBe([]);
});

it('never deletes a record: only lists that a save replaces, drafts, and calendar events', function () {
    // Tables whose rows are rebuilt on each save, plus the one real delete (calendar events, ADR-042).
    $replaceable = [
        'student_health_entries', 'emergency_contacts', 'personnel_health_entries', 'personnel_emergency_contacts', 'visit_extra_complaints',
        'treatment_item_lines', 'sports_report_students', 'inventory_item_allergy_words', 'inventory_item_symptom_tags', 'recovery_codes',
        'password_histories', 'hospital_referrals', 'holidays', 'calendar_events',
        'excuse_letters', // a draft only (`saveDraft` with null); approved, voided and superseded letters stay
    ];
    $found = [];
    $files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator(base_path('app')));
    foreach ($files as $file) {
        // A migration's down() undoes its own rows; it is not app behaviour.
        if (! str_ends_with((string) $file, '.php') || str_contains((string) $file, DIRECTORY_SEPARATOR.'Migrations'.DIRECTORY_SEPARATOR)) {
            continue;
        }
        foreach (file((string) $file) ?: [] as $n => $line) {
            if (preg_match("/DB::table\\('([a-z_]+)'\\)[^;]*->delete\\(\\)/", $line, $m) === 1 && ! in_array($m[1], $replaceable, true)) {
                $found[] = basename((string) $file).':'.($n + 1)." deletes from {$m[1]}";
            }
        }
    }
    expect($found)->toBe([]);
});

it('keeps the security basics: no registration route, a throttled sign-in, strict models, no CORS wildcard', function () {
    $uris = collect(Route::getRoutes()->getRoutes())->map(fn (RoutingRoute $r): string => $r->uri());
    expect($uris->filter(fn (string $u): bool => str_contains($u, 'register'))->all())->toBe([])
        ->and(Route::getRoutes()->getByName('auth.login')?->gatherMiddleware())->toContain('throttle:login')
        ->and(config('cors.allowed_origins'))->not->toContain('*')
        ->and(Model::preventsLazyLoading())->toBeTrue();
});
