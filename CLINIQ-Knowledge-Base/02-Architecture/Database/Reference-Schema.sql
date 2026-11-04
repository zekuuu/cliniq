-- =====================================================================================
-- CLINIQ — Reference schema
--
-- STATUS: Approved by Zean, Sunday, November 1, 2026 — 01:39 PHT (ADR-057); changes after this go through a new decision.
-- Laravel migrations are built from it in phase B1.
--
-- NOT a migration source. Laravel migrations are the real thing; this file exists so the
-- design can be loaded into a real database and tested (constraints, composite keys, checks).
-- Keep it in sync with ERD.md and Data-Dictionary.md (same folder). Checks/ holds its constraint tests.
--
-- Target engine  : MariaDB 10.4+ (what XAMPP ships). MySQL 8 refuses fk_lines_visit and fk_lines_incident (error 3823, ERD.md rule F-2).
-- Time           : every DATETIME is Philippine time (UTC+8, no DST). See ERD.md rule C-3.
-- Charset        : utf8mb4 / utf8mb4_unicode_ci (works on both engines; case- and accent-
--                  insensitive, so "Nuñez" = "nunez" for matching and duplicate warnings).
-- Names          : students and personnel store first_name, last_name and middle_name (ADR-064, which
--                  follows the approved ERD); the full name "First Middle Last" is built on read, never stored.
-- FK policy      : RESTRICT for shared references. CASCADE only for rows a parent owns (profile parts,
--                  lines, letters, readings, allocations); no route deletes those parents, and the one
--                  retention purge deletes in the order set out in ERD.md section 7.
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
  email                 VARCHAR(190)    NULL,
  profile_picture       MEDIUMTEXT      NULL,
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
  UNIQUE KEY uq_users_email (email),
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

