<?php

declare(strict_types=1);

namespace App\Shared\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * With one allowed origin, the CORS library names it on every response, whoever asks. The browser
 * still refuses a stranger, but this API tells a stranger nothing.
 */
final class DropForeignCorsHeaders
{
    /** @param Closure(Request): Response $next */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);
        $origin = $request->headers->get('Origin');
        $allowed = config()->array('cors.allowed_origins');

        if ($origin !== null && ! in_array($origin, $allowed, true)) {
            foreach (array_keys($response->headers->all()) as $header) {
                if (str_starts_with($header, 'access-control-')) {
                    $response->headers->remove($header);
                }
            }
        }

        return $response;
    }
}
