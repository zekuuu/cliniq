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
CREATE TABLE triage_steps (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  complaint_type_id   BIGINT UNSIGNED NOT NULL,
  step_text           VARCHAR(255)    NOT NULL,
  sort_order          SMALLINT        NOT NULL DEFAULT 0,
  is_active           TINYINT(1)      NOT NULL DEFAULT 1,
  updated_by_user_id  BIGINT UNSIGNED NULL,
  created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_triage_steps_type (complaint_type_id, sort_order),
  CONSTRAINT fk_triage_steps_type FOREIGN KEY (complaint_type_id) REFERENCES complaint_types (id),
  CONSTRAINT fk_triage_steps_user FOREIGN KEY (updated_by_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('triage_steps');
    }
};
