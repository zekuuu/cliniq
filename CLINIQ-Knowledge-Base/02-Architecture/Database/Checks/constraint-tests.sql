-- CLINIQ constraint tests. Run on a scratch database holding Reference-Schema.sql: see README.md (same folder).
-- t_rejects passes only when the statement fails on the named constraint. Every case rolls back,
-- so cases do not depend on each other. The retention purge runs last, on purpose, and stays.

SET NAMES utf8mb4;
SET time_zone = '+08:00';
SET sql_mode = 'STRICT_ALL_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

CREATE TABLE t_results (
  n INT AUTO_INCREMENT PRIMARY KEY,
  kind VARCHAR(8) NOT NULL,
  name VARCHAR(120) NOT NULL,
  passed TINYINT(1) NOT NULL,
  got TEXT NULL
);

DELIMITER //

CREATE PROCEDURE t_run(IN q TEXT, OUT msg TEXT)
BEGIN
  DECLARE CONTINUE HANDLER FOR SQLEXCEPTION GET DIAGNOSTICS CONDITION 1 msg = MESSAGE_TEXT;
  SET msg = NULL;
  SET @t_q = q;
  PREPARE t_s FROM @t_q;
  EXECUTE t_s;
  DEALLOCATE PREPARE t_s;
END //

CREATE PROCEDURE t_rejects(IN expected VARCHAR(120), IN q TEXT)
BEGIN
  DECLARE msg TEXT;
  START TRANSACTION;
  CALL t_run(q, msg);
  ROLLBACK;
  INSERT INTO t_results (kind, name, passed, got)
  VALUES ('rejects', expected, msg IS NOT NULL AND LOCATE(expected, msg) > 0, COALESCE(msg, 'statement was accepted'));
END //

CREATE PROCEDURE t_accepts(IN label VARCHAR(120), IN q TEXT)
BEGIN
  DECLARE msg TEXT;
  START TRANSACTION;
  CALL t_run(q, msg);
  ROLLBACK;
  INSERT INTO t_results (kind, name, passed, got) VALUES ('accepts', label, msg IS NULL, msg);
END //

-- Runs a statement, then expects a count from a query, then rolls back. An empty statement only counts.
CREATE PROCEDURE t_count(IN label VARCHAR(120), IN q TEXT, IN count_q TEXT, IN expected BIGINT)
BEGIN
  DECLARE msg TEXT;
  START TRANSACTION;
  IF q <> '' THEN CALL t_run(q, msg); END IF;
  SET @t_q = CONCAT('SELECT COUNT(*) INTO @t_c FROM ', count_q);
  PREPARE t_s FROM @t_q;
  EXECUTE t_s;
  DEALLOCATE PREPARE t_s;
  ROLLBACK;
  INSERT INTO t_results (kind, name, passed, got)
  VALUES ('count', label, msg IS NULL AND @t_c = expected, COALESCE(msg, CONCAT('count ', @t_c, ', expected ', expected)));
END //

-- The retention purge of ERD.md section 7, in its order, for a student or a staff patient.
CREATE PROCEDURE t_purge_patient(IN s BIGINT UNSIGNED, IN p BIGINT UNSIGNED)
BEGIN
  START TRANSACTION;
  DELETE FROM emergency_contacts WHERE student_id = s;
  UPDATE visits SET escalated_incident_id = NULL WHERE student_id <=> s AND personnel_id <=> p;
  UPDATE incidents SET source_visit_id = NULL WHERE student_id <=> s AND personnel_id <=> p;
  UPDATE inventory_transactions
    SET student_id = NULL, personnel_id = NULL, visit_id = NULL, incident_id = NULL,
        note = IF(note IS NULL, NULL, 'Removed at retention purge')
    WHERE (s IS NOT NULL AND student_id = s) OR (p IS NOT NULL AND personnel_id = p);
  DELETE FROM follow_ups WHERE student_id <=> s AND personnel_id <=> p;
  DELETE FROM pe_referrals WHERE student_id = s;
  DELETE FROM incidents WHERE student_id <=> s AND personnel_id <=> p;
  DELETE FROM visits WHERE student_id <=> s AND personnel_id <=> p;
  DELETE FROM students WHERE id = s;
  DELETE FROM personnel WHERE id = p;
  INSERT INTO audit_logs (occurred_at, action_type, target_type, target_id, summary)
  VALUES (NOW(), 'delete', IF(s IS NULL, 'staff', 'student'), COALESCE(s, p), 'Retention purge');
  COMMIT;
END //

DELIMITER ;

-- ---------------------------------------------------------------------------------
-- Fixtures
-- ---------------------------------------------------------------------------------

INSERT INTO users (id, name, username, password_hash, role) VALUES
  (1, 'Nurse', 'nurse', 'h', 'staff'), (2, 'Principal', 'principal', 'h', 'admin');
INSERT INTO students (id, lrn, last_name, first_name, sex) VALUES
  (1, '100000000001', 'Nuñez', 'Ana', 'female'), (2, '100000000002', 'Reyes', 'Ben', 'male'), (3, '100000000003', 'Cruz', 'Cara', 'female');
INSERT INTO personnel (id, staff_number, last_name, first_name, sex, type) VALUES
  (1, 'STF-0001', 'Santos', 'Dan', 'male', 'Teacher'), (2, 'STF-0002', 'Lim', 'Eve', 'female', 'Teacher');
INSERT INTO complaint_types (id, label) VALUES (1, 'Headache');
INSERT INTO triage_steps (id, complaint_type_id, step_text) VALUES (1, 1, 'Check temperature');
INSERT INTO inventory_items (id, name, category, unit) VALUES (1, 'Paracetamol', 'medicine', 'tablet'), (2, 'Gauze', 'supply', 'pack');
INSERT INTO inventory_batches (id, item_id, quantity, received_date) VALUES (1, 1, 50, '2026-10-01'), (2, 1, 50, '2026-10-02');
INSERT INTO student_health_entries (student_id, kind, label) VALUES (1, 'allergy', 'Peanuts'), (3, 'allergy', 'Dust');
INSERT INTO emergency_contacts (id, student_id, name, phone) VALUES (1, 1, 'Parent One', '0917'), (3, 3, 'Parent Three', '0919');
INSERT INTO personnel_health_entries (personnel_id, kind, label) VALUES (1, 'allergy', 'Latex'), (2, 'condition', 'Asthma');
INSERT INTO personnel_emergency_contacts (personnel_id, name, phone) VALUES (1, 'Kin One', '0920'), (2, 'Kin Two', '0921');
INSERT INTO visits (id, student_id, personnel_id, visited_at, complaint, disposition, logged_by_user_id) VALUES
  (1, 1, NULL, '2026-10-01 09:00:00', 'Headache', 'sent_home', 1),
  (2, 2, NULL, '2026-10-01 09:10:00', 'Fever', 'sent_home', 1),
  (3, NULL, 1, '2026-10-01 09:20:00', 'Cough', 'sent_home', 1),
  (4, 3, NULL, '2026-10-01 09:30:00', 'Fall', 'sent_home', 1),
  (5, NULL, 2, '2026-10-01 09:40:00', 'Fall', 'sent_home', 1);
INSERT INTO incidents (id, student_id, personnel_id, occurred_at, complaint, created_by_user_id) VALUES
  (1, 1, NULL, '2026-10-01 10:00:00', 'Fall', 1), (2, 2, NULL, '2026-10-01 10:10:00', 'Fall', 1),
  (3, NULL, 1, '2026-10-01 10:20:00', 'Faint', 1), (4, 3, NULL, '2026-10-01 10:30:00', 'Fall', 1),
  (5, NULL, 2, '2026-10-01 10:40:00', 'Fall', 1);
