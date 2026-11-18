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
CREATE TABLE backup_location_results (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  backup_log_id       BIGINT UNSIGNED NOT NULL,
  backup_location_id  BIGINT UNSIGNED NOT NULL,
  status              VARCHAR(6)      NOT NULL,
  error_message       VARCHAR(500)    NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_backup_location_result (backup_log_id, backup_location_id),
  CONSTRAINT chk_location_result_status CHECK (status IN ('ok','failed')),
  CONSTRAINT fk_location_result_log FOREIGN KEY (backup_log_id) REFERENCES backup_logs (id),
  CONSTRAINT fk_location_result_location FOREIGN KEY (backup_location_id) REFERENCES backup_locations (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('backup_location_results');
    }
};
