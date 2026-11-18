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
CREATE TABLE treatment_item_lines (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  visit_id            BIGINT UNSIGNED NULL,
  incident_id         BIGINT UNSIGNED NULL,
  item_id             BIGINT UNSIGNED NOT NULL,
  item_name_snapshot  VARCHAR(120)    NOT NULL,
  unit_snapshot       VARCHAR(30)     NOT NULL,
  quantity            INT UNSIGNED    NOT NULL,
  instructions        VARCHAR(120)    NULL,
  sort_order          SMALLINT        NOT NULL DEFAULT 0,
  created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_lines_visit_item (visit_id, item_id),
  UNIQUE KEY uq_lines_incident_item (incident_id, item_id),
  KEY idx_lines_item (item_id),
  CONSTRAINT chk_lines_one_source CHECK ((visit_id IS NOT NULL) + (incident_id IS NOT NULL) = 1),
  CONSTRAINT chk_lines_quantity CHECK (quantity >= 1),
  CONSTRAINT fk_lines_visit FOREIGN KEY (visit_id) REFERENCES visits (id) ON DELETE CASCADE,
  CONSTRAINT fk_lines_incident FOREIGN KEY (incident_id) REFERENCES incidents (id) ON DELETE CASCADE,
  CONSTRAINT fk_lines_item FOREIGN KEY (item_id) REFERENCES inventory_items (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('treatment_item_lines');
    }
};
