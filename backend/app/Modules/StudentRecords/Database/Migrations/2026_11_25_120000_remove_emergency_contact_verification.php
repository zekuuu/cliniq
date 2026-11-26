<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('emergency_contact_verifications');

        DB::statement('ALTER TABLE emergency_contacts DROP FOREIGN KEY fk_contacts_verified_by');
        DB::statement('ALTER TABLE emergency_contacts DROP CONSTRAINT chk_contacts_verified');
        DB::statement('ALTER TABLE emergency_contacts DROP COLUMN is_verified, DROP COLUMN verified_at, DROP COLUMN verified_by_user_id');
        DB::statement('ALTER TABLE personnel_emergency_contacts DROP COLUMN is_verified');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE emergency_contacts ADD COLUMN is_verified TINYINT(1) NOT NULL DEFAULT 0 AFTER sort_order, ADD COLUMN verified_at DATETIME NULL AFTER is_verified, ADD COLUMN verified_by_user_id BIGINT UNSIGNED NULL AFTER verified_at');
        DB::statement('ALTER TABLE emergency_contacts ADD CONSTRAINT chk_contacts_verified CHECK (is_verified = 0 OR verified_at IS NOT NULL), ADD CONSTRAINT fk_contacts_verified_by FOREIGN KEY (verified_by_user_id) REFERENCES users (id)');
        DB::statement('ALTER TABLE personnel_emergency_contacts ADD COLUMN is_verified TINYINT(1) NOT NULL DEFAULT 0 AFTER sort_order');

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
};