INSERT INTO excuse_letters (id, visit_id, excused_from, excused_until, prepared_by_user_id) VALUES (1, 1, '2026-10-01', '2026-10-02', 1);
INSERT INTO excuse_letters (id, visit_id, status, excused_from, excused_until, prepared_by_user_id, reference_no, approved_by_user_id, approved_at) VALUES
  (2, 2, 'approved', '2026-10-01', '2026-10-02', 1, 'EL-2026-00001', 1, '2026-10-01 11:00:00');
INSERT INTO treatment_item_lines (id, visit_id, item_id, item_name_snapshot, unit_snapshot, quantity) VALUES (1, 1, 1, 'Paracetamol', 'tablet', 2);
INSERT INTO treatment_item_lines (id, incident_id, item_id, item_name_snapshot, unit_snapshot, quantity) VALUES (2, 1, 1, 'Paracetamol', 'tablet', 1);
INSERT INTO inventory_transactions (id, item_id, type, quantity_delta, stock_after, occurred_at, user_id, student_id, visit_id) VALUES
  (1, 1, 'dispense', -2, 98, '2026-10-01 09:00:00', 1, 1, 1);
INSERT INTO inventory_transaction_batches (transaction_id, batch_id, quantity) VALUES (1, 1, 2);
INSERT INTO incident_report_approvals (incident_id, reference_no, approved_by_user_id, approved_at) VALUES (1, 'IR-2026-00001', 1, '2026-10-01 12:00:00');
INSERT INTO hospital_referrals (incident_id, destination, transport_mode, departed_at, created_by_user_id) VALUES (1, 'Hospital', 'Car', '2026-10-01 10:30:00', 1);
INSERT INTO sports_reports (id, title, requested_by, created_by_user_id) VALUES (1, 'Basketball', 'Coach', 1);
INSERT INTO sports_report_students (sports_report_id, student_id) VALUES (1, 1), (1, 3);
INSERT INTO backup_logs (id, run_key, ran_at, status) VALUES (1, 'run-1', '2026-10-01 01:00:00', 'ok'), (2, 'run-2', '2026-10-02 01:00:00', 'failed');
INSERT INTO backup_locations (id, label, path) VALUES (1, 'USB', 'E:/');
INSERT INTO backup_location_results (backup_log_id, backup_location_id, status) VALUES (1, 1, 'ok');
INSERT INTO holidays (holiday_date, name, kind, source) VALUES ('2026-12-25', 'Christmas', 'regular', 'test');
-- The frontend seed's school years (ADR-072, ADR-075): 2025–2026 ended, 2026–2027 in session.
INSERT INTO school_years (id, label, started_on, started_by_user_id, ended_on, ended_by_user_id) VALUES
  (1, '2025–2026', '2025-06-16', 1, '2026-04-14', 1), (2, '2026–2027', '2026-06-15', 1, NULL, NULL);
INSERT INTO complaint_types (id, label, sort_order) VALUES (2, 'Fever', 1);
INSERT INTO inventory_item_symptom_tags (item_id, complaint_type_id) VALUES (1, 1), (1, 2);
INSERT INTO recovery_codes (id, user_id, code_hash) VALUES (1, 1, 'hash-1'), (2, 2, 'hash-2');
UPDATE users SET totp_secret = 'encrypted', totp_confirmed_at = '2026-11-07 09:00:00' WHERE id = 1;

SET @u = 'INSERT INTO users (name, username, password_hash, role, is_head_nurse) VALUES ';
SET @st = 'INSERT INTO students (lrn, last_name, first_name, middle_name, sex) VALUES ';
SET @pe = 'INSERT INTO personnel (staff_number, last_name, first_name, middle_name, sex, type) VALUES ';
SET @v = 'INSERT INTO visits (student_id, personnel_id, visited_at, complaint, disposition, referred_to, logged_by_user_id) VALUES ';
SET @i = 'INSERT INTO incidents (student_id, personnel_id, occurred_at, complaint, stage, completed_at, completed_by_user_id, created_by_user_id) VALUES ';
SET @l = 'INSERT INTO excuse_letters (visit_id, status, excused_from, excused_until, prepared_by_user_id, reference_no, approved_by_user_id, approved_at, voided_at, superseded_at) VALUES ';
SET @r = 'INSERT INTO incident_vital_readings (incident_id, stage, recorded_at, recorded_by_user_id, temperature_c, pulse_bpm, blood_pressure, spo2_percent) VALUES ';
SET @f = 'INSERT INTO follow_ups (student_id, personnel_id, visit_id, incident_id, follow_up_date, reason, status, created_by_user_id) VALUES ';
SET @il = 'INSERT INTO treatment_item_lines (visit_id, incident_id, item_id, item_name_snapshot, unit_snapshot, quantity) VALUES ';
SET @tx = 'INSERT INTO inventory_transactions (item_id, type, quantity_delta, stock_after, occurred_at, user_id, student_id, personnel_id, visit_id, incident_id, reason, note) VALUES ';
SET @a = 'INSERT INTO audit_logs (occurred_at, actor_user_id, actor_role, action_type, target_type, target_id, target_label, subject_student_id, subject_personnel_id) VALUES ';
SET @now = "'2026-10-01 12:00:00'";

-- ---------------------------------------------------------------------------------
-- Access and settings
-- ---------------------------------------------------------------------------------

