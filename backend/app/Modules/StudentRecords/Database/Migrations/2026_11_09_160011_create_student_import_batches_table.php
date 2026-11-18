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
CREATE TABLE student_import_batches (
  id                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  label                VARCHAR(80)     NOT NULL,
  school_year          VARCHAR(9)      NULL,
  source_file_name     VARCHAR(255)    NULL,
  source_file_sha256   CHAR(64)        NULL,
  rows_total           INT UNSIGNED    NOT NULL DEFAULT 0,
  rows_created         INT UNSIGNED    NOT NULL DEFAULT 0,
  rows_updated         INT UNSIGNED    NOT NULL DEFAULT 0,
  rows_archived        INT UNSIGNED    NOT NULL DEFAULT 0,
  rows_flagged         INT UNSIGNED    NOT NULL DEFAULT 0,
  status               VARCHAR(8)      NOT NULL DEFAULT 'applied',
  imported_by_user_id  BIGINT UNSIGNED NOT NULL,
  imported_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes                VARCHAR(500)    NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_import_batches_file (source_file_sha256),
  CONSTRAINT chk_import_batches_status CHECK (status IN ('applied','failed')),
  CONSTRAINT fk_import_batches_user FOREIGN KEY (imported_by_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('student_import_batches');
    }
};
