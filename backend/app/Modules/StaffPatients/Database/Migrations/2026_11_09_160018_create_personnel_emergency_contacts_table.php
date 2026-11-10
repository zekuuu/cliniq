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
CREATE TABLE personnel_emergency_contacts (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  personnel_id        BIGINT UNSIGNED NOT NULL,
  name                VARCHAR(120)    NOT NULL,
  relationship        VARCHAR(40)     NULL,
  phone               VARCHAR(30)     NOT NULL,
  is_primary          TINYINT(1)      NOT NULL DEFAULT 1,
  sort_order          SMALLINT        NOT NULL DEFAULT 0,
  is_verified         TINYINT(1)      NOT NULL DEFAULT 0,
  created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  primary_personnel_id BIGINT UNSIGNED GENERATED ALWAYS AS (IF(is_primary = 1, personnel_id, NULL)) STORED,
  PRIMARY KEY (id),
  UNIQUE KEY uq_personnel_contacts_one_primary (primary_personnel_id),
  KEY idx_personnel_contacts_personnel (personnel_id),
  CONSTRAINT fk_personnel_contacts_personnel FOREIGN KEY (personnel_id) REFERENCES personnel (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('personnel_emergency_contacts');
    }
};
