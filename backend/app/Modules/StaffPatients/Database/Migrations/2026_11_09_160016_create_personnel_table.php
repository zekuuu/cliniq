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
  archive_reason      VARCHAR(80)     NULL,
  archived_school_year VARCHAR(9)     NULL,
  created_by_user_id  BIGINT UNSIGNED NULL,
  created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_personnel_staff_number (staff_number),
  KEY idx_personnel_name (last_name, first_name, middle_name),
  KEY idx_personnel_archived_at (archived_at),
  KEY idx_personnel_archived_year (archived_school_year, archived_at),
  CONSTRAINT chk_personnel_archive_details CHECK ((archived_at IS NULL) = (archive_reason IS NULL)
    AND (archived_at IS NULL) = (archived_school_year IS NULL)),
  CONSTRAINT chk_personnel_archive_reason CHECK (archive_reason IS NULL OR CHAR_LENGTH(TRIM(archive_reason)) >= 1),
  CONSTRAINT chk_personnel_archived_year CHECK (archived_school_year IS NULL OR archived_school_year REGEXP '^[0-9]{4}–[0-9]{4}$'),
  CONSTRAINT chk_personnel_first_name CHECK (CHAR_LENGTH(TRIM(first_name)) >= 1),
  CONSTRAINT chk_personnel_last_name CHECK (CHAR_LENGTH(TRIM(last_name)) >= 1),
  CONSTRAINT chk_personnel_middle_name CHECK (middle_name IS NULL OR CHAR_LENGTH(TRIM(middle_name)) >= 1),
  CONSTRAINT chk_personnel_sex CHECK (sex IN ('female','male')),
  CONSTRAINT fk_personnel_archived_by FOREIGN KEY (archived_by_user_id) REFERENCES users (id),
  CONSTRAINT fk_personnel_created_by FOREIGN KEY (created_by_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('personnel');
    }
};
