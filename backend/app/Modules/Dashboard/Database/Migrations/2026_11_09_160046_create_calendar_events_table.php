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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('calendar_events');
    }
};
