<?php

declare(strict_types=1);

namespace App\Shared\AuditLog;

use Illuminate\Support\Facades\DB;

/**
 * Writes the audit trail to `audit_logs` (B3). Insert only: no code path updates or deletes a row,
 * and the database account `cliniq_app` holds only SELECT and INSERT on the table (ERD section 13).
 * The summary names fields, never values (ADR-017): an explicit summary wins, else "Updated a and b".
 */
final class DatabaseAuditLogger implements AuditLogger
{
    /** The mock's FIELD_LABELS (api.ts), so summaries read the same. */
    private const LABELS = [
        'idleSignoutMinutesStaff' => 'Staff idle sign-out minutes',
        'idleSignoutMinutesAdmin' => 'Admin idle sign-out minutes',
        'lrn' => 'LRN',
        'gradeLevel' => 'grade level',
        'contactInfo' => 'contact info',
        'medicalConditions' => 'medical conditions',
        'emergencyContacts' => 'emergency contacts',
        'currentStock' => 'stock',
        'expirationDate' => 'expiration date',
        'lowStockThreshold' => 'low-stock threshold',
        'dateTime' => 'date and time',
        'eventTag' => 'event tag',
        'treatment' => 'treatment notes',
        'itemsGiven' => 'medicines and supplies',
        'temperatureC' => 'body temperature',
        'timeOut' => 'time out',
        'assistedBy' => 'assisted by',
        'parentGuardian' => 'parent or guardian',
        'profilePicture' => 'profile picture',
        'brand' => 'generic or branded',
        'department' => 'department or role',
        'avoidIfAllergicTo' => 'avoid if allergic to',
        'schoolYearStartMonth' => 'start month',
        'schoolYearStartDay' => 'start day',
        'schoolYearEndMonth' => 'end month',
        'schoolYearEndDay' => 'end day',
        'usedFor' => 'commonly used for',
        'generalNotes' => 'additional notes',
    ];

    public function record(AuditEvent $event): void
    {
        $numericId = $event->targetId !== null && ctype_digit($event->targetId);
        $ip = request()->ip();

        DB::table('audit_logs')->insert([
            'occurred_at' => $event->at->setTimezone(config()->string('app.timezone'))->format('Y-m-d H:i:s'),
            'actor_user_id' => $event->actorId,
            'actor_role' => $event->actorId === null ? null : $event->actorRole,
            'action_type' => $event->action->value,
            'target_type' => $event->targetType?->value,
            'target_id' => $numericId ? $event->targetId : null,
            'target_label' => $event->targetLabel ?? ($numericId ? null : $event->targetId),
            'subject_student_id' => $event->subjectStudentId,
            'subject_personnel_id' => $event->subjectPersonnelId,
            'summary' => $event->summary ?? self::changedSummary($event->fields),
            'client_ip' => $ip === null ? null : (inet_pton($ip) ?: null),
        ]);
    }

    /** @param  list<string>  $fields */
    public static function changedSummary(array $fields): ?string
    {
        if ($fields === []) {
            return null;
        }
        $words = array_map(
            fn (string $f): string => self::LABELS[$f] ?? strtolower((string) preg_replace('/(?<!^)[A-Z]/', ' $0', $f)),
            $fields,
        );
        $last = array_pop($words);

        return 'Updated '.($words === [] ? $last : implode(', ', $words).' and '.$last);
    }
}
