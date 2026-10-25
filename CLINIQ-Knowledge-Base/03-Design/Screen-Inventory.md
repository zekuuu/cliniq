# Screen Inventory — Full Detail

Complete list, kept in sync with the canonical **Frontend Context Brief**, Section 4 (`09-References/Canonical-Documents/CLINIQ_Frontend_Context_Brief.md`). If you edit one, edit both.

---

## 4. Complete Page/Screen Inventory

Give the agent this full list — it maps directly to the two module groups (baseline + enhancements) already finalized in planning.

### Auth & Shell
1. **Login** — username/password, role-aware redirect after login; the session lasts 1 week until the token expires, with no idle timeout
2. **Force Password Change** — shown on first login (backend enforces this)
3. **App Shell/Nav** — role-aware sidebar or nav; Staff sees all modules, Admin sees Dashboard, Calendar, Students and Incidents (read only, ADR-038), Reports, Audit Log, Accounts and Backup. For the Admin, Ctrl+P / Cmd+P does nothing and the browser's own Print prints only "Printing is done by the clinician." (ADR-038). The desktop header shows the signed-in user's name and role with a red, icon-only Log out control carrying an accessible label.

### Dashboard
4. **Staff Dashboard** — today's visit count, low-stock alerts, expiring-medicine alerts, backup status widget, quick "New Visit" action. Delivered on the shared Clinic Overview (#31): Staff get a strip under the header with the "New Visit" action and a backup-status indicator (status + last-backup date) linking to #32
5. **Admin Dashboard** — summary cards linking into Reports and the Clinic Overview Dashboard (no edit actions)

### Student Records
6. **Student List** — searchable/filterable table (name, grade level, flags for incomplete records). Admin: read only, no Add Student (ADR-038)
7. **Student Profile (view)** — full record: demographics, medical history, allergies, emergency contact, visit history for that student. Admin: read only (no Edit or Archive, no excuse letters), visits as text, Print disabled with "Printing is done by the clinician."; the view is audit-logged once per session (ADR-038)
8. **Add/Edit Student** — form with required-field validation (full name, grade level, emergency contact, allergies, conditions); triggers duplicate-detection warning on save. On Edit the LRN is read-only ("The LRN is the student's identifier and can't be changed."); changing the name shows a required "Reason for the name correction" field (Sir Rey, October 25, 2026)
9. **Incomplete Records Review Queue** — list of Registrar-imported records flagged incomplete, with who-resolved-it tracking

### Staff Patients (ADR-043, built Monday, October 26, 2026; School Clinician only)
9a. **Staff List** (`/staff`) — name, Staff No., type, department or role; search, type filter, "Show archived". Sidebar item **Staff** in the group **Patient Care** (renamed from Student Care). The Admin has no Staff item and is redirected from `/staff` routes
9b. **Staff Profile** (`/staff/:id`) — record, allergy alert, emergency contacts, visit, incident and follow-up history; Record a visit, Record an incident, Edit, Archive
9c. **Add / Edit Staff** (`/staff/new`, `/staff/:id/edit`) — name and type required; Staff No. read only on edit

