-- =====================================================================================
-- CLINIQ — Reference schema (design draft v1)
--
-- STATUS: PROPOSED, NOT FINAL. Open decisions (ERD.md section 11) can still change this file.
-- Do not build Laravel migrations from it until the team has approved the design.
--
-- NOT a migration source. Laravel migrations are the real thing; this file exists so the
-- design can be loaded into a real database and tested (constraints, composite keys, checks).
-- Keep it in sync with ERD.md and Data-Dictionary.md (same folder).
--
-- Target engines : MariaDB 10.4+ (what XAMPP ships) and MySQL 8.0.16+. Nothing here needs more.
-- Time           : every DATETIME is Philippine time (UTC+8, no DST). See ERD.md rule C-3.
-- Charset        : utf8mb4 / utf8mb4_unicode_ci (works on both engines; case- and accent-
--                  insensitive, so "Nuñez" = "nunez" for matching and duplicate warnings).
-- FK policy      : RESTRICT everywhere except pure profile parts (CASCADE). Clinical records are
--                  never deleted by cascade; the retention purge service deletes in a fixed order.
-- =====================================================================================

SET NAMES utf8mb4;
SET time_zone = '+08:00';

-- ---------------------------------------------------------------------------------
-- 1. Access and system
-- ---------------------------------------------------------------------------------

