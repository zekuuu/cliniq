<?php

declare(strict_types=1);

namespace App\Shared\Http;

use RuntimeException;

/** A valid request refused by stored state: 409 `rule_violated` with a `rule` (API-Contract.md). */
final class BusinessRuleViolation extends RuntimeException
{
    public function __construct(public readonly string $rule, string $message)
    {
        parent::__construct($message);
    }
}
