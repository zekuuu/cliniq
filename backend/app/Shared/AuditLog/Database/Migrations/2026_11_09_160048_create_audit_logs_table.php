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
CREATE TABLE audit_logs (
  id                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  occurred_at             DATETIME        NOT NULL,
  actor_user_id           BIGINT UNSIGNED NULL,
  actor_role              VARCHAR(12)     NULL,
  action_type             VARCHAR(8)      NOT NULL,
  target_type             VARCHAR(40)     NULL,
  target_id               BIGINT UNSIGNED NULL,
  target_label            VARCHAR(120)    NULL,
  subject_student_id      BIGINT UNSIGNED NULL,
  subject_personnel_id    BIGINT UNSIGNED NULL,
  summary                 VARCHAR(255)    NULL,
  client_ip               VARBINARY(16)   NULL,
  PRIMARY KEY (id),
  KEY idx_audit_time (occurred_at),
  KEY idx_audit_actor_time (actor_user_id, occurred_at),
  KEY idx_audit_action_time (action_type, occurred_at),
  KEY idx_audit_target_time (target_type, occurred_at),
  KEY idx_audit_target (target_type, target_id),
  KEY idx_audit_subject (subject_student_id, occurred_at),
  KEY idx_audit_subject_personnel (subject_personnel_id, occurred_at),
  CONSTRAINT chk_audit_action CHECK (action_type IN ('login','logout','submit','approve','create','update','delete','archive','print','view')),
  CONSTRAINT chk_audit_role CHECK (actor_role IS NULL OR actor_role IN ('staff','admin')),
  CONSTRAINT chk_audit_actor CHECK (actor_user_id IS NOT NULL OR actor_role IS NULL),
  CONSTRAINT chk_audit_target CHECK (target_id IS NOT NULL OR target_label IS NOT NULL),
  CONSTRAINT chk_audit_one_subject CHECK (subject_student_id IS NULL OR subject_personnel_id IS NULL),
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
