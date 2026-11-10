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
CREATE TABLE sports_report_students (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sports_report_id  BIGINT UNSIGNED NOT NULL,
  student_id        BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sports_report_student (sports_report_id, student_id),
  KEY idx_sports_report_students_student (student_id),
  CONSTRAINT fk_sports_report_students_report FOREIGN KEY (sports_report_id) REFERENCES sports_reports (id) ON DELETE CASCADE,
  CONSTRAINT fk_sports_report_students_student FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('sports_report_students');
    }
};
