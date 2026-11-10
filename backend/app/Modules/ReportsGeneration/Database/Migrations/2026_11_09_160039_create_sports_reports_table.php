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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('sports_reports');
    }
};