### Clinic Visit Monitoring
10. **Visit Log List** — daily/date-filterable list of visits (disposition filter includes Resting; "In clinic now only" and "Include entered in error" filters; chips for In clinic now, Escalated and Entered in error); shows **masked LRN**, not full name, per the display-privacy rule (a multi-student list, not a single deliberate lookup). Header has a primary **New Visit** button (→ #11) Rows per page 10 or 20 (Sir Rey, October 25, 2026).
11. **New Visit Entry** — student lookup, visit date and time (default now; late-entry reason after 30 minutes), complaint (emergency-type complaints hint "Escalate to an incident?"), **Treatment notes**, **Medicines & supplies given** (searchable inventory picker + repeatable lines with quantity stepper, unit, optional instructions; recorded allergies shown beside the picker; ADR-018), disposition (returned to class / resting in clinic / sent home / referred to hospital), a secondary **Escalate to incident** button (ADR-036); **this is where the first-aid checklist panel appears** once a complaint is selected. Notes or at least one line is required "Assisted by" suggests active account names and accepts free text; Parent or guardian is prefilled from the primary emergency contact when empty (Sir Rey, October 25, 2026).
12. **Visit Detail/Edit** — "Entered late" when it was, **Escalate to incident** and **Entered in error** (required reason; record kept, stock returned, letter voided, no further edits), an "Escalated to incident" link; shows treatment notes and the medicines given ("Paracetamol 500mg × 2 tablets (1 tablet every 6 hours)"); editing the lines adjusts stock through "visit edited" adjustments (ADR-018) Time out shows with the visit date (Sir Rey, October 25, 2026).
13. **Excuse Letter Generator** — pulls from a visit record, produces a printable letter; nurse checks and approves it, then it's stored permanently in the student's record as a printable document. **Medical certificates are out of scope** — those are hospital-issued, never generated by CLINIQ; don't conflate the two in the UI or data model Wording names the excused dates; Today only / +1 day / +2 days presets; signature line on the printout; "Issue a replacement" (old letter Superseded, kept); Voided when the visit was entered in error. A draft stays on screen but Print / Save as PDF is disabled with "Approve the letter to print it." (ADR-038 item 6); approved, superseded and void letters print.
14. **PE/Sports Injury Referral Form** — logs referral, links into the same visit/treatment flow

### Emergency Response
15. **Incident Log List** — shows which incidents are still Stage-1 (fast-capture, incomplete) vs fully completed; shows **masked LRN**, not full name, per the display-privacy rule. Header has a primary **New Incident** button (→ #16, Stage 1). Admin: read only, View Report only (ADR-038). Rows per page 10 or 20
16. **New Incident Entry — Stage 1 (fast capture)** — student and complaint required; the four readings (temperature, pulse, blood pressure, oximeter) optional; saves immediately, speed over completeness. Once the student is picked, a read-only card shows allergies, medical conditions and emergency contacts ("None recorded" when empty)
16b. **Incident Entry — Stage 2 (complete later)** — same record, opened afterward to fill in any further readings (still optional), treatment notes, hospital referral fields (destination, transport, departure time), optional body part affected; "Complete Incident" stays disabled until there is treatment, a medicine, a notification or a referral, or "Nothing further was needed or done" is ticked with a reason
17. **Parent Notification Outcome Logging** — timestamped, tied to the incident (Reached / No answer / Left message or voicemail / Wrong number), with who was called (a saved emergency contact or "Other")
18. **Incident Report View/Print** — generated summary for the nurse to review, sign, and print; "Approve Report" stays disabled on a record with no treatment, medicine, notification, referral or "nothing further" reason. Admin: read only (no Approve, no visit link), Print disabled; the view is audit-logged once per session (ADR-038)

### Follow-Up Handling (feature spanning Clinic Visit Monitoring + Emergency Response)
18b. **Follow-Up Prompt (Staff)** — appears inline at the end of saving #11 (New Visit Entry) or #16 (Incident Entry, Stage 1): "Does this student need a follow-up?" If yes, capture follow-up date, reason/instruction, and optional notes in the same flow — not a separate screen Staff has to remember to visit afterward
18c. **Follow-Up List View (Staff)** — all follow-ups, filterable by status (Pending / Completed / Missed / Cancelled); each pending row has one status control to mark it Completed, Missed, or Cancelled (Missed and Cancelled ask for confirmation; Completed, the expected outcome, does not). Shows **masked LRN**, not full name, per the display-privacy rule (multi-student list). There is no separate follow-up detail screen Missed and Cancelled ask for a required reason (shown under the status), then offer "Set a new date".

### Reports Generation
19. **Monthly Report View/Generate**
20. **Incident register** (formerly Incident Report Archive; rows open the report, or Complete Stage 2)
21. **Complaint summary** (formerly Health Summaries View)
21a. **Sports Reports** (ADR-034, Staff only; entry from Reports): the saved-reports list, the builder (title, activity, requested by, look-back window, conditions option, students by name or LRN search or a whole grade, a note per student), and the report view with its preview and A4 printout.
(All of these need print/export-friendly layouts — this is a paper-replacement feature, so print CSS matters.)

### (Removed) Screens #22–26
The QR screens (#22–24, #26) were removed with the QR feature (ADR-027), and the phone Emergency screen (#25) with the phone-only screens (ADR-033). Their numbers are kept so later screens keep theirs; Staff start an incident from Report Incident (#16).

### First-aid Checklist Quick-Reference (enhancement)
27. Not a standalone page — a checklist panel/modal embedded in **New Visit Entry** (#11), triggered by the selected complaint type

### Medicine & Supply Inventory Tracker (enhancement)
28. **Inventory List** — items, current stock, expiration dates, low-stock/expiring flags. Row actions: **Restock** (modal: quantity received + required expiration date, or an explicit no-expiration confirmation), **Adjust Stock** (modal: +/- change or set to counted quantity, required reason, optional note, never below 0), **Edit** (ADR-018) Since panel review part 5: Restock is the one visible row button; Adjust Stock, Batches and Edit sit under a "Manage" row menu; Adjust Stock uses Add / Remove with a positive quantity and shows the resulting stock.
29. **Add/Edit Inventory Item** — on Edit, current stock and expiration date are read-only (they change only through Dispense/Restock/Adjust Stock); on Add, an expiration date or the explicit "This item has no expiration date" tick (ADR-035), a non-blocking duplicate warning (same name and unit), and unit suggestions. Optional "Generic or branded" (Not specified by default), also shown in Batches and the Dispense picker, not as a list column (Sir Rey, October 25, 2026)
30. **Dispense/Log Usage** — for non-visit use; must name a student or choose "Not for a student (general use)"; shows a notice linking to the student's visit today when one exists; expired items can't be picked (ADR-018)

### Clinic Overview Dashboard (enhancement, expanded from "Health Trends Dashboard"; Staff + Admin-facing)
31. **Dashboard View** — Overview starts with visit, incident, active-student, pending-excuse-letter, and due/overdue-follow-up totals; Inventory and incomplete-record attention counts drill through for Staff; Frequent visitors appear lower. Trends keep date-derived grouping, Chart/Table fallback, symptom clustering, and display-private frequent-visitor warnings.
31a. **Clinic Calendar** — Staff and Admin top-level calendar with Weekly/Monthly/Yearly and Calendar/Table controls, holidays, visit/incident tags, and Staff-only school-event management (ADR-019, ADR-020).

### Backup Verification Assistant (enhancement)
32. **Backup Status Screen** — last backup date/size/status, plus a plain-language guided recovery checklist (Staff-only, likely nurse-only) Since panel review part 6 (ADR-037): open to Staff and Admin/Principal, with "Back up now", the five most recent runs, and a Dashboard chip for both roles when the last good backup is older than 48 hours, failed, or missing.

### User Management
33. **User List** — Admin/Principal only (ADR-033); Staff and Admin/Principal accounts, with Disable/Enable and Reset Password (PE/Sports Instructors have no account, ADR-029)
34. **Add/Edit User & Role Assignment**

### Audit Log Viewer
35. **Audit Log** — Staff and Admin/Principal, view-only; filterable by date range, user, action type, and target/module (`ADR-016`); masked LRN, not name, for student-related entries, per the display-privacy rule

### Sidebar Footer / Legal
36. **Privacy Policy** — accessible to every role (Staff, Admin/Principal), reached via a link in the sidebar footer; static content, no student data rendered on the page itself. Draft content: `09-References/Privacy-Policy.md`.

**Total: ~35 screens/views** (accounting for the two-stage incident entry; the four QR screens and the phone Emergency screen were removed, ADR-027 and ADR-033; the three Sports Report views were added, ADR-034), several of which (Excuse Letter, Incident Report, Monthly Report) also need a distinct print layout — call that out to the agent explicitly since print CSS is easy to forget.
