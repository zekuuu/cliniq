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
CREATE TABLE inventory_transactions (
  id                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  item_id               BIGINT UNSIGNED NOT NULL,
  type                  VARCHAR(10)     NOT NULL,
  quantity_delta        INT             NOT NULL,
  stock_after           INT             NOT NULL,
  occurred_at           DATETIME        NOT NULL,
  user_id               BIGINT UNSIGNED NOT NULL,
  student_id            BIGINT UNSIGNED NULL,
  personnel_id          BIGINT UNSIGNED NULL,
  visit_id              BIGINT UNSIGNED NULL,
  incident_id           BIGINT UNSIGNED NULL,
  reason                VARCHAR(20)     NULL,
  note                  VARCHAR(255)    NULL,
  created_at            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_txn_item_time (item_id, occurred_at),
  KEY idx_txn_student_time (student_id, occurred_at),
  KEY idx_txn_personnel_time (personnel_id, occurred_at),
  KEY idx_txn_visit (visit_id),
  KEY idx_txn_incident (incident_id),
  CONSTRAINT chk_txn_type CHECK (type IN ('opening','dispense','restock','adjustment')),
  CONSTRAINT chk_txn_sign CHECK (
    (type = 'opening'    AND quantity_delta >= 0) OR
    (type = 'dispense'   AND quantity_delta < 0) OR
    (type = 'restock'    AND quantity_delta > 0) OR
    (type = 'adjustment' AND quantity_delta <> 0)),
  CONSTRAINT chk_txn_reason CHECK (
    (type = 'adjustment' AND reason IS NOT NULL AND reason IN ('visit_edited','expired_disposed','damaged_spilled','miscount_correction','other')) OR
    (type <> 'adjustment' AND reason IS NULL)),
  CONSTRAINT chk_txn_one_link CHECK (visit_id IS NULL OR incident_id IS NULL),
  CONSTRAINT chk_txn_link_has_patient CHECK ((visit_id IS NULL AND incident_id IS NULL) OR (student_id IS NOT NULL) + (personnel_id IS NOT NULL) = 1),
  CONSTRAINT chk_txn_one_patient CHECK (student_id IS NULL OR personnel_id IS NULL),
  CONSTRAINT fk_txn_item FOREIGN KEY (item_id) REFERENCES inventory_items (id),
  CONSTRAINT fk_txn_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT fk_txn_student FOREIGN KEY (student_id) REFERENCES students (id),
  CONSTRAINT fk_txn_personnel FOREIGN KEY (personnel_id) REFERENCES personnel (id),
  CONSTRAINT fk_txn_visit_staff FOREIGN KEY (visit_id, personnel_id) REFERENCES visits (id, personnel_id),
  CONSTRAINT fk_txn_incident_staff FOREIGN KEY (incident_id, personnel_id) REFERENCES incidents (id, personnel_id),
  CONSTRAINT fk_txn_visit FOREIGN KEY (visit_id, student_id) REFERENCES visits (id, student_id),
  CONSTRAINT fk_txn_incident FOREIGN KEY (incident_id, student_id) REFERENCES incidents (id, student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_transactions');
    }
};
