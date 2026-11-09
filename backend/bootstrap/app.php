<?php

declare(strict_types=1);

use App\Shared\Http\ApiError;
use App\Shared\Http\ApiExceptionRenderer;
use App\Shared\Http\BusinessRuleViolation;
use App\Shared\Http\Middleware\DropForeignCorsHeaders;
use App\Shared\Http\Middleware\EnsureRole;
use App\Shared\Http\Middleware\FixedSessionLifetime;
use App\Shared\Http\Middleware\ForceJson;
use App\Shared\Http\Middleware\IdleSignOut;
use App\Shared\Http\Middleware\RequestId;
use App\Shared\Http\Middleware\SecurityHeaders;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->prepend([RequestId::class, ForceJson::class, SecurityHeaders::class, DropForeignCorsHeaders::class]);
        $middleware->statefulApi();
        $middleware->throttleApi();
        $middleware->alias([
            'role' => EnsureRole::class,
            'session.idle' => IdleSignOut::class,
            'session.fixed' => FixedSessionLifetime::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->dontReport([ApiError::class, BusinessRuleViolation::class]);
        $exceptions->render(new ApiExceptionRenderer);
    })->create();
