<?php

declare(strict_types=1);

use App\Shared\Http\HealthController;
use App\Shared\Http\KeepAliveController;
use Illuminate\Support\Facades\Route;

Route::get('health', HealthController::class);

// ADR-078: counts as activity and returns the idle seconds left. The 7-day check runs first.
Route::post('session/keepalive', KeepAliveController::class)
    ->middleware(['auth:sanctum', 'session.fixed', 'session.idle', 'throttle:60,1'])
    ->name('session.keepalive');
