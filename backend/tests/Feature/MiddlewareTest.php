<?php

declare(strict_types=1);

use Illuminate\Session\Middleware\StartSession;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Route;
use Tests\Support\FakeClinicUser;

beforeEach(function () {
    Route::middleware('api')->prefix('api')->group(function () {
        Route::get('_t/any', fn () => ['data' => 'ok']);
    });
    Route::middleware(['api', StartSession::class, 'role:staff'])->get('api/_t/staff', fn () => ['data' => 'ok']);
    Route::middleware(['api', StartSession::class, 'role:staff,admin'])->get('api/_t/both', fn () => ['data' => 'ok']);
    Route::middleware(['api', StartSession::class, 'session.fixed', 'admin.idle'])->get('api/_t/session', fn () => ['data' => 'ok']);
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

it('signs the Admin out after the idle limit, and never Staff', function (Closure $user, int $minutes, int $status) {
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
    'Admin at 29 minutes stays' => [fn () => FakeClinicUser::admin(), 29, 200],
    'Admin at 31 minutes is out' => [fn () => FakeClinicUser::admin(), 31, 401],
    'Staff at 31 minutes stays' => [fn () => FakeClinicUser::staff(), 31, 200],
    'Staff a day later stays' => [fn () => FakeClinicUser::staff(), 1440, 200],
]);

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
        $response->assertJsonPath('code', 'unauthenticated');
    }
})->with([
    'Staff a minute before' => [fn () => FakeClinicUser::staff(), '2026-11-09 07:59:00', 200],
    'Staff at 7 days' => [fn () => FakeClinicUser::staff(), '2026-11-09 08:00:00', 401],
    'Admin a day past' => [fn () => FakeClinicUser::admin(), '2026-11-10 08:00:00', 401],
]);

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
