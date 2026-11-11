<?php

declare(strict_types=1);

use App\Modules\UserManagement\Controllers\AuthController;
use App\Shared\AuditLog\AuditLogController;
use App\Shared\Http\HealthController;
use App\Shared\Http\KeepAliveController;
use App\Shared\Settings\IdleSignoutSettingsController;
use Illuminate\Support\Facades\Route;

Route::get('health', HealthController::class);

Route::post('auth/login', [AuthController::class, 'login'])->middleware('throttle:login')->name('auth.login');

// ADR-078: counts as activity and returns the idle seconds left. The 7-day check runs first.
Route::post('session/keepalive', KeepAliveController::class)
    ->middleware(['auth:sanctum', 'session.fixed', 'session.idle', 'account.active', 'role:staff,admin', 'throttle:60,1'])
    ->name('session.keepalive');

// Every signed-in route: the 7-day check, the idle check, the account check, then the role.
Route::middleware(['auth:sanctum', 'session.fixed', 'session.idle', 'account.active'])->group(function (): void {
    Route::middleware('role:staff,admin')->group(function (): void {
        Route::post('auth/logout', [AuthController::class, 'logout'])->name('auth.logout');
        Route::get('auth/me', [AuthController::class, 'me'])->name('auth.me');
        Route::post('auth/password', [AuthController::class, 'password'])->name('auth.password');

        Route::get('settings/idle-signout', [IdleSignoutSettingsController::class, 'show']);
        // Staff only; the controller answers the Admin with the mock's message.
        Route::put('settings/idle-signout', [IdleSignoutSettingsController::class, 'update']);

        Route::get('audit-log', [AuditLogController::class, 'index']);
        Route::post('audit/views', [AuditLogController::class, 'view']);
    });

    Route::middleware('role:staff')->group(function (): void {
        Route::post('audit/prints', [AuditLogController::class, 'print']);
    });
});
