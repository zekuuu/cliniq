<?php

declare(strict_types=1);

use App\Shared\AuditLog\AuditAction;
use App\Shared\AuditLog\AuditLogger;
use App\Shared\AuditLog\InMemoryAuditLogger;
use App\Shared\Settings\SettingsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Route;
use Tests\Support\FakeClinicUser;

/** The SPA's origin: Sanctum starts the session only for a request from a stateful domain (ADR-056, ADR-079). */
function spaOrigin(): string
{
    $stateful = config('sanctum.stateful');
    assert(is_array($stateful) && is_string($stateful[0]));

    return 'http://'.$stateful[0].'/';
}

// The idle limits are read from `system_settings`.
uses(RefreshDatabase::class);

beforeEach(function () {
    // Fake users have no users row, so these middleware tests keep the audit in memory.
    app()->instance(AuditLogger::class, new InMemoryAuditLogger);

    Route::middleware('api')->prefix('api')->group(function () {
        Route::get('_t/any', fn () => ['data' => 'ok']);
    });
    Route::middleware(['api', StartSession::class, 'role:staff'])->get('api/_t/staff', fn () => ['data' => 'ok']);
    Route::middleware(['api', StartSession::class, 'role:staff,admin'])->get('api/_t/both', fn () => ['data' => 'ok']);
    Route::middleware(['api', StartSession::class, 'session.fixed', 'session.idle'])->get('api/_t/session', fn () => ['data' => 'ok']);
});

it('answers JSON even when the client asks for HTML', function () {
    $response = $this->get('/api/_t/nothing', ['Accept' => 'text/html']);

    $response->assertNotFound();
    expect($response->headers->get('Content-Type'))->toContain('application/json');
});

it('sets the security headers on every API response', function (string $uri, int $status) {
    $response = $this->get($uri);

    $response->assertStatus($status);
    expect($response->headers->get('X-Content-Type-Options'))->toBe('nosniff')
        ->and($response->headers->get('X-Frame-Options'))->toBe('DENY')
        ->and($response->headers->get('Referrer-Policy'))->toBe('no-referrer')
        ->and($response->headers->get('Permissions-Policy'))->toContain('camera=()')
        ->and($response->headers->get('Cache-Control'))->toContain('no-store')
        ->and($response->headers->has('Strict-Transport-Security'))->toBeFalse();
})->with([
    'success' => ['/api/health', 200],
    'an error' => ['/api/_t/nothing', 404],
    'the CSRF cookie' => ['/sanctum/csrf-cookie', 204],
]);

it('generates a request id and returns it', function () {
    $id = $this->getJson('/api/health')->headers->get('X-Request-Id');

    expect($id)->toMatch('/^[0-9a-f-]{36}$/');
});

it('passes a well-formed request id through', function () {
    $response = $this->getJson('/api/health', ['X-Request-Id' => 'abc-12345678']);

    expect($response->headers->get('X-Request-Id'))->toBe('abc-12345678');
});

it('replaces a request id that could forge a log line', function () {
    $response = $this->getJson('/api/health', ['X-Request-Id' => "bad\nid injected"]);

    expect($response->headers->get('X-Request-Id'))->not->toContain('injected');
});

it('adds the request id to the log context', function () {
    $this->getJson('/api/health', ['X-Request-Id' => 'abc-12345678']);

    expect(Log::sharedContext())->toMatchArray(['request_id' => 'abc-12345678']);
});

it('lets each role through the role middleware, and no one else', function () {
    $this->getJson('/api/_t/staff')->assertUnauthorized()->assertJsonPath('code', 'unauthenticated');
    $this->actingAs(FakeClinicUser::staff())->getJson('/api/_t/staff')->assertOk();
    $this->actingAs(FakeClinicUser::admin())->getJson('/api/_t/staff')->assertForbidden()->assertJsonPath('code', 'forbidden');
    $this->actingAs(FakeClinicUser::admin())->getJson('/api/_t/both')->assertOk();
    $this->actingAs(FakeClinicUser::staff())->getJson('/api/_t/both')->assertOk();
});

it('signs each role out after its own idle limit (ADR-078)', function (Closure $user, int $minutes, int $status) {
    $this->travelTo('2026-11-02 08:00:00');
    $start = now()->getTimestamp();

    $this->travel($minutes)->minutes();
    $response = $this->actingAs($user())
        ->withSession(['cliniq.last_request_at' => $start, 'cliniq.signed_in_at' => $start])
        ->getJson('/api/_t/session');

    $response->assertStatus($status);
    if ($status === 401) {
        $response->assertJsonPath('code', 'session_idle');
    }
})->with([
    'Admin just inside, 29 minutes' => [fn () => FakeClinicUser::admin(), 29, 200],
    'Admin just past, 30 minutes' => [fn () => FakeClinicUser::admin(), 30, 401],
    'Staff just inside, 59 minutes' => [fn () => FakeClinicUser::staff(), 59, 200],
    'Staff just past, 60 minutes' => [fn () => FakeClinicUser::staff(), 60, 401],
]);