CALL t_rejects('chk_users_role', CONCAT(@u, "('A', 'abc', 'h', 'nurse', 0)"));
CALL t_rejects('chk_users_head_nurse', CONCAT(@u, "('A', 'abc', 'h', 'admin', 1)"));
CALL t_rejects('chk_users_username_len', CONCAT(@u, "('A', 'ab', 'h', 'staff', 0)"));
CALL t_rejects('chk_users_name_len', CONCAT(@u, "(' ', 'abc', 'h', 'staff', 0)"));
CALL t_rejects('uq_users_username', CONCAT(@u, "('A', 'NURSE', 'h', 'staff', 0)"));
CALL t_count('no email column: the email reset is dropped (ADR-073)', '', "information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'email'", 0);
-- Authenticator recovery (ADR-073).
CALL t_rejects('chk_users_totp', "UPDATE users SET totp_secret = 'encrypted' WHERE id = 2");
CALL t_rejects('chk_users_totp', "UPDATE users SET totp_confirmed_at = NOW() WHERE id = 2");
CALL t_rejects('chk_users_totp_step', "UPDATE users SET last_totp_step = 59000000 WHERE id = 2");
CALL t_accepts('a confirmed authenticator records its last step', "UPDATE users SET last_totp_step = 59000000 WHERE id = 1");
CALL t_accepts('turning the authenticator off clears it', "UPDATE users SET totp_secret = NULL, totp_confirmed_at = NULL, last_totp_step = NULL WHERE id = 1");
CALL t_rejects('uq_recovery_codes_hash', "INSERT INTO recovery_codes (user_id, code_hash) VALUES (2, 'hash-1')");
CALL t_rejects('chk_recovery_codes_used', "UPDATE recovery_codes SET used_at = created_at - INTERVAL 1 DAY WHERE id = 1");
CALL t_accepts('a recovery code is spent once', "UPDATE recovery_codes SET used_at = created_at + INTERVAL 1 MINUTE WHERE id = 1");
CALL t_rejects('fk_recovery_codes_user', "INSERT INTO recovery_codes (user_id, code_hash) VALUES (999, 'hash-x')");
CALL t_count('deleting a user removes its codes', 'DELETE FROM users WHERE id = 2', 'recovery_codes WHERE user_id = 2', 0);
-- School-year settings (ADR-072, ADR-075): one row's range; day-for-month and end-not-start are the service's.
CALL t_rejects('chk_settings_school_year_month', "UPDATE system_settings SET setting_value = '13' WHERE setting_key = 'school_year_start_month'");
CALL t_rejects('chk_settings_school_year_month', "UPDATE system_settings SET setting_value = '0' WHERE setting_key = 'school_year_end_month'");
CALL t_rejects('chk_settings_school_year_month', "UPDATE system_settings SET setting_value = 'June' WHERE setting_key = 'school_year_start_month'");
CALL t_rejects('chk_settings_school_year_day', "UPDATE system_settings SET setting_value = '32' WHERE setting_key = 'school_year_start_day'");
CALL t_rejects('chk_settings_school_year_day', "UPDATE system_settings SET setting_value = '0' WHERE setting_key = 'school_year_end_day'");
CALL t_accepts('a school-year date at its limits', "UPDATE system_settings SET setting_value = '31' WHERE setting_key = 'school_year_end_day'");
CALL t_count('school-year dates default to June 15 and April 14, notice 7 days', '', "system_settings WHERE (setting_key, setting_value) IN (('school_year_start_month','6'),('school_year_start_day','15'),('school_year_end_month','4'),('school_year_end_day','14'),('school_year_notice_days','7'))", 5);
-- School years started and ended by hand (ADR-075).
SET @sy = 'INSERT INTO school_years (label, started_on, started_by_user_id, ended_on, ended_by_user_id) VALUES ';
CALL t_rejects('uq_school_years_label', CONCAT(@sy, "('2026–2027', '2027-06-15', 1, NULL, NULL)"));
CALL t_rejects('uq_school_years_started_on', "UPDATE school_years SET started_on = '2025-06-16' WHERE id = 2");
CALL t_rejects('uq_school_years_one_in_session', CONCAT(@sy, "('2027–2028', '2027-06-15', 1, NULL, NULL)"));
CALL t_accepts('the next year starts once the current one is ended', "INSERT INTO school_years (id, label, started_on, started_by_user_id, ended_on, ended_by_user_id) VALUES (2, '2026–2027', '2026-06-15', 1, '2027-04-14', 1), (3, '2027–2028', '2027-06-15', 1, NULL, NULL) ON DUPLICATE KEY UPDATE ended_on = VALUES(ended_on), ended_by_user_id = VALUES(ended_by_user_id)");
CALL t_rejects('chk_school_years_label', CONCAT(@sy, "('2027-2028', '2027-06-15', 1, '2028-04-14', 1)"));
CALL t_rejects('chk_school_years_label', CONCAT(@sy, "('2027–2029', '2027-06-15', 1, '2028-04-14', 1)"));
CALL t_rejects('chk_school_years_ended_after_start', "UPDATE school_years SET ended_on = '2026-06-14', ended_by_user_id = 1 WHERE id = 2");
CALL t_accepts('a year may end on the day it started', "UPDATE school_years SET ended_on = '2026-06-15', ended_by_user_id = 1 WHERE id = 2");
CALL t_rejects('chk_school_years_ended_pair', "UPDATE school_years SET ended_on = '2027-04-14' WHERE id = 2");
CALL t_rejects('chk_school_years_ended_pair', "UPDATE school_years SET ended_by_user_id = 1 WHERE id = 2");
CALL t_rejects('fk_school_years_started_by', CONCAT(@sy, "('2030–2031', '2030-06-15', 999, '2031-04-14', 1)"));
CALL t_count('the current year is the latest start', '', "school_years WHERE id = (SELECT id FROM (SELECT id FROM school_years ORDER BY started_on DESC LIMIT 1) AS latest) AND label = '2026–2027' AND ended_on IS NULL", 1);
CALL t_accepts('profile picture holds a data URL', "UPDATE users SET profile_picture = CONCAT('data:image/png;base64,', REPEAT('A', 70000)) WHERE id = 1");
CALL t_rejects('chk_settings_type', "INSERT INTO system_settings (setting_key, setting_value, value_type) VALUES ('x', '1', 'list')");
CALL t_rejects('fk_settings_user', "UPDATE system_settings SET updated_by_user_id = 999 WHERE setting_key = 'top_complaints'");
CALL t_rejects('chk_reference_settings_format', "INSERT INTO reference_settings (setting_key, value_format, setting_value) VALUES ('x', 'yaml', 'a')");
CALL t_rejects('chk_reference_settings_json', "INSERT INTO reference_settings (setting_key, value_format, setting_value) VALUES ('x', 'json', '{broken')");
CALL t_count('every non-numeric setting is seeded', '', "reference_settings WHERE setting_key IN ('show_frequent_visitors','personnel_types','vitals_warning_ranges','vitals_usual_ranges')", 4);
CALL t_count('audit retention is 10 years', '', "system_settings WHERE setting_key = 'audit_retention_years' AND setting_value = '10'", 1);
CALL t_count('record retention is 5 years', '', "system_settings WHERE setting_key = 'retention_years_after_archive' AND setting_value = '5'", 1);
CALL t_rejects('uq_grade_levels_name', "INSERT INTO grade_levels (name, sort_order) VALUES ('grade 1', 99)");
CALL t_rejects('uq_complaint_types_label', "INSERT INTO complaint_types (label) VALUES ('HEADACHE')");

-- ---------------------------------------------------------------------------------
-- Students and staff patients
-- ---------------------------------------------------------------------------------

