<?php

declare(strict_types=1);

namespace App\Shared\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

/** Passes a well-formed id through, so a client cannot write its own text into a log line. */
final class RequestId
{
    public const ATTRIBUTE = 'request_id';

    public const HEADER = 'X-Request-Id';

    /** @param Closure(Request): Response $next */
    public function handle(Request $request, Closure $next): Response
    {
        $given = $request->headers->get(self::HEADER);
        $id = is_string($given) && preg_match('/\A[A-Za-z0-9-]{8,64}\z/', $given) === 1 ? $given : (string) Str::uuid();

        $request->attributes->set(self::ATTRIBUTE, $id);
        Log::shareContext([self::ATTRIBUTE => $id]);

        $response = $next($request);
        $response->headers->set(self::HEADER, $id);

        return $response;
    }
}
