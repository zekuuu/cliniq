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
  archive_reason           VARCHAR(80)     NULL,
  archived_school_year     VARCHAR(9)      NULL,
  import_batch_id          BIGINT UNSIGNED NULL,
  created_by_user_id       BIGINT UNSIGNED NULL,
  created_at               DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at               DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_students_lrn (lrn),
  KEY idx_students_name (last_name, first_name, middle_name),
  KEY idx_students_grade_archived (grade_level_id, archived_at),
  KEY idx_students_archived_at (archived_at),
  KEY idx_students_archived_year (archived_school_year, archived_at),
  CONSTRAINT chk_students_lrn CHECK (lrn REGEXP '^[0-9]{12}$'),
  CONSTRAINT chk_students_archive_details CHECK ((archived_at IS NULL) = (archive_reason IS NULL)
    AND (archived_at IS NULL) = (archived_school_year IS NULL)),
  CONSTRAINT chk_students_archive_reason CHECK (archive_reason IS NULL OR CHAR_LENGTH(TRIM(archive_reason)) >= 1),
  CONSTRAINT chk_students_archived_year CHECK (archived_school_year IS NULL OR archived_school_year REGEXP '^[0-9]{4}–[0-9]{4}$'),
  CONSTRAINT chk_students_first_name CHECK (CHAR_LENGTH(TRIM(first_name)) >= 1),
  CONSTRAINT chk_students_last_name CHECK (CHAR_LENGTH(TRIM(last_name)) >= 1),
  CONSTRAINT chk_students_middle_name CHECK (middle_name IS NULL OR CHAR_LENGTH(TRIM(middle_name)) >= 1),
  CONSTRAINT chk_students_sex CHECK (sex IS NULL OR sex IN ('female','male')),
  CONSTRAINT fk_students_grade FOREIGN KEY (grade_level_id) REFERENCES grade_levels (id),
  CONSTRAINT fk_students_archived_by FOREIGN KEY (archived_by_user_id) REFERENCES users (id),
  CONSTRAINT fk_students_batch FOREIGN KEY (import_batch_id) REFERENCES student_import_batches (id),
  CONSTRAINT fk_students_created_by FOREIGN KEY (created_by_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('students');
    }
};
