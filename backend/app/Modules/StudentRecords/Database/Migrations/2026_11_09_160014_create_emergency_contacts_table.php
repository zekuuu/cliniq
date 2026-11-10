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
CREATE TABLE emergency_contacts (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id          BIGINT UNSIGNED NOT NULL,
  name                VARCHAR(120)    NOT NULL,
  relationship        VARCHAR(40)     NULL,
  phone               VARCHAR(30)     NOT NULL,
  is_primary          TINYINT(1)      NOT NULL DEFAULT 1,
  sort_order          SMALLINT        NOT NULL DEFAULT 0,
  is_verified         TINYINT(1)      NOT NULL DEFAULT 0,
  verified_at         DATETIME        NULL,
  verified_by_user_id BIGINT UNSIGNED NULL,
  created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  primary_student_id  BIGINT UNSIGNED GENERATED ALWAYS AS (IF(is_primary = 1, student_id, NULL)) STORED,
  PRIMARY KEY (id),
  UNIQUE KEY uq_contacts_one_primary (primary_student_id),
  KEY idx_contacts_student (student_id),
  CONSTRAINT chk_contacts_verified CHECK (is_verified = 0 OR verified_at IS NOT NULL),
  CONSTRAINT fk_contacts_student FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE,
  CONSTRAINT fk_contacts_verified_by FOREIGN KEY (verified_by_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('emergency_contacts');
    }
};