CALL t_rejects('chk_students_lrn', CONCAT(@st, "('12345', 'A', 'A', NULL, 'female')"));
CALL t_rejects('chk_students_lrn', CONCAT(@st, "('12345678901a', 'A', 'A', NULL, 'female')"));
CALL t_rejects('chk_students_first_name', CONCAT(@st, "('100000000009', 'A', ' ', NULL, 'female')"));
CALL t_rejects('chk_students_last_name', CONCAT(@st, "('100000000009', ' ', 'A', NULL, 'female')"));
CALL t_rejects('chk_students_middle_name', CONCAT(@st, "('100000000009', 'A', 'A', '  ', 'female')"));
CALL t_accepts('a student with no middle name', CONCAT(@st, "('100000000009', 'A', 'A', NULL, 'female')"));
CALL t_rejects("Data too long for column 'first_name'", CONCAT(@st, "('100000000009', 'A', REPEAT('a', 51), NULL, 'female')"));
CALL t_rejects("Data too long for column 'middle_name'", CONCAT(@st, "('100000000009', 'A', 'A', REPEAT('a', 41), 'female')"));
CALL t_rejects("Data too long for column 'last_name'", CONCAT(@st, "('100000000009', REPEAT('a', 51), 'A', NULL, 'female')"));
CALL t_accepts('name parts at their limits', CONCAT(@st, "('100000000009', REPEAT('a', 50), REPEAT('a', 50), REPEAT('a', 40), 'female')"));
CALL t_rejects('chk_students_sex', CONCAT(@st, "('100000000009', 'A', 'A', NULL, 'other')"));
CALL t_rejects('chk_personnel_sex', CONCAT(@pe, "('STF-0098', 'A', 'A', NULL, 'other', 'Teacher')"));
CALL t_accepts('staff sex is female or male', CONCAT(@pe, "('STF-0099', 'A', 'A', NULL, 'female', 'Teacher')"));
CALL t_rejects('uq_students_lrn', CONCAT(@st, "('100000000001', 'A', 'A', NULL, 'female')"));
CALL t_rejects('fk_students_grade', "UPDATE students SET grade_level_id = 999 WHERE id = 1");
CALL t_accepts('an LRN keeps its leading zeros', CONCAT(@st, "('000000000009', 'A', 'A', NULL, NULL)"));
CALL t_count('accents and capitals match', '', "students WHERE last_name = 'NUNEZ' AND first_name = 'ANA'", 1);
CALL t_count('the joined name skips a missing middle name and ignores accents', '', "students WHERE CONCAT_WS(' ', first_name, middle_name, last_name) = 'ANA NUNEZ'", 1);
CALL t_rejects('chk_health_kind', "INSERT INTO student_health_entries (student_id, kind, label) VALUES (1, 'other', 'x')");
CALL t_rejects('uq_health_entry', "INSERT INTO student_health_entries (student_id, kind, label) VALUES (1, 'allergy', 'peanuts')");
CALL t_rejects('uq_contacts_one_primary', "INSERT INTO emergency_contacts (student_id, name, phone) VALUES (1, 'B', '1')");
CALL t_accepts('a second contact that is not primary', "INSERT INTO emergency_contacts (student_id, name, phone, is_primary, sort_order) VALUES (1, 'B', '1', 0, 1)");
CALL t_rejects('chk_contacts_verified', "UPDATE emergency_contacts SET is_verified = 1 WHERE id = 1");
CALL t_rejects('chk_verifications_result', "INSERT INTO emergency_contact_verifications (contact_id, result, recorded_by_user_id) VALUES (1, 'maybe', 1)");
CALL t_rejects('chk_reviews_source', "INSERT INTO student_record_reviews (student_id, source) VALUES (1, 'other')");
CALL t_rejects('chk_reviews_resolved', "INSERT INTO student_record_reviews (student_id, source, resolved_at) VALUES (1, 'flagged_in_clinic', NOW())");
CALL t_rejects('uq_reviews_one_open', "INSERT INTO student_record_reviews (student_id, source) VALUES (1, 'flagged_in_clinic'), (1, 'registrar_import')");
CALL t_rejects('chk_import_batches_status', "INSERT INTO student_import_batches (label, status, imported_by_user_id) VALUES ('a', 'x', 1)");
CALL t_rejects('uq_import_batches_file', CONCAT("INSERT INTO student_import_batches (label, source_file_sha256, imported_by_user_id) VALUES ('a', REPEAT('a', 64), 1), ('b', REPEAT('a', 64), 1)"));
CALL t_rejects('chk_personnel_first_name', CONCAT(@pe, "('STF-0009', 'A', ' ', NULL, 'female', 'Teacher')"));
-- Archive details (ADR-072): when, why and the school year, all three or none.
CALL t_rejects('chk_students_archive_details', "UPDATE students SET archived_at = NOW() WHERE id = 1");
CALL t_rejects('chk_students_archive_details', "UPDATE students SET archive_reason = 'Transferred' WHERE id = 1");
CALL t_rejects('chk_students_archive_reason', "UPDATE students SET archived_at = NOW(), archive_reason = '  ', archived_school_year = '2026–2027' WHERE id = 1");
CALL t_rejects("Data too long for column 'archive_reason'", CONCAT("UPDATE students SET archived_at = NOW(), archive_reason = '", REPEAT('a', 81), "', archived_school_year = '2026–2027' WHERE id = 1"));
CALL t_rejects('chk_students_archived_year', "UPDATE students SET archived_at = NOW(), archive_reason = 'Transferred', archived_school_year = '2026' WHERE id = 1");
CALL t_accepts('an archived student stores when, why and the year', CONCAT("UPDATE students SET archived_at = NOW(), archive_reason = '", REPEAT('a', 80), "', archived_school_year = '2026–2027' WHERE id = 1"));
CALL t_rejects('chk_personnel_archive_details', "UPDATE personnel SET archived_at = NOW(), archive_reason = 'Resigned' WHERE id = 1");
CALL t_rejects('chk_personnel_archive_reason', "UPDATE personnel SET archived_at = NOW(), archive_reason = ' ', archived_school_year = '2026–2027' WHERE id = 1");
CALL t_rejects('chk_personnel_archived_year', "UPDATE personnel SET archived_at = NOW(), archive_reason = 'Resigned', archived_school_year = '26-27' WHERE id = 1");
CALL t_accepts('an archived staff member stores when, why and the year', "UPDATE personnel SET archived_at = NOW(), archive_reason = 'Resigned', archived_school_year = '2026–2027' WHERE id = 1");
CALL t_rejects('chk_personnel_last_name', CONCAT(@pe, "('STF-0009', ' ', 'A', NULL, 'female', 'Teacher')"));
CALL t_rejects('chk_personnel_middle_name', CONCAT(@pe, "('STF-0009', 'A', 'A', ' ', 'female', 'Teacher')"));
CALL t_accepts('a staff member with no middle name', CONCAT(@pe, "('STF-0009', 'A', 'A', NULL, 'female', 'Teacher')"));
CALL t_rejects("Data too long for column 'last_name'", CONCAT(@pe, "('STF-0009', REPEAT('a', 51), 'A', NULL, 'female', 'Teacher')"));
CALL t_rejects('uq_personnel_staff_number', CONCAT(@pe, "('STF-0001', 'A', 'A', NULL, 'female', 'Teacher')"));
CALL t_rejects('chk_personnel_health_kind', "INSERT INTO personnel_health_entries (personnel_id, kind, label) VALUES (1, 'family_history', 'x')");
CALL t_rejects('uq_personnel_health_entry', "INSERT INTO personnel_health_entries (personnel_id, kind, label) VALUES (1, 'allergy', 'LATEX')");
CALL t_rejects('uq_personnel_contacts_one_primary', "INSERT INTO personnel_emergency_contacts (personnel_id, name, phone) VALUES (1, 'B', '1')");
-- Staff record reviews (ADR-067, ADR-076): as the student queue, without the import columns.
CALL t_rejects('chk_staff_reviews_resolved', "INSERT INTO staff_record_reviews (staff_id, resolved_at) VALUES (1, NOW())");
CALL t_rejects('chk_staff_reviews_resolved', "INSERT INTO staff_record_reviews (staff_id, resolved_by_user_id) VALUES (1, 1)");
CALL t_rejects('uq_staff_reviews_one_open', "INSERT INTO staff_record_reviews (staff_id) VALUES (1), (1)");
CALL t_rejects('fk_staff_reviews_staff', "INSERT INTO staff_record_reviews (staff_id) VALUES (999)");
CALL t_rejects('fk_staff_reviews_user', "INSERT INTO staff_record_reviews (staff_id, resolved_by_user_id, resolved_at) VALUES (1, 999, NOW())");
CALL t_accepts('a resolved staff review stays and a new one opens', "INSERT INTO staff_record_reviews (staff_id, resolved_by_user_id, resolved_at) VALUES (1, 1, NOW()), (1, NULL, NULL)");

-- ---------------------------------------------------------------------------------
-- Inventory items
-- ---------------------------------------------------------------------------------

