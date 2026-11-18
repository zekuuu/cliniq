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
CREATE TABLE backup_logs (
  id                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  run_key              VARCHAR(100)    NOT NULL,
  ran_at               DATETIME        NOT NULL,
  file_name            VARCHAR(255)    NULL,
  file_size_bytes      BIGINT UNSIGNED NULL,
  sha256               CHAR(64)        NULL,
  status               VARCHAR(6)      NOT NULL,
  error_message        VARCHAR(500)    NULL,
  verified_by_user_id  BIGINT UNSIGNED NULL,
  verified_at          DATETIME        NULL,
  created_at           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_backup_run_key (run_key),
  KEY idx_backup_ran_at (ran_at),
  CONSTRAINT chk_backup_status CHECK (status IN ('ok','failed')),
  CONSTRAINT chk_backup_verified CHECK ((verified_at IS NULL) = (verified_by_user_id IS NULL)),
  CONSTRAINT chk_backup_verify_ok CHECK (verified_at IS NULL OR status = 'ok'),
  CONSTRAINT fk_backup_user FOREIGN KEY (verified_by_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('backup_logs');
    }
};
