# Data Dictionary

**Status: Approved by Zean, Sunday, November 1, 2026 — 01:39 PHT (ADR-057); changes after this go through a new decision.** Generated Friday, October 09, 2026 — 02:11 PHT from the reference schema (`Reference-Schema.sql`). Purposes, mappings and notes are hand-written. If you change the schema, change this file with it.

**Updated Sunday, November 08, 2026 — 18:35 PHT, following ADR-078:** the idle sign-out settings of `system_settings` (see that table). No new table or column.

**Updated Saturday, November 07, 2026 — 16:12 PHT, following this approved ERD through [ADR-076](../../06-Decisions/ADR-076-Staff-Record-Reviews-In-Their-Own-Table.md):** new table 48, `staff_record_reviews`, for the staff Incomplete Records queue (ADR-067). Settles counter-check C-1.

**Updated Saturday, November 07, 2026 — 13:24 PHT, following this approved ERD through [ADR-071](../../06-Decisions/ADR-071-Suggested-Medicines-From-Item-Tags.md), [ADR-072](../../06-Decisions/ADR-072-Archive-By-School-Year.md), [ADR-073](../../06-Decisions/ADR-073-Password-Recovery-With-An-Authenticator-App.md) and [ADR-075](../../06-Decisions/ADR-075-School-Year-Started-By-Hand.md), with their dated amendments:** tables 45 to 47 (`inventory_item_symptom_tags`, `school_years`, `recovery_codes`); authenticator columns on `users` and `users.email` removed; archive details on `students` and `personnel`; school-year settings. Compared with `Reference-Schema.sql` and its 247 constraint tests.

**Labels versus data (ADR-070):** screens say "Symptom(s)" and "Released to"; the data keeps `complaint`, the extra complaints (`visit_extra_complaints`) and `collected_by_name`, `collected_by_relationship`, `collected_by_time`. No column is renamed. When the relationship is "Other", the frontend sends who it was as the relationship text (for example "Neighbour"), never the word "Other".

**Updated Thursday, November 05, 2026 — 01:33 PHT:** `students` and `personnel` store `first_name`, `last_name` and an optional `middle_name` instead of `full_name` ([ADR-064](../../06-Decisions/ADR-064-Names-Stored-As-First-Last-And-Middle-Name.md), which follows this approved ERD and settles D-15); compared with `Reference-Schema.sql` and its constraint tests.

**Updated Sunday, November 1, 2026 — 01:55 PHT with the answers of ADR-057 and the gaps of `ERD-Review.md`.** Written by hand and compared with `Reference-Schema.sql`, which loads on MariaDB 10.11 and passes `Checks/constraint-tests.sql`.

How to read it: **Tier** is `Core` (a built screen or the mock already needs it) or `Spec` (the requirements ask for it but the frontend contract does not carry it yet). **Module** is the backend module that owns the table (ADR-009, extended in `ERD.md`). **Frontend** says how the table maps to today's `types/entities.ts`, which is what the API layer must translate. Conventions (keys, times, FK policy) are in `ERD.md` section 2.

## Tables at a glance