CALL t_rejects('chk_items_category', "INSERT INTO inventory_items (name, category, unit) VALUES ('A', 'other', 'x')");
CALL t_rejects('chk_items_brand', "INSERT INTO inventory_items (name, category, unit, brand) VALUES ('A', 'medicine', 'x', 'store')");
CALL t_rejects('chk_items_name', "INSERT INTO inventory_items (name, category, unit) VALUES (' ', 'medicine', 'x')");
CALL t_rejects('uq_items_active_name', "INSERT INTO inventory_items (name, category, unit) VALUES ('paracetamol', 'medicine', 'x')");
-- "Commonly used for" (ADR-071).
CALL t_rejects('uq_item_symptom_tag', "INSERT INTO inventory_item_symptom_tags (item_id, complaint_type_id) VALUES (1, 1)");
CALL t_rejects('fk_symptom_tags_type', "INSERT INTO inventory_item_symptom_tags (item_id, complaint_type_id) VALUES (2, 999)");
CALL t_rejects('fk_symptom_tags_type', "DELETE FROM complaint_types WHERE id = 2");
CALL t_accepts('the same symptom on another item', "INSERT INTO inventory_item_symptom_tags (item_id, complaint_type_id) VALUES (2, 1)");
CALL t_count('tags come back in the option list order', '', "(SELECT ct.label FROM inventory_item_symptom_tags t JOIN complaint_types ct ON ct.id = t.complaint_type_id WHERE t.item_id = 1 ORDER BY ct.sort_order LIMIT 1) AS first_tag WHERE first_tag.label = 'Headache'", 1);
CALL t_accepts('an archived item frees its name', "INSERT INTO inventory_items (name, category, unit, archived_at) VALUES ('Paracetamol', 'medicine', 'x', NOW())");
CALL t_rejects('uq_item_allergy_word', "INSERT INTO inventory_item_allergy_words (item_id, word) VALUES (1, 'aspirin'), (1, 'ASPIRIN')");
CALL t_accepts('a batch can go below zero', "UPDATE inventory_batches SET quantity = -3 WHERE id = 1");

-- ---------------------------------------------------------------------------------
-- Visits and letters
-- ---------------------------------------------------------------------------------

CALL t_rejects('chk_visits_disposition', CONCAT(@v, "(1, NULL, ", @now, ", 'A', 'gone', NULL, 1)"));
CALL t_rejects('chk_visits_referred_to', CONCAT(@v, "(1, NULL, ", @now, ", 'A', 'sent_home', 'Hospital', 1)"));
CALL t_accepts('referred_to on a referred visit', CONCAT(@v, "(1, NULL, ", @now, ", 'A', 'referred_to_hospital', 'Hospital', 1)"));
CALL t_rejects('chk_visits_complaint', CONCAT(@v, "(1, NULL, ", @now, ", ' ', 'sent_home', NULL, 1)"));
CALL t_rejects('chk_visits_one_patient', CONCAT(@v, "(1, 1, ", @now, ", 'A', 'sent_home', NULL, 1)"));
CALL t_rejects('chk_visits_one_patient', CONCAT(@v, "(NULL, NULL, ", @now, ", 'A', 'sent_home', NULL, 1)"));
CALL t_rejects('chk_visits_error', "UPDATE visits SET entered_in_error_at = NOW() WHERE id = 1");
CALL t_rejects('chk_visits_temperature', "UPDATE visits SET temperature_c = -1 WHERE id = 1");
CALL t_accepts('G15: a slip of 370.00 saves on a visit', "UPDATE visits SET temperature_c = 370.00 WHERE id = 1");
CALL t_accepts('two-decimal temperature on a visit', "UPDATE visits SET temperature_c = 37.25 WHERE id = 1");
CALL t_rejects('uq_extra_complaint', "INSERT INTO visit_extra_complaints (visit_id, complaint) VALUES (1, 'Dizzy'), (1, 'DIZZY')");
CALL t_rejects('chk_letters_status', CONCAT(@l, "(3, 'lost', '2026-10-01', '2026-10-02', 1, NULL, NULL, NULL, NULL, NULL)"));
CALL t_rejects('chk_letters_period', CONCAT(@l, "(3, 'draft', '2026-10-02', '2026-10-01', 1, NULL, NULL, NULL, NULL, NULL)"));
CALL t_rejects('chk_letters_approved', CONCAT(@l, "(3, 'approved', '2026-10-01', '2026-10-02', 1, NULL, 1, ", @now, ", NULL, NULL)"));
CALL t_rejects('chk_letters_approved', CONCAT(@l, "(3, 'voided', '2026-10-01', '2026-10-02', 1, NULL, NULL, NULL, NULL, NULL)"));
CALL t_rejects('uq_letters_live_visit', CONCAT(@l, "(1, 'draft', '2026-10-01', '2026-10-02', 1, NULL, NULL, NULL, NULL, NULL)"));
CALL t_rejects('uq_letters_reference', CONCAT(@l, "(3, 'approved', '2026-10-01', '2026-10-02', 1, 'EL-2026-00001', 1, ", @now, ", NULL, NULL)"));
CALL t_accepts('a voided letter sits beside the live one', CONCAT(@l, "(1, 'voided', '2026-10-01', '2026-10-02', 1, NULL, NULL, NULL, ", @now, ", NULL)"));

-- ---------------------------------------------------------------------------------
-- Incidents
-- ---------------------------------------------------------------------------------

CALL t_rejects('chk_incidents_stage', CONCAT(@i, "(1, NULL, ", @now, ", 'A', 3, NULL, NULL, 1)"));
CALL t_rejects('chk_incidents_completed', CONCAT(@i, "(1, NULL, ", @now, ", 'A', 2, NULL, NULL, 1)"));
CALL t_rejects('chk_incidents_completed', CONCAT(@i, "(1, NULL, ", @now, ", 'A', 1, ", @now, ", 1, 1)"));
CALL t_rejects('chk_incidents_complaint', CONCAT(@i, "(1, NULL, ", @now, ", ' ', 1, NULL, NULL, 1)"));
CALL t_rejects('chk_incidents_one_patient', CONCAT(@i, "(1, 1, ", @now, ", 'A', 1, NULL, NULL, 1)"));
CALL t_rejects('chk_incidents_one_patient', CONCAT(@i, "(NULL, NULL, ", @now, ", 'A', 1, NULL, NULL, 1)"));
CALL t_rejects('chk_vitals_stage', CONCAT(@r, "(1, 3, ", @now, ", 1, NULL, NULL, NULL, NULL)"));
CALL t_rejects('chk_vitals_temp', CONCAT(@r, "(1, 1, ", @now, ", 1, -0.1, NULL, NULL, NULL)"));
CALL t_rejects('chk_vitals_spo2', CONCAT(@r, "(1, 1, ", @now, ", 1, NULL, NULL, NULL, 101)"));
CALL t_rejects('pulse_bpm', CONCAT(@r, "(1, 1, ", @now, ", 1, NULL, -1, NULL, NULL)"));
CALL t_accepts('G15: out-of-range readings save', CONCAT(@r, "(1, 1, ", @now, ", 1, 370.00, 300, '300/250', 20)"));
CALL t_accepts('G15: no pulse and no oxygen reading save', CONCAT(@r, "(1, 1, ", @now, ", 1, 25.00, 0, NULL, 0)"));
CALL t_accepts('G14: blood pressure by palpation saves', CONCAT(@r, "(1, 1, ", @now, ", 1, NULL, NULL, '90/P', NULL)"));
CALL t_accepts('no reading is required', CONCAT(@r, "(1, 1, ", @now, ", 1, NULL, NULL, NULL, NULL)"));
CALL t_rejects('uq_referrals_incident', "INSERT INTO hospital_referrals (incident_id, destination, transport_mode, departed_at, created_by_user_id) VALUES (1, 'B', 'Car', NOW(), 1)");
CALL t_rejects('chk_notifications_outcome', "INSERT INTO parent_notification_attempts (incident_id, outcome, attempted_at, logged_by_user_id) VALUES (1, 'busy', NOW(), 1)");
CALL t_rejects('chk_notifications_source', "INSERT INTO parent_notification_attempts (incident_id, outcome, called_source, attempted_at, logged_by_user_id) VALUES (1, 'reached', 'friend', NOW(), 1)");
CALL t_accepts('a call for a staff patient keeps its snapshot', "INSERT INTO parent_notification_attempts (incident_id, called_name, called_relationship, phone_dialed, called_source, outcome, attempted_at, logged_by_user_id) VALUES (3, 'Kin One', 'Spouse', '0920', 'emergency_contact', 'reached', NOW(), 1)");
CALL t_rejects('uq_report_approvals_incident', "INSERT INTO incident_report_approvals (incident_id, reference_no, approved_by_user_id, approved_at) VALUES (1, 'IR-2026-00002', 1, NOW())");
CALL t_rejects('uq_report_approvals_reference', "INSERT INTO incident_report_approvals (incident_id, reference_no, approved_by_user_id, approved_at) VALUES (2, 'IR-2026-00001', 1, NOW())");

