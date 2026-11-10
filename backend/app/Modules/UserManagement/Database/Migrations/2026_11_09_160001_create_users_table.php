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
CREATE TABLE users (
  id                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name                  VARCHAR(120)    NOT NULL,
  username              VARCHAR(50)     NOT NULL,
  profile_picture       MEDIUMTEXT      NULL,
  password_hash         VARCHAR(255)    NOT NULL,
  role                  VARCHAR(12)     NOT NULL,
  is_head_nurse         TINYINT(1)      NOT NULL DEFAULT 0,
  must_change_password  TINYINT(1)      NOT NULL DEFAULT 1,
  password_changed_at   DATETIME        NULL,
  failed_login_count    SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  locked_until          DATETIME        NULL,
  last_login_at         DATETIME        NULL,
  deactivated_at        DATETIME        NULL,
  totp_secret           TEXT            NULL,
  totp_confirmed_at     DATETIME        NULL,
  last_totp_step        BIGINT UNSIGNED NULL,
  created_at            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username (username),
  CONSTRAINT chk_users_totp CHECK ((totp_secret IS NULL) = (totp_confirmed_at IS NULL)),
  CONSTRAINT chk_users_totp_step CHECK (last_totp_step IS NULL OR totp_secret IS NOT NULL),
  CONSTRAINT chk_users_role CHECK (role IN ('staff','admin')),
  CONSTRAINT chk_users_head_nurse CHECK (is_head_nurse = 0 OR role = 'staff'),
  CONSTRAINT chk_users_username_len CHECK (CHAR_LENGTH(TRIM(username)) >= 3),
  CONSTRAINT chk_users_name_len CHECK (CHAR_LENGTH(TRIM(name)) >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
