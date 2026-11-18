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
CREATE TABLE personnel_health_entries (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  personnel_id        BIGINT UNSIGNED NOT NULL,
  kind                VARCHAR(16)     NOT NULL,
  label               VARCHAR(150)    NOT NULL,
  sort_order          SMALLINT        NOT NULL DEFAULT 0,
  created_by_user_id  BIGINT UNSIGNED NULL,
  created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_personnel_health_entry (personnel_id, kind, label),
  CONSTRAINT chk_personnel_health_kind CHECK (kind IN ('allergy','condition')),
  CONSTRAINT fk_personnel_health_personnel FOREIGN KEY (personnel_id) REFERENCES personnel (id) ON DELETE CASCADE,
  CONSTRAINT fk_personnel_health_user FOREIGN KEY (created_by_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('personnel_health_entries');
    }
};
