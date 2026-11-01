<?php

declare(strict_types=1);

namespace App\Shared\AuditLog;

/** The binding until the `audit_logs` table exists (B3). */
final class InMemoryAuditLogger implements AuditLogger
{
    /** @var list<AuditEvent> */
    private array $events = [];

    public function record(AuditEvent $event): void
    {
        $this->events[] = $event;
    }

    /** @return list<AuditEvent> */
    public function events(): array
    {
        return $this->events;
    }
}
