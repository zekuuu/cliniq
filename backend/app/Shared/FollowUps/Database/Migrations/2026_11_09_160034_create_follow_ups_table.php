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
  CONSTRAINT fk_followups_visit FOREIGN KEY (visit_id, student_id) REFERENCES visits (id, student_id),
  CONSTRAINT fk_followups_incident FOREIGN KEY (incident_id, student_id) REFERENCES incidents (id, student_id),
  CONSTRAINT fk_followups_visit_staff FOREIGN KEY (visit_id, personnel_id) REFERENCES visits (id, personnel_id),
  CONSTRAINT fk_followups_incident_staff FOREIGN KEY (incident_id, personnel_id) REFERENCES incidents (id, personnel_id),
  CONSTRAINT fk_followups_status_by FOREIGN KEY (status_updated_by_user_id) REFERENCES users (id),
  CONSTRAINT fk_followups_created_by FOREIGN KEY (created_by_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('follow_ups');
    }
};
