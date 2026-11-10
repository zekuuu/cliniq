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
CREATE TABLE inventory_transaction_batches (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  transaction_id      BIGINT UNSIGNED NOT NULL,
  batch_id            BIGINT UNSIGNED NOT NULL,
  quantity            INT             NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_txn_batch (transaction_id, batch_id),
  KEY idx_txn_batch_batch (batch_id),
  CONSTRAINT chk_txn_batch_quantity CHECK (quantity <> 0),
  CONSTRAINT fk_txn_batch_txn FOREIGN KEY (transaction_id) REFERENCES inventory_transactions (id) ON DELETE CASCADE,
  CONSTRAINT fk_txn_batch_batch FOREIGN KEY (batch_id) REFERENCES inventory_batches (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_transaction_batches');
    }
};
