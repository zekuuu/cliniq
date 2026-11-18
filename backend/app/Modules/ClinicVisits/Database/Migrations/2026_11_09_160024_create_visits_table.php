<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement(<<<'SQL'
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('visits');
    }
};
