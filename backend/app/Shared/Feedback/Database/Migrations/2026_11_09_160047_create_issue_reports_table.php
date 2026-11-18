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
CREATE TABLE issue_reports (
  id                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  description          TEXT            NOT NULL,
  route                VARCHAR(255)    NOT NULL,
  page_name            VARCHAR(120)    NOT NULL,
  reporter_role        VARCHAR(12)     NOT NULL,
  reported_by_user_id  BIGINT UNSIGNED NOT NULL,
  created_at           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_issue_reports_created (created_at),
  CONSTRAINT chk_issue_reports_role CHECK (reporter_role IN ('staff','admin')),
  CONSTRAINT fk_issue_reports_user FOREIGN KEY (reported_by_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('issue_reports');
    }
};
