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
CREATE TABLE visit_extra_complaints (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  visit_id            BIGINT UNSIGNED NOT NULL,
  complaint           VARCHAR(150)    NOT NULL,
  sort_order          TINYINT         NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_extra_complaint (visit_id, complaint),
  CONSTRAINT fk_extra_complaints_visit FOREIGN KEY (visit_id) REFERENCES visits (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('visit_extra_complaints');
    }
};
