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
CREATE TABLE system_settings (
  setting_key         VARCHAR(80)  NOT NULL,
  setting_value       VARCHAR(255) NOT NULL,
  value_type          VARCHAR(8)   NOT NULL,
  description         VARCHAR(255) NULL,
  updated_by_user_id  BIGINT UNSIGNED NULL,
  updated_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (setting_key),
  CONSTRAINT chk_settings_type CHECK (value_type IN ('int','decimal','string','bool')),
  CONSTRAINT chk_settings_school_year_month CHECK (setting_key NOT IN ('school_year_start_month','school_year_end_month')
    OR (setting_value REGEXP '^[0-9]{1,2}$' AND CAST(setting_value AS UNSIGNED) BETWEEN 1 AND 12)),
  CONSTRAINT chk_settings_school_year_day CHECK (setting_key NOT IN ('school_year_start_day','school_year_end_day')
    OR (setting_value REGEXP '^[0-9]{1,2}$' AND CAST(setting_value AS UNSIGNED) BETWEEN 1 AND 31)),
  CONSTRAINT chk_settings_idle_signout CHECK (setting_key NOT IN ('idle_signout_minutes_staff','idle_signout_minutes_admin')
    OR (setting_value REGEXP '^[0-9]{2,3}$' AND CAST(setting_value AS UNSIGNED) BETWEEN 10 AND 240)),
  CONSTRAINT fk_settings_user FOREIGN KEY (updated_by_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('system_settings');
    }
};
