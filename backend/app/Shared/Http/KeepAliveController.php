<?php

declare(strict_types=1);

namespace App\Shared\Http;

use App\Shared\Http\Middleware\IdleSignOut;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** `POST /api/session/keepalive` (ADR-078): counts as activity and returns the idle seconds left. */
final class KeepAliveController
{
    public function __invoke(Request $request): JsonResponse
    {
        return response()->json(['data' => ['idleSecondsLeft' => IdleSignOut::secondsLeft($request)]]);
    }
}
