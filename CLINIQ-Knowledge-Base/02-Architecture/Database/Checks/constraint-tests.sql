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

INSERT INTO users (id, name, username, email, password_hash, role) VALUES
  (1, 'Nurse', 'nurse', 'nurse@school.test', 'h', 'staff'), (2, 'Principal', 'principal', NULL, 'h', 'admin');
INSERT INTO students (id, lrn, full_name, sex) VALUES
  (1, '100000000001', 'Nuñez, Ana', 'female'), (2, '100000000002', 'Reyes, Ben', 'male'), (3, '100000000003', 'Cruz, Cara', 'female');
INSERT INTO personnel (id, staff_number, full_name, type) VALUES
  (1, 'STF-0001', 'Santos, Dan', 'Teacher'), (2, 'STF-0002', 'Lim, Eve', 'Teacher');
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

SET @u = 'INSERT INTO users (name, username, password_hash, role, is_head_nurse) VALUES ';
SET @st = 'INSERT INTO students (lrn, full_name, sex) VALUES ';
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
CALL t_rejects('uq_users_email', "INSERT INTO users (name, username, email, password_hash, role) VALUES ('A', 'abc', 'NURSE@school.test', 'h', 'staff')");
CALL t_accepts('several accounts may have no email', CONCAT(@u, "('A', 'abc', 'h', 'staff', 0)"));
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

CALL t_rejects('chk_students_lrn', CONCAT(@st, "('12345', 'A', 'female')"));
CALL t_rejects('chk_students_lrn', CONCAT(@st, "('12345678901a', 'A', 'female')"));
CALL t_rejects('chk_students_name', CONCAT(@st, "('100000000009', ' ', 'female')"));
CALL t_rejects('chk_students_sex', CONCAT(@st, "('100000000009', 'A', 'other')"));
CALL t_rejects('uq_students_lrn', CONCAT(@st, "('100000000001', 'A', 'female')"));
CALL t_rejects('fk_students_grade', "UPDATE students SET grade_level_id = 999 WHERE id = 1");
CALL t_accepts('an LRN keeps its leading zeros', CONCAT(@st, "('000000000009', 'A', NULL)"));
CALL t_count('accents and capitals match', '', "students WHERE full_name = 'NUNEZ, ANA'", 1);
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
CALL t_rejects('chk_personnel_name', "INSERT INTO personnel (staff_number, full_name, type) VALUES ('STF-0009', ' ', 'Teacher')");
CALL t_rejects('uq_personnel_staff_number', "INSERT INTO personnel (staff_number, full_name, type) VALUES ('STF-0001', 'A', 'Teacher')");
CALL t_rejects('chk_personnel_health_kind', "INSERT INTO personnel_health_entries (personnel_id, kind, label) VALUES (1, 'family_history', 'x')");
CALL t_rejects('uq_personnel_health_entry', "INSERT INTO personnel_health_entries (personnel_id, kind, label) VALUES (1, 'allergy', 'LATEX')");
CALL t_rejects('uq_personnel_contacts_one_primary', "INSERT INTO personnel_emergency_contacts (personnel_id, name, phone) VALUES (1, 'B', '1')");

-- ---------------------------------------------------------------------------------
-- Inventory items
-- ---------------------------------------------------------------------------------

CALL t_rejects('chk_items_category', "INSERT INTO inventory_items (name, category, unit) VALUES ('A', 'other', 'x')");
CALL t_rejects('chk_items_brand', "INSERT INTO inventory_items (name, category, unit, brand) VALUES ('A', 'medicine', 'x', 'store')");
CALL t_rejects('chk_items_name', "INSERT INTO inventory_items (name, category, unit) VALUES (' ', 'medicine', 'x')");
CALL t_rejects('uq_items_active_name', "INSERT INTO inventory_items (name, category, unit) VALUES ('paracetamol', 'medicine', 'x')");
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
CALL t_rejects('chk_report_acknowledged', "UPDATE incident_report_approvals SET acknowledged_at = NOW() WHERE incident_id = 1");

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
CALL t_rejects('chk_txn_other_note', CONCAT(@tx, "(1, 'adjustment', -1, 0, ", @day, ", 1, NULL, NULL, NULL, NULL, 'other', ' ')"));
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
