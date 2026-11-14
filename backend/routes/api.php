<?php

declare(strict_types=1);

use App\Modules\BackupVerification\Controllers\BackupController;
use App\Modules\ClinicVisits\Controllers\VisitController;
use App\Modules\Dashboard\Controllers\DashboardController;
use App\Modules\EmergencyResponse\Controllers\IncidentController;
use App\Modules\InventoryTracker\Controllers\InventoryController;
use App\Modules\ReportsGeneration\Controllers\ReportController;
use App\Modules\StaffPatients\Controllers\PersonnelController;
use App\Modules\StudentRecords\Controllers\ArchiveController;
use App\Modules\StudentRecords\Controllers\SchoolYearController;
use App\Modules\StudentRecords\Controllers\StudentController;
use App\Modules\UserManagement\Controllers\AuthController;
use App\Modules\UserManagement\Controllers\AuthenticatorController;
use App\Modules\UserManagement\Controllers\ProfileController;
use App\Modules\UserManagement\Controllers\UserController;
use App\Shared\AuditLog\AuditLogController;
use App\Shared\Feedback\IssueReportController;
use App\Shared\FollowUps\FollowUpController;
use App\Shared\Http\HealthController;
use App\Shared\Http\KeepAliveController;
use App\Shared\Settings\IdleSignoutSettingsController;
use App\Shared\Settings\ReferenceController;
use Illuminate\Support\Facades\Route;

Route::get('health', HealthController::class);

Route::post('auth/login', [AuthController::class, 'login'])->middleware('throttle:login')->name('auth.login');

// Password recovery (ADR-073): unauthenticated, behind the CSRF cookie, the login throttle and a per-username limiter.
Route::middleware(['throttle:login', 'throttle:recovery'])->group(function (): void {
    Route::post('auth/recovery/check', [AuthenticatorController::class, 'check']);
    Route::post('auth/recovery/verify', [AuthenticatorController::class, 'verify']);
    Route::post('auth/recovery/reset', [AuthenticatorController::class, 'reset']);
});

// ADR-078: counts as activity and returns the idle seconds left. The 7-day check runs first.
Route::post('session/keepalive', KeepAliveController::class)
    ->middleware(['auth:sanctum', 'session.fixed', 'session.idle', 'account.active', 'role:staff,admin', 'throttle:60,1'])
    ->name('session.keepalive');

