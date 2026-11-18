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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('pe_referrals');
    }
};
