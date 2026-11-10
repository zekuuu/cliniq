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
CREATE TABLE parent_notification_attempts (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  incident_id         BIGINT UNSIGNED NOT NULL,
  called_name         VARCHAR(120)    NULL,
  called_relationship VARCHAR(40)     NULL,
  phone_dialed        VARCHAR(30)     NULL,
  called_source       VARCHAR(17)     NULL,
  outcome             VARCHAR(30)     NOT NULL,
  attempted_at        DATETIME        NOT NULL,
  logged_by_user_id   BIGINT UNSIGNED NOT NULL,
  note                VARCHAR(255)    NULL,
  created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notifications_incident (incident_id, attempted_at),
  CONSTRAINT chk_notifications_outcome CHECK (outcome IN ('reached','no_answer','left_message_or_voicemail','wrong_number')),
  CONSTRAINT chk_notifications_source CHECK (called_source IS NULL OR called_source IN ('emergency_contact','other')),
  CONSTRAINT fk_notifications_incident FOREIGN KEY (incident_id) REFERENCES incidents (id) ON DELETE CASCADE,
  CONSTRAINT fk_notifications_user FOREIGN KEY (logged_by_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('parent_notification_attempts');
    }
};