// Every signed-in route: the 7-day check, the idle check, the account check, then the role.
Route::middleware(['auth:sanctum', 'session.fixed', 'session.idle', 'account.active'])->group(function (): void {
    Route::middleware('role:staff,admin')->group(function (): void {
        Route::post('auth/logout', [AuthController::class, 'logout'])->name('auth.logout');
        Route::get('auth/me', [AuthController::class, 'me'])->name('auth.me');
        Route::post('auth/password', [AuthController::class, 'password'])->name('auth.password');
        Route::get('auth/profile', [ProfileController::class, 'show']);
        Route::put('auth/profile', [ProfileController::class, 'update']);
        Route::get('auth/authenticator', [AuthenticatorController::class, 'status']);
        Route::post('auth/authenticator/setup', [AuthenticatorController::class, 'setup']);
        Route::post('auth/authenticator/confirm', [AuthenticatorController::class, 'confirm']);
        Route::delete('auth/authenticator', [AuthenticatorController::class, 'turnOff']);

        Route::get('settings/idle-signout', [IdleSignoutSettingsController::class, 'show']);
        // Staff only; the controller answers the Admin with the mock's message.
        Route::put('settings/idle-signout', [IdleSignoutSettingsController::class, 'update']);

        Route::get('audit-log', [AuditLogController::class, 'index']);
        Route::post('audit/views', [AuditLogController::class, 'view']);

        Route::post('students/query', [StudentController::class, 'query']);
        Route::get('students/{id}', [StudentController::class, 'show'])->whereNumber('id');
        Route::get('students/{id}/history', [IncidentController::class, 'studentHistory'])->whereNumber('id');

        // Accounts (ADR-033): Staff read names; the writes answer Staff with the mock's message.
        Route::get('users', [UserController::class, 'index']);
        Route::get('users/principal-name', [UserController::class, 'principalName']);
        Route::get('users/{id}', [UserController::class, 'show'])->whereNumber('id');
        Route::post('users', [UserController::class, 'store']);
        Route::put('users/{id}', [UserController::class, 'update'])->whereNumber('id');
        Route::put('users/{id}/active', [UserController::class, 'active'])->whereNumber('id');
        Route::post('users/{id}/reset-password', [UserController::class, 'resetPassword'])->whereNumber('id');

        // Backup (ADR-037, ADR-052): both roles, the same abilities.
        Route::get('backups/status', [BackupController::class, 'status']);
        Route::post('backups/verify-latest', [BackupController::class, 'verifyLatest']);
        Route::post('backups/run', [BackupController::class, 'run'])->middleware('throttle:6,1');
        Route::get('backups/folders', [BackupController::class, 'folders']);
        Route::get('backups/locations', [BackupController::class, 'locations']);
        Route::post('backups/locations', [BackupController::class, 'addLocation']);
        Route::put('backups/locations/{id}/enabled', [BackupController::class, 'enabled'])->whereNumber('id');

        Route::post('issue-reports', [IssueReportController::class, 'store']);
        Route::get('issue-reports', [IssueReportController::class, 'index']);
        Route::get('reference/grade-levels', [ReferenceController::class, 'gradeLevels']);

        // Dashboard and calendar (Module 9): both roles; events are written by both (ADR-042).
        Route::get('dashboard/summary', [DashboardController::class, 'summary']);
        Route::get('dashboard/cluster-alerts', [DashboardController::class, 'clusters']);
        Route::get('calendar/days', [DashboardController::class, 'days']);
        Route::get('calendar/holidays', [DashboardController::class, 'holidays']);
        Route::get('calendar/events', [DashboardController::class, 'events']);
        Route::post('calendar/events', [DashboardController::class, 'storeEvent']);
        Route::put('calendar/events/{id}', [DashboardController::class, 'updateEvent'])->whereNumber('id');
        Route::delete('calendar/events/{id}', [DashboardController::class, 'deleteEvent'])->whereNumber('id');

        // Reports (ADR-074, ADR-077): the Admin views the monthly reports; Sports Reports answer the Admin 403 in the controller (ADR-034).
        Route::get('reports/monthly', [ReportController::class, 'monthly']);
        Route::get('reports/latest-month', [ReportController::class, 'latestMonth']);
        Route::get('sports-reports', [ReportController::class, 'sportsIndex']);
        Route::post('sports-reports', [ReportController::class, 'sportsStore']);
        Route::get('sports-reports/{id}', [ReportController::class, 'sportsShow'])->whereNumber('id');
        Route::put('sports-reports/{id}', [ReportController::class, 'sportsUpdate'])->whereNumber('id');
        Route::get('sports-reports/{id}/content', [ReportController::class, 'sportsContent'])->whereNumber('id');
        Route::post('sports-reports/{id}/duplicate', [ReportController::class, 'sportsDuplicate'])->whereNumber('id');
        Route::put('sports-reports/{id}/archived', [ReportController::class, 'sportsArchived'])->whereNumber('id');

        // Incidents: the Admin reads, and never a staff patient's (ADR-043).
        Route::get('incidents', [IncidentController::class, 'index']);
        Route::get('incidents/approved-ids', [IncidentController::class, 'approvedIds']);
        Route::get('incidents/{id}', [IncidentController::class, 'show'])->whereNumber('id');
        Route::get('incidents/{id}/trail', [IncidentController::class, 'trail'])->whereNumber('id');

        // School years (ADR-075): the Admin reads; the writes answer the Admin with the mock's message.
        Route::get('school-years', [SchoolYearController::class, 'index']);
        Route::get('school-years/reminder', [SchoolYearController::class, 'reminder']);
        Route::put('school-years/settings', [SchoolYearController::class, 'saveSettings']);
        Route::post('school-years/end', [SchoolYearController::class, 'end']);
        Route::post('school-years/start', [SchoolYearController::class, 'start']);

        Route::get('archive/years', [ArchiveController::class, 'years']);
        Route::get('archive/students', [ArchiveController::class, 'students']);
        Route::get('patients/{kind}/{id}', [PersonnelController::class, 'patient'])->whereIn('kind', ['student', 'personnel'])->whereNumber('id');
    });

    Route::middleware('role:staff')->group(function (): void {
        Route::post('audit/prints', [AuditLogController::class, 'print']);

        // Reference data: read only, Staff (grade levels are for both roles, above).
        Route::get('reference/visit-complaint-types', [ReferenceController::class, 'visitComplaintTypes']);
        Route::get('reference/visit-complaint-suggestions', [ReferenceController::class, 'visitComplaintSuggestions']);
        Route::get('reference/incident-complaint-types', [ReferenceController::class, 'incidentComplaintTypes']);
        Route::get('reference/vitals-ranges', [ReferenceController::class, 'vitalsRanges']);
        Route::get('reference/medical-certificate-after-days', [ReferenceController::class, 'medicalCertificateAfterDays']);
        Route::get('reference/unusual-age-years', [ReferenceController::class, 'unusualAgeYears']);
        Route::get('reference/large-write-off-percent', [ReferenceController::class, 'largeWriteOffPercent']);
        Route::get('reference/personnel-types', [ReferenceController::class, 'personnelTypes']);
        Route::get('reference/personnel-departments', [ReferenceController::class, 'personnelDepartments']);

        // Clinic visits, excuse letters, PE referrals and follow-ups (Module 3).
        Route::get('visits', [VisitController::class, 'index']);
        Route::post('visits', [VisitController::class, 'store']);
        Route::get('visits/{id}', [VisitController::class, 'show'])->whereNumber('id');
        Route::put('visits/{id}', [VisitController::class, 'update'])->whereNumber('id');
        Route::post('visits/{id}/entered-in-error', [VisitController::class, 'enteredInError'])->whereNumber('id');
        Route::get('visits/{id}/excuse-letter', [VisitController::class, 'letter'])->whereNumber('id');
        Route::post('visits/{id}/excuse-letter/approve', [VisitController::class, 'approveLetter'])->whereNumber('id');
        Route::post('visits/{id}/excuse-letter/replacement', [VisitController::class, 'replaceLetter'])->whereNumber('id');
        Route::get('excuse-letters/pending', [VisitController::class, 'pendingLetters']);
        Route::get('excuse-letters/{id}', [VisitController::class, 'letterById'])->whereNumber('id');
        Route::get('students/{id}/excuse-letters', [VisitController::class, 'studentLetters'])->whereNumber('id');
        Route::post('pe-referrals', [VisitController::class, 'peReferral']);
        Route::post('incidents', [IncidentController::class, 'store']);
        Route::put('incidents/{id}/stage-two', [IncidentController::class, 'stageTwo'])->whereNumber('id');
        Route::post('incidents/{id}/parent-notifications', [IncidentController::class, 'notify'])->whereNumber('id');
        Route::post('incidents/{id}/approve', [IncidentController::class, 'approve'])->whereNumber('id');
        Route::get('personnel/{id}/history', [IncidentController::class, 'personnelHistory'])->whereNumber('id');
        Route::get('follow-ups', [FollowUpController::class, 'index']);

        // Inventory (Module 8); stock moves only through the actions (ADR-018).
        Route::get('inventory', [InventoryController::class, 'index']);
        Route::post('inventory', [InventoryController::class, 'store']);
        Route::get('inventory/movements', [InventoryController::class, 'movements']);
        Route::get('inventory/{id}', [InventoryController::class, 'show'])->whereNumber('id');
        Route::put('inventory/{id}', [InventoryController::class, 'update'])->whereNumber('id');
        Route::get('inventory/{id}/history', [InventoryController::class, 'history'])->whereNumber('id');
        Route::post('inventory/{id}/dispense', [InventoryController::class, 'dispense'])->whereNumber('id');
        Route::post('inventory/{id}/restock', [InventoryController::class, 'restock'])->whereNumber('id');
        Route::post('inventory/{id}/adjust', [InventoryController::class, 'adjust'])->whereNumber('id');
        Route::put('follow-ups/{id}/status', [FollowUpController::class, 'status'])->whereNumber('id');
        Route::post('follow-ups/{id}/reschedule', [FollowUpController::class, 'reschedule'])->whereNumber('id');

        Route::post('students/search', [StudentController::class, 'search']);
        Route::post('students/check-duplicates', [StudentController::class, 'checkDuplicates']);
        Route::post('students', [StudentController::class, 'store']);
        Route::get('students/incomplete', [StudentController::class, 'incomplete']);
        Route::post('students/import/preview', [StudentController::class, 'importPreview']);
        Route::post('students/import', [StudentController::class, 'import']);
        Route::put('students/{id}', [StudentController::class, 'update'])->whereNumber('id');
        Route::post('students/{id}/archive', [StudentController::class, 'archive'])->whereNumber('id');

        // Staff patients: the Staff role only (ADR-043 item 9).
        Route::get('personnel', [PersonnelController::class, 'index']);
        Route::get('personnel/search', [PersonnelController::class, 'search']);
        Route::get('personnel/incomplete', [PersonnelController::class, 'incomplete']);
        Route::post('personnel/import/preview', [PersonnelController::class, 'importPreview']);
        Route::post('personnel/import', [PersonnelController::class, 'import']);
        Route::post('personnel', [PersonnelController::class, 'store']);
        Route::get('personnel/{id}', [PersonnelController::class, 'show'])->whereNumber('id');
        Route::put('personnel/{id}', [PersonnelController::class, 'update'])->whereNumber('id');
        Route::post('personnel/{id}/archive', [PersonnelController::class, 'archive'])->whereNumber('id');
        Route::post('patients/search', [PersonnelController::class, 'searchPatients']);
        Route::get('archive/staff', [ArchiveController::class, 'staff']);
    });
});
