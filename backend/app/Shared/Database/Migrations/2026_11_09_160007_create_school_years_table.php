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
CREATE TABLE school_years (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  label               VARCHAR(9)      NOT NULL,
  started_on          DATE            NOT NULL,
  started_by_user_id  BIGINT UNSIGNED NOT NULL,
  ended_on            DATE            NULL,
  ended_by_user_id    BIGINT UNSIGNED NULL,
  created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  in_session          TINYINT(1) GENERATED ALWAYS AS (IF(ended_on IS NULL, 1, NULL)) STORED,
  PRIMARY KEY (id),
  UNIQUE KEY uq_school_years_label (label),
  UNIQUE KEY uq_school_years_started_on (started_on),
  UNIQUE KEY uq_school_years_one_in_session (in_session),
  CONSTRAINT chk_school_years_label CHECK (label REGEXP '^[0-9]{4}–[0-9]{4}$'
    AND CAST(SUBSTRING(label, 6, 4) AS UNSIGNED) = CAST(LEFT(label, 4) AS UNSIGNED) + 1),
  CONSTRAINT chk_school_years_ended_after_start CHECK (ended_on IS NULL OR ended_on >= started_on),
  CONSTRAINT chk_school_years_ended_pair CHECK ((ended_on IS NULL) = (ended_by_user_id IS NULL)),
  CONSTRAINT fk_school_years_started_by FOREIGN KEY (started_by_user_id) REFERENCES users (id),
  CONSTRAINT fk_school_years_ended_by FOREIGN KEY (ended_by_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('school_years');
    }
};