-- ---------------------------------------------------------------------------------
-- Follow-ups, PE referrals, medicine lines
-- ---------------------------------------------------------------------------------

CALL t_rejects('chk_followups_status', CONCAT(@f, "(1, NULL, 1, NULL, '2026-10-05', 'A', 'late', 1)"));
CALL t_rejects('chk_followups_one_source', CONCAT(@f, "(1, NULL, 1, 1, '2026-10-05', 'A', 'pending', 1)"));
CALL t_rejects('chk_followups_one_source', CONCAT(@f, "(1, NULL, NULL, NULL, '2026-10-05', 'A', 'pending', 1)"));
CALL t_rejects('chk_followups_one_patient', CONCAT(@f, "(1, 1, 1, NULL, '2026-10-05', 'A', 'pending', 1)"));
CALL t_rejects('fk_followups_visit', CONCAT(@f, "(1, NULL, 2, NULL, '2026-10-05', 'A', 'pending', 1)"));
CALL t_rejects('fk_followups_incident', CONCAT(@f, "(1, NULL, NULL, 2, '2026-10-05', 'A', 'pending', 1)"));
CALL t_rejects('fk_followups_visit_staff', CONCAT(@f, "(NULL, 1, 1, NULL, '2026-10-05', 'A', 'pending', 1)"));
CALL t_rejects('fk_followups_incident_staff', CONCAT(@f, "(NULL, 1, NULL, 1, '2026-10-05', 'A', 'pending', 1)"));
CALL t_accepts('a follow-up for the right staff patient', CONCAT(@f, "(NULL, 1, 3, NULL, '2026-10-05', 'A', 'pending', 1)"));
CALL t_accepts('G17: a prefixed 340-character status reason', "INSERT INTO follow_ups (student_id, visit_id, follow_up_date, reason, status, status_reason, created_by_user_id) VALUES (1, 1, '2026-10-05', 'A', 'cancelled', REPEAT('a', 340), 1)");
SET @pe = 'INSERT INTO pe_referrals (student_id, referred_by, logged_by_user_id, activity, injury_summary, clinical_assessment, treatment, disposition, visit_id, incident_id) VALUES ';
CALL t_rejects('chk_pe_disposition', CONCAT(@pe, "(1, 'Coach', 1, 'A', 'B', 'C', 'D', 'resting_in_clinic', NULL, NULL)"));
CALL t_rejects('fk_pe_visit', CONCAT(@pe, "(1, 'Coach', 1, 'A', 'B', 'C', 'D', 'sent_home', 2, NULL)"));
CALL t_rejects('fk_pe_incident', CONCAT(@pe, "(1, 'Coach', 1, 'A', 'B', 'C', 'D', 'sent_home', NULL, 2)"));
CALL t_rejects('chk_lines_one_source', CONCAT(@il, "(1, 1, 2, 'A', 'x', 1)"));
CALL t_rejects('chk_lines_one_source', CONCAT(@il, "(NULL, NULL, 2, 'A', 'x', 1)"));
CALL t_rejects('chk_lines_quantity', CONCAT(@il, "(2, NULL, 2, 'A', 'x', 0)"));
CALL t_rejects('uq_lines_visit_item', CONCAT(@il, "(1, NULL, 1, 'A', 'x', 1)"));
CALL t_rejects('uq_lines_incident_item', CONCAT(@il, "(NULL, 1, 1, 'A', 'x', 1)"));

-- ---------------------------------------------------------------------------------
-- Ledger
-- ---------------------------------------------------------------------------------

SET @day = "'2026-10-02 09:00:00'";
CALL t_rejects('chk_txn_type', CONCAT(@tx, "(1, 'theft', -1, 0, ", @day, ", 1, NULL, NULL, NULL, NULL, NULL, NULL)"));
CALL t_rejects('chk_txn_sign', CONCAT(@tx, "(1, 'opening', -1, 0, ", @day, ", 1, NULL, NULL, NULL, NULL, NULL, NULL)"));
CALL t_rejects('chk_txn_sign', CONCAT(@tx, "(1, 'dispense', 1, 0, ", @day, ", 1, NULL, NULL, NULL, NULL, NULL, NULL)"));
CALL t_rejects('chk_txn_sign', CONCAT(@tx, "(1, 'restock', -1, 0, ", @day, ", 1, NULL, NULL, NULL, NULL, NULL, NULL)"));
CALL t_rejects('chk_txn_sign', CONCAT(@tx, "(1, 'adjustment', 0, 0, ", @day, ", 1, NULL, NULL, NULL, NULL, 'other', 'x')"));
CALL t_rejects('chk_txn_reason', CONCAT(@tx, "(1, 'adjustment', -1, 0, ", @day, ", 1, NULL, NULL, NULL, NULL, NULL, NULL)"));
CALL t_rejects('chk_txn_reason', CONCAT(@tx, "(1, 'restock', 1, 0, ", @day, ", 1, NULL, NULL, NULL, NULL, 'other', 'x')"));
CALL t_accepts('reason other with no note (ADR-068)', CONCAT(@tx, "(1, 'adjustment', -1, 0, ", @day, ", 1, NULL, NULL, NULL, NULL, 'other', NULL)"));
CALL t_rejects('chk_txn_one_link', CONCAT(@tx, "(1, 'dispense', -1, 0, ", @day, ", 1, 1, NULL, 1, 1, NULL, NULL)"));
CALL t_rejects('chk_txn_link_has_patient', CONCAT(@tx, "(1, 'dispense', -1, 0, ", @day, ", 1, NULL, NULL, 1, NULL, NULL, NULL)"));
CALL t_rejects('chk_txn_one_patient', CONCAT(@tx, "(1, 'dispense', -1, 0, ", @day, ", 1, 1, 1, NULL, NULL, NULL, NULL)"));
CALL t_rejects('fk_txn_visit', CONCAT(@tx, "(1, 'dispense', -1, 0, ", @day, ", 1, 1, NULL, 2, NULL, NULL, NULL)"));
CALL t_rejects('fk_txn_incident', CONCAT(@tx, "(1, 'dispense', -1, 0, ", @day, ", 1, 1, NULL, NULL, 2, NULL, NULL)"));
CALL t_rejects('fk_txn_visit_staff', CONCAT(@tx, "(1, 'dispense', -1, 0, ", @day, ", 1, NULL, 1, 1, NULL, NULL, NULL)"));
CALL t_rejects('fk_txn_incident_staff', CONCAT(@tx, "(1, 'dispense', -1, 0, ", @day, ", 1, NULL, 1, NULL, 1, NULL, NULL)"));
CALL t_accepts('general use has no patient', CONCAT(@tx, "(1, 'dispense', -1, 0, ", @day, ", 1, NULL, NULL, NULL, NULL, NULL, NULL)"));
CALL t_accepts('an incident line edit is a visit_edited row with no visit', CONCAT(@tx, "(1, 'adjustment', 1, 0, ", @day, ", 1, 1, NULL, NULL, 1, 'visit_edited', NULL)"));
CALL t_accepts('G20: a return is a negative allocation', "INSERT INTO inventory_transaction_batches (transaction_id, batch_id, quantity) VALUES (1, 2, -2)");
CALL t_rejects('chk_txn_batch_quantity', "INSERT INTO inventory_transaction_batches (transaction_id, batch_id, quantity) VALUES (1, 2, 0)");
CALL t_rejects('uq_txn_batch', "INSERT INTO inventory_transaction_batches (transaction_id, batch_id, quantity) VALUES (1, 1, 1)");