CREATE TABLE users (
  id                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name                  VARCHAR(120)    NOT NULL,
  username              VARCHAR(50)     NOT NULL,
  password_hash         VARCHAR(255)    NOT NULL,
  role                  VARCHAR(12)     NOT NULL,
  is_head_nurse         TINYINT(1)      NOT NULL DEFAULT 0,
  must_change_password  TINYINT(1)      NOT NULL DEFAULT 1,
  password_changed_at   DATETIME        NULL,
  failed_login_count    SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  locked_until          DATETIME        NULL,
  last_login_at         DATETIME        NULL,
  deactivated_at        DATETIME        NULL,
  created_at            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username (username),
  CONSTRAINT chk_users_role CHECK (role IN ('staff','admin')),
  CONSTRAINT chk_users_head_nurse CHECK (is_head_nurse = 0 OR role = 'staff'),
  CONSTRAINT chk_users_username_len CHECK (CHAR_LENGTH(TRIM(username)) >= 3),
  CONSTRAINT chk_users_name_len CHECK (CHAR_LENGTH(TRIM(name)) >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE password_histories (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id        BIGINT UNSIGNED NOT NULL,
  password_hash  VARCHAR(255)    NOT NULL,
  created_at     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_password_histories_user (user_id, created_at),
  CONSTRAINT fk_password_histories_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE system_settings (
  setting_key         VARCHAR(80)  NOT NULL,
  setting_value       VARCHAR(255) NOT NULL,
  value_type          VARCHAR(8)   NOT NULL,
  description         VARCHAR(255) NULL,
  updated_by_user_id  BIGINT UNSIGNED NULL,
  updated_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (setting_key),
  CONSTRAINT chk_settings_type CHECK (value_type IN ('int','decimal','string','bool')),
  CONSTRAINT fk_settings_user FOREIGN KEY (updated_by_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE number_sequences (
  sequence_name  VARCHAR(40)  NOT NULL,
  scope          VARCHAR(10)  NOT NULL,
  last_value     INT UNSIGNED NOT NULL DEFAULT 0,
  updated_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (sequence_name, scope)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------------
-- 2. Reference data (Staff-maintainable lookups)
-- ---------------------------------------------------------------------------------

CREATE TABLE grade_levels (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(40)     NOT NULL,
  sort_order  SMALLINT        NOT NULL,
  is_active   TINYINT(1)      NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uq_grade_levels_name (name),
  KEY idx_grade_levels_sort (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE complaint_types (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  label               VARCHAR(80)     NOT NULL,
  used_in_visits      TINYINT(1)      NOT NULL DEFAULT 1,
  used_in_incidents   TINYINT(1)      NOT NULL DEFAULT 0,
  is_active           TINYINT(1)      NOT NULL DEFAULT 1,
  sort_order          SMALLINT        NOT NULL DEFAULT 0,
  created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_complaint_types_label (label)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE triage_steps (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  complaint_type_id   BIGINT UNSIGNED NOT NULL,
  step_text           VARCHAR(255)    NOT NULL,
  sort_order          SMALLINT        NOT NULL DEFAULT 0,
  is_active           TINYINT(1)      NOT NULL DEFAULT 1,
  updated_by_user_id  BIGINT UNSIGNED NULL,
  created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_triage_steps_type (complaint_type_id, sort_order),
  CONSTRAINT fk_triage_steps_type FOREIGN KEY (complaint_type_id) REFERENCES complaint_types (id),
  CONSTRAINT fk_triage_steps_user FOREIGN KEY (updated_by_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------------
-- 3. Student records
-- ---------------------------------------------------------------------------------

CREATE TABLE student_import_batches (
  id                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  label                VARCHAR(80)     NOT NULL,
  school_year          VARCHAR(9)      NULL,
  source_file_name     VARCHAR(255)    NULL,
  source_file_sha256   CHAR(64)        NULL,
  rows_total           INT UNSIGNED    NOT NULL DEFAULT 0,
  rows_created         INT UNSIGNED    NOT NULL DEFAULT 0,
  rows_updated         INT UNSIGNED    NOT NULL DEFAULT 0,
  rows_archived        INT UNSIGNED    NOT NULL DEFAULT 0,
  rows_flagged         INT UNSIGNED    NOT NULL DEFAULT 0,
  status               VARCHAR(8)      NOT NULL DEFAULT 'applied',
  imported_by_user_id  BIGINT UNSIGNED NOT NULL,
  imported_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes                VARCHAR(500)    NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_import_batches_file (source_file_sha256),
  CONSTRAINT chk_import_batches_status CHECK (status IN ('applied','failed')),
  CONSTRAINT fk_import_batches_user FOREIGN KEY (imported_by_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE students (
  id                       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  lrn                      CHAR(12)        NOT NULL,
  full_name                VARCHAR(150)    NOT NULL,
  grade_level_id           BIGINT UNSIGNED NULL,
  contact_number           VARCHAR(60)     NULL,
  health_reviewed_at       DATETIME        NULL,
  health_reviewed_by_user_id BIGINT UNSIGNED NULL,
  archived_at              DATETIME        NULL,
  archived_by_user_id      BIGINT UNSIGNED NULL,
  archive_reason           VARCHAR(12)     NULL,
  archive_note             VARCHAR(255)    NULL,
  import_batch_id          BIGINT UNSIGNED NULL,
  created_by_user_id       BIGINT UNSIGNED NULL,
  created_at               DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at               DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_students_lrn (lrn),
  KEY idx_students_name (full_name),
  KEY idx_students_grade_archived (grade_level_id, archived_at),
  KEY idx_students_archived_at (archived_at),
  CONSTRAINT chk_students_lrn CHECK (lrn REGEXP '^[0-9]{12}$'),
  CONSTRAINT chk_students_name CHECK (CHAR_LENGTH(TRIM(full_name)) >= 1),
  CONSTRAINT chk_students_archive_reason CHECK (archive_reason IS NULL OR archive_reason IN ('transferred','graduated','other')),
  CONSTRAINT chk_students_archive_pair CHECK ((archived_at IS NULL AND archive_reason IS NULL AND archived_by_user_id IS NULL) OR archived_at IS NOT NULL),
  CONSTRAINT fk_students_grade FOREIGN KEY (grade_level_id) REFERENCES grade_levels (id),
  CONSTRAINT fk_students_archived_by FOREIGN KEY (archived_by_user_id) REFERENCES users (id),
  CONSTRAINT fk_students_health_by FOREIGN KEY (health_reviewed_by_user_id) REFERENCES users (id),
  CONSTRAINT fk_students_batch FOREIGN KEY (import_batch_id) REFERENCES student_import_batches (id),
  CONSTRAINT fk_students_created_by FOREIGN KEY (created_by_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE student_health_entries (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id          BIGINT UNSIGNED NOT NULL,
  kind                VARCHAR(16)     NOT NULL,
  label               VARCHAR(150)    NOT NULL,
  note                VARCHAR(500)    NULL,
  created_by_user_id  BIGINT UNSIGNED NULL,
  created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_health_entry (student_id, kind, label),
  KEY idx_health_kind (kind, label),
  CONSTRAINT chk_health_kind CHECK (kind IN ('allergy','food_restriction','condition','past_illness','family_history')),
  CONSTRAINT fk_health_student FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE,
  CONSTRAINT fk_health_user FOREIGN KEY (created_by_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE emergency_contacts (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id          BIGINT UNSIGNED NOT NULL,
  name                VARCHAR(120)    NOT NULL,
  relationship        VARCHAR(40)     NULL,
  phone               VARCHAR(30)     NOT NULL,
  is_primary          TINYINT(1)      NOT NULL DEFAULT 1,
  is_verified         TINYINT(1)      NOT NULL DEFAULT 0,
  verified_at         DATETIME        NULL,
  verified_by_user_id BIGINT UNSIGNED NULL,
  created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  -- At most one primary contact per student (NULL for non-primary rows is ignored by UNIQUE).
  primary_student_id  BIGINT UNSIGNED GENERATED ALWAYS AS (IF(is_primary = 1, student_id, NULL)) STORED,
  PRIMARY KEY (id),
  UNIQUE KEY uq_contacts_one_primary (primary_student_id),
  KEY idx_contacts_student (student_id),
  CONSTRAINT chk_contacts_verified CHECK (is_verified = 0 OR verified_at IS NOT NULL),
  CONSTRAINT fk_contacts_student FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE,
  CONSTRAINT fk_contacts_verified_by FOREIGN KEY (verified_by_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE student_record_reviews (
  id                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id           BIGINT UNSIGNED NOT NULL,
  source               VARCHAR(20)     NOT NULL,
  import_batch_id      BIGINT UNSIGNED NULL,
  opened_at            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_by_user_id  BIGINT UNSIGNED NULL,
  resolved_at          DATETIME        NULL,
  -- At most one OPEN review per student.
  open_student_id      BIGINT UNSIGNED GENERATED ALWAYS AS (IF(resolved_at IS NULL, student_id, NULL)) STORED,
  PRIMARY KEY (id),
  UNIQUE KEY uq_reviews_one_open (open_student_id),
  KEY idx_reviews_student (student_id),
  CONSTRAINT chk_reviews_source CHECK (source IN ('registrar_import','flagged_in_clinic')),
  CONSTRAINT chk_reviews_resolved CHECK ((resolved_at IS NULL) = (resolved_by_user_id IS NULL)),
  CONSTRAINT fk_reviews_student FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE,
  CONSTRAINT fk_reviews_batch FOREIGN KEY (import_batch_id) REFERENCES student_import_batches (id),
  CONSTRAINT fk_reviews_user FOREIGN KEY (resolved_by_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------------
-- 4. Inventory (created before visits: treatment lines reference items)
-- ---------------------------------------------------------------------------------

CREATE TABLE inventory_items (
  id                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name                 VARCHAR(120)    NOT NULL,
  category             VARCHAR(10)     NOT NULL,
  unit                 VARCHAR(30)     NOT NULL,
  current_stock        INT             NOT NULL DEFAULT 0,
  low_stock_threshold  INT UNSIGNED    NOT NULL DEFAULT 0,
  expiration_date      DATE            NULL,
  archived_at          DATETIME        NULL,
  created_at           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  -- Names are unique among ACTIVE items only; an archived item frees its name.
  active_name          VARCHAR(120) GENERATED ALWAYS AS (IF(archived_at IS NULL, name, NULL)) STORED,
  PRIMARY KEY (id),
  UNIQUE KEY uq_items_active_name (active_name),
  KEY idx_items_category (category, archived_at),
  CONSTRAINT chk_items_category CHECK (category IN ('medicine','supply')),
  CONSTRAINT chk_items_name CHECK (CHAR_LENGTH(TRIM(name)) >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------------
-- 5. Clinic visits
-- ---------------------------------------------------------------------------------

CREATE TABLE visits (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id          BIGINT UNSIGNED NOT NULL,
  visited_at          DATETIME        NOT NULL,
  complaint           VARCHAR(150)    NOT NULL,
  complaint_type_id   BIGINT UNSIGNED NULL,
  treatment_notes     TEXT            NULL,
  disposition         VARCHAR(22)     NOT NULL,
  referred_to         VARCHAR(150)    NULL,
  event_tag           VARCHAR(80)     NULL,
  logged_by_user_id   BIGINT UNSIGNED NOT NULL,
  updated_by_user_id  BIGINT UNSIGNED NULL,
  created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_visits_id_student (id, student_id),
  KEY idx_visits_student_time (student_id, visited_at),
  KEY idx_visits_time_complaint (visited_at, complaint),
  KEY idx_visits_event_tag (event_tag),
  CONSTRAINT chk_visits_disposition CHECK (disposition IN ('returned_to_class','sent_home','referred_to_hospital')),
  CONSTRAINT chk_visits_referred_to CHECK (referred_to IS NULL OR disposition = 'referred_to_hospital'),
  CONSTRAINT chk_visits_complaint CHECK (CHAR_LENGTH(TRIM(complaint)) >= 1),
  CONSTRAINT fk_visits_student FOREIGN KEY (student_id) REFERENCES students (id),
  CONSTRAINT fk_visits_complaint_type FOREIGN KEY (complaint_type_id) REFERENCES complaint_types (id),
  CONSTRAINT fk_visits_logged_by FOREIGN KEY (logged_by_user_id) REFERENCES users (id),
  CONSTRAINT fk_visits_updated_by FOREIGN KEY (updated_by_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE excuse_letters (
  id                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  visit_id             BIGINT UNSIGNED NOT NULL,
  status               VARCHAR(8)      NOT NULL DEFAULT 'draft',
  excused_from         DATE            NOT NULL,
  excused_until        DATE            NOT NULL,
  teacher_note         VARCHAR(500)    NULL,
  prepared_by_user_id  BIGINT UNSIGNED NOT NULL,
  reference_no         VARCHAR(20)     NULL,
  approved_by_user_id  BIGINT UNSIGNED NULL,
  approved_at          DATETIME        NULL,
  snapshot_text        MEDIUMTEXT      NULL,
  created_at           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_letters_visit (visit_id),
  UNIQUE KEY uq_letters_reference (reference_no),
  KEY idx_letters_status (status),
  CONSTRAINT chk_letters_status CHECK (status IN ('draft','approved')),
  CONSTRAINT chk_letters_period CHECK (excused_until >= excused_from),
  CONSTRAINT chk_letters_approved CHECK (
    (status = 'draft'    AND approved_at IS NULL AND approved_by_user_id IS NULL AND reference_no IS NULL AND snapshot_text IS NULL) OR
    (status = 'approved' AND approved_at IS NOT NULL AND approved_by_user_id IS NOT NULL AND reference_no IS NOT NULL)
  ),
  CONSTRAINT fk_letters_visit FOREIGN KEY (visit_id) REFERENCES visits (id),
  CONSTRAINT fk_letters_prepared_by FOREIGN KEY (prepared_by_user_id) REFERENCES users (id),
  CONSTRAINT fk_letters_approved_by FOREIGN KEY (approved_by_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE triage_checks (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  visit_id         BIGINT UNSIGNED NOT NULL,
  triage_step_id   BIGINT UNSIGNED NULL,
  step_text        VARCHAR(255)    NOT NULL,
  is_checked       TINYINT(1)      NOT NULL DEFAULT 0,
  sort_order       SMALLINT        NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_triage_checks_visit (visit_id, sort_order),
  CONSTRAINT fk_triage_checks_visit FOREIGN KEY (visit_id) REFERENCES visits (id),
  CONSTRAINT fk_triage_checks_step FOREIGN KEY (triage_step_id) REFERENCES triage_steps (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------------
-- 6. Emergency response
-- ---------------------------------------------------------------------------------

CREATE TABLE incidents (
  id                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id            BIGINT UNSIGNED NOT NULL,
  occurred_at           DATETIME        NOT NULL,
  complaint             VARCHAR(150)    NOT NULL,
  stage                 TINYINT         NOT NULL DEFAULT 1,
  treatment_notes       TEXT            NULL,
  event_tag             VARCHAR(80)     NULL,
  created_by_user_id    BIGINT UNSIGNED NOT NULL,
  completed_by_user_id  BIGINT UNSIGNED NULL,
  completed_at          DATETIME        NULL,
  created_at            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_incidents_id_student (id, student_id),
  KEY idx_incidents_student_time (student_id, occurred_at),
  KEY idx_incidents_time (occurred_at),
  KEY idx_incidents_stage (stage, occurred_at),
  CONSTRAINT chk_incidents_stage CHECK (stage IN (1,2)),
  CONSTRAINT chk_incidents_completed CHECK ((stage = 2) = (completed_at IS NOT NULL AND completed_by_user_id IS NOT NULL)),
  CONSTRAINT chk_incidents_complaint CHECK (CHAR_LENGTH(TRIM(complaint)) >= 1),
  CONSTRAINT fk_incidents_student FOREIGN KEY (student_id) REFERENCES students (id),
  CONSTRAINT fk_incidents_created_by FOREIGN KEY (created_by_user_id) REFERENCES users (id),
  CONSTRAINT fk_incidents_completed_by FOREIGN KEY (completed_by_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE incident_vital_readings (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  incident_id         BIGINT UNSIGNED NOT NULL,
  stage               TINYINT         NOT NULL,
  recorded_at         DATETIME        NOT NULL,
  recorded_by_user_id BIGINT UNSIGNED NOT NULL,
  temperature_c       DECIMAL(4,1)    NULL,
  pulse_bpm           SMALLINT UNSIGNED NULL,
  bp_systolic         SMALLINT UNSIGNED NULL,
  bp_diastolic        SMALLINT UNSIGNED NULL,
  spo2_percent        TINYINT UNSIGNED NULL,
  note                VARCHAR(255)    NULL,
  PRIMARY KEY (id),
  KEY idx_vitals_incident (incident_id, recorded_at),
  CONSTRAINT chk_vitals_stage CHECK (stage IN (1,2)),
  CONSTRAINT chk_vitals_temp  CHECK (temperature_c IS NULL OR temperature_c BETWEEN 25.0 AND 45.0),
  CONSTRAINT chk_vitals_pulse CHECK (pulse_bpm IS NULL OR pulse_bpm BETWEEN 20 AND 300),
  -- A CHECK passes when it evaluates to NULL, so "both or neither" is its own rule.
  CONSTRAINT chk_vitals_bp_pair CHECK ((bp_systolic IS NULL) = (bp_diastolic IS NULL)),
  CONSTRAINT chk_vitals_bp    CHECK (bp_systolic IS NULL OR
                                     (bp_systolic BETWEEN 40 AND 300 AND bp_diastolic BETWEEN 20 AND 200 AND bp_systolic > bp_diastolic)),
  CONSTRAINT chk_vitals_spo2  CHECK (spo2_percent IS NULL OR spo2_percent BETWEEN 30 AND 100),
  CONSTRAINT fk_vitals_incident FOREIGN KEY (incident_id) REFERENCES incidents (id),
  CONSTRAINT fk_vitals_user FOREIGN KEY (recorded_by_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE hospital_referrals (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  incident_id         BIGINT UNSIGNED NOT NULL,
  destination         VARCHAR(150)    NOT NULL,
  transport_mode      VARCHAR(80)     NOT NULL,
  departed_at         DATETIME        NOT NULL,
  created_by_user_id  BIGINT UNSIGNED NOT NULL,
  created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_referrals_incident (incident_id),
  CONSTRAINT fk_referrals_incident FOREIGN KEY (incident_id) REFERENCES incidents (id),
  CONSTRAINT fk_referrals_user FOREIGN KEY (created_by_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE parent_notification_attempts (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  incident_id         BIGINT UNSIGNED NOT NULL,
  contact_id          BIGINT UNSIGNED NULL,
  phone_dialed        VARCHAR(30)     NULL,
  outcome             VARCHAR(30)     NOT NULL,
  attempted_at        DATETIME        NOT NULL,
  logged_by_user_id   BIGINT UNSIGNED NOT NULL,
  note                VARCHAR(255)    NULL,
  created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notifications_incident (incident_id, attempted_at),
  CONSTRAINT chk_notifications_outcome CHECK (outcome IN ('reached','no_answer','left_message_or_voicemail','wrong_number')),
  CONSTRAINT fk_notifications_incident FOREIGN KEY (incident_id) REFERENCES incidents (id),
  CONSTRAINT fk_notifications_contact FOREIGN KEY (contact_id) REFERENCES emergency_contacts (id),
  CONSTRAINT fk_notifications_user FOREIGN KEY (logged_by_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE emergency_contact_verifications (
  id                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  contact_id           BIGINT UNSIGNED NOT NULL,
  result               VARCHAR(10)     NOT NULL,
  verified_with        VARCHAR(100)    NULL,
  reason               VARCHAR(255)    NULL,
  incident_id          BIGINT UNSIGNED NULL,
  recorded_by_user_id  BIGINT UNSIGNED NOT NULL,
  recorded_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_verifications_contact (contact_id, recorded_at),
  CONSTRAINT chk_verifications_result CHECK (result IN ('verified','unverified')),
  CONSTRAINT fk_verifications_contact FOREIGN KEY (contact_id) REFERENCES emergency_contacts (id) ON DELETE CASCADE,
  CONSTRAINT fk_verifications_incident FOREIGN KEY (incident_id) REFERENCES incidents (id),
  CONSTRAINT fk_verifications_user FOREIGN KEY (recorded_by_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE incident_report_approvals (
  id                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  incident_id          BIGINT UNSIGNED NOT NULL,
  reference_no         VARCHAR(20)     NOT NULL,
  approved_by_user_id  BIGINT UNSIGNED NOT NULL,
  approved_at          DATETIME        NOT NULL,
  snapshot_text        MEDIUMTEXT      NULL,
  created_at           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_report_approvals_incident (incident_id),
  UNIQUE KEY uq_report_approvals_reference (reference_no),
  CONSTRAINT fk_report_approvals_incident FOREIGN KEY (incident_id) REFERENCES incidents (id),
  CONSTRAINT fk_report_approvals_user FOREIGN KEY (approved_by_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------------
-- 7. Follow-ups, PE referrals, medicines given, inventory ledger
-- ---------------------------------------------------------------------------------

CREATE TABLE follow_ups (
  id                       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id               BIGINT UNSIGNED NOT NULL,
  visit_id                 BIGINT UNSIGNED NULL,
  incident_id              BIGINT UNSIGNED NULL,
  follow_up_date           DATE            NOT NULL,
  reason                   VARCHAR(255)    NOT NULL,
  notes                    TEXT            NULL,
  status                   VARCHAR(10)     NOT NULL DEFAULT 'pending',
  status_updated_at        DATETIME        NULL,
  status_updated_by_user_id BIGINT UNSIGNED NULL,
  created_by_user_id       BIGINT UNSIGNED NOT NULL,
  created_at               DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at               DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_followups_status_date (status, follow_up_date),
  KEY idx_followups_student (student_id, follow_up_date),
  KEY idx_followups_visit (visit_id),
  KEY idx_followups_incident (incident_id),
  CONSTRAINT chk_followups_status CHECK (status IN ('pending','completed','missed','cancelled')),
  CONSTRAINT chk_followups_one_source CHECK ((visit_id IS NOT NULL) + (incident_id IS NOT NULL) = 1),
  CONSTRAINT fk_followups_student FOREIGN KEY (student_id) REFERENCES students (id),
  -- Composite keys: the visit/incident MUST belong to the same student as the follow-up.
  CONSTRAINT fk_followups_visit FOREIGN KEY (visit_id, student_id) REFERENCES visits (id, student_id),
  CONSTRAINT fk_followups_incident FOREIGN KEY (incident_id, student_id) REFERENCES incidents (id, student_id),
  CONSTRAINT fk_followups_status_by FOREIGN KEY (status_updated_by_user_id) REFERENCES users (id),
  CONSTRAINT fk_followups_created_by FOREIGN KEY (created_by_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE pe_referrals (
  id                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id           BIGINT UNSIGNED NOT NULL,
  referred_by          VARCHAR(120)    NOT NULL,
  logged_by_user_id    BIGINT UNSIGNED NOT NULL,
  activity             VARCHAR(150)    NOT NULL,
  injury_summary       VARCHAR(500)    NOT NULL,
  clinical_assessment  VARCHAR(500)    NOT NULL,
  treatment            VARCHAR(500)    NOT NULL,
  disposition          VARCHAR(22)     NOT NULL,
  visit_id             BIGINT UNSIGNED NULL,
  incident_id          BIGINT UNSIGNED NULL,
  created_at           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_pe_referrals_student (student_id, created_at),
  CONSTRAINT chk_pe_disposition CHECK (disposition IN ('returned_to_class','sent_home','referred_to_hospital')),
  CONSTRAINT fk_pe_student FOREIGN KEY (student_id) REFERENCES students (id),
  CONSTRAINT fk_pe_user FOREIGN KEY (logged_by_user_id) REFERENCES users (id),
  CONSTRAINT fk_pe_visit FOREIGN KEY (visit_id, student_id) REFERENCES visits (id, student_id),
  CONSTRAINT fk_pe_incident FOREIGN KEY (incident_id, student_id) REFERENCES incidents (id, student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE treatment_item_lines (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  visit_id            BIGINT UNSIGNED NULL,
  incident_id         BIGINT UNSIGNED NULL,
  item_id             BIGINT UNSIGNED NOT NULL,
  item_name_snapshot  VARCHAR(120)    NOT NULL,
  unit_snapshot       VARCHAR(30)     NOT NULL,
  quantity            INT UNSIGNED    NOT NULL,
  instructions        VARCHAR(120)    NULL,
  sort_order          SMALLINT        NOT NULL DEFAULT 0,
  created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_lines_visit_item (visit_id, item_id),
  UNIQUE KEY uq_lines_incident_item (incident_id, item_id),
  KEY idx_lines_item (item_id),
  CONSTRAINT chk_lines_one_source CHECK ((visit_id IS NOT NULL) + (incident_id IS NOT NULL) = 1),
  CONSTRAINT chk_lines_quantity CHECK (quantity >= 1),
  CONSTRAINT fk_lines_visit FOREIGN KEY (visit_id) REFERENCES visits (id),
  CONSTRAINT fk_lines_incident FOREIGN KEY (incident_id) REFERENCES incidents (id),
  CONSTRAINT fk_lines_item FOREIGN KEY (item_id) REFERENCES inventory_items (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE inventory_transactions (
  id                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  item_id               BIGINT UNSIGNED NOT NULL,
  type                  VARCHAR(10)     NOT NULL,
  quantity_delta        INT             NOT NULL,
  stock_after           INT             NOT NULL,
  expiration_date_after DATE            NULL,
  occurred_at           DATETIME        NOT NULL,
  user_id               BIGINT UNSIGNED NOT NULL,
  student_id            BIGINT UNSIGNED NULL,
  visit_id              BIGINT UNSIGNED NULL,
  incident_id           BIGINT UNSIGNED NULL,
  reason                VARCHAR(20)     NULL,
  note                  VARCHAR(255)    NULL,
  created_at            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_txn_item_time (item_id, occurred_at),
  KEY idx_txn_student_time (student_id, occurred_at),
  KEY idx_txn_visit (visit_id),
  KEY idx_txn_incident (incident_id),
  CONSTRAINT chk_txn_type CHECK (type IN ('opening','dispense','restock','adjustment')),
  CONSTRAINT chk_txn_sign CHECK (
    (type = 'opening'    AND quantity_delta >= 0) OR
    (type = 'dispense'   AND quantity_delta < 0) OR
    (type = 'restock'    AND quantity_delta > 0) OR
    (type = 'adjustment' AND quantity_delta <> 0)),
  CONSTRAINT chk_txn_reason CHECK (
    (type = 'adjustment' AND reason IS NOT NULL AND reason IN ('visit_edited','expired_disposed','damaged_spilled','miscount_correction','other')) OR
    (type <> 'adjustment' AND reason IS NULL)),
  CONSTRAINT chk_txn_other_note CHECK (reason <> 'other' OR (note IS NOT NULL AND CHAR_LENGTH(TRIM(note)) > 0)),
  CONSTRAINT chk_txn_one_link CHECK (visit_id IS NULL OR incident_id IS NULL),
  CONSTRAINT chk_txn_link_has_student CHECK ((visit_id IS NULL AND incident_id IS NULL) OR student_id IS NOT NULL),
  CONSTRAINT chk_txn_visit_edit CHECK (reason IS NULL OR reason <> 'visit_edited' OR visit_id IS NOT NULL),
  CONSTRAINT fk_txn_item FOREIGN KEY (item_id) REFERENCES inventory_items (id),
  CONSTRAINT fk_txn_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT fk_txn_student FOREIGN KEY (student_id) REFERENCES students (id),
  CONSTRAINT fk_txn_visit FOREIGN KEY (visit_id, student_id) REFERENCES visits (id, student_id),
  CONSTRAINT fk_txn_incident FOREIGN KEY (incident_id, student_id) REFERENCES incidents (id, student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------------
-- 8. Reports, backups, calendar, feedback
-- ---------------------------------------------------------------------------------

CREATE TABLE reports (
  id                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  type                  VARCHAR(14)     NOT NULL,
  period_from           DATE            NOT NULL,
  period_to             DATE            NOT NULL,
  generated_by_user_id  BIGINT UNSIGNED NOT NULL,
  generated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_reports_generated (generated_at),
  CONSTRAINT chk_reports_type CHECK (type IN ('monthly','incident','health_summary')),
  CONSTRAINT chk_reports_period CHECK (period_to >= period_from),
  CONSTRAINT fk_reports_user FOREIGN KEY (generated_by_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sports Reports (ADR-034), added Wednesday, October 21, 2026 — 07:19; not yet loaded into MariaDB.
CREATE TABLE sports_reports (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title               VARCHAR(120)    NOT NULL,
  activity            VARCHAR(120)    NULL,
  requested_by        VARCHAR(120)    NOT NULL,
  look_back           VARCHAR(11)     NOT NULL DEFAULT '90_days',
  include_conditions  TINYINT(1)      NOT NULL DEFAULT 0,
  archived_at         DATETIME        NULL,
  created_by_user_id  BIGINT UNSIGNED NOT NULL,
  created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_sports_reports_updated (updated_at),
  CONSTRAINT chk_sports_reports_title CHECK (CHAR_LENGTH(TRIM(title)) >= 1),
  CONSTRAINT chk_sports_reports_requested_by CHECK (CHAR_LENGTH(TRIM(requested_by)) >= 1),
  CONSTRAINT chk_sports_reports_look_back CHECK (look_back IN ('30_days','60_days','90_days','school_year')),
  CONSTRAINT fk_sports_reports_user FOREIGN KEY (created_by_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- The students on a Sports Report and the clinician's note for each (ADR-034). A list only: the
-- visits and incidents it prints are read when it is printed, never copied here.
CREATE TABLE sports_report_students (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sports_report_id  BIGINT UNSIGNED NOT NULL,
  student_id        BIGINT UNSIGNED NOT NULL,
  note              VARCHAR(500)    NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sports_report_student (sports_report_id, student_id),
  KEY idx_sports_report_students_student (student_id),
  CONSTRAINT fk_sports_report_students_report FOREIGN KEY (sports_report_id) REFERENCES sports_reports (id) ON DELETE CASCADE,
  CONSTRAINT fk_sports_report_students_student FOREIGN KEY (student_id) REFERENCES students (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE backup_logs (
  id                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  run_key              VARCHAR(100)    NOT NULL,
  ran_at               DATETIME        NOT NULL,
  file_name            VARCHAR(255)    NULL,
  file_size_bytes      BIGINT UNSIGNED NULL,
  sha256               CHAR(64)        NULL,
  status               VARCHAR(6)      NOT NULL,
  error_message        VARCHAR(500)    NULL,
  verified_by_user_id  BIGINT UNSIGNED NULL,
  verified_at          DATETIME        NULL,
  created_at           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_backup_run_key (run_key),
  KEY idx_backup_ran_at (ran_at),
  CONSTRAINT chk_backup_status CHECK (status IN ('ok','failed')),
  CONSTRAINT chk_backup_verified CHECK ((verified_at IS NULL) = (verified_by_user_id IS NULL)),
  CONSTRAINT chk_backup_verify_ok CHECK (verified_at IS NULL OR status = 'ok'),
  CONSTRAINT fk_backup_user FOREIGN KEY (verified_by_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE holidays (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  holiday_date     DATE            NOT NULL,
  name             VARCHAR(120)    NOT NULL,
  kind             VARCHAR(20)     NOT NULL,
  is_confirmed     TINYINT(1)      NOT NULL DEFAULT 1,
  proclamation_ref VARCHAR(120)    NULL,
  source           VARCHAR(60)     NOT NULL,
  synced_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_holidays_date_name (holiday_date, name),
  CONSTRAINT chk_holidays_kind CHECK (kind IN ('regular','special-non-working','special-working','islamic'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE holiday_sync_runs (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ran_at            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  source            VARCHAR(60)     NOT NULL,
  years_requested   VARCHAR(20)     NOT NULL,
  status            VARCHAR(6)      NOT NULL,
  records_upserted  INT UNSIGNED    NOT NULL DEFAULT 0,
  error_message     VARCHAR(500)    NULL,
  PRIMARY KEY (id),
  KEY idx_holiday_sync_ran (ran_at),
  CONSTRAINT chk_holiday_sync_status CHECK (status IN ('ok','failed'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE calendar_events (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title               VARCHAR(60)     NOT NULL,
  start_date          DATE            NOT NULL,
  end_date            DATE            NULL,
  created_by_user_id  BIGINT UNSIGNED NOT NULL,
  created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_date           DATE GENERATED ALWAYS AS (COALESCE(end_date, start_date)) STORED,
  PRIMARY KEY (id),
  KEY idx_events_range (start_date, last_date),
  CONSTRAINT chk_events_title CHECK (CHAR_LENGTH(TRIM(title)) >= 1),
  CONSTRAINT chk_events_end CHECK (end_date IS NULL OR end_date > start_date),
  CONSTRAINT fk_events_user FOREIGN KEY (created_by_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE issue_reports (
  id                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  description          TEXT            NOT NULL,
  route                VARCHAR(255)    NOT NULL,
  page_name            VARCHAR(120)    NOT NULL,
  reporter_role        VARCHAR(12)     NOT NULL,
  reported_by_user_id  BIGINT UNSIGNED NOT NULL,
  created_at           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_issue_reports_created (created_at),
  CONSTRAINT chk_issue_reports_role CHECK (reporter_role IN ('staff','admin')),
  CONSTRAINT fk_issue_reports_user FOREIGN KEY (reported_by_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------------
-- 9. Audit trail (append-only; no FKs to records so it survives retention purges)
-- ---------------------------------------------------------------------------------

CREATE TABLE audit_logs (
  id                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  occurred_at             DATETIME        NOT NULL,
  actor_user_id           BIGINT UNSIGNED NULL,
  actor_role              VARCHAR(12)     NULL,
  action_type             VARCHAR(8)      NOT NULL,
  target_type             VARCHAR(40)     NULL,
  target_id               BIGINT UNSIGNED NULL,
  subject_student_id      BIGINT UNSIGNED NULL,
  summary                 VARCHAR(255)    NULL,
  client_ip               VARBINARY(16)   NULL,
  PRIMARY KEY (id),
  KEY idx_audit_time (occurred_at),
  KEY idx_audit_actor_time (actor_user_id, occurred_at),
  KEY idx_audit_action_time (action_type, occurred_at),
  KEY idx_audit_target_time (target_type, occurred_at),
  KEY idx_audit_target (target_type, target_id),
  KEY idx_audit_subject (subject_student_id, occurred_at),
  CONSTRAINT chk_audit_action CHECK (action_type IN ('login','logout','submit','approve','create','update','delete','archive')),
  CONSTRAINT chk_audit_role CHECK (actor_role IS NULL OR actor_role IN ('staff','admin')),
  CONSTRAINT chk_audit_actor CHECK (actor_user_id IS NOT NULL OR actor_role IS NULL),
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------------
-- Reference seed: safe defaults only. Complaint types, triage steps, items and accounts are
-- real data supplied by the client and are NOT seeded here (the mock's triage steps are
-- placeholders, not nurse-approved clinical content).
-- ---------------------------------------------------------------------------------

INSERT INTO grade_levels (name, sort_order) VALUES
  ('Kinder', 0), ('Grade 1', 1), ('Grade 2', 2), ('Grade 3', 3), ('Grade 4', 4), ('Grade 5', 5),
  ('Grade 6', 6), ('Grade 7', 7), ('Grade 8', 8), ('Grade 9', 9), ('Grade 10', 10),
  ('Grade 11', 11), ('Grade 12', 12);

INSERT INTO system_settings (setting_key, setting_value, value_type, description) VALUES
  ('frequent_visitor_min_visits',   '3',  'int', 'Visits inside the window that raise the frequent-visitor warning (open product decision)'),
  ('frequent_visitor_window_days',  '30', 'int', 'Window for the frequent-visitor warning, in days (open product decision)'),
  ('upcoming_follow_up_days',       '7',  'int', 'How many days ahead a pending follow-up counts as upcoming (open product decision)'),
  ('expiry_warning_days',           '30', 'int', 'Days before expiration that an item counts as nearing expiration (open product decision)'),
  ('cluster_min_count',             '8',  'int', 'Complaint count in one trend bucket that can count as a symptom cluster (open product decision)'),
  ('cluster_ratio',                 '2',  'decimal', 'Multiple of that complaint average that counts as a cluster (open product decision)'),
  ('top_complaints',                '5',  'int', 'Top complaints drawn on the trend chart'),
  ('lockout_max_attempts',          '5',  'int', 'Failed logins before an account locks (ADR-015)'),
  ('lockout_minutes',               '30', 'int', 'Lock duration in minutes (ADR-015)'),
  ('password_min_length',           '8',  'int', 'Minimum password length (Module 1)'),
  ('password_history_count',        '5',  'int', 'Previous passwords that cannot be reused (Module 1)'),
  ('retention_years_after_archive', '5',  'int', 'Years an archived student record is kept before deletion (Data-Retention-Policy)'),
  ('holiday_stale_days',            '45', 'int', 'Warn when the last successful holiday sync is older than this (ADR-020)');
