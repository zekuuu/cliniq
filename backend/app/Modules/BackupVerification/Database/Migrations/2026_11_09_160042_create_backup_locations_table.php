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
CREATE TABLE backup_locations (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  label               VARCHAR(80)     NOT NULL,
  path                VARCHAR(255)    NOT NULL,
  enabled             TINYINT(1)      NOT NULL DEFAULT 1,
  status              VARCHAR(12)     NOT NULL DEFAULT 'not_found',
  last_backup_at      DATETIME        NULL,
  last_result         VARCHAR(6)      NULL,
  created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT chk_locations_status CHECK (status IN ('found','not_found','not_writable')),
  CONSTRAINT chk_locations_result CHECK (last_result IS NULL OR last_result IN ('ok','failed'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('backup_locations');
    }
};
