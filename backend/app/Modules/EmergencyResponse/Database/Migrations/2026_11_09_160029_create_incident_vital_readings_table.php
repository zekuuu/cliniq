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
CREATE TABLE incident_vital_readings (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  incident_id         BIGINT UNSIGNED NOT NULL,
  stage               TINYINT         NOT NULL,
  recorded_at         DATETIME        NOT NULL,
  recorded_by_user_id BIGINT UNSIGNED NOT NULL,
  temperature_c       DECIMAL(5,2)    NULL,
  pulse_bpm           SMALLINT UNSIGNED NULL,
  blood_pressure      VARCHAR(20)     NULL,
  spo2_percent        TINYINT UNSIGNED NULL,
  note                VARCHAR(255)    NULL,
  PRIMARY KEY (id),
  KEY idx_vitals_incident (incident_id, recorded_at),
  CONSTRAINT chk_vitals_stage CHECK (stage IN (1,2)),
  CONSTRAINT chk_vitals_temp  CHECK (temperature_c IS NULL OR temperature_c >= 0),
  CONSTRAINT chk_vitals_spo2  CHECK (spo2_percent IS NULL OR spo2_percent <= 100),
  CONSTRAINT fk_vitals_incident FOREIGN KEY (incident_id) REFERENCES incidents (id) ON DELETE CASCADE,
  CONSTRAINT fk_vitals_user FOREIGN KEY (recorded_by_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('incident_vital_readings');
    }
};