it('records "Signed out (idle)" with the user and action only', function () {
    $this->travelTo('2026-11-02 08:00:00');
    $start = now()->getTimestamp();
    $this->travel(60)->minutes();

    $this->actingAs(FakeClinicUser::staff())
        ->withSession(['cliniq.last_request_at' => $start, 'cliniq.signed_in_at' => $start])
        ->getJson('/api/_t/session')->assertUnauthorized();

    $event = app(AuditLogger::class)->events()[0];
    expect($event->action)->toBe(AuditAction::Logout)
        ->and($event->actorId)->toBe('1')
        ->and($event->targetType)->toBeNull()
        ->and($event->targetId)->toBeNull()
        ->and($event->targetLabel)->toBe('Signed out (idle)')
        ->and($event->fields)->toBe([]);
});

it('keeps a running countdown on its old limit; a changed setting applies from the next request', function () {
    $this->travelTo('2026-11-02 08:00:00');
    $this->actingAs(FakeClinicUser::admin())->getJson('/api/_t/session')->assertOk();

    app(SettingsService::class)->save(['idle_signout_minutes_admin' => 10], null);
    $this->travel(20)->minutes();
    $this->getJson('/api/_t/session')->assertOk();

    $this->travel(11)->minutes();
    $this->getJson('/api/_t/session')->assertUnauthorized()->assertJsonPath('code', 'session_idle');
});

it('moves the idle clock with each request', function () {
    $this->travelTo('2026-11-02 08:00:00');
    $this->actingAs(FakeClinicUser::admin())->getJson('/api/_t/session')->assertOk();

    $this->travel(20)->minutes();
    $this->getJson('/api/_t/session')->assertOk();

    $this->travel(20)->minutes();
    $this->getJson('/api/_t/session')->assertOk();
});

it('ends the session 7 days after sign-in however active the user is', function (Closure $user, string $at, int $status) {
    $signedIn = strtotime('2026-11-02 08:00:00 +08:00');
    $this->travelTo($at);

    $response = $this->actingAs($user())
        ->withSession(['cliniq.signed_in_at' => $signedIn, 'cliniq.last_request_at' => now()->getTimestamp()])
        ->getJson('/api/_t/session');

    $response->assertStatus($status);
    if ($status === 401) {
        $response->assertJsonPath('code', 'session_expired');
    }
})->with([
    'Staff a minute before' => [fn () => FakeClinicUser::staff(), '2026-11-09 07:59:00', 200],
    'Staff at 7 days' => [fn () => FakeClinicUser::staff(), '2026-11-09 08:00:00', 401],
    'Admin a day past' => [fn () => FakeClinicUser::admin(), '2026-11-10 08:00:00', 401],
]);

it('answers the keep-alive with the idle seconds left and counts it as activity', function () {
    $this->travelTo('2026-11-02 08:00:00');
    $start = now()->getTimestamp();
    $this->travel(10)->minutes();

    $this->actingAs(FakeClinicUser::staff())
        ->withSession(['cliniq.last_request_at' => $start, 'cliniq.signed_in_at' => $start])
        ->withHeader('Referer', spaOrigin())->postJson('/api/session/keepalive')
        ->assertOk()->assertExactJson(['data' => ['idleSecondsLeft' => 3600]]);

    $this->travel(55)->minutes();
    $this->getJson('/api/_t/session')->assertOk();
});

it('leaves the clock alone for a keep-alive within a minute of the last activity', function () {
    $this->travelTo('2026-11-02 08:00:00');
    $start = now()->getTimestamp();
    $this->travel(30)->seconds();

    $this->actingAs(FakeClinicUser::staff())
        ->withSession(['cliniq.last_request_at' => $start, 'cliniq.signed_in_at' => $start])
        ->withHeader('Referer', spaOrigin())->postJson('/api/session/keepalive')
        ->assertOk()->assertExactJson(['data' => ['idleSecondsLeft' => 3570]]);
});

it('refuses the keep-alive once idle, and without a sign-in', function () {
    $this->withHeader('Referer', spaOrigin())->postJson('/api/session/keepalive')->assertUnauthorized()->assertJsonPath('code', 'unauthenticated');

    $this->travelTo('2026-11-02 08:00:00');
    $start = now()->getTimestamp();
    $this->travel(31)->minutes();
    $this->actingAs(FakeClinicUser::admin())
        ->withSession(['cliniq.last_request_at' => $start, 'cliniq.signed_in_at' => $start])
        ->withHeader('Referer', spaOrigin())->postJson('/api/session/keepalive')->assertUnauthorized()->assertJsonPath('code', 'session_idle');
});

it('limits sign-in to 10 a minute per IP', function () {
    Route::middleware(['api', 'throttle:login'])->post('api/_t/login', fn () => ['data' => 'ok']);

    foreach (range(1, 10) as $attempt) {
        $this->postJson('/api/_t/login')->assertOk();
    }

    $this->postJson('/api/_t/login')->assertTooManyRequests()->assertJsonPath('code', 'too_many_requests');
});

it('limits the API to 120 a minute', function () {
    foreach (range(1, 120) as $attempt) {
        $this->getJson('/api/_t/any')->assertOk();
    }

    $response = $this->getJson('/api/_t/any');

    $response->assertTooManyRequests()->assertJsonPath('code', 'too_many_requests');
    expect($response->headers->has('Retry-After'))->toBeTrue();
});
