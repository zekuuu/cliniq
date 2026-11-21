<?php

declare(strict_types=1);

namespace App\Shared\Database\DemoSchool;

use App\Modules\UserManagement\Models\User;
use App\Shared\Support\Row;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Testing\Concerns\InteractsWithAuthentication;
use Illuminate\Foundation\Testing\Concerns\InteractsWithSession;
use Illuminate\Foundation\Testing\Concerns\MakesHttpRequests;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Routing\Middleware\ThrottleRequestsWithRedis;
use RuntimeException;

/** Calls the real routes in-process (routing, middleware, validation, controller), as the Pest tests do. */
final class LoadHttp
{
    use InteractsWithAuthentication, InteractsWithSession, MakesHttpRequests;

    public function __construct(public Application $app)
    {
        // Rate limits are not what the seed tests: their counters live in the shared file cache, keyed by user id,
        // so a dev app signed in as the same id (or an earlier run) made the seed's own calls answer 429
        // (Zean, Saturday, November 21, 2026). Every other middleware still runs. Seed process only.
        $this->withoutMiddleware([ThrottleRequests::class, ThrottleRequestsWithRedis::class]);
    }

    public function as(User $user): self
    {
        $this->defaultHeaders = [];

        return $this->withHeader('Referer', 'http://'.Row::text(config('sanctum.stateful.0')).'/')->flushSession()->actingAs($user);
    }

    /**
     * @param  array<string, mixed>  $body
     * @return array<mixed> the `data` of a 2xx answer, or throws with the body
     */
    public function ok(string $method, string $uri, array $body = []): array
    {
        $r = $this->json($method, $uri, $body);
        if ($r->getStatusCode() >= 300) {
            throw new RuntimeException("$method $uri answered {$r->getStatusCode()}: ".mb_substr((string) $r->getContent(), 0, 400));
        }

        return (array) ($r->json('data') ?? []);
    }
}
