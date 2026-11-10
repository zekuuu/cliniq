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
CREATE TABLE incident_report_approvals (
  id                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  incident_id          BIGINT UNSIGNED NOT NULL,
  reference_no         VARCHAR(20)     NOT NULL,
  approved_by_user_id  BIGINT UNSIGNED NOT NULL,
  approved_at          DATETIME        NOT NULL,
  snapshot_text        MEDIUMTEXT      NULL,
  created_at           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_report_approvals_incident (incident_id),
  UNIQUE KEY uq_report_approvals_reference (reference_no),
  CONSTRAINT fk_report_approvals_incident FOREIGN KEY (incident_id) REFERENCES incidents (id) ON DELETE CASCADE,
  CONSTRAINT fk_report_approvals_user FOREIGN KEY (approved_by_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('incident_report_approvals');
    }
};
