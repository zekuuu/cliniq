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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('holiday_sync_runs');
    }
};
