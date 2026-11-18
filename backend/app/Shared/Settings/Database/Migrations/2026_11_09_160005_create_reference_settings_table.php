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
CREATE TABLE reference_settings (
  setting_key         VARCHAR(80)  NOT NULL,
  value_format        VARCHAR(4)   NOT NULL,
  setting_value       TEXT         NOT NULL,
  description         VARCHAR(255) NULL,
  updated_by_user_id  BIGINT UNSIGNED NULL,
  updated_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (setting_key),
  CONSTRAINT chk_reference_settings_format CHECK (value_format IN ('text','json')),
  CONSTRAINT chk_reference_settings_json CHECK (value_format <> 'json' OR JSON_VALID(setting_value)),
  CONSTRAINT fk_reference_settings_user FOREIGN KEY (updated_by_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('reference_settings');
    }
};
