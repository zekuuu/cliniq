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
CREATE TABLE emergency_contact_verifications (
  id                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  contact_id           BIGINT UNSIGNED NOT NULL,
  result               VARCHAR(10)     NOT NULL,
  verified_with        VARCHAR(100)    NULL,
  reason               VARCHAR(255)    NULL,
  incident_id          BIGINT UNSIGNED NULL,
  recorded_by_user_id  BIGINT UNSIGNED NOT NULL,
  recorded_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_verifications_contact (contact_id, recorded_at),
  CONSTRAINT chk_verifications_result CHECK (result IN ('verified','unverified')),
  CONSTRAINT fk_verifications_contact FOREIGN KEY (contact_id) REFERENCES emergency_contacts (id) ON DELETE CASCADE,
  CONSTRAINT fk_verifications_incident FOREIGN KEY (incident_id) REFERENCES incidents (id),
  CONSTRAINT fk_verifications_user FOREIGN KEY (recorded_by_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('emergency_contact_verifications');
    }
};
