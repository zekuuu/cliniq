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
CREATE TABLE holidays (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  holiday_date     DATE            NOT NULL,
  name             VARCHAR(120)    NOT NULL,
  kind             VARCHAR(20)     NOT NULL,
  is_confirmed     TINYINT(1)      NOT NULL DEFAULT 1,
  proclamation_ref VARCHAR(120)    NULL,
  source           VARCHAR(60)     NOT NULL,
  synced_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_holidays_date_name (holiday_date, name),
  CONSTRAINT chk_holidays_kind CHECK (kind IN ('regular','special-non-working','special-working','islamic'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('holidays');
    }
};
