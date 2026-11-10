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
CREATE TABLE student_record_reviews (
  id                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id           BIGINT UNSIGNED NOT NULL,
  source               VARCHAR(20)     NOT NULL,
  import_batch_id      BIGINT UNSIGNED NULL,
  opened_at            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_by_user_id  BIGINT UNSIGNED NULL,
  resolved_at          DATETIME        NULL,
  open_student_id      BIGINT UNSIGNED GENERATED ALWAYS AS (IF(resolved_at IS NULL, student_id, NULL)) STORED,
  PRIMARY KEY (id),
  UNIQUE KEY uq_reviews_one_open (open_student_id),
  KEY idx_reviews_student (student_id),
  CONSTRAINT chk_reviews_source CHECK (source IN ('registrar_import','flagged_in_clinic')),
  CONSTRAINT chk_reviews_resolved CHECK ((resolved_at IS NULL) = (resolved_by_user_id IS NULL)),
  CONSTRAINT fk_reviews_student FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE,
  CONSTRAINT fk_reviews_batch FOREIGN KEY (import_batch_id) REFERENCES student_import_batches (id),
  CONSTRAINT fk_reviews_user FOREIGN KEY (resolved_by_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('student_record_reviews');
    }
};