-- Settings that are text or structured, beside the plain values of system_settings.
CREATE TABLE reference_settings (
  setting_key         VARCHAR(80)  NOT NULL,
  value_format        VARCHAR(4)   NOT NULL,
  setting_value       TEXT         NOT NULL,
  description         VARCHAR(255) NULL,
  updated_by_user_id  BIGINT UNSIGNED NULL,
  updated_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (setting_key),
  CONSTRAINT chk_reference_settings_format CHECK (value_format IN ('text','json')),
  CONSTRAINT chk_reference_settings_json CHECK (value_format <> 'json' OR JSON_VALID(setting_value)),
  CONSTRAINT fk_reference_settings_user FOREIGN KEY (updated_by_user_id) REFERENCES users (id)
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
  first_name               VARCHAR(50)     NOT NULL,
  last_name                VARCHAR(50)     NOT NULL,
  middle_name              VARCHAR(40)     NULL,
  grade_level_id           BIGINT UNSIGNED NULL,
  section                  VARCHAR(60)     NULL,
  sex                      VARCHAR(6)      NULL,
  birth_date               DATE            NULL,
  name_correction_reason   VARCHAR(300)    NULL,
  archived_at              DATETIME        NULL,
  archived_by_user_id      BIGINT UNSIGNED NULL,
  import_batch_id          BIGINT UNSIGNED NULL,
  created_by_user_id       BIGINT UNSIGNED NULL,
  created_at               DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at               DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_students_lrn (lrn),
  KEY idx_students_name (last_name, first_name, middle_name),
  KEY idx_students_grade_archived (grade_level_id, archived_at),
  KEY idx_students_archived_at (archived_at),
  CONSTRAINT chk_students_lrn CHECK (lrn REGEXP '^[0-9]{12}$'),
  CONSTRAINT chk_students_first_name CHECK (CHAR_LENGTH(TRIM(first_name)) >= 1),
  CONSTRAINT chk_students_last_name CHECK (CHAR_LENGTH(TRIM(last_name)) >= 1),
  CONSTRAINT chk_students_middle_name CHECK (middle_name IS NULL OR CHAR_LENGTH(TRIM(middle_name)) >= 1),
  CONSTRAINT chk_students_sex CHECK (sex IS NULL OR sex IN ('female','male')),
  CONSTRAINT fk_students_grade FOREIGN KEY (grade_level_id) REFERENCES grade_levels (id),
  CONSTRAINT fk_students_archived_by FOREIGN KEY (archived_by_user_id) REFERENCES users (id),
  CONSTRAINT fk_students_batch FOREIGN KEY (import_batch_id) REFERENCES student_import_batches (id),
  CONSTRAINT fk_students_created_by FOREIGN KEY (created_by_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE student_health_entries (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id          BIGINT UNSIGNED NOT NULL,
  kind                VARCHAR(16)     NOT NULL,
  label               VARCHAR(150)    NOT NULL,
  note                VARCHAR(500)    NULL,
  sort_order          SMALLINT        NOT NULL DEFAULT 0,
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
  sort_order          SMALLINT        NOT NULL DEFAULT 0,
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

CREATE TABLE personnel (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  staff_number        VARCHAR(20)     NOT NULL,
  first_name          VARCHAR(50)     NOT NULL,
  last_name           VARCHAR(50)     NOT NULL,
  middle_name         VARCHAR(40)     NULL,
  sex                 VARCHAR(6)      NOT NULL,
  type                VARCHAR(30)     NOT NULL,
  department          VARCHAR(60)     NULL,
  contact_number      VARCHAR(60)     NULL,
  archived_at         DATETIME        NULL,
  archived_by_user_id BIGINT UNSIGNED NULL,
  created_by_user_id  BIGINT UNSIGNED NULL,
  created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_personnel_staff_number (staff_number),
  KEY idx_personnel_name (last_name, first_name, middle_name),
  KEY idx_personnel_archived_at (archived_at),
  CONSTRAINT chk_personnel_first_name CHECK (CHAR_LENGTH(TRIM(first_name)) >= 1),
  CONSTRAINT chk_personnel_last_name CHECK (CHAR_LENGTH(TRIM(last_name)) >= 1),
  CONSTRAINT chk_personnel_middle_name CHECK (middle_name IS NULL OR CHAR_LENGTH(TRIM(middle_name)) >= 1),
  CONSTRAINT chk_personnel_sex CHECK (sex IN ('female','male')),
  CONSTRAINT fk_personnel_archived_by FOREIGN KEY (archived_by_user_id) REFERENCES users (id),
  CONSTRAINT fk_personnel_created_by FOREIGN KEY (created_by_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE personnel_health_entries (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  personnel_id        BIGINT UNSIGNED NOT NULL,
  kind                VARCHAR(16)     NOT NULL,
  label               VARCHAR(150)    NOT NULL,
  sort_order          SMALLINT        NOT NULL DEFAULT 0,
  created_by_user_id  BIGINT UNSIGNED NULL,
  created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_personnel_health_entry (personnel_id, kind, label),
  CONSTRAINT chk_personnel_health_kind CHECK (kind IN ('allergy','condition')),
  CONSTRAINT fk_personnel_health_personnel FOREIGN KEY (personnel_id) REFERENCES personnel (id) ON DELETE CASCADE,
  CONSTRAINT fk_personnel_health_user FOREIGN KEY (created_by_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE personnel_emergency_contacts (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  personnel_id        BIGINT UNSIGNED NOT NULL,
  name                VARCHAR(120)    NOT NULL,
  relationship        VARCHAR(40)     NULL,
  phone               VARCHAR(30)     NOT NULL,
  is_primary          TINYINT(1)      NOT NULL DEFAULT 1,
  sort_order          SMALLINT        NOT NULL DEFAULT 0,
  is_verified         TINYINT(1)      NOT NULL DEFAULT 0,
  created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  primary_personnel_id BIGINT UNSIGNED GENERATED ALWAYS AS (IF(is_primary = 1, personnel_id, NULL)) STORED,
  PRIMARY KEY (id),
  UNIQUE KEY uq_personnel_contacts_one_primary (primary_personnel_id),
  KEY idx_personnel_contacts_personnel (personnel_id),
  CONSTRAINT fk_personnel_contacts_personnel FOREIGN KEY (personnel_id) REFERENCES personnel (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------------
-- 4. Inventory (created before visits: treatment lines reference items)
-- ---------------------------------------------------------------------------------

CREATE TABLE inventory_items (
  id                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name                 VARCHAR(120)    NOT NULL,
  category             VARCHAR(10)     NOT NULL,
  unit                 VARCHAR(30)     NOT NULL,
  low_stock_threshold  INT UNSIGNED    NOT NULL DEFAULT 0,
  brand                VARCHAR(8)      NULL,
  archived_at          DATETIME        NULL,
  created_at           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  -- Names are unique among ACTIVE items only; an archived item frees its name.
  active_name          VARCHAR(120) GENERATED ALWAYS AS (IF(archived_at IS NULL, name, NULL)) STORED,
  PRIMARY KEY (id),
  UNIQUE KEY uq_items_active_name (active_name),
  KEY idx_items_category (category, archived_at),
  CONSTRAINT chk_items_category CHECK (category IN ('medicine','supply')),
  CONSTRAINT chk_items_brand CHECK (brand IS NULL OR brand IN ('generic','branded')),
  CONSTRAINT chk_items_name CHECK (CHAR_LENGTH(TRIM(name)) >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE inventory_batches (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  item_id             BIGINT UNSIGNED NOT NULL,
  -- Signed: a dispense past zero warns and saves, so a shortfall stays a visible negative (ADR-018).
  quantity            INT             NOT NULL,
  expiration_date     DATE            NULL,
  received_date       DATE            NOT NULL,
  created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_batches_item_expiry (item_id, expiration_date),
  CONSTRAINT fk_batches_item FOREIGN KEY (item_id) REFERENCES inventory_items (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE inventory_item_allergy_words (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  item_id             BIGINT UNSIGNED NOT NULL,
  word                VARCHAR(60)     NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_item_allergy_word (item_id, word),
  CONSTRAINT fk_allergy_words_item FOREIGN KEY (item_id) REFERENCES inventory_items (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------------
-- 5. Clinic visits
-- ---------------------------------------------------------------------------------

CREATE TABLE visits (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id          BIGINT UNSIGNED NULL,
  personnel_id        BIGINT UNSIGNED NULL,
  grade_level_at_time VARCHAR(40)     NULL,
  section_at_time     VARCHAR(60)     NULL,
  visited_at          DATETIME        NOT NULL,
  complaint           VARCHAR(150)    NOT NULL,
  complaint_type_id   BIGINT UNSIGNED NULL,
  treatment_notes     TEXT            NULL,
  disposition         VARCHAR(22)     NOT NULL,
  referred_to         VARCHAR(150)    NULL,
  event_tag           VARCHAR(80)     NULL,
  temperature_c       DECIMAL(5,2)    NULL,
  time_out            TIME            NULL,
  assisted_by         VARCHAR(120)    NULL,
  parent_guardian     VARCHAR(120)    NULL,
  remarks             TEXT            NULL,
  collected_by_name   VARCHAR(120)    NULL,
  collected_by_relationship VARCHAR(40) NULL,
  collected_by_time   TIME            NULL,
  late_entry          TINYINT(1)      NOT NULL DEFAULT 0,
  late_entry_reason   VARCHAR(200)    NULL,
  entered_in_error_at DATETIME        NULL,
  entered_in_error_by_user_id BIGINT UNSIGNED NULL,
  entered_in_error_reason VARCHAR(300) NULL,
  escalated_incident_id BIGINT UNSIGNED NULL,
  logged_by_user_id   BIGINT UNSIGNED NOT NULL,
  updated_by_user_id  BIGINT UNSIGNED NULL,
  created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_visits_id_student (id, student_id),
  UNIQUE KEY uq_visits_id_personnel (id, personnel_id),
  KEY idx_visits_personnel_time (personnel_id, visited_at),
  KEY idx_visits_student_time (student_id, visited_at),
  KEY idx_visits_time_complaint (visited_at, complaint),
  KEY idx_visits_event_tag (event_tag),
  CONSTRAINT chk_visits_disposition CHECK (disposition IN ('returned_to_class','resting_in_clinic','sent_home','referred_to_hospital')),
  CONSTRAINT chk_visits_referred_to CHECK (referred_to IS NULL OR disposition = 'referred_to_hospital'),
  CONSTRAINT chk_visits_complaint CHECK (CHAR_LENGTH(TRIM(complaint)) >= 1),
  CONSTRAINT chk_visits_one_patient CHECK ((student_id IS NOT NULL) + (personnel_id IS NOT NULL) = 1),
  CONSTRAINT chk_visits_temperature CHECK (temperature_c IS NULL OR temperature_c >= 0),
  CONSTRAINT chk_visits_error CHECK ((entered_in_error_at IS NULL) = (entered_in_error_reason IS NULL)),
  CONSTRAINT fk_visits_student FOREIGN KEY (student_id) REFERENCES students (id),
  CONSTRAINT fk_visits_personnel FOREIGN KEY (personnel_id) REFERENCES personnel (id),
  CONSTRAINT fk_visits_error_by FOREIGN KEY (entered_in_error_by_user_id) REFERENCES users (id),
  CONSTRAINT fk_visits_complaint_type FOREIGN KEY (complaint_type_id) REFERENCES complaint_types (id),
  CONSTRAINT fk_visits_logged_by FOREIGN KEY (logged_by_user_id) REFERENCES users (id),
  CONSTRAINT fk_visits_updated_by FOREIGN KEY (updated_by_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE visit_extra_complaints (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  visit_id            BIGINT UNSIGNED NOT NULL,
  complaint           VARCHAR(150)    NOT NULL,
  sort_order          TINYINT         NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_extra_complaint (visit_id, complaint),
  -- Up to 3 per visit (ADR-053), enforced by the service; a CHECK can't count rows.
  CONSTRAINT fk_extra_complaints_visit FOREIGN KEY (visit_id) REFERENCES visits (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE excuse_letters (
  id                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  visit_id             BIGINT UNSIGNED NOT NULL,
  status               VARCHAR(10)     NOT NULL DEFAULT 'draft',
  excused_from         DATE            NOT NULL,
  excused_until        DATE            NOT NULL,
  teacher_note         VARCHAR(500)    NULL,
  stay_home_until_cleared TINYINT(1)   NOT NULL DEFAULT 0,
  stay_home_note       VARCHAR(255)    NULL,
  recipient            VARCHAR(150)    NULL,
  prepared_by_user_id  BIGINT UNSIGNED NOT NULL,
  reference_no         VARCHAR(20)     NULL,
  approved_by_user_id  BIGINT UNSIGNED NULL,
  approved_at          DATETIME        NULL,
  snapshot_text        MEDIUMTEXT      NULL,
  voided_at            DATETIME        NULL,
  voided_by_user_id    BIGINT UNSIGNED NULL,
  voided_reason        VARCHAR(300)    NULL,
  superseded_at        DATETIME        NULL,
  superseded_by_user_id BIGINT UNSIGNED NULL,
  superseded_reason    VARCHAR(300)    NULL,
  created_at           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  -- One live letter per visit; voided and superseded letters are kept beside it.
  live_visit_id        BIGINT UNSIGNED GENERATED ALWAYS AS (IF(status IN ('draft','approved'), visit_id, NULL)) STORED,
  PRIMARY KEY (id),
  UNIQUE KEY uq_letters_live_visit (live_visit_id),
  KEY idx_letters_visit (visit_id),
  UNIQUE KEY uq_letters_reference (reference_no),
  KEY idx_letters_status (status),
  CONSTRAINT chk_letters_status CHECK (status IN ('draft','approved','voided','superseded')),
  CONSTRAINT chk_letters_period CHECK (excused_until >= excused_from),
  CONSTRAINT chk_letters_approved CHECK (
    (status = 'draft'    AND approved_at IS NULL AND approved_by_user_id IS NULL AND reference_no IS NULL AND snapshot_text IS NULL) OR
    (status = 'approved' AND approved_at IS NOT NULL AND approved_by_user_id IS NOT NULL AND reference_no IS NOT NULL) OR
    (status = 'voided' AND voided_at IS NOT NULL) OR
    (status = 'superseded' AND superseded_at IS NOT NULL)
  ),
  CONSTRAINT fk_letters_visit FOREIGN KEY (visit_id) REFERENCES visits (id) ON DELETE CASCADE,
  CONSTRAINT fk_letters_prepared_by FOREIGN KEY (prepared_by_user_id) REFERENCES users (id),
  CONSTRAINT fk_letters_approved_by FOREIGN KEY (approved_by_user_id) REFERENCES users (id),
  CONSTRAINT fk_letters_voided_by FOREIGN KEY (voided_by_user_id) REFERENCES users (id),
  CONSTRAINT fk_letters_superseded_by FOREIGN KEY (superseded_by_user_id) REFERENCES users (id)
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
  CONSTRAINT fk_triage_checks_visit FOREIGN KEY (visit_id) REFERENCES visits (id) ON DELETE CASCADE,
  CONSTRAINT fk_triage_checks_step FOREIGN KEY (triage_step_id) REFERENCES triage_steps (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------------
-- 6. Emergency response
-- ---------------------------------------------------------------------------------

CREATE TABLE incidents (
  id                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id            BIGINT UNSIGNED NULL,
  personnel_id          BIGINT UNSIGNED NULL,
  grade_level_at_time   VARCHAR(40)     NULL,
  section_at_time       VARCHAR(60)     NULL,
  occurred_at           DATETIME        NOT NULL,
  complaint             VARCHAR(150)    NOT NULL,
  stage                 TINYINT         NOT NULL DEFAULT 1,
  treatment_notes       TEXT            NULL,
  event_tag             VARCHAR(80)     NULL,
  general_notes         TEXT            NULL,
  body_part             VARCHAR(60)     NULL,
  source_visit_id       BIGINT UNSIGNED NULL,
  no_further_action_reason VARCHAR(200) NULL,
  created_by_user_id    BIGINT UNSIGNED NOT NULL,
  completed_by_user_id  BIGINT UNSIGNED NULL,
  completed_at          DATETIME        NULL,
  created_at            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_incidents_id_student (id, student_id),
  UNIQUE KEY uq_incidents_id_personnel (id, personnel_id),
  KEY idx_incidents_personnel_time (personnel_id, occurred_at),
  KEY idx_incidents_student_time (student_id, occurred_at),
  KEY idx_incidents_time (occurred_at),
  KEY idx_incidents_stage (stage, occurred_at),
  CONSTRAINT chk_incidents_stage CHECK (stage IN (1,2)),
  CONSTRAINT chk_incidents_completed CHECK ((stage = 2) = (completed_at IS NOT NULL AND completed_by_user_id IS NOT NULL)),
  CONSTRAINT chk_incidents_complaint CHECK (CHAR_LENGTH(TRIM(complaint)) >= 1),
  CONSTRAINT chk_incidents_one_patient CHECK ((student_id IS NOT NULL) + (personnel_id IS NOT NULL) = 1),
  CONSTRAINT fk_incidents_student FOREIGN KEY (student_id) REFERENCES students (id),
  CONSTRAINT fk_incidents_personnel FOREIGN KEY (personnel_id) REFERENCES personnel (id),
  CONSTRAINT fk_incidents_source_visit FOREIGN KEY (source_visit_id) REFERENCES visits (id),
  CONSTRAINT fk_incidents_created_by FOREIGN KEY (created_by_user_id) REFERENCES users (id),
  CONSTRAINT fk_incidents_completed_by FOREIGN KEY (completed_by_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- visits and incidents point at each other (ADR-036), so this key comes after both tables.
ALTER TABLE visits ADD CONSTRAINT fk_visits_escalated_incident FOREIGN KEY (escalated_incident_id) REFERENCES incidents (id);

CREATE TABLE incident_vital_readings (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  incident_id         BIGINT UNSIGNED NOT NULL,
  stage               TINYINT         NOT NULL,
  recorded_at         DATETIME        NOT NULL,
  recorded_by_user_id BIGINT UNSIGNED NOT NULL,
  temperature_c       DECIMAL(5,2)    NULL,
  pulse_bpm           SMALLINT UNSIGNED NULL,
  blood_pressure      VARCHAR(20)     NULL,
  spo2_percent        TINYINT UNSIGNED NULL,
  note                VARCHAR(255)    NULL,
  PRIMARY KEY (id),
  KEY idx_vitals_incident (incident_id, recorded_at),
  CONSTRAINT chk_vitals_stage CHECK (stage IN (1,2)),
  -- Sanity only: a reading out of the usual range warns and saves (ADR-051), so nothing else is checked here.
  CONSTRAINT chk_vitals_temp  CHECK (temperature_c IS NULL OR temperature_c >= 0),
  CONSTRAINT chk_vitals_spo2  CHECK (spo2_percent IS NULL OR spo2_percent <= 100),
  CONSTRAINT fk_vitals_incident FOREIGN KEY (incident_id) REFERENCES incidents (id) ON DELETE CASCADE,
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
  CONSTRAINT fk_referrals_incident FOREIGN KEY (incident_id) REFERENCES incidents (id) ON DELETE CASCADE,
  CONSTRAINT fk_referrals_user FOREIGN KEY (created_by_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE parent_notification_attempts (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  incident_id         BIGINT UNSIGNED NOT NULL,
  called_name         VARCHAR(120)    NULL,
  called_relationship VARCHAR(40)     NULL,
  phone_dialed        VARCHAR(30)     NULL,
  called_source       VARCHAR(17)     NULL,
  outcome             VARCHAR(30)     NOT NULL,
  attempted_at        DATETIME        NOT NULL,
  logged_by_user_id   BIGINT UNSIGNED NOT NULL,
  note                VARCHAR(255)    NULL,
  created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notifications_incident (incident_id, attempted_at),
  CONSTRAINT chk_notifications_outcome CHECK (outcome IN ('reached','no_answer','left_message_or_voicemail','wrong_number')),
  CONSTRAINT chk_notifications_source CHECK (called_source IS NULL OR called_source IN ('emergency_contact','other')),
  CONSTRAINT fk_notifications_incident FOREIGN KEY (incident_id) REFERENCES incidents (id) ON DELETE CASCADE,
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
  CONSTRAINT fk_report_approvals_incident FOREIGN KEY (incident_id) REFERENCES incidents (id) ON DELETE CASCADE,
  CONSTRAINT fk_report_approvals_user FOREIGN KEY (approved_by_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------------
-- 7. Follow-ups, PE referrals, medicines given, inventory ledger
-- ---------------------------------------------------------------------------------

CREATE TABLE follow_ups (
  id                       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id               BIGINT UNSIGNED NULL,
  personnel_id             BIGINT UNSIGNED NULL,
  visit_id                 BIGINT UNSIGNED NULL,
  incident_id              BIGINT UNSIGNED NULL,
  follow_up_date           DATE            NOT NULL,
  reason                   VARCHAR(255)    NOT NULL,
  notes                    TEXT            NULL,
  status                   VARCHAR(10)     NOT NULL DEFAULT 'pending',
  status_reason            VARCHAR(340)    NULL,
  stay_home_until_cleared  TINYINT(1)      NOT NULL DEFAULT 0,
  stay_home_note           VARCHAR(255)    NULL,
  status_updated_at        DATETIME        NULL,
  status_updated_by_user_id BIGINT UNSIGNED NULL,
  created_by_user_id       BIGINT UNSIGNED NOT NULL,
  created_at               DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at               DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_followups_status_date (status, follow_up_date),
  KEY idx_followups_student (student_id, follow_up_date),
  KEY idx_followups_personnel (personnel_id, follow_up_date),
  KEY idx_followups_visit (visit_id),
  KEY idx_followups_incident (incident_id),
  CONSTRAINT chk_followups_status CHECK (status IN ('pending','completed','missed','cancelled')),
  CONSTRAINT chk_followups_one_source CHECK ((visit_id IS NOT NULL) + (incident_id IS NOT NULL) = 1),
  CONSTRAINT chk_followups_one_patient CHECK ((student_id IS NOT NULL) + (personnel_id IS NOT NULL) = 1),
  CONSTRAINT fk_followups_student FOREIGN KEY (student_id) REFERENCES students (id),
  CONSTRAINT fk_followups_personnel FOREIGN KEY (personnel_id) REFERENCES personnel (id),
  -- Composite keys: the visit/incident MUST belong to the same student as the follow-up.
  CONSTRAINT fk_followups_visit FOREIGN KEY (visit_id, student_id) REFERENCES visits (id, student_id),
  CONSTRAINT fk_followups_incident FOREIGN KEY (incident_id, student_id) REFERENCES incidents (id, student_id),
  -- The same guarantee for a staff patient; a composite key is skipped when one column is NULL.
  CONSTRAINT fk_followups_visit_staff FOREIGN KEY (visit_id, personnel_id) REFERENCES visits (id, personnel_id),
  CONSTRAINT fk_followups_incident_staff FOREIGN KEY (incident_id, personnel_id) REFERENCES incidents (id, personnel_id),
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
  CONSTRAINT fk_lines_visit FOREIGN KEY (visit_id) REFERENCES visits (id) ON DELETE CASCADE,
  CONSTRAINT fk_lines_incident FOREIGN KEY (incident_id) REFERENCES incidents (id) ON DELETE CASCADE,
  CONSTRAINT fk_lines_item FOREIGN KEY (item_id) REFERENCES inventory_items (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE inventory_transactions (
  id                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  item_id               BIGINT UNSIGNED NOT NULL,
  type                  VARCHAR(10)     NOT NULL,
  quantity_delta        INT             NOT NULL,
  stock_after           INT             NOT NULL,
  occurred_at           DATETIME        NOT NULL,
  user_id               BIGINT UNSIGNED NOT NULL,
  student_id            BIGINT UNSIGNED NULL,
  personnel_id          BIGINT UNSIGNED NULL,
  visit_id              BIGINT UNSIGNED NULL,
  incident_id           BIGINT UNSIGNED NULL,
  reason                VARCHAR(20)     NULL,
  note                  VARCHAR(255)    NULL,
  created_at            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_txn_item_time (item_id, occurred_at),
  KEY idx_txn_student_time (student_id, occurred_at),
  KEY idx_txn_personnel_time (personnel_id, occurred_at),
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
  CONSTRAINT chk_txn_link_has_patient CHECK ((visit_id IS NULL AND incident_id IS NULL) OR (student_id IS NOT NULL) + (personnel_id IS NOT NULL) = 1),
  CONSTRAINT chk_txn_one_patient CHECK (student_id IS NULL OR personnel_id IS NULL),
  CONSTRAINT fk_txn_item FOREIGN KEY (item_id) REFERENCES inventory_items (id),
  CONSTRAINT fk_txn_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT fk_txn_student FOREIGN KEY (student_id) REFERENCES students (id),
  CONSTRAINT fk_txn_personnel FOREIGN KEY (personnel_id) REFERENCES personnel (id),
  CONSTRAINT fk_txn_visit_staff FOREIGN KEY (visit_id, personnel_id) REFERENCES visits (id, personnel_id),
  CONSTRAINT fk_txn_incident_staff FOREIGN KEY (incident_id, personnel_id) REFERENCES incidents (id, personnel_id),
  CONSTRAINT fk_txn_visit FOREIGN KEY (visit_id, student_id) REFERENCES visits (id, student_id),
  CONSTRAINT fk_txn_incident FOREIGN KEY (incident_id, student_id) REFERENCES incidents (id, student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE inventory_transaction_batches (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  transaction_id      BIGINT UNSIGNED NOT NULL,
  batch_id            BIGINT UNSIGNED NOT NULL,
  -- Signed: a return or a write-off moves stock back, as a negative allocation.
  quantity            INT             NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_txn_batch (transaction_id, batch_id),
  KEY idx_txn_batch_batch (batch_id),
  CONSTRAINT chk_txn_batch_quantity CHECK (quantity <> 0),
  CONSTRAINT fk_txn_batch_txn FOREIGN KEY (transaction_id) REFERENCES inventory_transactions (id) ON DELETE CASCADE,
  CONSTRAINT fk_txn_batch_batch FOREIGN KEY (batch_id) REFERENCES inventory_batches (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------------
-- 8. Reports, backups, calendar, feedback
-- ---------------------------------------------------------------------------------

-- Sports Reports (ADR-034), added Wednesday, October 21, 2026 — 07:19.
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

-- The students on a Sports Report (ADR-034); no note since Tuesday, November 03, 2026 — 20:16 PHT (ADR-034 note). A list only: the
-- visits and incidents it prints are read when it is printed, never copied here.
CREATE TABLE sports_report_students (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sports_report_id  BIGINT UNSIGNED NOT NULL,
  student_id        BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sports_report_student (sports_report_id, student_id),
  KEY idx_sports_report_students_student (student_id),
  CONSTRAINT fk_sports_report_students_report FOREIGN KEY (sports_report_id) REFERENCES sports_reports (id) ON DELETE CASCADE,
  CONSTRAINT fk_sports_report_students_student FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE
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

CREATE TABLE backup_locations (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  label               VARCHAR(80)     NOT NULL,
  path                VARCHAR(255)    NOT NULL,
  enabled             TINYINT(1)      NOT NULL DEFAULT 1,
  status              VARCHAR(12)     NOT NULL DEFAULT 'not_found',
  last_backup_at      DATETIME        NULL,
  last_result         VARCHAR(6)      NULL,
  created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT chk_locations_status CHECK (status IN ('found','not_found','not_writable')),
  CONSTRAINT chk_locations_result CHECK (last_result IS NULL OR last_result IN ('ok','failed'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE backup_location_results (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  backup_log_id       BIGINT UNSIGNED NOT NULL,
  backup_location_id  BIGINT UNSIGNED NOT NULL,
  status              VARCHAR(6)      NOT NULL,
  error_message       VARCHAR(500)    NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_backup_location_result (backup_log_id, backup_location_id),
  CONSTRAINT chk_location_result_status CHECK (status IN ('ok','failed')),
  CONSTRAINT fk_location_result_log FOREIGN KEY (backup_log_id) REFERENCES backup_logs (id),
  CONSTRAINT fk_location_result_location FOREIGN KEY (backup_location_id) REFERENCES backup_locations (id)
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
  target_label            VARCHAR(120)    NULL,
  subject_student_id      BIGINT UNSIGNED NULL,
  subject_personnel_id    BIGINT UNSIGNED NULL,
  summary                 VARCHAR(255)    NULL,
  client_ip               VARBINARY(16)   NULL,
  PRIMARY KEY (id),
  KEY idx_audit_time (occurred_at),
  KEY idx_audit_actor_time (actor_user_id, occurred_at),
  KEY idx_audit_action_time (action_type, occurred_at),
  KEY idx_audit_target_time (target_type, occurred_at),
  KEY idx_audit_target (target_type, target_id),
  KEY idx_audit_subject (subject_student_id, occurred_at),
  KEY idx_audit_subject_personnel (subject_personnel_id, occurred_at),
  CONSTRAINT chk_audit_action CHECK (action_type IN ('login','logout','submit','approve','create','update','delete','archive','print','view')),
  CONSTRAINT chk_audit_role CHECK (actor_role IS NULL OR actor_role IN ('staff','admin')),
  CONSTRAINT chk_audit_actor CHECK (actor_user_id IS NOT NULL OR actor_role IS NULL),
  CONSTRAINT chk_audit_target CHECK (target_id IS NOT NULL OR target_label IS NOT NULL),
  CONSTRAINT chk_audit_one_subject CHECK (subject_student_id IS NULL OR subject_personnel_id IS NULL),
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
  ('frequent_visitor_window_days',  '14', 'int', 'Window for the frequent-visitor warning, in days (open product decision)'),
  ('upcoming_follow_up_days',       '7',  'int', 'How many days ahead a pending follow-up counts as upcoming (open product decision)'),
  ('expiry_warning_days',           '30', 'int', 'Days before expiration that an item counts as nearing expiration (open product decision)'),
  ('cluster_min_count',             '8',  'int', 'Complaint count in one trend bucket that can count as a symptom cluster (open product decision)'),
  ('cluster_ratio',                 '2',  'decimal', 'Multiple of that complaint average that counts as a cluster (open product decision)'),
  ('top_complaints',                '5',  'int', 'Top complaints drawn on the trend chart'),
  ('lockout_max_attempts',          '5',  'int', 'Failed logins before an account locks (ADR-015)'),
  ('lockout_minutes',               '30', 'int', 'Lock duration in minutes (ADR-015)'),
  ('password_min_length',           '8',  'int', 'Minimum password length (Module 1)'),
  ('password_history_count',        '5',  'int', 'Previous passwords that cannot be reused (Module 1)'),
  ('retention_years_after_archive', '5',  'int', 'Years an archived student or staff-patient record is kept before deletion (ADR-057)'),
  ('holiday_stale_days',            '45', 'int', 'Warn when the last successful holiday sync is older than this (ADR-020)'),
  ('audit_retention_years',         '10', 'int', 'Years the audit log is kept (ADR-037, ADR-057)'),
  ('admin_idle_minutes',            '30', 'int', 'Idle minutes before the Admin/Principal is signed out (ADR-048)'),
  ('medical_certificate_after_days','3',  'int', 'Excused days past which a letter warns about a medical certificate (ADR-049)'),
  ('cluster_min_students',          '3',  'int', 'Students with the same complaint and grade that raise the cluster alert (ADR-050)'),
  ('cluster_window_days',           '3',  'int', 'Window of the cluster alert, in days (ADR-050)'),
  ('follow_up_overdue_after_days',  '3',  'int', 'Days after its date that a pending follow-up is overdue (ADR-051)'),
  ('follow_up_auto_close_days',     '7',  'int', 'Days after its date that a pending follow-up closes as Missed (ADR-051)'),
  ('stale_backup_hours',            '48', 'int', 'Hours after the last good backup before the Dashboard warns (ADR-037)'),
  ('backup_keep_last',              '60', 'int', 'Backups kept per location (ADR-052)'),
  ('unusual_age_years',             '3',  'int', 'Years from the usual age for the grade that raise a soft note (ADR-054)'),
  ('large_write_off_percent',       '25', 'int', 'Share of an item on hand at which a stock removal needs a written note (ADR-061)'),
  ('percent_min_prior_count',       '5',  'int', 'Prior-period count below which a stat card shows both counts (panel review DB-2)');

INSERT INTO reference_settings (setting_key, value_format, setting_value, description) VALUES
  ('show_frequent_visitors', 'json', 'true', 'Show the frequent-visitor list on the Dashboard'),
  ('personnel_types', 'json', '["Teacher","Non-teaching staff","Utility worker","Other"]', 'Groups offered for a staff patient; the service checks against this list'),
  ('vitals_warning_ranges', 'json', '{"temperatureC":{"min":30,"max":43},"pulseBpm":{"min":30,"max":250},"oxygenSaturationPct":null,"feverFromC":37}', 'Sanity bounds that warn and never block (ADR-051); nurse to confirm'),
  ('vitals_usual_ranges', 'json', '{"temperatureMinC":36,"oxygenSaturationMinPct":95,"grades1to6FromAge":6,"grades7to12FromAge":13,"byAgeGroup":{"kinder":{"pulseBpm":{"min":80,"max":110},"systolic":{"min":95,"max":110},"diastolic":{"min":60,"max":75}},"grades1to6":{"pulseBpm":{"min":70,"max":100},"systolic":{"min":100,"max":120},"diastolic":{"min":60,"max":75}},"grades7to12":{"pulseBpm":{"min":60,"max":100},"systolic":{"min":100,"max":120},"diastolic":{"min":70,"max":80}},"adult":{"pulseBpm":{"min":60,"max":100},"systolic":{"min":90,"max":120},"diastolic":{"min":60,"max":80}}}}', 'Usual ranges by age group, soft notes only (ADR-051); nurse to confirm');
