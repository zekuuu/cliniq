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
CREATE TABLE hospital_referrals (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  incident_id         BIGINT UNSIGNED NOT NULL,
  destination         VARCHAR(150)    NOT NULL,
  transport_mode      VARCHAR(80)     NOT NULL,
  departed_at         DATETIME        NOT NULL,
  created_by_user_id  BIGINT UNSIGNED NOT NULL,
  created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_referrals_incident (incident_id),
  CONSTRAINT fk_referrals_incident FOREIGN KEY (incident_id) REFERENCES incidents (id) ON DELETE CASCADE,
  CONSTRAINT fk_referrals_user FOREIGN KEY (created_by_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('hospital_referrals');
    }
};