| # | Table | Module | Tier | Purpose |
|---|---|---|---|---|
| 1 | [`users`](#users) | UserManagement | Core | Accounts for Staff and Admin/Principal. |
| 2 | [`password_histories`](#password_histories) | UserManagement | Core | The last N password hashes per user, so "no reuse of the last 5" can be checked without storing plaintext. |
| 3 | [`system_settings`](#system_settings) | Shared | Core | Tunable thresholds and policy numbers that the requirements leave open, so changing one is a data change, not a deployment. |
| 4 | [`number_sequences`](#number_sequences) | Shared | Core | Collision-free counters for reference numbers on printed documents. |
| 5 | [`grade_levels`](#grade_levels) | Shared | Core | Ordered list of grade levels. |
| 6 | [`complaint_types`](#complaint_types) | FirstAidChecklist | Core | Predefined complaint labels. |
| 7 | [`triage_steps`](#triage_steps) | FirstAidChecklist | Core | Ordered first-aid checklist steps per complaint type. |
| 8 | [`student_import_batches`](#student_import_batches) | StudentRecords | Core | One row per registrar masterlist import, for traceability and for "which import flagged this record". |
| 9 | [`students`](#students) | StudentRecords | Core | The student record. |
| 10 | [`student_health_entries`](#student_health_entries) | StudentRecords | Core | Allergies, food restrictions, conditions, past illnesses and family history, one row each. |
| 11 | [`emergency_contacts`](#emergency_contacts) | StudentRecords | Core | Guardians to call in an emergency. |
| 12 | [`emergency_contact_verifications`](#emergency_contact_verifications) | StudentRecords | Spec | History of verifying a contact number with the class adviser or Registrar, and of re-flagging it when unreachable in an emergency (Module 2, Parent Contact Validation). |
| 13 | [`student_record_reviews`](#student_record_reviews) | StudentRecords | Core | The Incomplete Records review queue: who flagged a record, from which import, who resolved it. |
| 14 | [`inventory_items`](#inventory_items) | InventoryTracker | Core | Medicines and supplies with a maintained stock count. |
| 15 | [`visits`](#visits) | ClinicVisits | Core | A routine clinic visit. |
| 16 | [`excuse_letters`](#excuse_letters) | ClinicVisits | Core | One excuse letter per visit: a draft while Staff prepare it, then permanent once approved. |
| 17 | [`triage_checks`](#triage_checks) | FirstAidChecklist | Spec | Which checklist items were ticked during a visit ("save checklist completion with the visit record", Module 7). |
| 18 | [`incidents`](#incidents) | EmergencyResponse | Core | An emergency incident, captured in two stages. |
| 19 | [`incident_vital_readings`](#incident_vital_readings) | EmergencyResponse | Core | Timestamped vital-sign readings. |
| 20 | [`hospital_referrals`](#hospital_referrals) | EmergencyResponse | Core | Hospital referral details for an incident (at most one per incident). |
| 21 | [`parent_notification_attempts`](#parent_notification_attempts) | EmergencyResponse | Core | Every attempt to reach a parent/guardian for an incident, timestamped. |
| 22 | [`incident_report_approvals`](#incident_report_approvals) | EmergencyResponse | Core | The nurse's sign-off on an incident report. |
| 23 | [`follow_ups`](#follow_ups) | Shared (FollowUps) | Core | A return-for-monitoring instruction attached to a visit or an incident. |
| 24 | [`pe_referrals`](#pe_referrals) | ClinicVisits | Core | A PE/Sports injury referral logged by Staff, with the nurse's assessment and disposition. |
| 25 | [`treatment_item_lines`](#treatment_item_lines) | InventoryTracker | Core | "Medicines & supplies given": one row per item per visit or incident (ADR-018). |
| 26 | [`inventory_transactions`](#inventory_transactions) | InventoryTracker | Core | Insert-only ledger of every stock movement. |
| 27 | [`reference_settings`](#reference_settings) | Shared | Core | Settings that are text or structured, beside the plain values of `system_settings`. |
| 28 | [`backup_logs`](#backup_logs) | BackupVerification | Core | One row per backup run, filled by ingesting the status file that the scheduled backup script writes (so a failed run is still recorded when the database itself is the problem). |
| 29 | [`holidays`](#holidays) | Dashboard | Core | Nationwide Philippine holidays, read-only reference data filled by the monthly sync job. |
| 30 | [`holiday_sync_runs`](#holiday_sync_runs) | Dashboard | Core | History of holiday sync attempts. |
| 31 | [`calendar_events`](#calendar_events) | Dashboard | Core | School events that Staff maintain on the Dashboard calendar (ADR-019). |
| 32 | [`issue_reports`](#issue_reports) | Shared (Feedback) | Core | "Report an issue" feedback from any signed-in role. |
| 33 | [`audit_logs`](#audit_logs) | Shared (AuditLog) | Core | Append-only record of who did what and when (RA 10173 accountability). |
| 34 | [`sports_reports`](#sports_reports) | ReportsGeneration | Core | A saved Sports Report for a PE or sports instructor (ADR-034). |
| 35 | [`sports_report_students`](#sports_report_students) | ReportsGeneration | Core | The students on a Sports Report. |
| 36 | [`personnel`](#personnel) | StaffPatients | Core | Teachers and school staff seen as patients (ADR-043). |
| 37 | [`personnel_health_entries`](#personnel_health_entries) | StaffPatients | Core | A staff patient's allergies and conditions. |
| 38 | [`personnel_emergency_contacts`](#personnel_emergency_contacts) | StaffPatients | Core | A staff patient's emergency contacts. |
| 39 | [`visit_extra_complaints`](#visit_extra_complaints) | ClinicVisits | Core | Up to 3 extra complaint tags on a visit (ADR-053). |
| 40 | [`inventory_batches`](#inventory_batches) | InventoryTracker | Core | Received batches, the source of all stock (ADR-030). |
| 41 | [`inventory_item_allergy_words`](#inventory_item_allergy_words) | InventoryTracker | Core | "Avoid if allergic to" words on an item (ADR-049). |
| 42 | [`inventory_transaction_batches`](#inventory_transaction_batches) | InventoryTracker | Core | Which batches a stock movement touched (ADR-030). |
| 43 | [`backup_locations`](#backup_locations) | BackupVerification | Core | Where backups go (ADR-052). |
| 44 | [`backup_location_results`](#backup_location_results) | BackupVerification | Core | One backup run's result per location (ADR-052). |
| 45 | [`inventory_item_symptom_tags`](#inventory_item_symptom_tags) | InventoryTracker | Core | The symptoms an item is commonly used for, which order the Visit form's picker (ADR-071). |
| 46 | [`school_years`](#school_years) | Shared | Core | School years, started and ended by hand by Staff (ADR-072, ADR-075). |
| 47 | [`recovery_codes`](#recovery_codes) | UserManagement | Core | One-time recovery codes for password recovery, slow-hashed (ADR-073). |
| 48 | [`staff_record_reviews`](#staff_record_reviews) | StaffPatients | Core | The staff Incomplete Records queue: who resolved a staff record, and when (ADR-067, ADR-076). |

Sanctum's `personal_access_tokens` migration is not published, since no API tokens are issued (ADR-056). Laravel's own `migrations` table is standard and not redefined here. Its `password_reset_tokens` table is **not needed**: the email reset of ADR-048 item 3 is replaced by the authenticator recovery of ADR-073 (Saturday, November 07, 2026 — 13:24 PHT); the one-time reset token after a code is short-lived and kept in the cache, not a table.

## users

**Module:** UserManagement  |  **Tier:** Core

Accounts for Staff and Admin/Principal. Never hard-deleted: a leaver is deactivated so history keeps its author.

**Frontend:** `User` (id, name, username, role, lastLogin) + the mock-only `devAccounts` (password, mustChangePassword).

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` **PK** | `bigint unsigned` | no |  |  |
| `name` | `varchar(120)` | no |  |  |
| `username` | `varchar(50)` | no |  | Case-insensitive unique (collation). Login looks up by username, so a duplicate could never sign in. Stays reserved after deactivation. |
| `profile_picture` | `mediumtext` | yes | NULL | Data URL, as the mock stores it (G2); a file path once uploads exist. Never on a list. |
| `password_hash` | `varchar(255)` | no |  | bcrypt/argon hash from Laravel `Hash`. Never returned by any API. |
| `role` | `varchar(12)` | no |  | `staff` / `admin`. PE/Sports Instructors have no account (ADR-029). A further value (`canteen`) is an additive CHECK change later. |
| `is_head_nurse` | `tinyint(1)` | no | 0 | OPEN (D-04). Module 7 and Module 10 reserve some actions to the "Head Nurse" within Staff. Only meaningful when role = staff. |
| `must_change_password` | `tinyint(1)` | no | 1 | Forces the Force Password Change screen after login. Default 1 for new accounts. |
| `password_changed_at` | `datetime` | yes | NULL |  |
| `failed_login_count` | `smallint unsigned` | no | 0 | Reset to 0 on success. At `lockout_max_attempts` (5) the account locks. |
| `locked_until` | `datetime` | yes | NULL | Set to now + `lockout_minutes` (5) when the limit is hit. Login refuses while in the future. |
| `last_login_at` | `datetime` | yes | NULL |  |
| `deactivated_at` | `datetime` | yes | NULL | Non-null = cannot log in. Rows are kept forever. |
| `totp_secret` | `text` | yes | NULL | The authenticator secret (ADR-073), **encrypted at rest** by the application (Laravel `Crypt`; the key is in the environment, not the database, `Environment-Setup.md`). Stored only once the first code confirms the setup; the secret and otpauth URI are returned once, at setup, and never again. NULL = not set up. |
| `totp_confirmed_at` | `datetime` | yes | NULL | When the setup was confirmed. Set together with `totp_secret`. |
| `last_totp_step` | `bigint unsigned` | yes | NULL | The 30-second step of the last accepted code, so the same code is never accepted twice (replay). |
| `created_at` | `datetime` | no | current_timestamp() |  |
| `updated_at` | `datetime` | no | current_timestamp() |  |

**Indexes:** UNIQUE `uq_users_username` (`username`). (`email` and `uq_users_email` removed Saturday, November 07, 2026 — 13:24 PHT: they existed only for the email reset that ADR-073 replaces; no account needs an email.)

**Authenticator (ADR-073):** codes are RFC 6238, SHA-1, 30-second steps, 6 digits, one step either way. Recovery: check the username, then a code or a recovery code, then the new password by the Change Password rules; every failed check or code counts toward the sign-in lockout (`failed_login_count`, `locked_until`). An unknown username is limited by the rate limiter only.

**Checks:**

- `chk_users_head_nurse`: `is_head_nurse = 0 or role = 'staff'`
- `chk_users_name_len`: `char_length(trim(name)) >= 1`
- `chk_users_role`: `role in ('staff','admin')`
- `chk_users_username_len`: `char_length(trim(username)) >= 3`
- `chk_users_totp`: `(totp_secret is null) = (totp_confirmed_at is null)`
- `chk_users_totp_step`: `last_totp_step is null or totp_secret is not null`

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
- `chk_settings_school_year_month`: the two school-year month keys hold a whole number 1 to 12
- `chk_settings_school_year_day`: the two school-year day keys hold a whole number 1 to 31
- `chk_settings_idle_signout`: the two idle sign-out keys hold a whole number 10 to 240

**School-year settings (ADR-072, ADR-075):** `school_year_start_month` 6, `school_year_start_day` 15, `school_year_end_month` 4, `school_year_end_day` 14 (the Principal, October 17, 2026), and `school_year_notice_days` 7 (a starting value; the nurse to confirm). Staff edit them; the Admin reads; each change is audited by field name ("Updated start month and start day"). They give only the **due** days: ending is due on the last class day, starting on the start day, and the Dashboard reminds Staff from `school_year_notice_days` before. They never start or end a year. A day must exist in its month (February counts 28) and the end may not equal the start: those span two rows, so the settings service checks them.

**Idle sign-out settings (ADR-078; amends ADR-015, ADR-048, ADR-057):** `idle_signout_minutes_staff` 60 and `idle_signout_minutes_admin` 30, each a whole number of minutes from 10 to 240 (`chk_settings_idle_signout`). They replace `admin_idle_minutes`. The API names are `idleSignoutMinutesStaff` and `idleSignoutMinutesAdmin`. Staff edit them; the Admin reads. Each change is audited by field name only ("Updated Staff idle sign-out"), never the values. The idle middleware reads the signed-in role's key; the 7-day maximum from sign-in still applies (`API-Contract.md`, Sign-in).

## reference_settings

**Module:** Shared  |  **Tier:** Core

Settings that are text or structured, beside the plain values of `system_settings` (ADR-057). Read through the same settings service.

**Frontend:** `MockDbConfig`: `vitalsWarningRanges`, `vitalsUsualRanges`, `personnelTypes`, `showFrequentVisitors`.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `setting_key` **PK** | `varchar(80)` | no |  | Stable code identifier (snake_case). |
| `value_format` | `varchar(4)` | no |  | `text` or `json`. |
| `setting_value` | `text` | no |  | JSON is held as checked text, so nothing queries inside it. |
| `description` | `varchar(255)` | yes | NULL |  |
| `updated_by_user_id` | `bigint unsigned` | yes | NULL |  |
| `updated_at` | `datetime` | no | current_timestamp() |  |

**Foreign keys:** `updated_by_user_id` -> `users`(`id`) ON DELETE RESTRICT

**Checks:**

- `chk_reference_settings_format`: `value_format in ('text','json')`
- `chk_reference_settings_json`: `value_format <> 'json' or json_valid(setting_value)`

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

**Module:** FirstAidChecklist  |  **Tier:** Core

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

**Module:** FirstAidChecklist  |  **Tier:** Core

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

**Frontend:** `Student` (id, lrn, firstName, lastName, middleName, gradeLevel, section, sex, birthDate, archived). `allergies`, `medicalConditions`, `emergencyContact` move to child tables; `recordComplete` is derived.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` **PK** | `bigint unsigned` | no |  |  |
| `lrn` | `char(12)` | no |  | Learner Reference Number, entered by Staff: exactly 12 digits, stored as text so leading zeros survive, unique, set once and not changed after the record is created (ADR-028 note). Never in a URL or an audit entry (ADR-028). |
| `first_name` | `varchar(50)` | no |  | Required and non-blank; trimmed, spaces collapsed (ADR-064, a change after the ADR-057 approval that settles D-15). |
| `last_name` | `varchar(50)` | no |  | Required and non-blank; trimmed, spaces collapsed (ADR-064). |
| `middle_name` | `varchar(40)` | yes | NULL | Optional: NULL when there is none, never an empty or blank string (ADR-064). |
| `grade_level_id` | `bigint unsigned` | yes | NULL | Nullable on purpose: an imported record may lack it and is then flagged "incomplete". Never nullable for a completed record (rule in the app). |
| `section` | `varchar(60)` | yes | NULL | Optional until the yearly import fills it (ADR-047). Shown on the Student Profile and its printout only. |
| `sex` | `varchar(6)` | yes | NULL | `female` or `male`, as recorded by the school. Required for a completed record (ADR-031); nullable during an incomplete import. |
| `birth_date` | `date` | yes | NULL | Optional (ADR-054). The age is calculated, never stored. Never on a list, picker, Dashboard, report or other printout. |
| `name_correction_reason` | `varchar(300)` | yes | NULL | The reason given for the latest name correction (at least 3 characters). Also written in the audit summary (ADR-058). |
| `archived_at` | `datetime` | yes | NULL | Non-null = archived (hidden from default lists). Starts the 5-year retention clock. |
| `archived_by_user_id` | `bigint unsigned` | yes | NULL |  |
| `archive_reason` | `varchar(80)` | yes | NULL | Why it was archived (ADR-072): set with `archived_at`, required then, up to 80 characters. The manual Archive asks a reason from a short list plus Other ("Specify the reason"; a mid-year transfer is "Transferred"). The yearly student import writes "Not on the new list" (ADR-047). |
| `archived_school_year` | `varchar(9)` | yes | NULL | The school year's label at archive time ("2026–2027", en dash), stored and never recomputed, so changing the school-year dates never moves the record (ADR-072). Filled from the current `school_years` row. |
| `import_batch_id` | `bigint unsigned` | yes | NULL | Set when the record was created by a registrar import. |
| `created_by_user_id` | `bigint unsigned` | yes | NULL |  |
| `created_at` | `datetime` | no | current_timestamp() |  |
| `updated_at` | `datetime` | no | current_timestamp() |  |

**Indexes:** `idx_students_archived_at` (`archived_at`); `idx_students_archived_year` (`archived_school_year`, `archived_at`), for the Archive page; `idx_students_grade_archived` (`grade_level_id`, `archived_at`); `idx_students_name` (`last_name`, `first_name`, `middle_name`); UNIQUE `uq_students_lrn` (`lrn`)

**Foreign keys:** `archived_by_user_id` -> `users`(`id`) ON DELETE RESTRICT; `import_batch_id` -> `student_import_batches`(`id`) ON DELETE RESTRICT; `created_by_user_id` -> `users`(`id`) ON DELETE RESTRICT; `grade_level_id` -> `grade_levels`(`id`) ON DELETE RESTRICT

**Name (ADR-064):** the full name is never stored. The API builds `fullName` on read as the non-empty parts in the order First, Middle, Last (`CONCAT_WS(' ', first_name, middle_name, last_name)`: "Maria Angela Santos Dela Cruz"; without a middle name "Ana Reyes"). Lists sort by `last_name`, `first_name`, `middle_name`, which `idx_students_name` serves. Name search requires every word of the query somewhere in the joined name; duplicate detection compares the joined names after trimming and collapsing spaces. Accent- and case-insensitive matching comes from the collation.

**Checks:**

- `chk_students_first_name`: `char_length(trim(first_name)) >= 1`
- `chk_students_last_name`: `char_length(trim(last_name)) >= 1`
- `chk_students_middle_name`: `middle_name is null or char_length(trim(middle_name)) >= 1`
- `chk_students_lrn`: `lrn regexp '^[0-9]{12}$'`
- `chk_students_sex`: `sex is null or sex in ('female','male')`
- `chk_students_archive_details`: `(archived_at is null) = (archive_reason is null) and (archived_at is null) = (archived_school_year is null)`: all three on an archived record, none on an active one (ADR-072)
- `chk_students_archive_reason`: `archive_reason is null or char_length(trim(archive_reason)) >= 1`
- `chk_students_archived_year`: `archived_school_year is null or archived_school_year regexp '^[0-9]{4}–[0-9]{4}$'`

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
| `sort_order` | `smallint` | no | 0 | Keeps the order of the list (G5, G6). |
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
| `sort_order` | `smallint` | no | 0 | Keeps the order of the list (G5, G6). |
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
| `low_stock_threshold` | `int unsigned` | no | 0 |  |
| `brand` | `varchar(8)` | yes | null | **PROVISIONAL** (Sunday, October 25, 2026, Sir Rey): `generic` or `branded`; null reads "Not specified". Optional on the item form. |
| `archived_at` | `datetime` | yes | NULL | Soft-archive. Referenced items can never be hard-deleted. |
| `created_at` | `datetime` | no | current_timestamp() |  |
| `updated_at` | `datetime` | no | current_timestamp() |  |
| `active_name` | `varchar(120)` generated | yes | = if(`archived_at` is null,`name`,NULL) | Generated: the name while active, NULL once archived. Unique, so active names can't repeat but an archived name can be reused. |

**Indexes:** `idx_items_category` (`category`, `archived_at`); UNIQUE `uq_items_active_name` (`active_name`)

**Commonly used for (ADR-071):** an item's symptom tags are rows of [`inventory_item_symptom_tags`](#inventory_item_symptom_tags).

**Checks:**

- `chk_items_category`: `category in ('medicine','supply')`
- `chk_items_name`: `char_length(trim(name)) >= 1`

## visits

**Module:** ClinicVisits  |  **Tier:** Core

A routine clinic visit, about a student or a staff patient, exactly one (ADR-043). Never deleted; a mistaken visit is marked "Entered in error".

**Frontend:** `Visit`. `treatment` -> `treatment_notes`; `studentId` -> `student_id`; `excuseLetterDraft` -> a row in `excuse_letters`; `itemsGiven` -> `treatment_item_lines`.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` **PK** | `bigint unsigned` | no |  |  |
| `student_id` | `bigint unsigned` | no |  |  |
| `personnel_id` | `bigint unsigned` | yes | NULL | A staff patient (ADR-043). Exactly one of `student_id` and `personnel_id`. |
| `grade_level_at_time` | `varchar(40)` | yes | NULL | The grade when saved (ADR-047). Null for a staff patient. |
| `section_at_time` | `varchar(60)` | yes | NULL | The section when saved, when the student had one (ADR-047). |
| `visited_at` | `datetime` | no |  | Philippine time. Editable (back-dated entry is real), but the service rejects a future time. `created_at` still records when it was typed. |
| `complaint` | `varchar(150)` | no |  | Shown as "Symptom" (ADR-070; the column keeps its name). Free text, stored in a known suggestion's spelling. Case-insensitive collation also keeps GROUP BY from splitting "Headache" / "headache". |
| `complaint_type_id` | `bigint unsigned` | yes | NULL | Set when the text matches a predefined type (drives the triage checklist). Nullable. |
| `treatment_notes` | `text` | yes | NULL | Optional. Care that isn't stock. |
| `disposition` | `varchar(22)` | no |  | `returned_to_class`, `resting_in_clinic` (panel review part 2, PROVISIONAL), `sent_home`, `referred_to_hospital`. |
| `referred_to` | `varchar(150)` | yes | NULL | Only when disposition = referred_to_hospital (CHECK). |
| `event_tag` | `varchar(80)` | yes | NULL | Free text such as "Intramurals". Deliberately not a managed list. |
| `temperature_c` | `decimal(5,2)` | yes | NULL | Logbook field, optional. Two decimals, as the screens. Out of the usual range warns and saves (ADR-051). |
| `time_out` | `time` | yes | NULL | Logbook field, on the visit's date. |
| `assisted_by` | `varchar(120)` | yes | NULL | Logbook field, free text. |
| `parent_guardian` | `varchar(120)` | yes | NULL | Logbook field, free text. |
| `remarks` | `text` | yes | NULL | Logbook field, free text. |
| `collected_by_name` | `varchar(120)` | yes | NULL | Sent home or Referred only (ADR-049). |
| `collected_by_relationship` | `varchar(40)` | yes | NULL | ADR-049. Shown as "Released to" (ADR-070). For "Other", the text is who it was (for example "Neighbour"), never the word "Other". |
| `collected_by_time` | `time` | yes | NULL | ADR-049. |
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

**Checks (added):** `chk_visits_temperature`: `temperature_c is null or temperature_c >= 0`

**Update:** `chk_visits_one_patient`, `chk_visits_error`, `uq_visits_id_personnel`, `idx_visits_personnel_time`, `fk_visits_personnel`, `fk_visits_error_by` and `fk_visits_escalated_incident` (added after `incidents`). Extra complaint tags: `visit_extra_complaints`.

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
| `stay_home_until_cleared` | `tinyint(1)` | no | 0 | ADR-049. |
| `stay_home_note` | `varchar(255)` | yes | NULL | ADR-049. |
| `recipient` | `varchar(150)` | yes | NULL | Stored at approval with the wording in `snapshot_text` (ADR-049). |
| `prepared_by_user_id` | `bigint unsigned` | no |  |  |
| `reference_no` | `varchar(20)` | yes | NULL | Human-facing number for the printed letter (e.g. EL-2026-0001), assigned at approval from `number_sequences`. |
| `approved_by_user_id` | `bigint unsigned` | yes | NULL |  |
| `approved_at` | `datetime` | yes | NULL |  |
| `snapshot_text` | `mediumtext` | yes | NULL | The rendered letter at approval (student name, grade, period, note, approver). Reprints use this, so a later rename or grade change cannot alter a permanent document. |
| `voided_at` | `datetime` | yes | NULL | Set when the visit is entered in error. |
| `voided_by_user_id` | `bigint unsigned` | yes | NULL |  |
| `voided_reason` | `varchar(300)` | yes | NULL |  |
| `superseded_at` | `datetime` | yes | NULL | Set by "Issue a replacement". |
| `superseded_by_user_id` | `bigint unsigned` | yes | NULL |  |
| `superseded_reason` | `varchar(300)` | yes | NULL |  |
| `live_visit_id` | `bigint unsigned` | yes | generated | `visit_id` while `draft` or `approved`: one live letter per visit. |
| `created_at` | `datetime` | no | current_timestamp() |  |
| `updated_at` | `datetime` | no | current_timestamp() |  |

**Indexes:** `idx_letters_status` (`status`); UNIQUE `uq_letters_reference` (`reference_no`); UNIQUE `uq_letters_live_visit` (`live_visit_id`); `idx_letters_visit` (`visit_id`)

**Foreign keys:** `approved_by_user_id` -> `users`(`id`) ON DELETE RESTRICT; `prepared_by_user_id` -> `users`(`id`) ON DELETE RESTRICT; `visit_id` -> `visits`(`id`) ON DELETE CASCADE

**Checks:**

- `chk_letters_approved`: `status = 'draft' and approved_at is null and approved_by_user_id is null and reference_no is null and snapshot_text is null or status = 'approved' and approved_at is not null and approved_by_user_id is not null and reference_no is not null`
- `chk_letters_period`: `excused_until >= excused_from`
- `chk_letters_status`: `status in ('draft','approved')`

**Update:** `status` is `varchar(10)`: `draft`, `approved`, `voided`, `superseded`; `chk_letters_approved` covers the two new statuses.

## triage_checks

**Module:** FirstAidChecklist  |  **Tier:** Spec

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

**Foreign keys:** `triage_step_id` -> `triage_steps`(`id`) ON DELETE RESTRICT; `visit_id` -> `visits`(`id`) ON DELETE CASCADE

## incidents

**Module:** EmergencyResponse  |  **Tier:** Core

An emergency incident, captured in two stages. Stage 1 is the fast save; Stage 2 completes the same row.

**Frontend:** `Incident`. `vitals` -> `incident_vital_readings`; `hospitalReferral` -> `hospital_referrals`; `parentNotifications` -> `parent_notification_attempts`; treatmentNotes (inside the mock's `vitals`) -> `treatment_notes`; `bodyPart` -> `body_part`; `noFurtherActionReason` -> `no_further_action_reason` (both PROVISIONAL, panel review part 1).

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` **PK** | `bigint unsigned` | no |  |  |
| `student_id` | `bigint unsigned` | no |  |  |
| `personnel_id` | `bigint unsigned` | yes | NULL | A staff patient (ADR-043). Exactly one of `student_id` and `personnel_id`. |
| `grade_level_at_time` | `varchar(40)` | yes | NULL | The grade when Stage 1 was saved (ADR-047). |
| `section_at_time` | `varchar(60)` | yes | NULL | The section at the same moment (ADR-047). |
| `occurred_at` | `datetime` | no |  | When it happened (Philippine time). |
| `complaint` | `varchar(150)` | no |  |  |
| `stage` | `tinyint` | no | 1 | 1 = fast capture, 2 = complete. CHECK: stage 2 requires `completed_at` and `completed_by_user_id`. |
| `treatment_notes` | `text` | yes | NULL | Optional. In the mock this text hides inside the vitals object. |
| `body_part` | `varchar(60)` | yes | NULL | PROVISIONAL (panel review part 1). Optional free text with suggestions, Stage 2 only. |
| `source_visit_id` | `bigint unsigned` | yes | NULL | PROVISIONAL (ADR-036). The visit this incident was escalated from. |
| `no_further_action_reason` | `varchar(200)` | yes | NULL | PROVISIONAL (panel review part 1). Set only when "Nothing further was needed or done" is ticked; completing and approving need it, treatment notes, a treatment item line, a notification attempt or a referral. |
| `event_tag` | `varchar(80)` | yes | NULL |  |
| `general_notes` | `text` | yes | NULL | Additional notes; correctable until approval (ADR-049). |
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

**Update:** `chk_incidents_one_patient`, `uq_incidents_id_personnel`, `idx_incidents_personnel_time`, `fk_incidents_personnel`, `fk_incidents_source_visit`.

## incident_vital_readings

**Module:** EmergencyResponse  |  **Tier:** Core

Timestamped vital-sign readings. Any reading may be left out at either stage; a recheck is another row. A reading out of the usual range warns and saves (ADR-051), so the database only refuses what cannot be a reading.

**Frontend:** `Incident.vitals` (`temperatureC`, `pulseBpm`, `bloodPressure` "110/70", `oxygenSaturationPct` 98). The API merges the latest value of each into the existing object.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` **PK** | `bigint unsigned` | no |  |  |
| `incident_id` | `bigint unsigned` | no |  |  |
| `stage` | `tinyint` | no |  | Which stage the reading came from. |
| `recorded_at` | `datetime` | no |  |  |
| `recorded_by_user_id` | `bigint unsigned` | no |  |  |
| `temperature_c` | `decimal(5,2)` | yes | NULL | Not negative. A slip such as 370 saves, with the warning. |
| `pulse_bpm` | `smallint unsigned` | yes | NULL | 0 is a real reading. |
| `blood_pressure` | `varchar(20)` | yes | NULL | Text, as the mock: "110/70", or "90/P" by palpation. Only the usual-range note parses it (G14). |
| `spo2_percent` | `tinyint unsigned` | yes | NULL | Whole percent, 0-100, as the mock. |
| `note` | `varchar(255)` | yes | NULL |  |

**Indexes:** `idx_vitals_incident` (`incident_id`, `recorded_at`)

**Foreign keys:** `incident_id` -> `incidents`(`id`) ON DELETE CASCADE; `recorded_by_user_id` -> `users`(`id`) ON DELETE RESTRICT

**Checks:**

- `chk_vitals_spo2`: `spo2_percent is null or spo2_percent <= 100`
- `chk_vitals_stage`: `stage in (1,2)`
- `chk_vitals_temp`: `temperature_c is null or temperature_c >= 0`

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

**Foreign keys:** `incident_id` -> `incidents`(`id`) ON DELETE CASCADE; `created_by_user_id` -> `users`(`id`) ON DELETE RESTRICT

## parent_notification_attempts

**Module:** EmergencyResponse  |  **Tier:** Core

Every attempt to reach a parent/guardian for an incident, timestamped.

**Frontend:** `ParentNotificationAttempt` (outcome, timestamp, calledContact). `calledContact` is a snapshot here as in the mock (name, relationship, phone, source), so it works for a student, a staff patient or an "Other" person.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` **PK** | `bigint unsigned` | no |  |  |
| `incident_id` | `bigint unsigned` | no |  |  |
| `called_name` | `varchar(120)` | yes | NULL | Snapshot of who was called. |
| `called_relationship` | `varchar(40)` | yes | NULL | Snapshot. |
| `phone_dialed` | `varchar(30)` | yes | NULL | Snapshot of the number, in case the contact is edited later. |
| `called_source` | `varchar(17)` | yes | NULL | `emergency_contact` or `other`. |
| `outcome` | `varchar(30)` | no |  | `reached` / `no_answer` / `left_message_or_voicemail` / `wrong_number` (D6, panel review part 1). |
| `attempted_at` | `datetime` | no |  |  |
| `logged_by_user_id` | `bigint unsigned` | no |  |  |
| `note` | `varchar(255)` | yes | NULL |  |
| `created_at` | `datetime` | no | current_timestamp() |  |

**Indexes:** `idx_notifications_incident` (`incident_id`, `attempted_at`)

**Foreign keys:** `incident_id` -> `incidents`(`id`) ON DELETE CASCADE; `logged_by_user_id` -> `users`(`id`) ON DELETE RESTRICT

**Checks:**

- `chk_notifications_outcome`: `outcome in ('reached','no_answer','left_message_or_voicemail','wrong_number')`
- `chk_notifications_source`: `called_source is null or called_source in ('emergency_contact','other')`

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

**Foreign keys:** `incident_id` -> `incidents`(`id`) ON DELETE CASCADE; `approved_by_user_id` -> `users`(`id`) ON DELETE RESTRICT

## follow_ups

**Module:** Shared (FollowUps)  |  **Tier:** Core

A return-for-monitoring instruction attached to a visit or an incident. One feature with two entry points.

**Frontend:** `FollowUp` (`relatedRecord: {type, id}` -> exactly one of `visit_id` / `incident_id`).

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` **PK** | `bigint unsigned` | no |  |  |
| `student_id` | `bigint unsigned` | no |  |  |
| `personnel_id` | `bigint unsigned` | yes | NULL | A staff patient (ADR-043). Exactly one of `student_id` and `personnel_id`. |
| `visit_id` | `bigint unsigned` | yes | NULL | Composite FK (visit_id, student_id): the DB itself refuses a follow-up whose visit belongs to another student. |
| `incident_id` | `bigint unsigned` | yes | NULL |  |
| `follow_up_date` | `date` | no |  |  |
| `reason` | `varchar(255)` | no |  |  |
| `notes` | `text` | yes | NULL |  |
| `status` | `varchar(10)` | no | pending | `pending` -> `completed` / `missed` / `cancelled`. "Overdue" and "due today" are derived from date + status, never stored. |
| `status_updated_at` | `datetime` | yes | NULL | When the status last changed, and by whom. |
| `status_updated_by_user_id` | `bigint unsigned` | yes | NULL |  |
| `status_reason` | `varchar(340)` | yes | NULL | PROVISIONAL (panel review part 3). Required when the status becomes `missed` or `cancelled`. |
| `stay_home_until_cleared` | `tinyint(1)` | no | 0 | ADR-049. |
| `stay_home_note` | `varchar(255)` | yes | NULL | ADR-049. |
| `created_by_user_id` | `bigint unsigned` | no |  |  |
| `created_at` | `datetime` | no | current_timestamp() |  |
| `updated_at` | `datetime` | no | current_timestamp() |  |

**Indexes:** `idx_followups_incident` (`incident_id`); `idx_followups_status_date` (`status`, `follow_up_date`); `idx_followups_student` (`student_id`, `follow_up_date`); `idx_followups_visit` (`visit_id`)

**Foreign keys:** `created_by_user_id` -> `users`(`id`) ON DELETE RESTRICT; `incident_id`, `student_id` -> `incidents`(`id`, `student_id`) ON DELETE RESTRICT; `status_updated_by_user_id` -> `users`(`id`) ON DELETE RESTRICT; `student_id` -> `students`(`id`) ON DELETE RESTRICT; `visit_id`, `student_id` -> `visits`(`id`, `student_id`) ON DELETE RESTRICT

**Checks:**

- `chk_followups_one_source`: `(visit_id is not null) + (incident_id is not null) = 1`
- `chk_followups_status`: `status in ('pending','completed','missed','cancelled')`

**Update:** `chk_followups_one_patient`, `fk_followups_personnel`, and `fk_followups_visit_staff` and `fk_followups_incident_staff` for the same-patient guarantee on a staff patient.

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

**Batches:** a line holds no batch. The batches behind a line are read from the movements of the same visit or incident and item, in order, through `inventory_transaction_batches` (ADR-057).

**Foreign keys:** `incident_id` -> `incidents`(`id`) ON DELETE CASCADE; `item_id` -> `inventory_items`(`id`) ON DELETE RESTRICT; `visit_id` -> `visits`(`id`) ON DELETE CASCADE

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
| `stock_after` | `int` | no |  | Running balance after this row. Lets a reconciliation job prove the batch quantities match the ledger. |
| `occurred_at` | `datetime` | no |  |  |
| `user_id` | `bigint unsigned` | no |  |  |
| `student_id` | `bigint unsigned` | yes | NULL | Null = "Not for a student (general use)". Never shown by name (display-privacy). |
| `personnel_id` | `bigint unsigned` | yes | NULL | A staff patient (ADR-043). At most one of the two; neither means general use. |
| `visit_id` | `bigint unsigned` | yes | NULL | Composite FK with student_id, so the visit must be that student's. |
| `incident_id` | `bigint unsigned` | yes | NULL |  |
| `reason` | `varchar(20)` | yes | NULL | Adjustments only (CHECK). `visit_edited` is written only by a visit edit and needs a visit. |
| `note` | `varchar(255)` | yes | NULL | Optional for every reason, Other included (ADR-068; it was required for Other until Saturday, November 07, 2026 — 13:33 PHT, counter-check C-2). |
| `created_at` | `datetime` | no | current_timestamp() |  |

**Indexes:** `idx_txn_incident` (`incident_id`); `idx_txn_item_time` (`item_id`, `occurred_at`); `idx_txn_student_time` (`student_id`, `occurred_at`); `idx_txn_visit` (`visit_id`)

**Foreign keys:** `incident_id`, `student_id` -> `incidents`(`id`, `student_id`) ON DELETE RESTRICT; `item_id` -> `inventory_items`(`id`) ON DELETE RESTRICT; `student_id` -> `students`(`id`) ON DELETE RESTRICT; `user_id` -> `users`(`id`) ON DELETE RESTRICT; `visit_id`, `student_id` -> `visits`(`id`, `student_id`) ON DELETE RESTRICT

**Checks:**

- `chk_txn_link_has_student`: `visit_id is null and incident_id is null or student_id is not null`
- `chk_txn_one_link`: `visit_id is null or incident_id is null`
- `chk_txn_reason`: `type = 'adjustment' and reason is not null and reason in ('visit_edited','expired_disposed','damaged_spilled','miscount_correction','other') or type <> 'adjustment' and reason is null`
- `chk_txn_sign`: `type = 'opening' and quantity_delta >= 0 or type = 'dispense' and quantity_delta < 0 or type = 'restock' and quantity_delta > 0 or type = 'adjustment' and quantity_delta <> 0`
- `chk_txn_type`: `type in ('opening','dispense','restock','adjustment')`

**Update (ADR-030, ADR-043):** `chk_txn_link_has_student` is now `chk_txn_link_has_patient`, plus `chk_txn_one_patient`; `fk_txn_visit_staff` and `fk_txn_incident_staff` give a staff patient the same-patient guarantee. Batches moved: `inventory_transaction_batches`.

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
| `look_back` | `varchar(11)` | no | '90_days' | `30_days` / `60_days` / `90_days` / `school_year`: from the current school year's recorded start (`school_years.started_on`, ADR-075), no longer a fixed June 15. |
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

The students on a Sports Report. Hand-written Wednesday, October 21, 2026 — 07:19; the note column removed Tuesday, November 03, 2026 — 20:16 PHT (ADR-034 note); not yet loaded into MariaDB.

**Frontend:** `SportsReport.students` (studentId).

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` **PK** | `bigint unsigned` | no |  |  |
| `sports_report_id` | `bigint unsigned` | no |  |  |
| `student_id` | `bigint unsigned` | no |  | An archived student stays on the list and is left out of the printout. |

**Indexes:** `uq_sports_report_student` UNIQUE (`sports_report_id`, `student_id`), `idx_sports_report_students_student` (`student_id`)

**Foreign keys:** `sports_report_id` -> `sports_reports`(`id`) ON DELETE CASCADE; `student_id` -> `students`(`id`) ON DELETE CASCADE

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

Append-only record of who did what and when (RA 10173 accountability). **Kept 10 years** (ADR-037, settled by ADR-057). Written for every login, logout, submit, approve, create, update, delete and archive; reading the log is not logged (ADR-016).

**Frontend:** `AuditLogEntry` (+ `summary`, ADR-017).

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` **PK** | `bigint unsigned` | no |  |  |
| `occurred_at` | `datetime` | no |  |  |
| `actor_user_id` | `bigint unsigned` | yes | NULL | Null for system actions (backup ingest, holiday sync, retention purge). |
| `actor_role` | `varchar(12)` | yes | NULL | Snapshot of the actor's role when the action happened. ADR-057 item 12 amends ADR-017, which derived it at read time and would show the wrong role after a role change (D-01). |
| `action_type` | `varchar(8)` | no |  |  |
| `target_type` | `varchar(40)` | yes | NULL | Controlled vocabulary kept in code (e.g. `student`, `visit`, `incident`, `excuse_letter`, `inventory_item`, `inventory_transaction`, `calendar_event`, `backup_log`). Not a CHECK, so adding a target needs no ALTER on the biggest table. |
| `target_id` | `bigint unsigned` | yes | NULL | Id of the target row. NO foreign key on purpose: the log must outlive purged records. |
| `target_label` | `varchar(120)` | yes | NULL | For a target with no record id: a backup run, a settings change, a printed document. Built by the server, never free text. |
| `subject_student_id` | `bigint unsigned` | yes | NULL | Snapshot of the student the action concerned, by internal id: no FK, so it survives a purge. Never the LRN (ADR-028); the viewer shows the masked LRN while the student exists. |
| `subject_personnel_id` | `bigint unsigned` | yes | NULL | The staff twin of `subject_student_id`: internal id, no FK. |
| `summary` | `varchar(255)` | yes | NULL | Field names or states only, never values (ADR-017). Max 255; the service cuts a long list at a field boundary (G26). |
| `client_ip` | `varbinary(16)` | yes | NULL | Optional. IPv4/IPv6 as 4 or 16 bytes; useful to tell the workstation from a phone. |

**Indexes:** `idx_audit_action_time` (`action_type`, `occurred_at`); `idx_audit_actor_time` (`actor_user_id`, `occurred_at`); `idx_audit_subject` (`subject_student_id`, `occurred_at`); `idx_audit_subject_personnel` (`subject_personnel_id`, `occurred_at`); `idx_audit_target` (`target_type`, `target_id`); `idx_audit_target_time` (`target_type`, `occurred_at`); `idx_audit_time` (`occurred_at`)

**Foreign keys:** `actor_user_id` -> `users`(`id`) ON DELETE RESTRICT

**Checks:**

- `chk_audit_action`: `action_type in ('login','logout','submit','approve','create','update','delete','archive','print','view')`
- `chk_audit_actor`: `actor_user_id is not null or actor_role is null`
- `chk_audit_role`: `actor_role is null or actor_role in ('staff','admin')`
- `chk_audit_target`: `target_id is not null or target_label is not null`
- `chk_audit_one_subject`: `subject_student_id is null or subject_personnel_id is null`

**Update:** `chk_audit_action` adds `print` and `view` (ADR-026, ADR-038, ADR-048). Kept 10 years (ADR-037, ADR-051, ADR-057).

## personnel

**Module:** StaffPatients  |  **Tier:** Core

A teacher, non-teaching staff member or utility worker seen at the clinic (ADR-043, ADR-053).

**Frontend:** `Personnel` (`firstName` -> `first_name`, `lastName` -> `last_name`, `middleName` -> `middle_name`, `staffNumber` -> `staff_number`, `contactInfo` -> `contact_number`).

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` **PK** | `bigint unsigned` | no |  |  |
| `staff_number` | `varchar(20)` | no |  |  |
| `first_name` | `varchar(50)` | no |  | Required and non-blank (ADR-064, as for `students`). |
| `last_name` | `varchar(50)` | no |  | Required and non-blank (ADR-064). |
| `middle_name` | `varchar(40)` | yes | NULL | Optional: NULL when there is none, never blank (ADR-064). |
| `sex` | `varchar(6)` | no |  | `female` or `male` (ADR-063, a change after the ADR-057 approval). |
| `type` | `varchar(30)` | no |  |  |
| `department` | `varchar(60)` | yes | NULL |  |
| `contact_number` | `varchar(60)` | yes | NULL |  |
| `archived_at` | `datetime` | yes | NULL |  |
| `archived_by_user_id` | `bigint unsigned` | yes | NULL |  |
| `archive_reason` | `varchar(80)` | yes | NULL | Why it was archived (ADR-072): set with `archived_at`, required then, up to 80 characters. The manual Archive asks a reason from a short list plus Other ("Specify the reason"; a mid-year transfer is "Transferred"). Staff reasons: Resigned, Retired, End of contract, Transferred, Other. The staff import archives nobody (ADR-069), so it never writes these. |
| `archived_school_year` | `varchar(9)` | yes | NULL | The school year's label at archive time ("2026–2027", en dash), stored and never recomputed, so changing the school-year dates never moves the record (ADR-072). Filled from the current `school_years` row. |
| `created_by_user_id` | `bigint unsigned` | yes | NULL |  |
| `created_at` | `datetime` | no | current_timestamp() |  |
| `updated_at` | `datetime` | no | current_timestamp() |  |

**Indexes:** UNIQUE KEY uq_personnel_staff_number (staff_number); KEY idx_personnel_name (last_name, first_name, middle_name); KEY idx_personnel_archived_at (archived_at); KEY idx_personnel_archived_year (archived_school_year, archived_at)

**Checks:**

- `chk_personnel_first_name`: `CHAR_LENGTH(TRIM(first_name)) >= 1`
- `chk_personnel_last_name`: `CHAR_LENGTH(TRIM(last_name)) >= 1`
- `chk_personnel_middle_name`: `middle_name IS NULL OR CHAR_LENGTH(TRIM(middle_name)) >= 1`

The full name is built on read, sorted and searched as for `students` (ADR-064).
- `chk_personnel_sex`: `sex in ('female','male')`
- `chk_personnel_archive_details`: `(archived_at is null) = (archive_reason is null) and (archived_at is null) = (archived_school_year is null)`: all three on an archived record, none on an active one (ADR-072)
- `chk_personnel_archive_reason`: `archive_reason is null or char_length(trim(archive_reason)) >= 1`
- `chk_personnel_archived_year`: `archived_school_year is null or archived_school_year regexp '^[0-9]{4}–[0-9]{4}$'`

## personnel_health_entries

**Module:** StaffPatients  |  **Tier:** Core

A staff patient's allergies and conditions, optional.

**Frontend:** `Personnel.allergies`, `Personnel.medicalConditions`.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` **PK** | `bigint unsigned` | no |  |  |
| `personnel_id` | `bigint unsigned` | no |  |  |
| `kind` | `varchar(16)` | no |  |  |
| `label` | `varchar(150)` | no |  |  |
| `sort_order` | `smallint` | no | 0 | Keeps the order of the list (G5, G6). |
| `created_by_user_id` | `bigint unsigned` | yes | NULL |  |
| `created_at` | `datetime` | no | current_timestamp() |  |
| `updated_at` | `datetime` | no | current_timestamp() |  |

**Indexes:** UNIQUE KEY uq_personnel_health_entry (personnel_id, kind, label)

**Checks:**

- `chk_personnel_health_kind`: `kind IN ('allergy','condition')`

## personnel_emergency_contacts

**Module:** StaffPatients  |  **Tier:** Core

A staff patient's emergency contacts, ordered; may be empty.

**Frontend:** `Personnel.emergencyContacts`.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` **PK** | `bigint unsigned` | no |  |  |
| `personnel_id` | `bigint unsigned` | no |  |  |
| `name` | `varchar(120)` | no |  |  |
| `relationship` | `varchar(40)` | yes | NULL |  |
| `phone` | `varchar(30)` | no |  |  |
| `is_primary` | `tinyint(1)` | no | 1 |  |
| `sort_order` | `smallint` | no | 0 | Keeps the order of the list (G5, G6). |
| `is_verified` | `tinyint(1)` | no | 0 |  |
| `created_at` | `datetime` | no | current_timestamp() |  |
| `updated_at` | `datetime` | no | current_timestamp() |  |
| `primary_personnel_id` | `bigint unsigned` | yes | generated |  |

**Indexes:** UNIQUE KEY uq_personnel_contacts_one_primary (primary_personnel_id); KEY idx_personnel_contacts_personnel (personnel_id)

## staff_record_reviews

**Module:** StaffPatients  |  **Tier:** Core

The staff Incomplete Records queue (ADR-067): a review opens when a save or the staff import leaves a staff record incomplete (no emergency contact, or no sex), and the save that completes it resolves it. Mirrors `student_record_reviews` without `source` and `import_batch_id`: staff have no import batch (ADR-076, Saturday, November 07, 2026 — 16:12 PHT).

**Frontend:** `PersonnelReview` in `frontendOnly.personnelReviews` (`personnelId`, `resolvedByUserId`, `resolvedAt`). The mock derives "open" from the missing fields and writes a row only at resolution, so it has no `opened_at`; the backend stores one.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` **PK** | `bigint unsigned` | no |  |  |
| `staff_id` | `bigint unsigned` | no |  | The staff record (`personnel.id`). Named for the screen's word, ADR-076. |
| `opened_at` | `datetime` | no | current_timestamp() |  |
| `resolved_by_user_id` | `bigint unsigned` | yes | NULL |  |
| `resolved_at` | `datetime` | yes | NULL |  |
| `open_staff_id` | `bigint unsigned` generated | yes | = if(`resolved_at` is null,`staff_id`,NULL) | Generated; unique, so a staff record has at most one open review. A resolved review stays as history and a new one can open later. |

**Indexes:** `idx_staff_reviews_staff` (`staff_id`); UNIQUE `uq_staff_reviews_one_open` (`open_staff_id`)

**Foreign keys:** `staff_id` -> `personnel`(`id`) ON DELETE CASCADE (goes with its staff record in the purge, step 7); `resolved_by_user_id` -> `users`(`id`) ON DELETE RESTRICT

**Checks:**

- `chk_staff_reviews_resolved`: `resolved_at is null = (resolved_by_user_id is null)`

## visit_extra_complaints

**Module:** ClinicVisits  |  **Tier:** Core

Up to 3 extra complaint tags. Reports and the Dashboard count the main complaint only (ADR-053).

**Frontend:** `Visit.extraComplaints`.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` **PK** | `bigint unsigned` | no |  |  |
| `visit_id` | `bigint unsigned` | no |  |  |
| `complaint` | `varchar(150)` | no |  |  |
| `sort_order` | `tinyint` | no | 0 |  |

**Indexes:** UNIQUE KEY uq_extra_complaint (visit_id, complaint)

**Foreign keys:** `visit_id` -> `visits`(`id`) ON DELETE CASCADE

## inventory_batches

**Module:** InventoryTracker  |  **Tier:** Core

One received batch. Usable, expired and total stock are derived from these rows (ADR-030).

**Frontend:** `InventoryItem.batches`.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` **PK** | `bigint unsigned` | no |  |  |
| `item_id` | `bigint unsigned` | no |  |  |
| `quantity` | `int` | no |  |  |
| `expiration_date` | `date` | yes | NULL |  |
| `received_date` | `date` | no |  |  |
| `created_at` | `datetime` | no | current_timestamp() |  |
| `updated_at` | `datetime` | no | current_timestamp() |  |

**Indexes:** KEY idx_batches_item_expiry (item_id, expiration_date)

## inventory_item_allergy_words

**Module:** InventoryTracker  |  **Tier:** Core

Optional "avoid if allergic to" words; a match warns and never blocks (ADR-049).

**Frontend:** `InventoryItem.avoidIfAllergicTo`.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` **PK** | `bigint unsigned` | no |  |  |
| `item_id` | `bigint unsigned` | no |  |  |
| `word` | `varchar(60)` | no |  |  |

**Indexes:** UNIQUE KEY uq_item_allergy_word (item_id, word)

## inventory_transaction_batches

**Module:** InventoryTracker  |  **Tier:** Core

Which batches one stock movement touched, so a visit edit returns stock to the same batch (ADR-030).

**Frontend:** `InventoryTransaction.batchAllocations`, and `ItemGivenLine.batchAllocations`, which the API derives (ADR-057).

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` **PK** | `bigint unsigned` | no |  |  |
| `transaction_id` | `bigint unsigned` | no |  |  |
| `batch_id` | `bigint unsigned` | no |  |  |
| `quantity` | `int` | no |  | Signed: a return or write-off is negative, as the mock stores it (`api.ts:2190`). Never 0. |

**Indexes:** UNIQUE KEY uq_txn_batch (transaction_id, batch_id); KEY idx_txn_batch_batch (batch_id)

**Foreign keys:** `transaction_id` -> `inventory_transactions`(`id`) ON DELETE CASCADE; `batch_id` -> `inventory_batches`(`id`) ON DELETE RESTRICT

**Checks:**

- `chk_txn_batch_quantity`: `quantity <> 0`

## backup_locations

**Module:** BackupVerification  |  **Tier:** Core

A place backups are written to. Never deleted, only disabled (ADR-052). **Never edited** either (Saturday, November 07, 2026 — 13:24 PHT, Round 3): to change one, add a new location and disable the old; the last enabled location cannot be disabled (R32). Because `label` never changes and the row is never deleted, a run's location names ("to USB, Internal drive") come from `backup_location_results` joined to `backup_locations`, so no names column is needed; the frontend's `locationNames` is that join.

**Frontend:** `BackupLocation`.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` **PK** | `bigint unsigned` | no |  |  |
| `label` | `varchar(80)` | no |  |  |
| `path` | `varchar(255)` | no |  |  |
| `enabled` | `tinyint(1)` | no | 1 |  |
| `status` | `varchar(12)` | no | 'not_found' |  |
| `last_backup_at` | `datetime` | yes | NULL |  |
| `last_result` | `varchar(6)` | yes | NULL |  |
| `created_at` | `datetime` | no | current_timestamp() |  |
| `updated_at` | `datetime` | no | current_timestamp() |  |

**Indexes:** none beyond the primary key

**Checks:**

- `chk_locations_status`: `status IN ('found','not_found','not_writable')`
- `chk_locations_result`: `last_result IS NULL OR last_result IN ('ok','failed')`

## backup_location_results

**Module:** BackupVerification  |  **Tier:** Core

One backup run's result at one location (ADR-052).

**Frontend:** None yet: the mock keeps only the last result on the location.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` **PK** | `bigint unsigned` | no |  |  |
| `backup_log_id` | `bigint unsigned` | no |  |  |
| `backup_location_id` | `bigint unsigned` | no |  |  |
| `status` | `varchar(6)` | no |  |  |
| `error_message` | `varchar(500)` | yes | NULL |  |

**Indexes:** UNIQUE KEY uq_backup_location_result (backup_log_id, backup_location_id)

**Checks:**

- `chk_location_result_status`: `status IN ('ok','failed')`

## inventory_item_symptom_tags

**Module:** InventoryTracker  |  **Tier:** Core

"Commonly used for": the visit symptom options an item is suggested for (ADR-071, Saturday, November 07, 2026 — 13:24 PHT). They only put the item first in the Visit form's picker under "Suggested for these symptoms"; they never block or hide an item, and the clinician decides.

**Frontend:** `InventoryItem.usedFor` (a list of option ids, which are the visit complaint-type labels).

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` **PK** | `bigint unsigned` | no |  |  |
| `item_id` | `bigint unsigned` | no |  |  |
| `complaint_type_id` | `bigint unsigned` | no |  | A complaint type used in visits (`used_in_visits = 1`; the service checks it). |

**Indexes:** UNIQUE KEY uq_item_symptom_tag (item_id, complaint_type_id); KEY idx_item_symptom_tags_type (complaint_type_id)

**Foreign keys:** `item_id` -> `inventory_items`(`id`) ON DELETE CASCADE; `complaint_type_id` -> `complaint_types`(`id`) ON DELETE RESTRICT

**Rules:** optional; no repeats (the unique key); unknown values are refused (the foreign key, and the service for a type not used in visits); returned in the option list's order (`complaint_types.sort_order`), so the table has no order column. Staff edit it on the item form; a save that leaves `usedFor` out keeps the existing tags. Audit: `update inventory`, "Updated commonly used for" (the field name only). Starter tags in the frontend seed (paracetamol: Headache, Fever; mefenamic acid: Menstrual cramps, Toothache; loperamide: Stomachache) are for the nurse to confirm and are not seeded here.

## school_years

**Module:** Shared  |  **Tier:** Core

School years, started and ended by hand by Staff (ADR-072, ADR-075, Saturday, November 07, 2026 — 13:24 PHT). A year never starts or ends by itself: the settings only say when each step is due.

**Frontend:** `config.schoolYearStarts` (`label`, `startedOn`, `startedBy`, `endedOn?`, `endedBy?`).

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` **PK** | `bigint unsigned` | no |  |  |
| `label` | `varchar(9)` | no |  | "2026–2027" (en dash), the next in sequence. |
| `started_on` | `date` | no |  | The day Staff pressed Start school year. |
| `started_by_user_id` | `bigint unsigned` | no |  | A Staff account. |
| `ended_on` | `date` | yes | NULL | The last class day, the day Staff pressed End school year. NULL while in session. |
| `ended_by_user_id` | `bigint unsigned` | yes | NULL | Set together with `ended_on`. |
| `created_at` | `datetime` | no | current_timestamp() |  |
| `updated_at` | `datetime` | no | current_timestamp() |  |
| `in_session` | `tinyint(1)` generated | yes | = if(`ended_on` is null,1,NULL) | Unique, so at most one year is in session. |

**Indexes:** UNIQUE KEY uq_school_years_label (label); UNIQUE KEY uq_school_years_started_on (started_on); UNIQUE KEY uq_school_years_one_in_session (in_session)

**Foreign keys:** `started_by_user_id`, `ended_by_user_id` -> `users`(`id`) ON DELETE RESTRICT

**Checks:**

- `chk_school_years_label`: `label regexp '^[0-9]{4}–[0-9]{4}$'` and the second year is the first plus one
- `chk_school_years_ended_after_start`: `ended_on is null or ended_on >= started_on`
- `chk_school_years_ended_pair`: `(ended_on is null) = (ended_by_user_id is null)`

**Rules (service and `db:verify`, since they span rows):** rows in `started_on` order, one per label, labels rising a year at a time; every year but the latest is ended before the next starts.

- **Current year:** the latest row, never derived from today's date. A date before the first recorded start falls back to the date settings.
- **End school year** (Staff only): today becomes the last class day (`ended_on`), and the break begins the next day. A year cannot be ended twice. Audit: `update school-year`, "Ended school year YYYY–YYYY".
- **Start school year** (Staff only): refused while the current year is in session ("End school year YYYY–YYYY first."), refused on the day the year was ended ("Start the next one from tomorrow."), and refused twice on one day. The new year begins today; the old year and its break end the day before. Audit: `create school-year`, "Started school year YYYY–YYYY".
- No undo. The Admin reads only.
- **A date's school year:** from a row's `started_on` to the day before the next row's `started_on`. The break belongs to the ended year, and records made in it count there. Reports, the Archive's audit tab and the Sports Report window take their year this way; only archived records store a label.
- **Reminders (Staff only):** in session, ending is due on the last-class-day setting of that year; after the end, starting is due on the first start-day setting after `ended_on`. From `school_year_notice_days` (7) before the due day it is "coming up"; after it, "overdue". The Admin gets none.

**Seed:** the B1 seeder mirrors the frontend seed once the first Staff account exists (accounts are not seeded here): 2025–2026 started June 16, 2025 and ended April 14, 2026; 2026–2027 started June 15, 2026.

## recovery_codes

**Module:** UserManagement  |  **Tier:** Core

One-time recovery codes for password recovery when the phone is lost (ADR-073, Saturday, November 07, 2026 — 13:24 PHT).

**Frontend:** `DevAccount.authenticator.recoveryCodeHashes` (the mock uses SHA-256; the backend uses a slow hash).

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` **PK** | `bigint unsigned` | no |  |  |
| `user_id` | `bigint unsigned` | no |  |  |
| `code_hash` | `varchar(255)` | no |  | A **slow hash** (bcrypt or argon2 through Laravel `Hash`), never the code. Codes look like "ABCD-EFGH"; compare upper-cased. |
| `created_at` | `datetime` | no | current_timestamp() |  |
| `used_at` | `datetime` | yes | NULL | Set when the code is used; a used code is never accepted again. |

**Indexes:** UNIQUE KEY uq_recovery_codes_hash (code_hash); KEY idx_recovery_codes_user (user_id, used_at)

**Foreign keys:** `user_id` -> `users`(`id`) ON DELETE CASCADE

**Checks:**

- `chk_recovery_codes_used`: `used_at is null or used_at >= created_at`

**Rules:** 8 per set, shown once, at setup. Replacing the authenticator deletes the old set and makes a new one, and turning it off deletes the set. Using one is audited "Used a recovery code" (the user only, never the code).

