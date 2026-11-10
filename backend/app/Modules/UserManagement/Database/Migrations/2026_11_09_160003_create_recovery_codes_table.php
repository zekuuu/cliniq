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
CREATE TABLE recovery_codes (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     BIGINT UNSIGNED NOT NULL,
  code_hash   VARCHAR(255)    NOT NULL,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  used_at     DATETIME        NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_recovery_codes_hash (code_hash),
  KEY idx_recovery_codes_user (user_id, used_at),
  CONSTRAINT chk_recovery_codes_used CHECK (used_at IS NULL OR used_at >= created_at),
  CONSTRAINT fk_recovery_codes_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('recovery_codes');
    }
};
