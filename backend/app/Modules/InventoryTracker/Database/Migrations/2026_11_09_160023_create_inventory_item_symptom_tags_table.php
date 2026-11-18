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
CREATE TABLE inventory_item_symptom_tags (
  id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  item_id            BIGINT UNSIGNED NOT NULL,
  complaint_type_id  BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_item_symptom_tag (item_id, complaint_type_id),
  KEY idx_item_symptom_tags_type (complaint_type_id),
  CONSTRAINT fk_symptom_tags_item FOREIGN KEY (item_id) REFERENCES inventory_items (id) ON DELETE CASCADE,
  CONSTRAINT fk_symptom_tags_type FOREIGN KEY (complaint_type_id) REFERENCES complaint_types (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_item_symptom_tags');
    }
};