-- ---------------------------------------------------------------------------------
-- Reports, backups, calendar, feedback, audit
-- ---------------------------------------------------------------------------------

CALL t_rejects('chk_sports_reports_title', "INSERT INTO sports_reports (title, requested_by, created_by_user_id) VALUES (' ', 'A', 1)");
CALL t_rejects('chk_sports_reports_requested_by', "INSERT INTO sports_reports (title, requested_by, created_by_user_id) VALUES ('A', ' ', 1)");
CALL t_rejects('chk_sports_reports_look_back', "INSERT INTO sports_reports (title, requested_by, look_back, created_by_user_id) VALUES ('A', 'B', '7_days', 1)");
CALL t_rejects('uq_sports_report_student', "INSERT INTO sports_report_students (sports_report_id, student_id) VALUES (1, 1)");
CALL t_rejects('chk_backup_status', "INSERT INTO backup_logs (run_key, ran_at, status) VALUES ('x', NOW(), 'maybe')");
CALL t_rejects('chk_backup_verified', "UPDATE backup_logs SET verified_at = NOW() WHERE id = 1");
CALL t_rejects('chk_backup_verify_ok', "UPDATE backup_logs SET verified_at = NOW(), verified_by_user_id = 1 WHERE id = 2");
CALL t_accepts('a good run can be verified', "UPDATE backup_logs SET verified_at = NOW(), verified_by_user_id = 1 WHERE id = 1");
CALL t_rejects('uq_backup_run_key', "INSERT INTO backup_logs (run_key, ran_at, status) VALUES ('run-1', NOW(), 'ok')");
CALL t_rejects('chk_locations_status', "INSERT INTO backup_locations (label, path, status) VALUES ('A', 'B', 'lost')");
CALL t_rejects('chk_locations_result', "INSERT INTO backup_locations (label, path, last_result) VALUES ('A', 'B', 'maybe')");
CALL t_rejects('chk_location_result_status', "INSERT INTO backup_location_results (backup_log_id, backup_location_id, status) VALUES (2, 1, 'maybe')");
CALL t_rejects('uq_backup_location_result', "INSERT INTO backup_location_results (backup_log_id, backup_location_id, status) VALUES (1, 1, 'ok')");
CALL t_rejects('chk_holidays_kind', "INSERT INTO holidays (holiday_date, name, kind, source) VALUES ('2026-12-26', 'A', 'other', 'x')");
CALL t_rejects('uq_holidays_date_name', "INSERT INTO holidays (holiday_date, name, kind, source) VALUES ('2026-12-25', 'CHRISTMAS', 'regular', 'x')");
CALL t_rejects('chk_holiday_sync_status', "INSERT INTO holiday_sync_runs (source, years_requested, status) VALUES ('a', '2026', 'maybe')");
CALL t_rejects('chk_events_title', "INSERT INTO calendar_events (title, start_date, created_by_user_id) VALUES (' ', '2026-10-01', 1)");
CALL t_rejects('chk_events_end', "INSERT INTO calendar_events (title, start_date, end_date, created_by_user_id) VALUES ('A', '2026-10-02', '2026-10-02', 1)");
CALL t_rejects('chk_issue_reports_role', "INSERT INTO issue_reports (description, route, page_name, reporter_role, reported_by_user_id) VALUES ('a', 'b', 'c', 'guest', 1)");
CALL t_rejects('chk_audit_action', CONCAT(@a, "(", @now, ", 1, 'staff', 'read', 'visit', 1, NULL, NULL, NULL)"));
CALL t_rejects('chk_audit_role', CONCAT(@a, "(", @now, ", 1, 'nurse', 'view', 'visit', 1, NULL, NULL, NULL)"));
CALL t_rejects('chk_audit_actor', CONCAT(@a, "(", @now, ", NULL, 'staff', 'view', 'visit', 1, NULL, NULL, NULL)"));
CALL t_rejects('chk_audit_target', CONCAT(@a, "(", @now, ", 1, 'staff', 'view', 'visit', NULL, NULL, NULL, NULL)"));
CALL t_rejects('chk_audit_one_subject', CONCAT(@a, "(", @now, ", 1, 'staff', 'view', 'visit', 1, NULL, 1, 1)"));
CALL t_accepts('G25: a target with no record id', CONCAT(@a, "(", @now, ", NULL, NULL, 'create', 'backup', NULL, 'Backup run 2026-10-01', NULL, NULL)"));
CALL t_accepts('a staff patient as the audit subject', CONCAT(@a, "(", @now, ", 1, 'staff', 'view', 'staff', 1, NULL, NULL, 1)"));

-- ---------------------------------------------------------------------------------
-- Delete behaviour: shared references stay RESTRICT, owned rows go with their parent
-- ---------------------------------------------------------------------------------

CALL t_rejects('fk_incidents_student', "DELETE FROM students WHERE id = 2");
CALL t_rejects('fk_incidents_personnel', "DELETE FROM personnel WHERE id = 1");
CALL t_rejects('fk_batches_item', "DELETE FROM inventory_items WHERE id = 1");
CALL t_rejects('fk_txn_batch_batch', "DELETE FROM inventory_batches WHERE id = 1");
CALL t_rejects('fk_incidents_created_by', "DELETE FROM users WHERE id = 1");
CALL t_rejects('fk_txn_visit', "DELETE FROM visits WHERE id = 1");
CALL t_count('deleting a visit takes its letters', "DELETE FROM visits WHERE id = 2", "excuse_letters WHERE visit_id = 2", 0);
CALL t_count('deleting an incident takes its lines', "DELETE FROM incidents WHERE id = 1", "treatment_item_lines WHERE incident_id = 1", 0);
CALL t_count('deleting an incident takes its sign-off', "DELETE FROM incidents WHERE id = 1", "incident_report_approvals WHERE incident_id = 1", 0);
CALL t_count('deleting an incident takes its referral', "DELETE FROM incidents WHERE id = 1", "hospital_referrals WHERE incident_id = 1", 0);
CALL t_count('deleting a ledger row takes its allocations', "DELETE FROM inventory_transactions WHERE id = 1", "inventory_transaction_batches WHERE transaction_id = 1", 0);

-- ---------------------------------------------------------------------------------
-- Retention purge (G29, G30): a student and a staff patient with every kind of child row
-- ---------------------------------------------------------------------------------

