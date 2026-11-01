<?php

declare(strict_types=1);

namespace App\Shared\AuditLog;

interface AuditLogger
{
    public function record(AuditEvent $event): void;
}
