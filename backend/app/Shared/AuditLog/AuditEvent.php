<?php

declare(strict_types=1);

namespace App\Shared\AuditLog;

use Carbon\CarbonImmutable;

/**
 * Who did what to which record, and when. `fields` holds field names, never values (ADR-017). An
 * invalid event cannot be built. A target needs an id, or a label when it has none (ADR-057).
 */
final readonly class AuditEvent
{
    /** @param list<string> $fields */
    public function __construct(
        public ?string $actorId,
        public ?string $actorRole,
        public AuditAction $action,
        public ?AuditTarget $targetType,
        public ?string $targetId,
        public ?string $targetLabel,
        public CarbonImmutable $at,
        public array $fields = [],
        public ?string $subjectStudentId = null,
        public ?string $subjectPersonnelId = null,
        public ?string $summary = null,
    ) {
        foreach ($fields as $field) {
            if (preg_match('/\A[a-z][a-zA-Z]{0,39}\z/', $field) !== 1) {
                throw new InvalidAuditEvent('An audit field must be a field name, never a value.');
            }
        }
        if ($targetId === null && $targetLabel === null) {
            throw new InvalidAuditEvent('An audit event needs a target id or a target label.');
        }
        if ($summary !== null && mb_strlen($summary) > 255) {
            throw new InvalidAuditEvent('An audit summary is at most 255 characters.');
        }
        foreach ([$targetId, $targetLabel, $subjectStudentId, $subjectPersonnelId, $summary] as $value) {
            if ($value !== null && preg_match('/\d{12}|@/', $value) === 1) {
                throw new InvalidAuditEvent('An audit target must not hold an LRN or an email.');
            }
        }
    }
}
