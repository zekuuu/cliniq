<?php

declare(strict_types=1);

use App\Modules\BackupVerification\BackupVerificationServiceProvider;
use App\Modules\ClinicVisits\ClinicVisitsServiceProvider;
use App\Modules\Dashboard\DashboardServiceProvider;
use App\Modules\EmergencyResponse\EmergencyResponseServiceProvider;
use App\Modules\FirstAidChecklist\FirstAidChecklistServiceProvider;
use App\Modules\InventoryTracker\InventoryTrackerServiceProvider;
use App\Modules\ReportsGeneration\ReportsGenerationServiceProvider;
use App\Modules\StaffPatients\StaffPatientsServiceProvider;
use App\Modules\StudentRecords\StudentRecordsServiceProvider;
use App\Modules\UserManagement\UserManagementServiceProvider;
use App\Providers\AppServiceProvider;
use App\Shared\AuditLog\AuditServiceProvider;
use App\Shared\Database\SharedDatabaseServiceProvider;
use App\Shared\Feedback\FeedbackServiceProvider;
use App\Shared\FollowUps\FollowUpsServiceProvider;
use App\Shared\Sequences\SequencesServiceProvider;
use App\Shared\Settings\SettingsServiceProvider;

return [
    AppServiceProvider::class,
    AuditServiceProvider::class,
    SettingsServiceProvider::class,
    SequencesServiceProvider::class,
    SharedDatabaseServiceProvider::class,
    FollowUpsServiceProvider::class,
    FeedbackServiceProvider::class,
    UserManagementServiceProvider::class,
    StudentRecordsServiceProvider::class,
    StaffPatientsServiceProvider::class,
    FirstAidChecklistServiceProvider::class,
    InventoryTrackerServiceProvider::class,
    ClinicVisitsServiceProvider::class,
    EmergencyResponseServiceProvider::class,
    BackupVerificationServiceProvider::class,
    DashboardServiceProvider::class,
    ReportsGenerationServiceProvider::class,
];
