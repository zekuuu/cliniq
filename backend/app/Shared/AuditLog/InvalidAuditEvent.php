<?php

declare(strict_types=1);

namespace App\Shared\AuditLog;

use InvalidArgumentException;

/** The message never repeats the refused value: it may be the very data that must stay out. */
final class InvalidAuditEvent extends InvalidArgumentException {}
