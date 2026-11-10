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
CREATE TABLE inventory_items (
  id                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name                 VARCHAR(120)    NOT NULL,
  category             VARCHAR(10)     NOT NULL,
  unit                 VARCHAR(30)     NOT NULL,
  low_stock_threshold  INT UNSIGNED    NOT NULL DEFAULT 0,
  brand                VARCHAR(8)      NULL,
  archived_at          DATETIME        NULL,
  created_at           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  active_name          VARCHAR(120) GENERATED ALWAYS AS (IF(archived_at IS NULL, name, NULL)) STORED,
  PRIMARY KEY (id),
  UNIQUE KEY uq_items_active_name (active_name),
  KEY idx_items_category (category, archived_at),
  CONSTRAINT chk_items_category CHECK (category IN ('medicine','supply')),
  CONSTRAINT chk_items_brand CHECK (brand IS NULL OR brand IN ('generic','branded')),
  CONSTRAINT chk_items_name CHECK (CHAR_LENGTH(TRIM(name)) >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_items');
    }
};
