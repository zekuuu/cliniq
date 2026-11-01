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
    case Inventory = 'inventory';
    case InventoryAdjustment = 'inventory-adjustment';
    case InventoryDispensation = 'inventory-dispensation';
    case InventoryRestock = 'inventory-restock';
    case IssueReport = 'issue-report';
    case PeSportsReferral = 'pe-sports-referral';
    case PrintDocument = 'print-document';
    case SportsReport = 'sports-report';
    case Staff = 'staff';
    case Student = 'student';
    case User = 'user';
    case Visit = 'visit';
}
