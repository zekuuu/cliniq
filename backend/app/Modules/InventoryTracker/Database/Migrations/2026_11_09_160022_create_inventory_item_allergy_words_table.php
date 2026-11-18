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
CREATE TABLE inventory_item_allergy_words (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  item_id             BIGINT UNSIGNED NOT NULL,
  word                VARCHAR(60)     NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_item_allergy_word (item_id, word),
  CONSTRAINT fk_allergy_words_item FOREIGN KEY (item_id) REFERENCES inventory_items (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_item_allergy_words');
    }
};
