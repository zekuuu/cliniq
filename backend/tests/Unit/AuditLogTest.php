<?php

declare(strict_types=1);

use App\Shared\AuditLog\AuditAction;
use App\Shared\AuditLog\AuditEvent;
use App\Shared\AuditLog\AuditLogger;
use App\Shared\AuditLog\AuditTarget;
use App\Shared\AuditLog\DatabaseAuditLogger;
use App\Shared\AuditLog\InMemoryAuditLogger;
use App\Shared\AuditLog\InvalidAuditEvent;
use Carbon\CarbonImmutable;

function auditEvent(array $fields = [], ?string $targetId = '7', ?string $targetLabel = null): AuditEvent
{
    return new AuditEvent(
        actorId: '1',
        actorRole: 'staff',
        action: AuditAction::Update,
        targetType: AuditTarget::Student,
        targetId: $targetId,
        targetLabel: $targetLabel,
        at: CarbonImmutable::parse('2026-11-02 08:00:00'),
        fields: $fields,
    );
}

it('accepts field names', function () {
    expect(auditEvent(['allergies', 'gradeLevel', 'emergencyContacts'])->fields)->toHaveCount(3);
});

it('refuses a value that looks like data', function (string $value) {
    auditEvent([$value]);
})->with([
    'an LRN' => ['123456789012'],
    'a spaced LRN' => ['1234 5678 9012'],
    'an email' => ['nurse@school.test'],
    'a name' => ['Reyes, Ana'],
    'free text' => ['has a peanut allergy'],
    'a date' => ['2015-03-14'],
    'empty' => [''],
    'a very long word' => [str_repeat('a', 41)],
])->throws(InvalidAuditEvent::class);

it('refuses an LRN or an email as a target', function (?string $id, ?string $label) {
    auditEvent([], $id, $label);
})->with([
    'LRN as id' => ['123456789012', null],
    'LRN in a label' => [null, 'Student 123456789012'],
    'email in a label' => [null, 'nurse@school.test'],
    'no target' => [null, null],
])->throws(InvalidAuditEvent::class);

it('accepts a target with no record id', function () {
    expect(auditEvent([], null, 'Backup run 2026-11-02')->targetLabel)->toBe('Backup run 2026-11-02');
});

it('names every action the mock records', function () {
    expect(array_map(fn (AuditAction $action): string => $action->value, AuditAction::cases()))
        ->toBe(['login', 'logout', 'submit', 'approve', 'create', 'update', 'delete', 'archive', 'print', 'view']);
});

it('names every target the mock records', function () {
    $mock = ['backup', 'backup-location', 'calendar-event', 'excuse-letter', 'follow-up', 'incident', 'incident-escalation', 'incident-report', 'incident-stage-1', 'incident-stage-2', 'inventory', 'inventory-adjustment', 'inventory-dispensation', 'inventory-restock', 'issue-report', 'parent-notification', 'pe-sports-referral', 'print-document', 'school-year', 'sports-report', 'staff', 'staff-import', 'student', 'student-import', 'user', 'visit'];

    expect(array_map(fn (AuditTarget $target): string => $target->value, AuditTarget::cases()))->toEqualCanonicalizing($mock);
});

it('binds the logger to the database implementation (B3), one instance per app', function () {
    expect(app(AuditLogger::class))->toBeInstanceOf(DatabaseAuditLogger::class)
        ->and(app(AuditLogger::class))->toBe(app(AuditLogger::class));
});

it('keeps what the in-memory fake is given', function () {
    $logger = new InMemoryAuditLogger;
    $logger->record(auditEvent(['allergies']));

    expect($logger->events())->toHaveCount(1);
});
