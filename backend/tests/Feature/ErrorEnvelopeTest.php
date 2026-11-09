<?php

declare(strict_types=1);

use App\Shared\Http\ApiError;
use App\Shared\Http\BusinessRuleViolation;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

beforeEach(function () {
    Route::middleware('api')->prefix('api/_t')->group(function () {
        Route::post('validate', function (Request $request) {
            $request->validate(['name' => 'required']);
        });
        Route::get('rule', fn () => throw new BusinessRuleViolation('stock_rule', "Medicines on a completed incident can't be changed."));
        Route::get('forbidden', fn () => abort(403));
        Route::get('boom', fn () => throw new RuntimeException('SELECT * FROM students WHERE lrn = 123456789012'));
        Route::get('idle', fn () => throw ApiError::sessionIdle(30));
        Route::get('expired', fn () => throw ApiError::sessionExpired());
        Route::get('credentials', fn () => throw ApiError::invalidCredentials());
        Route::get('password', fn () => throw ApiError::passwordChangeRequired());
        Route::get('locked', fn () => throw ApiError::accountLocked('2026-11-02T08:30:00+08:00'));
        Route::get('auth', fn () => throw new AuthenticationException);
    });
});

it('renders 422 with its fields', function () {
    $this->postJson('/api/_t/validate')->assertUnprocessable()
        ->assertJsonPath('code', 'validation_failed')
        ->assertJsonStructure(['code', 'message', 'errors' => ['name'], 'request_id']);
});

it('renders a business rejection as 409 with only its keys', function () {
    $body = $this->getJson('/api/_t/rule', ['X-Request-Id' => 'abc-12345678'])->assertConflict()->json();

    expect($body)->toBe([
        'code' => 'rule_violated',
        'message' => "Medicines on a completed incident can't be changed.",
        'rule' => 'stock_rule',
        'request_id' => 'abc-12345678',
    ]);
});

it('renders each status with its code', function (string $uri, int $status, string $code) {
    $this->getJson($uri)->assertStatus($status)->assertJsonPath('code', $code)
        ->assertJsonStructure(['code', 'message', 'request_id']);
})->with([
    'unauthenticated' => ['/api/_t/auth', 401, 'unauthenticated'],
    'session idle' => ['/api/_t/idle', 401, 'session_idle'],
    'session expired' => ['/api/_t/expired', 401, 'session_expired'],
    'invalid credentials' => ['/api/_t/credentials', 401, 'invalid_credentials'],
    'forbidden' => ['/api/_t/forbidden', 403, 'forbidden'],
    'password change' => ['/api/_t/password', 403, 'password_change_required'],
    'not found' => ['/api/_t/missing', 404, 'not_found'],
    'locked' => ['/api/_t/locked', 423, 'account_locked'],
]);

it('adds locked_until to a locked account', function () {
    $this->getJson('/api/_t/locked')->assertJsonPath('locked_until', '2026-11-02T08:30:00+08:00');
});

it('renders a wrong method in the same shape', function () {
    $this->postJson('/api/_t/rule')->assertStatus(405)->assertJsonPath('code', 'method_not_allowed');
});

it('renders a CSRF mismatch as 419', function () {
    app()->detectEnvironment(fn (): string => 'local');
    Route::middleware('api')->post('api/_t/write', fn () => ['data' => 'ok']);

    $this->postJson('/api/_t/write', [], ['Origin' => 'http://localhost:5173', 'Referer' => 'http://localhost:5173/'])
        ->assertStatus(419)->assertJsonPath('code', 'csrf_mismatch');
});

it('leaks nothing from a 500, even with debug on', function (bool $debug) {
    config(['app.debug' => $debug]);

    $response = $this->getJson('/api/_t/boom');

    $response->assertStatus(500)->assertJsonPath('code', 'server_error');
    expect(array_keys($response->json()))->toBe(['code', 'message', 'request_id'])
        ->and($response->getContent())->not->toContain('SELECT')
        ->not->toContain('123456789012')
        ->not->toContain('.php');
})->with([false, true]);

it('uses the wording the screens already show', function () {
    expect(ApiError::sessionIdle(60)->getMessage())->toBe('You were signed out after 60 minutes of inactivity. Sign in again.')
        ->and(ApiError::sessionExpired()->getMessage())->toBe('Your session ended 7 days after you signed in. Sign in again.')
        ->and(ApiError::invalidCredentials()->getMessage())->toBe('Unable to sign in with those credentials.')
        ->and(ApiError::accountLocked('x')->getMessage())->toStartWith('This account is temporarily locked after repeated failed attempts.');
});

it('accepts a write that echoes the CSRF cookie, the way the browser will', function () {
    app()->detectEnvironment(fn (): string => 'local');
    Route::middleware('api')->post('api/_t/write', fn () => ['data' => 'ok']);
    $origin = ['Origin' => 'http://localhost:5173', 'Referer' => 'http://localhost:5173/'];

    $cookies = $this->get('/sanctum/csrf-cookie', $origin)->headers->getCookies();
    $token = collect($cookies)->firstWhere(fn ($cookie) => $cookie->getName() === 'XSRF-TOKEN')->getValue();

    $this->withCredentials()->postJson('/api/_t/write', [], [...$origin, 'X-XSRF-TOKEN' => $token])->assertOk();
});
