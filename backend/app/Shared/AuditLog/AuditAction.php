<?php

declare(strict_types=1);

namespace App\Shared\AuditLog;

/** `AuditActionType` in frontend/src/types/entities.ts; `chk_audit_action` in the schema. */
enum AuditAction: string
{
    case Login = 'login';
    case Logout = 'logout';
    case Submit = 'submit';
    case Approve = 'approve';
    case Create = 'create';
    case Update = 'update';
    case Delete = 'delete';
    case Archive = 'archive';
    case Print = 'print';
    case View = 'view';
}
