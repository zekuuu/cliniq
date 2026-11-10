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
CREATE TABLE triage_checks (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  visit_id         BIGINT UNSIGNED NOT NULL,
  triage_step_id   BIGINT UNSIGNED NULL,
  step_text        VARCHAR(255)    NOT NULL,
  is_checked       TINYINT(1)      NOT NULL DEFAULT 0,
  sort_order       SMALLINT        NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_triage_checks_visit (visit_id, sort_order),
  CONSTRAINT fk_triage_checks_visit FOREIGN KEY (visit_id) REFERENCES visits (id) ON DELETE CASCADE,
  CONSTRAINT fk_triage_checks_step FOREIGN KEY (triage_step_id) REFERENCES triage_steps (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('triage_checks');
    }
};
