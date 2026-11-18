<?php

declare(strict_types=1);

namespace App\Shared\Http;

use Illuminate\Http\JsonResponse;

/** Says the app is up. Never the database, a version or a record (D15). */
final class HealthController
{
    public function __invoke(): JsonResponse
    {
        return new JsonResponse(['data' => ['status' => 'ok']]);
    }
}
