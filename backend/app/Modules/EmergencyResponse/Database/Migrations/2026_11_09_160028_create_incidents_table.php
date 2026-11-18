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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL);

        DB::statement('ALTER TABLE visits ADD CONSTRAINT fk_visits_escalated_incident FOREIGN KEY (escalated_incident_id) REFERENCES incidents (id)');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE visits DROP FOREIGN KEY fk_visits_escalated_incident');
        Schema::dropIfExists('incidents');
    }
};
