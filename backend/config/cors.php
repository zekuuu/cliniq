<?php

declare(strict_types=1);

// An explicit list only (ADR-056). A wildcard in the environment is dropped, never honoured.
$origins = array_map(trim(...), explode(',', (string) env('CORS_ALLOWED_ORIGINS', 'http://localhost:5173')));

return [

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

    'allowed_origins' => array_values(array_filter($origins, fn (string $origin): bool => $origin !== '' && ! str_contains($origin, '*'))),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['Accept', 'Content-Type', 'X-Requested-With', 'X-XSRF-TOKEN', 'X-Request-Id'],

    'exposed_headers' => ['X-Request-Id'],

    'max_age' => 3600,

    'supports_credentials' => true,

];
