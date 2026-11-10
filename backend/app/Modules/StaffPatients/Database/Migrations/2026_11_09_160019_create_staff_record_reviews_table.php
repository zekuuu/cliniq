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
CREATE TABLE staff_record_reviews (
  id                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  staff_id             BIGINT UNSIGNED NOT NULL,
  opened_at            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_by_user_id  BIGINT UNSIGNED NULL,
  resolved_at          DATETIME        NULL,
  open_staff_id        BIGINT UNSIGNED GENERATED ALWAYS AS (IF(resolved_at IS NULL, staff_id, NULL)) STORED,
  PRIMARY KEY (id),
  UNIQUE KEY uq_staff_reviews_one_open (open_staff_id),
  KEY idx_staff_reviews_staff (staff_id),
  CONSTRAINT chk_staff_reviews_resolved CHECK ((resolved_at IS NULL) = (resolved_by_user_id IS NULL)),
  CONSTRAINT fk_staff_reviews_staff FOREIGN KEY (staff_id) REFERENCES personnel (id) ON DELETE CASCADE,
  CONSTRAINT fk_staff_reviews_user FOREIGN KEY (resolved_by_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('staff_record_reviews');
    }
};
