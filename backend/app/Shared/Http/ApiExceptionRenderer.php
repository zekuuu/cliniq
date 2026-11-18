<?php

declare(strict_types=1);

namespace App\Shared\Http;

use App\Shared\Http\Middleware\RequestId;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Throwable;

/** The one error envelope of API-Contract.md. A 500 carries no trace, query or record, even in debug. */
final class ApiExceptionRenderer
{
    private const HTTP = [
        401 => ['unauthenticated', 'Please sign in.'],
        403 => ['forbidden', "You don't have access to this."],
        404 => ['not_found', "That record doesn't exist."],
        405 => ['method_not_allowed', "That action isn't allowed here."],
        419 => ['csrf_mismatch', 'Your session has expired. Refresh the page and try again.'],
        429 => ['too_many_requests', 'Too many requests. Wait a moment and try again.'],
    ];

    public function __invoke(Throwable $e, Request $request): ?JsonResponse
    {
        if (! $request->is('api/*', 'sanctum/*')) {
            return null;
        }

        [$status, $code, $message, $extra, $headers] = $this->describe($e);
        $requestId = $request->attributes->get(RequestId::ATTRIBUTE);

        return new JsonResponse(['code' => $code, 'message' => $message] + $extra + ['request_id' => $requestId], $status, $headers);
    }

    /** @return array{int, string, string, array<string, mixed>, array<string, mixed>} */
    private function describe(Throwable $e): array
    {
        if ($e instanceof ValidationException) {
            return [422, 'validation_failed', $e->getMessage(), ['errors' => $e->errors()], []];
        }
        if ($e instanceof BusinessRuleViolation) {
            return [409, 'rule_violated', $e->getMessage(), ['rule' => $e->rule], []];
        }
        if ($e instanceof ApiError) {
            return [$e->status, $e->errorCode, $e->getMessage(), $e->extra, []];
        }
        if ($e instanceof AuthenticationException) {
            return [401, ...self::HTTP[401], [], []];
        }
        if ($e instanceof HttpExceptionInterface) {
            $status = $e->getStatusCode();
            [$code, $message] = self::HTTP[$status] ?? ($status < 500
                ? ['bad_request', "That request couldn't be processed."]
                : ['server_error', 'Something went wrong. Please try again.']);

            return [$status, $code, $message, [], array_filter($e->getHeaders(), is_string(...), ARRAY_FILTER_USE_KEY)];
        }

        return [500, 'server_error', 'Something went wrong. Please try again.', [], []];
    }
}
