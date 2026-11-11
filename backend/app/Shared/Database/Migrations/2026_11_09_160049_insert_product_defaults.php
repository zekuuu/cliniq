<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/*
 * The safe defaults that ship with the product, copied verbatim from the reference seed at the
 * end of Reference-Schema.sql: grade levels, system settings and reference settings. A migration,
 * not a seeder, so a plain `migrate` gives a working product and every test database has them.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::unprepared(<<<'SQL'
INSERT INTO grade_levels (name, sort_order) VALUES
  ('Kinder', 0), ('Grade 1', 1), ('Grade 2', 2), ('Grade 3', 3), ('Grade 4', 4), ('Grade 5', 5),
  ('Grade 6', 6), ('Grade 7', 7), ('Grade 8', 8), ('Grade 9', 9), ('Grade 10', 10),
  ('Grade 11', 11), ('Grade 12', 12);

INSERT INTO system_settings (setting_key, setting_value, value_type, description) VALUES
  ('frequent_visitor_min_visits',   '3',  'int', 'Visits inside the window that raise the frequent-visitor warning (open product decision)'),
  ('frequent_visitor_window_days',  '14', 'int', 'Window for the frequent-visitor warning, in days (open product decision)'),
  ('upcoming_follow_up_days',       '7',  'int', 'How many days ahead a pending follow-up counts as upcoming (open product decision)'),
  ('expiry_warning_days',           '30', 'int', 'Days before expiration that an item counts as nearing expiration (open product decision)'),
  ('cluster_min_count',             '8',  'int', 'Complaint count in one trend bucket that can count as a symptom cluster (open product decision)'),
  ('cluster_ratio',                 '2',  'decimal', 'Multiple of that complaint average that counts as a cluster (open product decision)'),
  ('top_complaints',                '5',  'int', 'Top complaints drawn on the trend chart'),
  ('lockout_max_attempts',          '5',  'int', 'Failed logins before an account locks (ADR-015)'),
  ('lockout_minutes',               '5',  'int', 'Lock duration in minutes (ADR-015)'),
  ('password_min_length',           '8',  'int', 'Minimum password length (Module 1)'),
  ('password_history_count',        '5',  'int', 'Previous passwords that cannot be reused (Module 1)'),
  ('retention_years_after_archive', '5',  'int', 'Years an archived student or staff-patient record is kept before deletion (ADR-057)'),
  ('holiday_stale_days',            '45', 'int', 'Warn when the last successful holiday sync is older than this (ADR-020)'),
  ('audit_retention_years',         '10', 'int', 'Years the audit log is kept (ADR-037, ADR-057)'),
  ('idle_signout_minutes_staff',    '60', 'int', 'Idle minutes before a Staff account is signed out, 10 to 240 (ADR-078)'),
  ('idle_signout_minutes_admin',    '30', 'int', 'Idle minutes before the Admin/Principal is signed out, 10 to 240 (ADR-048, ADR-078)'),
  ('medical_certificate_after_days','3',  'int', 'Excused days past which a letter warns about a medical certificate (ADR-049)'),
  ('cluster_min_students',          '3',  'int', 'Students with the same complaint and grade that raise the cluster alert (ADR-050)'),
  ('cluster_window_days',           '3',  'int', 'Window of the cluster alert, in days (ADR-050)'),
  ('follow_up_overdue_after_days',  '3',  'int', 'Days after its date that a pending follow-up is overdue (ADR-051)'),
  ('follow_up_auto_close_days',     '7',  'int', 'Days after its date that a pending follow-up closes as Missed (ADR-051)'),
  ('stale_backup_hours',            '48', 'int', 'Hours after the last good backup before the Dashboard warns (ADR-037)'),
  ('backup_keep_last',              '60', 'int', 'Backups kept per location (ADR-052)'),
  ('unusual_age_years',             '3',  'int', 'Years from the usual age for the grade that raise a soft note (ADR-054)'),
  ('large_write_off_percent',       '25', 'int', 'Share of an item on hand at which a stock removal is marked "Large write-off" in the audit (ADR-061; the note is optional, ADR-068)'),
  ('percent_min_prior_count',       '5',  'int', 'Prior-period count below which a stat card shows both counts (panel review DB-2)'),
  ('school_year_start_month',       '6',  'int', 'Month the next school year is due to start (ADR-072, ADR-075; Principal, October 17, 2026)'),
  ('school_year_start_day',         '15', 'int', 'Day the next school year is due to start (ADR-072, ADR-075)'),
  ('school_year_end_month',         '4',  'int', 'Month of the last class day, when ending the year is due (ADR-072, ADR-075)'),
  ('school_year_end_day',           '14', 'int', 'Day of the last class day (ADR-072, ADR-075)'),
  ('school_year_notice_days',       '7',  'int', 'Days before a start or end is due that the Dashboard reminds Staff (ADR-075; nurse to confirm)');

INSERT INTO reference_settings (setting_key, value_format, setting_value, description) VALUES
  ('show_frequent_visitors', 'json', 'true', 'Show the frequent-visitor list on the Dashboard'),
  ('personnel_types', 'json', '["Teacher","Non-teaching staff","Utility worker","Other"]', 'Groups offered for a staff patient; the service checks against this list'),
  ('vitals_warning_ranges', 'json', '{"temperatureC":{"min":30,"max":43},"pulseBpm":{"min":30,"max":250},"oxygenSaturationPct":null,"feverFromC":37}', 'Sanity bounds that warn and never block (ADR-051); nurse to confirm'),
  ('vitals_usual_ranges', 'json', '{"temperatureMinC":36,"oxygenSaturationMinPct":95,"grades1to6FromAge":6,"grades7to12FromAge":13,"byAgeGroup":{"kinder":{"pulseBpm":{"min":80,"max":110},"systolic":{"min":95,"max":110},"diastolic":{"min":60,"max":75}},"grades1to6":{"pulseBpm":{"min":70,"max":100},"systolic":{"min":100,"max":120},"diastolic":{"min":60,"max":75}},"grades7to12":{"pulseBpm":{"min":60,"max":100},"systolic":{"min":100,"max":120},"diastolic":{"min":70,"max":80}},"adult":{"pulseBpm":{"min":60,"max":100},"systolic":{"min":90,"max":120},"diastolic":{"min":60,"max":80}}}}', 'Usual ranges by age group, soft notes only (ADR-051); nurse to confirm');
SQL);
    }

    public function down(): void
    {
        DB::table('reference_settings')->delete();
        DB::table('system_settings')->delete();
        DB::table('grade_levels')->delete();
    }
};
