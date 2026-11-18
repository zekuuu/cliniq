<?php

declare(strict_types=1);

namespace App\Shared\AuditLog;

/** The target types the mock API records. */
enum AuditTarget: string
{
    case Backup = 'backup';
    case BackupLocation = 'backup-location';
    case CalendarEvent = 'calendar-event';
    case ExcuseLetter = 'excuse-letter';
    case FollowUp = 'follow-up';
    case Incident = 'incident';
    case IncidentEscalation = 'incident-escalation';
    case IncidentReport = 'incident-report';
    case IncidentStageOne = 'incident-stage-1';
    case IncidentStageTwo = 'incident-stage-2';
    case Inventory = 'inventory';
    case InventoryAdjustment = 'inventory-adjustment';
    case InventoryDispensation = 'inventory-dispensation';
    case InventoryRestock = 'inventory-restock';
    case IssueReport = 'issue-report';
    case ParentNotification = 'parent-notification';
    case PeSportsReferral = 'pe-sports-referral';
    case PrintDocument = 'print-document';
    case SchoolYear = 'school-year';
    case SportsReport = 'sports-report';
    case Staff = 'staff';
    case StaffImport = 'staff-import';
    case Student = 'student';
    case StudentImport = 'student-import';
    case User = 'user';
    case Visit = 'visit';
}
