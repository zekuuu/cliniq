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
CREATE TABLE excuse_letters (
  id                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  visit_id             BIGINT UNSIGNED NOT NULL,
  status               VARCHAR(10)     NOT NULL DEFAULT 'draft',
  excused_from         DATE            NOT NULL,
  excused_until        DATE            NOT NULL,
  teacher_note         VARCHAR(500)    NULL,
  stay_home_until_cleared TINYINT(1)   NOT NULL DEFAULT 0,
  stay_home_note       VARCHAR(255)    NULL,
  recipient            VARCHAR(150)    NULL,
  prepared_by_user_id  BIGINT UNSIGNED NOT NULL,
  reference_no         VARCHAR(20)     NULL,
  approved_by_user_id  BIGINT UNSIGNED NULL,
  approved_at          DATETIME        NULL,
  snapshot_text        MEDIUMTEXT      NULL,
  voided_at            DATETIME        NULL,
  voided_by_user_id    BIGINT UNSIGNED NULL,
  voided_reason        VARCHAR(300)    NULL,
  superseded_at        DATETIME        NULL,
  superseded_by_user_id BIGINT UNSIGNED NULL,
  superseded_reason    VARCHAR(300)    NULL,
  created_at           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  live_visit_id        BIGINT UNSIGNED GENERATED ALWAYS AS (IF(status IN ('draft','approved'), visit_id, NULL)) STORED,
  PRIMARY KEY (id),
  UNIQUE KEY uq_letters_live_visit (live_visit_id),
  KEY idx_letters_visit (visit_id),
  UNIQUE KEY uq_letters_reference (reference_no),
  KEY idx_letters_status (status),
  CONSTRAINT chk_letters_status CHECK (status IN ('draft','approved','voided','superseded')),
  CONSTRAINT chk_letters_period CHECK (excused_until >= excused_from),
  CONSTRAINT chk_letters_approved CHECK (
    (status = 'draft'    AND approved_at IS NULL AND approved_by_user_id IS NULL AND reference_no IS NULL AND snapshot_text IS NULL) OR
    (status = 'approved' AND approved_at IS NOT NULL AND approved_by_user_id IS NOT NULL AND reference_no IS NOT NULL) OR
    (status = 'voided' AND voided_at IS NOT NULL) OR
    (status = 'superseded' AND superseded_at IS NOT NULL)
  ),
  CONSTRAINT fk_letters_visit FOREIGN KEY (visit_id) REFERENCES visits (id) ON DELETE CASCADE,
  CONSTRAINT fk_letters_prepared_by FOREIGN KEY (prepared_by_user_id) REFERENCES users (id),
  CONSTRAINT fk_letters_approved_by FOREIGN KEY (approved_by_user_id) REFERENCES users (id),
  CONSTRAINT fk_letters_voided_by FOREIGN KEY (voided_by_user_id) REFERENCES users (id),
  CONSTRAINT fk_letters_superseded_by FOREIGN KEY (superseded_by_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('excuse_letters');
    }
};