INSERT INTO visit_extra_complaints (visit_id, complaint) VALUES (4, 'Dizzy'), (5, 'Dizzy');
INSERT INTO triage_checks (visit_id, step_text) VALUES (4, 'Check temperature');
INSERT INTO excuse_letters (id, visit_id, excused_from, excused_until, prepared_by_user_id) VALUES (3, 4, '2026-10-01', '2026-10-02', 1);
INSERT INTO incident_vital_readings (incident_id, stage, recorded_at, recorded_by_user_id, pulse_bpm) VALUES (4, 1, NOW(), 1, 80), (5, 1, NOW(), 1, 80);
INSERT INTO hospital_referrals (incident_id, destination, transport_mode, departed_at, created_by_user_id) VALUES (4, 'H', 'Car', NOW(), 1);
INSERT INTO parent_notification_attempts (incident_id, outcome, attempted_at, logged_by_user_id) VALUES (4, 'reached', NOW(), 1), (5, 'reached', NOW(), 1);
INSERT INTO incident_report_approvals (incident_id, reference_no, approved_by_user_id, approved_at) VALUES (4, 'IR-2026-00004', 1, NOW());
INSERT INTO emergency_contact_verifications (contact_id, result, incident_id, recorded_by_user_id) VALUES (3, 'verified', 4, 1);
INSERT INTO student_record_reviews (student_id, source) VALUES (3, 'flagged_in_clinic');
INSERT INTO staff_record_reviews (staff_id) VALUES (2);
INSERT INTO follow_ups (student_id, visit_id, follow_up_date, reason, created_by_user_id) VALUES (3, 4, '2026-10-05', 'A', 1);
INSERT INTO follow_ups (personnel_id, incident_id, follow_up_date, reason, created_by_user_id) VALUES (2, 5, '2026-10-05', 'A', 1);
INSERT INTO pe_referrals (student_id, referred_by, logged_by_user_id, activity, injury_summary, clinical_assessment, treatment, disposition, visit_id, incident_id) VALUES (3, 'Coach', 1, 'A', 'B', 'C', 'D', 'sent_home', 4, 4);
INSERT INTO treatment_item_lines (visit_id, item_id, item_name_snapshot, unit_snapshot, quantity) VALUES (4, 1, 'Paracetamol', 'tablet', 1), (5, 1, 'Paracetamol', 'tablet', 1);
INSERT INTO treatment_item_lines (incident_id, item_id, item_name_snapshot, unit_snapshot, quantity) VALUES (4, 2, 'Gauze', 'pack', 1);
INSERT INTO inventory_transactions (id, item_id, type, quantity_delta, stock_after, occurred_at, user_id, student_id, personnel_id, visit_id, reason, note) VALUES
  (2, 1, 'dispense', -1, 97, NOW(), 1, 3, NULL, 4, NULL, NULL),
  (3, 1, 'adjustment', 1, 98, NOW(), 1, 3, NULL, 4, 'visit_edited', NULL),
  (4, 1, 'adjustment', -1, 97, NOW(), 1, 3, NULL, NULL, 'other', 'Given to Cara'),
  (5, 1, 'dispense', -1, 96, NOW(), 1, NULL, 2, 5, NULL, NULL);
INSERT INTO inventory_transaction_batches (transaction_id, batch_id, quantity) VALUES (2, 1, 1), (3, 1, -1), (5, 1, 1);
UPDATE visits SET escalated_incident_id = 4 WHERE id = 4;
UPDATE incidents SET source_visit_id = 4 WHERE id = 4;
UPDATE visits SET escalated_incident_id = 5 WHERE id = 5;
UPDATE incidents SET source_visit_id = 5 WHERE id = 5;
INSERT INTO audit_logs (occurred_at, actor_user_id, actor_role, action_type, target_type, target_id, subject_student_id) VALUES
  (NOW() - INTERVAL 11 YEAR, 1, 'staff', 'view', 'student', 3, 3), (NOW() - INTERVAL 9 YEAR, 1, 'staff', 'view', 'student', 3, 3);

SET @before = (SELECT SUM(quantity_delta) FROM inventory_transactions);
CALL t_rejects('fk_followups_student', "DELETE FROM students WHERE id = 3");
CALL t_purge_patient(3, NULL);
CALL t_purge_patient(NULL, 2);
DELETE FROM audit_logs WHERE occurred_at < NOW() - INTERVAL 10 YEAR;

CALL t_count('purge: the student is gone', '', 'students WHERE id = 3', 0);
CALL t_count('purge: the staff patient is gone', '', 'personnel WHERE id = 2', 0);
CALL t_count('purge: visits gone', '', 'visits WHERE id IN (4, 5)', 0);
CALL t_count('purge: incidents gone', '', 'incidents WHERE id IN (4, 5)', 0);
CALL t_count('purge: letters gone', '', 'excuse_letters WHERE id = 3', 0);
CALL t_count('purge: lines gone', '', 'treatment_item_lines WHERE visit_id IN (4, 5) OR incident_id IN (4, 5)', 0);
CALL t_count('purge: follow-ups gone', '', 'follow_ups', 0);
CALL t_count('purge: PE referrals gone', '', 'pe_referrals', 0);
CALL t_count('purge: readings gone', '', 'incident_vital_readings', 0);
CALL t_count('purge: call attempts gone', '', 'parent_notification_attempts', 0);
CALL t_count('purge: extra complaints gone', '', 'visit_extra_complaints', 0);
CALL t_count('purge: triage checks gone', '', 'triage_checks', 0);
CALL t_count('purge: profile parts gone', '', 'student_health_entries WHERE student_id = 3', 0);
CALL t_count('purge: contacts gone', '', 'emergency_contacts WHERE student_id = 3', 0);
CALL t_count('purge: verifications gone', '', 'emergency_contact_verifications', 0);
CALL t_count('purge: reviews gone', '', 'student_record_reviews', 0);
CALL t_count('purge: staff contacts gone', '', 'personnel_emergency_contacts WHERE personnel_id = 2', 0);
CALL t_count('purge: staff health gone', '', 'personnel_health_entries WHERE personnel_id = 2', 0);
CALL t_count('purge: staff reviews gone', '', 'staff_record_reviews WHERE staff_id = 2', 0);
CALL t_count('purge: the Sports Report keeps its other student', '', 'sports_report_students WHERE sports_report_id = 1', 1);
CALL t_count('purge: the ledger keeps all five rows', '', 'inventory_transactions', 5);
CALL t_count('purge: the ledger still sums', '', CONCAT('(SELECT 1 FROM inventory_transactions HAVING SUM(quantity_delta) = ', @before, ') AS total'), 1);
CALL t_count('purge: allocations stay', '', 'inventory_transaction_batches', 4);
CALL t_count('purge: no person link left on the ledger', '', 'inventory_transactions WHERE id IN (2, 3, 4, 5) AND (student_id IS NOT NULL OR personnel_id IS NOT NULL OR visit_id IS NOT NULL)', 0);
CALL t_count('purge: free text on the ledger is removed', '', "inventory_transactions WHERE note LIKE '%Cara%'", 0);
CALL t_count('purge: the other patients are untouched', '', 'visits WHERE id IN (1, 2, 3)', 3);
CALL t_count('purge: audit rows older than 10 years go', '', 'audit_logs WHERE occurred_at < NOW() - INTERVAL 10 YEAR', 0);
CALL t_count('purge: audit rows younger than 10 years stay', '', "audit_logs WHERE action_type = 'view'", 1);
CALL t_count('purge: one audit row per patient', '', "audit_logs WHERE action_type = 'delete' AND actor_user_id IS NULL", 2);

-- ---------------------------------------------------------------------------------
-- Results
-- ---------------------------------------------------------------------------------

SELECT 'FAILED' AS result, name, got FROM t_results WHERE passed = 0;

SELECT 'UNTESTED CHECK' AS result, constraint_name AS name
FROM information_schema.check_constraints
WHERE constraint_schema = DATABASE() AND constraint_name NOT IN (SELECT name FROM t_results WHERE kind = 'rejects');

SELECT 'UNTESTED UNIQUE' AS result, constraint_name AS name
FROM information_schema.table_constraints
WHERE table_schema = DATABASE() AND constraint_type = 'UNIQUE'
  AND constraint_name NOT LIKE 'uq\_visits\_id\_%' AND constraint_name NOT LIKE 'uq\_incidents\_id\_%'
  AND constraint_name NOT IN (SELECT name FROM t_results WHERE kind = 'rejects');

SELECT kind, COUNT(*) AS cases, SUM(passed) AS passed, COUNT(*) - SUM(passed) AS failed FROM t_results GROUP BY kind WITH ROLLUP;
