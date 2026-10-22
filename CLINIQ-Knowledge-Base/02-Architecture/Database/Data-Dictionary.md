# Data Dictionary

**Status: PROPOSED v1, NOT FINAL.** Open decisions in `ERD.md` section 11 can still change tables and columns; do not build migrations from this until the team approves the design. Generated Friday, October 09, 2026 — 02:11 PHT from the reference schema (`Reference-Schema.sql`) after it was loaded into MariaDB 10.11 and passed 107 constraint tests, so the types, keys, indexes and constraints below are exactly what the database accepted. Purposes, mappings and notes are hand-written. If you change the schema, regenerate this file instead of editing it.

How to read it: **Tier** is `Core` (a built screen or the mock already needs it) or `Spec` (the requirements ask for it but the frontend contract does not carry it yet). **Module** is the backend module that owns the table (ADR-009, extended in `ERD.md`). **Frontend** says how the table maps to today's `types/entities.ts`, which is what the API layer must translate. Conventions (keys, times, FK policy) are in `ERD.md` section 2.

## Tables at a glance

| # | Table | Module | Tier | Purpose |
|---|---|---|---|---|
| 1 | [`users`](#users) | UserManagement | Core | Accounts for Staff and Admin/Principal. |
| 2 | [`password_histories`](#password_histories) | UserManagement | Core | The last N password hashes per user, so "no reuse of the last 5" can be checked without storing plaintext. |
| 3 | [`system_settings`](#system_settings) | Shared | Core | Tunable thresholds and policy numbers that the requirements leave open, so changing one is a data change, not a deployment. |
| 4 | [`number_sequences`](#number_sequences) | Shared | Core | Collision-free counters for reference numbers on printed documents. |
| 5 | [`grade_levels`](#grade_levels) | Shared | Core | Ordered list of grade levels. |
| 6 | [`complaint_types`](#complaint_types) | SmartTriage | Core | Predefined complaint labels. |
| 7 | [`triage_steps`](#triage_steps) | SmartTriage | Core | Ordered first-aid checklist steps per complaint type. |
| 8 | [`student_import_batches`](#student_import_batches) | StudentRecords | Core | One row per registrar masterlist import, for traceability and for "which import flagged this record". |
| 9 | [`students`](#students) | StudentRecords | Core | The student record. |
| 10 | [`student_health_entries`](#student_health_entries) | StudentRecords | Core | Allergies, food restrictions, conditions, past illnesses and family history, one row each. |
| 11 | [`emergency_contacts`](#emergency_contacts) | StudentRecords | Core | Guardians to call in an emergency. |
| 12 | [`emergency_contact_verifications`](#emergency_contact_verifications) | StudentRecords | Spec | History of verifying a contact number with the class adviser or Registrar, and of re-flagging it when unreachable in an emergency (Module 2, Parent Contact Validation). |
| 13 | [`student_record_reviews`](#student_record_reviews) | StudentRecords | Core | The Incomplete Records review queue: who flagged a record, from which import, who resolved it. |
| 14 | [`inventory_items`](#inventory_items) | InventoryTracker | Core | Medicines and supplies with a maintained stock count. |
| 15 | [`visits`](#visits) | ClinicVisits | Core | A routine clinic visit. |
| 16 | [`excuse_letters`](#excuse_letters) | ClinicVisits | Core | One excuse letter per visit: a draft while Staff prepare it, then permanent once approved. |
| 17 | [`triage_checks`](#triage_checks) | SmartTriage | Spec | Which checklist items were ticked during a visit ("save checklist completion with the visit record", Module 7). |
| 18 | [`incidents`](#incidents) | EmergencyResponse | Core | An emergency incident, captured in two stages. |
| 19 | [`incident_vital_readings`](#incident_vital_readings) | EmergencyResponse | Core | Timestamped vital-sign readings. |
| 20 | [`hospital_referrals`](#hospital_referrals) | EmergencyResponse | Core | Hospital referral details for an incident (at most one per incident). |
| 21 | [`parent_notification_attempts`](#parent_notification_attempts) | EmergencyResponse | Core | Every attempt to reach a parent/guardian for an incident, timestamped. |
| 22 | [`incident_report_approvals`](#incident_report_approvals) | EmergencyResponse | Core | The nurse's sign-off on an incident report. |
| 23 | [`follow_ups`](#follow_ups) | Shared (FollowUps) | Core | A return-for-monitoring instruction attached to a visit or an incident. |
| 24 | [`pe_referrals`](#pe_referrals) | ClinicVisits | Core | A PE/Sports injury referral logged by Staff, with the nurse's assessment and disposition. |
| 25 | [`treatment_item_lines`](#treatment_item_lines) | InventoryTracker | Core | "Medicines & supplies given": one row per item per visit or incident (ADR-018). |
| 26 | [`inventory_transactions`](#inventory_transactions) | InventoryTracker | Core | Insert-only ledger of every stock movement. |
| 27 | [`reports`](#reports) | ReportsGeneration | Core | A log of which report was requested, for what period, by whom. |
| 28 | [`backup_logs`](#backup_logs) | BackupVerification | Core | One row per backup run, filled by ingesting the status file that the scheduled backup script writes (so a failed run is still recorded when the database itself is the problem). |
| 29 | [`holidays`](#holidays) | Dashboard | Core | Nationwide Philippine holidays, read-only reference data filled by the monthly sync job. |
| 30 | [`holiday_sync_runs`](#holiday_sync_runs) | Dashboard | Core | History of holiday sync attempts. |
| 31 | [`calendar_events`](#calendar_events) | Dashboard | Core | School events that Staff maintain on the Dashboard calendar (ADR-019). |
| 32 | [`issue_reports`](#issue_reports) | Shared (Feedback) | Core | "Report an issue" feedback from any signed-in role. |
| 33 | [`audit_logs`](#audit_logs) | Shared (AuditLog) | Core | Append-only record of who did what and when (RA 10173 accountability). |
| 34 | [`sports_reports`](#sports_reports) | ReportsGeneration | Core | A saved Sports Report for a PE or sports instructor (ADR-034). |
| 35 | [`sports_report_students`](#sports_report_students) | ReportsGeneration | Core | The students on a Sports Report and the clinician's note for each. |

The Sanctum `personal_access_tokens` table is created by Sanctum's own migration and is not redefined here (set `expires_at` to 7 days, ADR-015). Laravel's `migrations` table is also standard.

## users

**Module:** UserManagement  |  **Tier:** Core

Accounts for Staff and Admin/Principal. Never hard-deleted: a leaver is deactivated so history keeps its author.

**Frontend:** `User` (id, name, username, role, lastLogin) + the mock-only `devAccounts` (password, mustChangePassword).

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` **PK** | `bigint unsigned` | no |  |  |
| `name` | `varchar(120)` | no |  |  |
| `username` | `varchar(50)` | no |  | Case-insensitive unique (collation). Login looks up by username, so a duplicate could never sign in. Stays reserved after deactivation. |
| `password_hash` | `varchar(255)` | no |  | bcrypt/argon hash from Laravel `Hash`. Never returned by any API. |
| `role` | `varchar(12)` | no |  | `staff` / `admin`. PE/Sports Instructors have no account (ADR-029). A further value (`canteen`) is an additive CHECK change later. |
| `is_head_nurse` | `tinyint(1)` | no | 0 | OPEN (D-04). Module 7 and Module 10 reserve some actions to the "Head Nurse" within Staff. Only meaningful when role = staff. |
| `must_change_password` | `tinyint(1)` | no | 1 | Forces the Force Password Change screen after login. Default 1 for new accounts. |
| `password_changed_at` | `datetime` | yes | NULL |  |
| `failed_login_count` | `smallint unsigned` | no | 0 | Reset to 0 on success. At `lockout_max_attempts` (5) the account locks. |
| `locked_until` | `datetime` | yes | NULL | Set to now + `lockout_minutes` (30) when the limit is hit. Login refuses while in the future. |
| `last_login_at` | `datetime` | yes | NULL |  |
| `deactivated_at` | `datetime` | yes | NULL | Non-null = cannot log in. Rows are kept forever. |
| `created_at` | `datetime` | no | current_timestamp() |  |
| `updated_at` | `datetime` | no | current_timestamp() |  |

**Indexes:** UNIQUE `uq_users_username` (`username`)

**Checks:**

- `chk_users_head_nurse`: `is_head_nurse = 0 or role = 'staff'`
- `chk_users_name_len`: `char_length(trim(name)) >= 1`
- `chk_users_role`: `role in ('staff','admin')`
- `chk_users_username_len`: `char_length(trim(username)) >= 3`

## password_histories

**Module:** UserManagement  |  **Tier:** Core

The last N password hashes per user, so "no reuse of the last 5" can be checked without storing plaintext.

**Frontend:** Mock keeps this in memory (`passwordHistory`).

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` **PK** | `bigint unsigned` | no |  |  |
| `user_id` | `bigint unsigned` | no |  |  |
| `password_hash` | `varchar(255)` | no |  | Compare with `Hash::check` against each row. Prune to `password_history_count` after each change. |
| `created_at` | `datetime` | no | current_timestamp() |  |

**Indexes:** `idx_password_histories_user` (`user_id`, `created_at`)

**Foreign keys:** `user_id` -> `users`(`id`) ON DELETE CASCADE

## system_settings

**Module:** Shared  |  **Tier:** Core

Tunable thresholds and policy numbers that the requirements leave open, so changing one is a data change, not a deployment.

**Frontend:** `MockDbConfig` in `lib/mock-db/types.ts` (frequentVisitorMinVisits, expiryWarningDays, ...).

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `setting_key` **PK** | `varchar(80)` | no |  | Stable code identifier (snake_case). Add new keys in a migration or seeder; read through one settings service with caching. |
| `setting_value` | `varchar(255)` | no |  |  |
| `value_type` | `varchar(8)` | no |  | How to cast `setting_value`. Validation lives in the settings service. |
| `description` | `varchar(255)` | yes | NULL |  |
| `updated_by_user_id` | `bigint unsigned` | yes | NULL |  |
| `updated_at` | `datetime` | no | current_timestamp() |  |

**Foreign keys:** `updated_by_user_id` -> `users`(`id`) ON DELETE RESTRICT

**Checks:**

- `chk_settings_type`: `value_type in ('int','decimal','string','bool')`

## number_sequences

**Module:** Shared  |  **Tier:** Core

Collision-free counters for reference numbers on printed documents. (Student Numbers no longer exist; students carry the LRN, ADR-028.)

**Frontend:** not in the mock.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `sequence_name` | `varchar(40)` | no |  | e.g. `excuse_letter`, `incident_report`. |
| `scope` | `varchar(10)` | no |  | The year (`2026`). A new year simply creates a new row, which is what resets the sequence. |
| `last_value` | `int unsigned` | no | 0 | Increment atomically: `INSERT ... ON DUPLICATE KEY UPDATE last_value = LAST_INSERT_ID(last_value + 1)`, then read `LAST_INSERT_ID()`. Inside the same transaction as the insert that uses it. Gaps after a rollback are acceptable. |
| `updated_at` | `datetime` | no | current_timestamp() |  |

**Indexes:** PRIMARY KEY (`sequence_name`, `scope`)

## grade_levels

**Module:** Shared  |  **Tier:** Core

Ordered list of grade levels. A table, not free text, so a spelling variant can never split a grade, and promotion can be done by sort order.

**Frontend:** `Student.gradeLevel` (string) and `getGradeLevels()`.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` **PK** | `bigint unsigned` | no |  |  |
| `name` | `varchar(40)` | no |  |  |
| `sort_order` | `smallint` | no |  | Defines promotion order (Kinder = 0 ... Grade 12 = 12). |
| `is_active` | `tinyint(1)` | no | 1 | Hide a retired level from dropdowns without breaking old students. |

**Indexes:** `idx_grade_levels_sort` (`sort_order`); UNIQUE `uq_grade_levels_name` (`name`)

## complaint_types

**Module:** SmartTriage  |  **Tier:** Core

Predefined complaint labels. Suggestions for the free-text complaint field, and the owner of triage checklists.

**Frontend:** `visitComplaintTypes` and `incidentComplaintTypes` (mock `frontendOnly`).

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` **PK** | `bigint unsigned` | no |  |  |
| `label` | `varchar(80)` | no |  | Case-insensitive unique. A visit may still store any text; matching a label is what unlocks its checklist. |
| `used_in_visits` | `tinyint(1)` | no | 1 | Replaces the mock's two separate lists. |
| `used_in_incidents` | `tinyint(1)` | no | 0 | 1 for the incident suggestion list. |
| `is_active` | `tinyint(1)` | no | 1 |  |
| `sort_order` | `smallint` | no | 0 |  |
| `created_at` | `datetime` | no | current_timestamp() |  |
| `updated_at` | `datetime` | no | current_timestamp() |  |

**Indexes:** UNIQUE `uq_complaint_types_label` (`label`)

## triage_steps

**Module:** SmartTriage  |  **Tier:** Core

Ordered first-aid checklist steps per complaint type. Clinical content: edited by the Head Nurse only (Module 7).

**Frontend:** `ComplaintType.triageSteps: string[]`.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` **PK** | `bigint unsigned` | no |  |  |
| `complaint_type_id` | `bigint unsigned` | no |  |  |
| `step_text` | `varchar(255)` | no |  | Clinical protocol text. Needs nurse sign-off before production; the mock's steps are placeholders. |
| `sort_order` | `smallint` | no | 0 |  |
| `is_active` | `tinyint(1)` | no | 1 | Retire a step without deleting history in `triage_checks`. |
| `updated_by_user_id` | `bigint unsigned` | yes | NULL |  |
| `created_at` | `datetime` | no | current_timestamp() |  |
| `updated_at` | `datetime` | no | current_timestamp() |  |

**Indexes:** `idx_triage_steps_type` (`complaint_type_id`, `sort_order`)

**Foreign keys:** `complaint_type_id` -> `complaint_types`(`id`) ON DELETE RESTRICT; `updated_by_user_id` -> `users`(`id`) ON DELETE RESTRICT

## student_import_batches

**Module:** StudentRecords  |  **Tier:** Core

One row per registrar masterlist import, for traceability and for "which import flagged this record".

**Frontend:** `RecordReview.importedAt` / `importedBy` (mock strings such as "Registrar import").

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` **PK** | `bigint unsigned` | no |  |  |
| `label` | `varchar(80)` | no |  |  |
| `school_year` | `varchar(9)` | yes | NULL | Free label such as `2026-2027`. Nullable until the yearly-import rules are decided. |
| `source_file_name` | `varchar(255)` | yes | NULL |  |
| `source_file_sha256` | `char(64)` | yes | NULL | Unique, so the exact same file cannot be applied twice by accident. |
| `rows_total` | `int unsigned` | no | 0 |  |
| `rows_created` | `int unsigned` | no | 0 |  |
| `rows_updated` | `int unsigned` | no | 0 |  |
| `rows_archived` | `int unsigned` | no | 0 |  |
| `rows_flagged` | `int unsigned` | no | 0 |  |
| `status` | `varchar(8)` | no | applied |  |
| `imported_by_user_id` | `bigint unsigned` | no |  |  |
| `imported_at` | `datetime` | no | current_timestamp() |  |
| `notes` | `varchar(500)` | yes | NULL |  |

**Indexes:** UNIQUE `uq_import_batches_file` (`source_file_sha256`)

**Foreign keys:** `imported_by_user_id` -> `users`(`id`) ON DELETE RESTRICT

**Checks:**

- `chk_import_batches_status`: `status in ('applied','failed')`

## students

**Module:** StudentRecords  |  **Tier:** Core

The student record. The LRN identifies the student to people (masked on lists, ADR-028); `id` is internal, never shown, and the only key used in URLs and foreign keys.

**Frontend:** `Student` (id, lrn, fullName, gradeLevel, contactInfo, archived). `allergies`, `medicalConditions`, `emergencyContact` move to child tables; `recordComplete` is derived.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` **PK** | `bigint unsigned` | no |  |  |
| `lrn` | `char(12)` | no |  | Learner Reference Number, entered by Staff: exactly 12 digits, stored as text so leading zeros survive, unique, editable (a correction is audited as "Updated LRN", no values). Never in a URL or an audit entry (ADR-028). |
| `full_name` | `varchar(150)` | no |  | Required and non-blank. Single field for now; splitting into last/first/middle waits for the registrar file format (D-15). Accent- and case-insensitive matching comes from the collation. |
| `grade_level_id` | `bigint unsigned` | yes | NULL | Nullable on purpose: an imported record may lack it and is then flagged "incomplete". Never nullable for a completed record (rule in the app). |
| `sex` | `varchar(6)` | yes | NULL | `female` or `male`, as recorded by the school. Required for a completed record (ADR-031); nullable during an incomplete import. |
| `contact_number` | `varchar(60)` | yes | NULL | Nullable for the same reason. "Student contact information" in the requirements. Required by the service for every grade except Kinder (panel review part 7, D8). |
| `health_reviewed_at` | `datetime` | yes | NULL | OPEN (D-03). Lets "no allergies recorded" mean "asked and none" instead of "never asked". Unused until the team decides. |
| `health_reviewed_by_user_id` | `bigint unsigned` | yes | NULL |  |
| `archived_at` | `datetime` | yes | NULL | Non-null = archived (hidden from default lists). Starts the 5-year retention clock. |
| `archived_by_user_id` | `bigint unsigned` | yes | NULL |  |
| `archive_reason` | `varchar(12)` | yes | NULL | `transferred` / `graduated` / `other`. |
| `archive_note` | `varchar(255)` | yes | NULL |  |
| `import_batch_id` | `bigint unsigned` | yes | NULL | Set when the record was created by a registrar import. |
| `created_by_user_id` | `bigint unsigned` | yes | NULL |  |
| `created_at` | `datetime` | no | current_timestamp() |  |
| `updated_at` | `datetime` | no | current_timestamp() |  |

**Indexes:** `idx_students_archived_at` (`archived_at`); `idx_students_grade_archived` (`grade_level_id`, `archived_at`); `idx_students_name` (`full_name`); UNIQUE `uq_students_lrn` (`lrn`)

**Foreign keys:** `archived_by_user_id` -> `users`(`id`) ON DELETE RESTRICT; `import_batch_id` -> `student_import_batches`(`id`) ON DELETE RESTRICT; `created_by_user_id` -> `users`(`id`) ON DELETE RESTRICT; `grade_level_id` -> `grade_levels`(`id`) ON DELETE RESTRICT; `health_reviewed_by_user_id` -> `users`(`id`) ON DELETE RESTRICT

**Checks:**

- `chk_students_archive_pair`: `archived_at is null and archive_reason is null and archived_by_user_id is null or archived_at is not null`
- `chk_students_archive_reason`: `archive_reason is null or archive_reason in ('transferred','graduated','other')`
- `chk_students_name`: `char_length(trim(full_name)) >= 1`
- `chk_students_lrn`: `lrn regexp '^[0-9]{12}$'`
- `chk_students_sex`: `sex is null or sex in ('female','male')`

## student_health_entries

**Module:** StudentRecords  |  **Tier:** Core

Allergies, food restrictions, conditions, past illnesses and family history, one row each. One table with a `kind`, so adding a kind is a data change.

**Frontend:** `Student.allergies: string[]` (kind `allergy`) and `Student.medicalConditions: string[]` (kind `condition`).

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` **PK** | `bigint unsigned` | no |  |  |
| `student_id` | `bigint unsigned` | no |  |  |
| `kind` | `varchar(16)` | no |  | `food_restriction` is what the deferred Canteen role would read, and nothing else. |
| `label` | `varchar(150)` | no |  | Free text (no ingredient database exists). Unique per student + kind, case-insensitive. |
| `note` | `varchar(500)` | yes | NULL | Optional detail such as a reaction. Not shown on glanceable lists. |
| `created_by_user_id` | `bigint unsigned` | yes | NULL |  |
| `created_at` | `datetime` | no | current_timestamp() |  |
| `updated_at` | `datetime` | no | current_timestamp() |  |

**Indexes:** `idx_health_kind` (`kind`, `label`); UNIQUE `uq_health_entry` (`student_id`, `kind`, `label`)

**Foreign keys:** `student_id` -> `students`(`id`) ON DELETE CASCADE; `created_by_user_id` -> `users`(`id`) ON DELETE RESTRICT

**Checks:**

- `chk_health_kind`: `kind in ('allergy','food_restriction','condition','past_illness','family_history')`

## emergency_contacts

**Module:** StudentRecords  |  **Tier:** Core

Guardians to call in an emergency. The requirements and mock have one; the table allows several with exactly one primary.

**Frontend:** `Student.emergencyContact` (name, relationship, phone, verified): the API returns the primary contact.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` **PK** | `bigint unsigned` | no |  |  |
| `student_id` | `bigint unsigned` | no |  |  |
| `name` | `varchar(120)` | no |  |  |
| `relationship` | `varchar(40)` | yes | NULL |  |
| `phone` | `varchar(30)` | no |  | Required. A contact with no phone counts as incomplete. |
| `is_primary` | `tinyint(1)` | no | 1 | At most one primary per student, enforced by the generated column `primary_student_id` + unique index. |
| `is_verified` | `tinyint(1)` | no | 0 | Denormalized latest state, maintained only by the verification service together with an `emergency_contact_verifications` row. |
| `verified_at` | `datetime` | yes | NULL |  |
| `verified_by_user_id` | `bigint unsigned` | yes | NULL |  |
| `created_at` | `datetime` | no | current_timestamp() |  |
| `updated_at` | `datetime` | no | current_timestamp() |  |
| `primary_student_id` | `bigint unsigned` generated | yes | = if(`is_primary` = 1,`student_id`,NULL) |  |

**Indexes:** `idx_contacts_student` (`student_id`); UNIQUE `uq_contacts_one_primary` (`primary_student_id`)

**Foreign keys:** `student_id` -> `students`(`id`) ON DELETE CASCADE; `verified_by_user_id` -> `users`(`id`) ON DELETE RESTRICT

**Checks:**

- `chk_contacts_verified`: `is_verified = 0 or verified_at is not null`

## emergency_contact_verifications

**Module:** StudentRecords  |  **Tier:** Spec

History of verifying a contact number with the class adviser or Registrar, and of re-flagging it when unreachable in an emergency (Module 2, Parent Contact Validation).

**Frontend:** Not in the mock (it only has `verified: boolean`).

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` **PK** | `bigint unsigned` | no |  |  |
| `contact_id` | `bigint unsigned` | no |  |  |
| `result` | `varchar(10)` | no |  |  |
| `verified_with` | `varchar(100)` | yes | NULL | Free text: who confirmed it (e.g. the adviser's name or "Registrar"). |
| `reason` | `varchar(255)` | yes | NULL |  |
| `incident_id` | `bigint unsigned` | yes | NULL | Set when an unreachable call during an incident caused the re-flag. |
| `recorded_by_user_id` | `bigint unsigned` | no |  |  |
| `recorded_at` | `datetime` | no | current_timestamp() |  |

**Indexes:** `idx_verifications_contact` (`contact_id`, `recorded_at`)

**Foreign keys:** `contact_id` -> `emergency_contacts`(`id`) ON DELETE CASCADE; `incident_id` -> `incidents`(`id`) ON DELETE RESTRICT; `recorded_by_user_id` -> `users`(`id`) ON DELETE RESTRICT

**Checks:**

- `chk_verifications_result`: `result in ('verified','unverified')`

## student_record_reviews

**Module:** StudentRecords  |  **Tier:** Core

The Incomplete Records review queue: who flagged a record, from which import, who resolved it.

**Frontend:** `RecordReview` in `frontendOnly.recordReviews` (the mock uses the string "Flagged in CLINIQ" as a fake importer).

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` **PK** | `bigint unsigned` | no |  |  |
| `student_id` | `bigint unsigned` | no |  |  |
| `source` | `varchar(20)` | no |  | `registrar_import` or `flagged_in_clinic`. |
| `import_batch_id` | `bigint unsigned` | yes | NULL |  |
| `opened_at` | `datetime` | no | current_timestamp() |  |
| `resolved_by_user_id` | `bigint unsigned` | yes | NULL |  |
| `resolved_at` | `datetime` | yes | NULL |  |
| `open_student_id` | `bigint unsigned` generated | yes | = if(`resolved_at` is null,`student_id`,NULL) | Generated; unique, so a student has at most one open review. A resolved review stays as history and a new one can open later. |

**Indexes:** `idx_reviews_student` (`student_id`); UNIQUE `uq_reviews_one_open` (`open_student_id`)

**Foreign keys:** `import_batch_id` -> `student_import_batches`(`id`) ON DELETE RESTRICT; `student_id` -> `students`(`id`) ON DELETE CASCADE; `resolved_by_user_id` -> `users`(`id`) ON DELETE RESTRICT

**Checks:**

- `chk_reviews_resolved`: `resolved_at is null = (resolved_by_user_id is null)`
- `chk_reviews_source`: `source in ('registrar_import','flagged_in_clinic')`

## inventory_items

**Module:** InventoryTracker  |  **Tier:** Core

Medicines and supplies with a maintained stock count. Stock changes only through `inventory_transactions`.

**Frontend:** `InventoryItem`.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` **PK** | `bigint unsigned` | no |  |  |
| `name` | `varchar(120)` | no |  |  |
| `category` | `varchar(10)` | no |  |  |
| `unit` | `varchar(30)` | no |  |  |
| `current_stock` | `int` | no | 0 | Signed: it can go negative because over-stock dispensing warns but never blocks (Module 8). Updated in the same transaction as the ledger row, under a row lock. |
| `low_stock_threshold` | `int unsigned` | no | 0 |  |
| `expiration_date` | `date` | yes | NULL | One date per item (not per batch), changed only by Restock. Null = never expires. |
| `archived_at` | `datetime` | yes | NULL | Soft-archive. Referenced items can never be hard-deleted. |
| `created_at` | `datetime` | no | current_timestamp() |  |
| `updated_at` | `datetime` | no | current_timestamp() |  |
| `active_name` | `varchar(120)` generated | yes | = if(`archived_at` is null,`name`,NULL) | Generated: the name while active, NULL once archived. Unique, so active names can't repeat but an archived name can be reused. |

**Indexes:** `idx_items_category` (`category`, `archived_at`); UNIQUE `uq_items_active_name` (`active_name`)

**Checks:**

- `chk_items_category`: `category in ('medicine','supply')`
- `chk_items_name`: `char_length(trim(name)) >= 1`

## visits

**Module:** ClinicVisits  |  **Tier:** Core

A routine clinic visit. Cannot be deleted or voided anywhere in the product (edit only).

**Frontend:** `Visit`. `treatment` -> `treatment_notes`; `studentId` -> `student_id`; `excuseLetterDraft` -> a row in `excuse_letters`; `itemsGiven` -> `treatment_item_lines`.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` **PK** | `bigint unsigned` | no |  |  |
| `student_id` | `bigint unsigned` | no |  |  |
| `visited_at` | `datetime` | no |  | Philippine time. Editable (back-dated entry is real), but the service rejects a future time. `created_at` still records when it was typed. |
| `complaint` | `varchar(150)` | no |  | Free text, stored in a known suggestion's spelling. Case-insensitive collation also keeps GROUP BY from splitting "Headache" / "headache". |
| `complaint_type_id` | `bigint unsigned` | yes | NULL | Set when the text matches a predefined type (drives the triage checklist). Nullable. |
| `treatment_notes` | `text` | yes | NULL | Optional. Care that isn't stock. |
| `disposition` | `varchar(22)` | no |  | `returned_to_class`, `resting_in_clinic` (panel review part 2, PROVISIONAL), `sent_home`, `referred_to_hospital`. |
| `referred_to` | `varchar(150)` | yes | NULL | Only when disposition = referred_to_hospital (CHECK). |
| `event_tag` | `varchar(80)` | yes | NULL | Free text such as "Intramurals". Deliberately not a managed list. |
| `late_entry` | `tinyint(1)` | no | 0 | PROVISIONAL (panel review part 2). Set when `visited_at` is more than 30 minutes before `created_at`. |
| `late_entry_reason` | `varchar(200)` | yes | NULL | PROVISIONAL. Optional reason for a late entry. |
| `entered_in_error_at` | `datetime` | yes | NULL | PROVISIONAL. Set by "Entered in error"; the row is kept and excluded from lists, counts and reports. |
| `entered_in_error_by_user_id` | `bigint unsigned` | yes | NULL | PROVISIONAL. |
| `entered_in_error_reason` | `varchar(300)` | yes | NULL | PROVISIONAL. Required with `entered_in_error_at`. |
| `escalated_incident_id` | `bigint unsigned` | yes | NULL | PROVISIONAL (ADR-036). The incident this visit was escalated to; the event then counts once, as the incident. |
| `logged_by_user_id` | `bigint unsigned` | no |  |  |
| `updated_by_user_id` | `bigint unsigned` | yes | NULL | Last editor, for the audit summary and conflict messages. |
| `created_at` | `datetime` | no | current_timestamp() |  |
| `updated_at` | `datetime` | no | current_timestamp() |  |

**Indexes:** `idx_visits_event_tag` (`event_tag`); `idx_visits_student_time` (`student_id`, `visited_at`); `idx_visits_time_complaint` (`visited_at`, `complaint`); UNIQUE `uq_visits_id_student` (`id`, `student_id`)

**Foreign keys:** `complaint_type_id` -> `complaint_types`(`id`) ON DELETE RESTRICT; `logged_by_user_id` -> `users`(`id`) ON DELETE RESTRICT; `student_id` -> `students`(`id`) ON DELETE RESTRICT; `updated_by_user_id` -> `users`(`id`) ON DELETE RESTRICT

**Checks:**

- `chk_visits_complaint`: `char_length(trim(complaint)) >= 1`
- `chk_visits_disposition`: `disposition in ('returned_to_class','resting_in_clinic','sent_home','referred_to_hospital')`
- `chk_visits_referred_to`: `referred_to is null or disposition = 'referred_to_hospital'`

## excuse_letters

**Module:** ClinicVisits  |  **Tier:** Core

One excuse letter per visit: a draft while Staff prepare it, then permanent once approved. Replaces the split between `Visit.excuseLetterDraft` and `ExcuseLetterApproval`.

**Frontend:** `ExcuseLetterDraft` + `ExcuseLetterApproval`. The API still presents them separately.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` **PK** | `bigint unsigned` | no |  |  |
| `visit_id` | `bigint unsigned` | no |  |  |
| `status` | `varchar(10)` | no | draft | `draft`, `approved`, `voided` (PROVISIONAL, panel review part 2: the visit was entered in error) or `superseded` (PROVISIONAL, panel review part 3: replaced by a newer letter for the same visit, with a reason). Voided and superseded letters are kept and never valid. One visit can then have several letters, only one of them not superseded. The CHECK ties every approval field to `approved` or `voided`. |
| `excused_from` | `date` | no |  |  |
| `excused_until` | `date` | no |  |  |
| `teacher_note` | `varchar(500)` | yes | NULL | Optional note printed for the teacher. 500-character cap is a proposal. |
| `prepared_by_user_id` | `bigint unsigned` | no |  |  |
| `reference_no` | `varchar(20)` | yes | NULL | Human-facing number for the printed letter (e.g. EL-2026-0001), assigned at approval from `number_sequences`. |
| `approved_by_user_id` | `bigint unsigned` | yes | NULL |  |
| `approved_at` | `datetime` | yes | NULL |  |
| `snapshot_text` | `mediumtext` | yes | NULL | The rendered letter at approval (student name, grade, period, note, approver). Reprints use this, so a later rename or grade change cannot alter a permanent document. |
| `created_at` | `datetime` | no | current_timestamp() |  |
| `updated_at` | `datetime` | no | current_timestamp() |  |

**Indexes:** `idx_letters_status` (`status`); UNIQUE `uq_letters_reference` (`reference_no`); UNIQUE `uq_letters_visit` (`visit_id`)

**Foreign keys:** `approved_by_user_id` -> `users`(`id`) ON DELETE RESTRICT; `prepared_by_user_id` -> `users`(`id`) ON DELETE RESTRICT; `visit_id` -> `visits`(`id`) ON DELETE RESTRICT

**Checks:**

- `chk_letters_approved`: `status = 'draft' and approved_at is null and approved_by_user_id is null and reference_no is null and snapshot_text is null or status = 'approved' and approved_at is not null and approved_by_user_id is not null and reference_no is not null`
- `chk_letters_period`: `excused_until >= excused_from`
- `chk_letters_status`: `status in ('draft','approved')`

## triage_checks

**Module:** SmartTriage  |  **Tier:** Spec

Which checklist items were ticked during a visit ("save checklist completion with the visit record", Module 7).

**Frontend:** Not in the mock: the checklist is shown but its completion isn't stored.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` **PK** | `bigint unsigned` | no |  |  |
| `visit_id` | `bigint unsigned` | no |  |  |
| `triage_step_id` | `bigint unsigned` | yes | NULL | Nullable link back to the live step. |
| `step_text` | `varchar(255)` | no |  | Snapshot of the step wording at the time, so editing the protocol later doesn't rewrite old visits. |
| `is_checked` | `tinyint(1)` | no | 0 |  |
| `sort_order` | `smallint` | no | 0 |  |

**Indexes:** `idx_triage_checks_visit` (`visit_id`, `sort_order`)

**Foreign keys:** `triage_step_id` -> `triage_steps`(`id`) ON DELETE RESTRICT; `visit_id` -> `visits`(`id`) ON DELETE RESTRICT

## incidents

**Module:** EmergencyResponse  |  **Tier:** Core

An emergency incident, captured in two stages. Stage 1 is the fast save; Stage 2 completes the same row.

**Frontend:** `Incident`. `vitals` -> `incident_vital_readings`; `hospitalReferral` -> `hospital_referrals`; `parentNotifications` -> `parent_notification_attempts`; treatmentNotes (inside the mock's `vitals`) -> `treatment_notes`; `bodyPart` -> `body_part`; `noFurtherActionReason` -> `no_further_action_reason` (both PROVISIONAL, panel review part 1).

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` **PK** | `bigint unsigned` | no |  |  |
| `student_id` | `bigint unsigned` | no |  |  |
| `occurred_at` | `datetime` | no |  | When it happened (Philippine time). |
| `complaint` | `varchar(150)` | no |  |  |
| `stage` | `tinyint` | no | 1 | 1 = fast capture, 2 = complete. CHECK: stage 2 requires `completed_at` and `completed_by_user_id`. |
| `treatment_notes` | `text` | yes | NULL | Optional. In the mock this text hides inside the vitals object. |
| `body_part` | `varchar(60)` | yes | NULL | PROVISIONAL (panel review part 1). Optional free text with suggestions, Stage 2 only. |
| `source_visit_id` | `bigint unsigned` | yes | NULL | PROVISIONAL (ADR-036). The visit this incident was escalated from. |
| `no_further_action_reason` | `varchar(200)` | yes | NULL | PROVISIONAL (panel review part 1). Set only when "Nothing further was needed or done" is ticked; completing and approving need it, treatment notes, a treatment item line, a notification attempt or a referral. |
| `event_tag` | `varchar(80)` | yes | NULL |  |
| `created_by_user_id` | `bigint unsigned` | no |  |  |
| `completed_by_user_id` | `bigint unsigned` | yes | NULL |  |
| `completed_at` | `datetime` | yes | NULL |  |
| `created_at` | `datetime` | no | current_timestamp() |  |
| `updated_at` | `datetime` | no | current_timestamp() |  |

**Indexes:** `idx_incidents_stage` (`stage`, `occurred_at`); `idx_incidents_student_time` (`student_id`, `occurred_at`); `idx_incidents_time` (`occurred_at`); UNIQUE `uq_incidents_id_student` (`id`, `student_id`)

**Foreign keys:** `completed_by_user_id` -> `users`(`id`) ON DELETE RESTRICT; `created_by_user_id` -> `users`(`id`) ON DELETE RESTRICT; `student_id` -> `students`(`id`) ON DELETE RESTRICT

**Checks:**

- `chk_incidents_complaint`: `char_length(trim(complaint)) >= 1`
- `chk_incidents_completed`: `stage = 2 = (completed_at is not null and completed_by_user_id is not null)`
- `chk_incidents_stage`: `stage in (1,2)`

## incident_vital_readings

**Module:** EmergencyResponse  |  **Tier:** Core

Timestamped vital-sign readings. Stage 1 records temperature and pulse; Stage 2 adds blood pressure and oxygen; a recheck is just another row.

**Frontend:** `Incident.vitals` (`temperatureC`, `pulseBpm`, `bloodPressure` "110/70", `oxygenSaturation` "98%"). The API merges the latest value of each into the existing object.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` **PK** | `bigint unsigned` | no |  |  |
| `incident_id` | `bigint unsigned` | no |  |  |
| `stage` | `tinyint` | no |  | Which stage the reading came from. |
| `recorded_at` | `datetime` | no |  |  |
| `recorded_by_user_id` | `bigint unsigned` | no |  |  |
| `temperature_c` | `decimal(4,1)` | yes | NULL | Sanity range 25.0-45.0 to catch typos (tunable). |
| `pulse_bpm` | `smallint unsigned` | yes | NULL |  |
| `bp_systolic` | `smallint unsigned` | yes | NULL | Parsed from "110/70" at the API boundary. Both BP values or neither. |
| `bp_diastolic` | `smallint unsigned` | yes | NULL |  |
| `spo2_percent` | `tinyint unsigned` | yes | NULL | Whole percent, 30-100. |
| `note` | `varchar(255)` | yes | NULL |  |

**Indexes:** `idx_vitals_incident` (`incident_id`, `recorded_at`)

**Foreign keys:** `incident_id` -> `incidents`(`id`) ON DELETE RESTRICT; `recorded_by_user_id` -> `users`(`id`) ON DELETE RESTRICT

**Checks:**

- `chk_vitals_bp`: `bp_systolic is null or bp_systolic between 40 and 300 and bp_diastolic between 20 and 200 and bp_systolic > bp_diastolic`
- `chk_vitals_bp_pair`: `bp_systolic is null = (bp_diastolic is null)`
- `chk_vitals_pulse`: `pulse_bpm is null or pulse_bpm between 20 and 300`
- `chk_vitals_spo2`: `spo2_percent is null or spo2_percent between 30 and 100`
- `chk_vitals_stage`: `stage in (1,2)`
- `chk_vitals_temp`: `temperature_c is null or temperature_c between 25.0 and 45.0`

## hospital_referrals

**Module:** EmergencyResponse  |  **Tier:** Core

Hospital referral details for an incident (at most one per incident).

**Frontend:** `HospitalReferral` (destination, transportMode, departureTime).

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` **PK** | `bigint unsigned` | no |  |  |
| `incident_id` | `bigint unsigned` | no |  |  |
| `destination` | `varchar(150)` | no |  |  |
| `transport_mode` | `varchar(80)` | no |  | Free text (the form allows anything; "Not recorded" is the form default). |
| `departed_at` | `datetime` | no |  | Required by the current shape. A referral status column is OPEN (D-05). |
| `created_by_user_id` | `bigint unsigned` | no |  |  |
| `created_at` | `datetime` | no | current_timestamp() |  |
| `updated_at` | `datetime` | no | current_timestamp() |  |

**Indexes:** UNIQUE `uq_referrals_incident` (`incident_id`)

**Foreign keys:** `incident_id` -> `incidents`(`id`) ON DELETE RESTRICT; `created_by_user_id` -> `users`(`id`) ON DELETE RESTRICT

## parent_notification_attempts

**Module:** EmergencyResponse  |  **Tier:** Core

Every attempt to reach a parent/guardian for an incident, timestamped.

**Frontend:** `ParentNotificationAttempt` (outcome, timestamp, calledContact). The mock keeps `calledContact` as a snapshot (name, relationship, phone, source `emergency_contact` or `other`) because it has no contact ids; here it maps to `contact_id` plus `phone_dialed`, and an "Other" person needs a name column (PROVISIONAL, not yet in this table).

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` **PK** | `bigint unsigned` | no |  |  |
| `incident_id` | `bigint unsigned` | no |  |  |
| `contact_id` | `bigint unsigned` | yes | NULL | Which guardian was called (nullable). |
| `phone_dialed` | `varchar(30)` | yes | NULL | Snapshot of the number, in case the contact is edited later. |
| `outcome` | `varchar(30)` | no |  | `reached` / `no_answer` / `left_message_or_voicemail` / `wrong_number` (D6, panel review part 1). |
| `attempted_at` | `datetime` | no |  |  |
| `logged_by_user_id` | `bigint unsigned` | no |  |  |
| `note` | `varchar(255)` | yes | NULL |  |
| `created_at` | `datetime` | no | current_timestamp() |  |

**Indexes:** `idx_notifications_incident` (`incident_id`, `attempted_at`)

**Foreign keys:** `contact_id` -> `emergency_contacts`(`id`) ON DELETE RESTRICT; `incident_id` -> `incidents`(`id`) ON DELETE RESTRICT; `logged_by_user_id` -> `users`(`id`) ON DELETE RESTRICT

**Checks:**

- `chk_notifications_outcome`: `outcome in ('reached','no_answer','left_message_or_voicemail','wrong_number')`

## incident_report_approvals

**Module:** EmergencyResponse  |  **Tier:** Core

The nurse's sign-off on an incident report. Stored as a real record because the audit trail has a shorter retention and must not be the only proof of an approval.

**Frontend:** Mock derives approval from an `approve` audit entry (`listApprovedIncidentReportIds`).

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` **PK** | `bigint unsigned` | no |  |  |
| `incident_id` | `bigint unsigned` | no |  |  |
| `reference_no` | `varchar(20)` | no |  | Printed report number (e.g. IR-2026-0001). |
| `approved_by_user_id` | `bigint unsigned` | no |  |  |
| `approved_at` | `datetime` | no |  |  |
| `snapshot_text` | `mediumtext` | yes | NULL | Frozen report content at sign-off (D-08). |
| `created_at` | `datetime` | no | current_timestamp() |  |

**Indexes:** UNIQUE `uq_report_approvals_incident` (`incident_id`); UNIQUE `uq_report_approvals_reference` (`reference_no`)

**Foreign keys:** `incident_id` -> `incidents`(`id`) ON DELETE RESTRICT; `approved_by_user_id` -> `users`(`id`) ON DELETE RESTRICT

## follow_ups

**Module:** Shared (FollowUps)  |  **Tier:** Core

A return-for-monitoring instruction attached to a visit or an incident. One feature with two entry points.

**Frontend:** `FollowUp` (`relatedRecord: {type, id}` -> exactly one of `visit_id` / `incident_id`).

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` **PK** | `bigint unsigned` | no |  |  |
| `student_id` | `bigint unsigned` | no |  |  |
| `visit_id` | `bigint unsigned` | yes | NULL | Composite FK (visit_id, student_id): the DB itself refuses a follow-up whose visit belongs to another student. |
| `incident_id` | `bigint unsigned` | yes | NULL |  |
| `follow_up_date` | `date` | no |  |  |
| `reason` | `varchar(255)` | no |  |  |
| `notes` | `text` | yes | NULL |  |
| `status` | `varchar(10)` | no | pending | `pending` -> `completed` / `missed` / `cancelled`. "Overdue" and "due today" are derived from date + status, never stored. |
| `status_updated_at` | `datetime` | yes | NULL | When the status last changed, and by whom. |
| `status_updated_by_user_id` | `bigint unsigned` | yes | NULL |  |
| `status_reason` | `varchar(300)` | yes | NULL | PROVISIONAL (panel review part 3). Required when the status becomes `missed` or `cancelled`. |
| `created_by_user_id` | `bigint unsigned` | no |  |  |
| `created_at` | `datetime` | no | current_timestamp() |  |
| `updated_at` | `datetime` | no | current_timestamp() |  |

**Indexes:** `idx_followups_incident` (`incident_id`); `idx_followups_status_date` (`status`, `follow_up_date`); `idx_followups_student` (`student_id`, `follow_up_date`); `idx_followups_visit` (`visit_id`)

**Foreign keys:** `created_by_user_id` -> `users`(`id`) ON DELETE RESTRICT; `incident_id`, `student_id` -> `incidents`(`id`, `student_id`) ON DELETE RESTRICT; `status_updated_by_user_id` -> `users`(`id`) ON DELETE RESTRICT; `student_id` -> `students`(`id`) ON DELETE RESTRICT; `visit_id`, `student_id` -> `visits`(`id`, `student_id`) ON DELETE RESTRICT

**Checks:**

- `chk_followups_one_source`: `(visit_id is not null) + (incident_id is not null) = 1`
- `chk_followups_status`: `status in ('pending','completed','missed','cancelled')`

## pe_referrals

**Module:** ClinicVisits  |  **Tier:** Core

A PE/Sports injury referral logged by Staff, with the nurse's assessment and disposition.

**Frontend:** `PeReferral` (`frontendOnly.peReferrals`).

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` **PK** | `bigint unsigned` | no |  |  |
| `student_id` | `bigint unsigned` | no |  |  |
| `referred_by` | `varchar(120)` | no |  | The PE/Sports Instructor's name as Staff typed it; instructors have no account (ADR-029). |
| `logged_by_user_id` | `bigint unsigned` | no |  | The Staff account that recorded the referral. |
| `activity` | `varchar(150)` | no |  |  |
| `injury_summary` | `varchar(500)` | no |  |  |
| `clinical_assessment` | `varchar(500)` | no |  |  |
| `treatment` | `varchar(500)` | no |  |  |
| `disposition` | `varchar(22)` | no |  |  |
| `visit_id` | `bigint unsigned` | yes | NULL | Optional link when the referral produced a visit (D-18). |
| `incident_id` | `bigint unsigned` | yes | NULL | Optional link when it escalated to an incident (D-18). |
| `created_at` | `datetime` | no | current_timestamp() |  |

**Indexes:** `idx_pe_referrals_student` (`student_id`, `created_at`)

**Foreign keys:** `incident_id`, `student_id` -> `incidents`(`id`, `student_id`) ON DELETE RESTRICT; `student_id` -> `students`(`id`) ON DELETE RESTRICT; `logged_by_user_id` -> `users`(`id`) ON DELETE RESTRICT; `visit_id`, `student_id` -> `visits`(`id`, `student_id`) ON DELETE RESTRICT

**Checks:**

- `chk_pe_disposition`: `disposition in ('returned_to_class','sent_home','referred_to_hospital')`

## treatment_item_lines

**Module:** InventoryTracker  |  **Tier:** Core

"Medicines & supplies given": one row per item per visit or incident (ADR-018). Each line is backed by ledger rows.

**Frontend:** `ItemGivenLine` (`Visit.itemsGiven`, `Incident.itemsGiven`).

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` **PK** | `bigint unsigned` | no |  |  |
| `visit_id` | `bigint unsigned` | yes | NULL | Exactly one of visit_id / incident_id is set (CHECK). |
| `incident_id` | `bigint unsigned` | yes | NULL |  |
| `item_id` | `bigint unsigned` | no |  |  |
| `item_name_snapshot` | `varchar(120)` | no |  | Name when the line was first added; renaming the item later does not change history. |
| `unit_snapshot` | `varchar(30)` | no |  |  |
| `quantity` | `int unsigned` | no |  | Whole number, at least 1. Invariant checked nightly: quantity = SUM(dispense) - SUM(visit_edited returns) in the ledger. |
| `instructions` | `varchar(120)` | yes | NULL | Max 120 characters (ADR-018). |
| `sort_order` | `smallint` | no | 0 |  |
| `created_at` | `datetime` | no | current_timestamp() |  |
| `updated_at` | `datetime` | no | current_timestamp() |  |

**Indexes:** `idx_lines_item` (`item_id`); UNIQUE `uq_lines_incident_item` (`incident_id`, `item_id`); UNIQUE `uq_lines_visit_item` (`visit_id`, `item_id`)

**Foreign keys:** `incident_id` -> `incidents`(`id`) ON DELETE RESTRICT; `item_id` -> `inventory_items`(`id`) ON DELETE RESTRICT; `visit_id` -> `visits`(`id`) ON DELETE RESTRICT

**Checks:**

- `chk_lines_one_source`: `(visit_id is not null) + (incident_id is not null) = 1`
- `chk_lines_quantity`: `quantity >= 1`

## inventory_transactions

**Module:** InventoryTracker  |  **Tier:** Core

Insert-only ledger of every stock movement. History is never rewritten: a correction is a new `adjustment` row.

**Frontend:** `InventoryTransaction`. Mock stores positive quantities for dispense/restock; here `quantity_delta` is always signed.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` **PK** | `bigint unsigned` | no |  |  |
| `item_id` | `bigint unsigned` | no |  |  |
| `type` | `varchar(10)` | no |  | `opening` (initial stock, new), `dispense`, `restock`, `adjustment`. |
| `quantity_delta` | `int` | no |  | Signed. dispense < 0, restock > 0, opening >= 0, adjustment <> 0 (CHECK). |
| `stock_after` | `int` | no |  | Running balance after this row. Lets a reconciliation job prove `current_stock` matches the ledger. |
| `expiration_date_after` | `date` | yes | NULL | Set by Restock: the expiry confirmed at that moment. |
| `occurred_at` | `datetime` | no |  |  |
| `user_id` | `bigint unsigned` | no |  |  |
| `student_id` | `bigint unsigned` | yes | NULL | Null = "Not for a student (general use)". Never shown by name (display-privacy). |
| `visit_id` | `bigint unsigned` | yes | NULL | Composite FK with student_id, so the visit must be that student's. |
| `incident_id` | `bigint unsigned` | yes | NULL |  |
| `reason` | `varchar(20)` | yes | NULL | Adjustments only (CHECK). `visit_edited` is written only by a visit edit and needs a visit. |
| `note` | `varchar(255)` | yes | NULL | Required when reason = other. |
| `created_at` | `datetime` | no | current_timestamp() |  |

**Indexes:** `idx_txn_incident` (`incident_id`); `idx_txn_item_time` (`item_id`, `occurred_at`); `idx_txn_student_time` (`student_id`, `occurred_at`); `idx_txn_visit` (`visit_id`)

**Foreign keys:** `incident_id`, `student_id` -> `incidents`(`id`, `student_id`) ON DELETE RESTRICT; `item_id` -> `inventory_items`(`id`) ON DELETE RESTRICT; `student_id` -> `students`(`id`) ON DELETE RESTRICT; `user_id` -> `users`(`id`) ON DELETE RESTRICT; `visit_id`, `student_id` -> `visits`(`id`, `student_id`) ON DELETE RESTRICT

**Checks:**

- `chk_txn_link_has_student`: `visit_id is null and incident_id is null or student_id is not null`
- `chk_txn_one_link`: `visit_id is null or incident_id is null`
- `chk_txn_other_note`: `reason <> 'other' or note is not null and char_length(trim(note)) > 0`
- `chk_txn_reason`: `type = 'adjustment' and reason is not null and reason in ('visit_edited','expired_disposed','damaged_spilled','miscount_correction','other') or type <> 'adjustment' and reason is null`
- `chk_txn_sign`: `type = 'opening' and quantity_delta >= 0 or type = 'dispense' and quantity_delta < 0 or type = 'restock' and quantity_delta > 0 or type = 'adjustment' and quantity_delta <> 0`
- `chk_txn_type`: `type in ('opening','dispense','restock','adjustment')`
- `chk_txn_visit_edit`: `reason is null or reason <> 'visit_edited' or visit_id is not null`

## reports

**Module:** ReportsGeneration  |  **Tier:** Core

A log of which report was requested, for what period, by whom. The report content is generated on demand from live records, not stored.

**Frontend:** `Report` (type, dateRange); `data` is computed on read.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` **PK** | `bigint unsigned` | no |  |  |
| `type` | `varchar(14)` | no |  | `monthly` / `incident` / `health_summary`. |
| `period_from` | `date` | no |  | Inclusive. |
| `period_to` | `date` | no |  |  |
| `generated_by_user_id` | `bigint unsigned` | no |  |  |
| `generated_at` | `datetime` | no | current_timestamp() |  |

**Indexes:** `idx_reports_generated` (`generated_at`)

**Foreign keys:** `generated_by_user_id` -> `users`(`id`) ON DELETE RESTRICT

**Checks:**

- `chk_reports_period`: `period_to >= period_from`
- `chk_reports_type`: `type in ('monthly','incident','health_summary')`

## sports_reports

**Module:** ReportsGeneration  |  **Tier:** Core

A saved Sports Report (ADR-034): a list of students the clinician prints for a PE or sports instructor. Holds the list's details only; the visits and incidents are read when it is printed. Hand-written Wednesday, October 21, 2026 — 07:19 from `Reference-Schema.sql`; not yet loaded into MariaDB, so regenerate this section when the schema is next tested.

**Frontend:** `SportsReport` (title, activity, requestedBy, window, includeConditions, archived).

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` **PK** | `bigint unsigned` | no |  |  |
| `title` | `varchar(120)` | no |  | 1-120 characters. |
| `activity` | `varchar(120)` | yes | NULL | For example "Palaro 2026, Boys Basketball". |
| `requested_by` | `varchar(120)` | no |  | The instructor's name as typed; instructors have no account (ADR-029). |
| `look_back` | `varchar(11)` | no | '90_days' | `30_days` / `60_days` / `90_days` / `school_year` (June 15 onward). |
| `include_conditions` | `tinyint(1)` | no | 0 | Print recorded conditions and allergies. Off by default. |
| `archived_at` | `datetime` | yes | NULL | Archived reports are hidden from the list by default; never deleted. |
| `created_by_user_id` | `bigint unsigned` | no |  |  |
| `created_at` | `datetime` | no | current_timestamp() |  |
| `updated_at` | `datetime` | no | current_timestamp() |  |

**Indexes:** `idx_sports_reports_updated` (`updated_at`)

**Foreign keys:** `created_by_user_id` -> `users`(`id`) ON DELETE RESTRICT

**Checks:**

- `chk_sports_reports_title`: `char_length(trim(title)) >= 1`
- `chk_sports_reports_requested_by`: `char_length(trim(requested_by)) >= 1`
- `chk_sports_reports_look_back`: `look_back in ('30_days','60_days','90_days','school_year')`

## sports_report_students

**Module:** ReportsGeneration  |  **Tier:** Core

The students on a Sports Report and the clinician's optional note for each. Hand-written Wednesday, October 21, 2026 — 07:19; not yet loaded into MariaDB.

**Frontend:** `SportsReport.students` (studentId, note).

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` **PK** | `bigint unsigned` | no |  |  |
| `sports_report_id` | `bigint unsigned` | no |  |  |
| `student_id` | `bigint unsigned` | no |  | An archived student stays on the list and is left out of the printout. |
| `note` | `varchar(500)` | yes | NULL | Printed beside the student. Never a system-made "fit to play". |

**Indexes:** `uq_sports_report_student` UNIQUE (`sports_report_id`, `student_id`), `idx_sports_report_students_student` (`student_id`)

**Foreign keys:** `sports_report_id` -> `sports_reports`(`id`) ON DELETE CASCADE; `student_id` -> `students`(`id`) ON DELETE RESTRICT

## backup_logs

**Module:** BackupVerification  |  **Tier:** Core

One row per backup run, filled by ingesting the status file that the scheduled backup script writes (so a failed run is still recorded when the database itself is the problem).

**Frontend:** `BackupLog` (lastRun, fileSizeBytes, status, verifiedByUserId).

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` **PK** | `bigint unsigned` | no |  |  |
| `run_key` | `varchar(100)` | no |  | Unique id from the backup script, so ingesting the same status file twice is harmless. |
| `ran_at` | `datetime` | no |  |  |
| `file_name` | `varchar(255)` | yes | NULL |  |
| `file_size_bytes` | `bigint unsigned` | yes | NULL |  |
| `sha256` | `char(64)` | yes | NULL | Checksum of the dump, for the restore check. |
| `status` | `varchar(6)` | no |  |  |
| `error_message` | `varchar(500)` | yes | NULL |  |
| `verified_by_user_id` | `bigint unsigned` | yes | NULL |  |
| `verified_at` | `datetime` | yes | NULL | Nurse confirmation time. A failed run cannot be verified (CHECK). |
| `created_at` | `datetime` | no | current_timestamp() |  |

**Indexes:** `idx_backup_ran_at` (`ran_at`); UNIQUE `uq_backup_run_key` (`run_key`)

**Foreign keys:** `verified_by_user_id` -> `users`(`id`) ON DELETE RESTRICT

**Checks:**

- `chk_backup_status`: `status in ('ok','failed')`
- `chk_backup_verified`: `verified_at is null = (verified_by_user_id is null)`
- `chk_backup_verify_ok`: `verified_at is null or status = 'ok'`

## holidays

**Module:** Dashboard  |  **Tier:** Core

Nationwide Philippine holidays, read-only reference data filled by the monthly sync job.

**Frontend:** `Holiday` (date, name, kind, confirmed) in `holidays-ph.json`.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` **PK** | `bigint unsigned` | no |  |  |
| `holiday_date` | `date` | no |  |  |
| `name` | `varchar(120)` | no |  |  |
| `kind` | `varchar(20)` | no |  | `regular` / `special-non-working` / `special-working` / `islamic` (same spelling as the frontend). |
| `is_confirmed` | `tinyint(1)` | no | 1 | 0 = estimated date (mostly Islamic holidays awaiting proclamation). When the confirmed date arrives, the sync must delete the unconfirmed row for that name and year, not just upsert, because the unique key includes the date. |
| `proclamation_ref` | `varchar(120)` | yes | NULL |  |
| `source` | `varchar(60)` | no |  |  |
| `synced_at` | `datetime` | no | current_timestamp() |  |

**Indexes:** UNIQUE `uq_holidays_date_name` (`holiday_date`, `name`)

**Checks:**

- `chk_holidays_kind`: `kind in ('regular','special-non-working','special-working','islamic')`

## holiday_sync_runs

**Module:** Dashboard  |  **Tier:** Core

History of holiday sync attempts. "Holidays updated <date>" and the stale warning (about 45 days) read the latest successful run.

**Frontend:** `HolidayFeed.lastUpdated` / `source`.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` **PK** | `bigint unsigned` | no |  |  |
| `ran_at` | `datetime` | no | current_timestamp() |  |
| `source` | `varchar(60)` | no |  |  |
| `years_requested` | `varchar(20)` | no |  |  |
| `status` | `varchar(6)` | no |  | On failure the previous holidays stay untouched (last good data is kept). |
| `records_upserted` | `int unsigned` | no | 0 |  |
| `error_message` | `varchar(500)` | yes | NULL |  |

**Indexes:** `idx_holiday_sync_ran` (`ran_at`)

**Checks:**

- `chk_holiday_sync_status`: `status in ('ok','failed')`

## calendar_events

**Module:** Dashboard  |  **Tier:** Core

School events that Staff maintain on the Dashboard calendar (ADR-019).

**Frontend:** `CalendarEvent`.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` **PK** | `bigint unsigned` | no |  |  |
| `title` | `varchar(60)` | no |  | 1-60 characters. |
| `start_date` | `date` | no |  |  |
| `end_date` | `date` | yes | NULL | Null for a one-day event. An end date equal to the start is stored as null (CHECK end > start). |
| `created_by_user_id` | `bigint unsigned` | no |  |  |
| `created_at` | `datetime` | no | current_timestamp() |  |
| `updated_at` | `datetime` | no | current_timestamp() |  |
| `last_date` | `date` generated | yes | = coalesce(`end_date`,`start_date`) | Generated: end_date or start_date. Makes "events overlapping this range" a plain index range scan. |

**Indexes:** `idx_events_range` (`start_date`, `last_date`)

**Foreign keys:** `created_by_user_id` -> `users`(`id`) ON DELETE RESTRICT

**Checks:**

- `chk_events_end`: `end_date is null or end_date > start_date`
- `chk_events_title`: `char_length(trim(title)) >= 1`

## issue_reports

**Module:** Shared (Feedback)  |  **Tier:** Core

"Report an issue" feedback from any signed-in role.

**Frontend:** `IssueReport`.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` **PK** | `bigint unsigned` | no |  |  |
| `description` | `text` | no |  |  |
| `route` | `varchar(255)` | no |  | The page path the person was on. |
| `page_name` | `varchar(120)` | no |  |  |
| `reporter_role` | `varchar(12)` | no |  | Snapshot of the role at the time. |
| `reported_by_user_id` | `bigint unsigned` | no |  |  |
| `created_at` | `datetime` | no | current_timestamp() |  |

**Indexes:** `idx_issue_reports_created` (`created_at`)

**Foreign keys:** `reported_by_user_id` -> `users`(`id`) ON DELETE RESTRICT

**Checks:**

- `chk_issue_reports_role`: `reporter_role in ('staff','admin')`

## audit_logs

**Module:** Shared (AuditLog)  |  **Tier:** Core

Append-only record of who did what and when (RA 10173 accountability). **Kept 10 years** (ADR-037; provisional until the school confirms). Written for every login, logout, submit, approve, create, update, delete and archive; reading the log is not logged (ADR-016).

**Frontend:** `AuditLogEntry` (+ `summary`, ADR-017).

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` **PK** | `bigint unsigned` | no |  |  |
| `occurred_at` | `datetime` | no |  |  |
| `actor_user_id` | `bigint unsigned` | yes | NULL | Null for system actions (backup ingest, holiday sync, retention purge). |
| `actor_role` | `varchar(12)` | yes | NULL | Snapshot of the actor's role when the action happened. Proposed amendment to ADR-017, which derives it at read time and would show the wrong role after a role change (D-01). |
| `action_type` | `varchar(8)` | no |  |  |
| `target_type` | `varchar(40)` | yes | NULL | Controlled vocabulary kept in code (e.g. `student`, `visit`, `incident`, `excuse_letter`, `inventory_item`, `inventory_transaction`, `calendar_event`, `backup_log`). Not a CHECK, so adding a target needs no ALTER on the biggest table. |
| `target_id` | `bigint unsigned` | yes | NULL | Id of the target row. NO foreign key on purpose: the log must outlive purged records. |
| `subject_student_id` | `bigint unsigned` | yes | NULL | Snapshot of the student the action concerned, by internal id: no FK, so it survives a purge. Never the LRN (ADR-028); the viewer shows the masked LRN while the student exists. |
| `summary` | `varchar(255)` | yes | NULL | Field names or states only, never values (ADR-017). Max 255. |
| `client_ip` | `varbinary(16)` | yes | NULL | Optional. IPv4/IPv6 as 4 or 16 bytes; useful to tell the workstation from a phone. |

**Indexes:** `idx_audit_action_time` (`action_type`, `occurred_at`); `idx_audit_actor_time` (`actor_user_id`, `occurred_at`); `idx_audit_subject` (`subject_student_id`, `occurred_at`); `idx_audit_target` (`target_type`, `target_id`); `idx_audit_target_time` (`target_type`, `occurred_at`); `idx_audit_time` (`occurred_at`)

**Foreign keys:** `actor_user_id` -> `users`(`id`) ON DELETE RESTRICT

**Checks:**

- `chk_audit_action`: `action_type in ('login','logout','submit','approve','create','update','delete','archive')`
- `chk_audit_actor`: `actor_user_id is not null or actor_role is null`
- `chk_audit_role`: `actor_role is null or actor_role in ('staff','admin')`
