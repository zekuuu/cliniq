# CLINIQ — Frontend Development Context Brief

This is the context package to hand to an AI coding agent before it writes any frontend code. Paste this whole document in as a system/context prompt, then layer your own house rules (naming conventions, component patterns, etc.) on top of it.

Brought up to date with ADR-001 to ADR-053 on Thursday, October 29, 2026. *Note, Wednesday, November 18, 2026 — 18:01 PHT: Section 4 now matches its vault twin `03-Design/Screen-Inventory.md` entry for entry (Staff import and Incomplete Records, Settings, Archive, Admin Reports, the account menu), and the document was brought in line with ADR-062 (warning colour), ADR-063 (staff sex), ADR-064 (name parts), ADR-065 (Stage 2 optional), ADR-067, ADR-068, ADR-069, ADR-070 and ADR-071 ("Symptoms", "Released to", suggested medicines), ADR-072 to ADR-075 (Archive and school year, authenticator recovery, no Dashboard print), the 832px narrow page width, the ADR-034 note (no per-student note) and the November 7 notes on ADR-040 and ADR-044 (the Audit Log screen masks the LRN). No screen was renumbered. Backlog run of November 18, 2026.* It says what the frontend should do; it does not say what is already built (see the repository README for that). **Words used:** "Staff" is the clinician role (School Clinician in the app); teachers and other employees who are seen at the clinic as patients are "personnel" in code and "Staff" in the Patient Care screens (ADR-043).

---

## 1. Project Context (the "why")

- **What it is:** CLINIQ is a clinic tracking and monitoring system for Mendez Christian Academy, a private school in Cavite, Philippines, serving 900+ students with a single school nurse and one shared workstation.
- **Who uses it:** A School Head Nurse and part-time clinic staff (full access), and School Administration/Principal (reads the Dashboard, reports, student profiles and incident reports; manages accounts; signs in at the clinic computer). PE/Sports instructors have no account; they ask the clinician (ADR-029). Teachers and school employees can be patients (ADR-043).
- **The constraint that shapes everything:** one existing low-spec Windows 11 workstation (Intel i3 / 4GB RAM), no budget for new hardware, non-technical staff, local deployment on that one computer (no public internet). The UI has to be fast on weak hardware and usable by someone who has never used a web app professionally before.
- **Give the agent the two source documents if it can read files:** the CLINIQ Project Plan and the CLINIQ Review of Related Systems (both PDFs you already have). Section 5.3 of the Project Plan and the Modules & Features document are the source of truth for the module list.

## 2. Tech Stack & Conventions

- **Frontend:** React + TypeScript, styled with Tailwind CSS.
- **Backend (separate, consumed via REST API):** Laravel (PHP), MariaDB (XAMPP, MySQL-compatible), Laravel Sanctum for authentication.
- **Build target:** `npm run build` produces static assets served by Laravel/Apache on the clinic computer — no SSR, no edge functions, no cloud-only APIs. Assume everything must work with zero internet access.
- **State/data fetching:** one small shared helper for loading, errors and retry, with each feature keeping its own request functions (ADR-013). Every request goes through one data layer, `src/lib/data`, which screens import (ADR-014); screens never read the mock data or call the API directly. *Update (Monday, November 16, 2026 — 12:29 PHT, ADR-080):* the backend now exists. The app runs on the mock data layer (`src/lib/mock-db`, kept unchanged) by default, and on the real Laravel API per module (`VITE_API_MODE_<MODULE>=api`) or all at once (`VITE_API_MODE=api`, which overrides every module). The clinic-PC build uses `VITE_API_MODE=api` and calls the relative `/api` beside it. *Update (Thursday, November 19, 2026, ADR-082):* the long lists are paged by the server through TanStack Query.
- **Auth model:** token-based login against Laravel Sanctum; two roles gate the UI (Staff, Admin/Principal — see Section 3). Each role is signed out after its idle setting (Staff 60 minutes, Admin/Principal 30, each 10 to 240, set by Staff on the Settings page), with a warning and countdown two minutes before; a session also ends 7 days after sign-in (ADR-015, ADR-048, ADR-078). When a token expires, the user simply lands back on Login. *Update (Monday, November 16, 2026 — 12:29 PHT):* on the API the sign-in is Sanctum's SPA cookie session (ADR-056), not a token; after the 7-day maximum Login says "Your session has ended. Sign in again." (ADR-080).

## 3. User Roles & Permissions

| Role | Can do |
|---|---|
| **Staff** (nurse/clinic assistant; School Clinician in the app) | Full read/write on students, staff patients, visits, incidents, inventory; generates and prints reports and Sports Reports; backup; own account only |
| **Admin/Principal** | Reads the Clinic Overview Dashboard and Activity calendar (and maintains school events, ADR-042), reports, the Student List and Student Profile, and the Incident Log and Incident Report (ADR-038); reads the Audit Log and the Backup screen (ADR-037); manages every account (ADR-033). Never prints or saves as PDF; does not see staff patients |
| **PE/Sports Instructor** | No account and no access (ADR-029). An instructor asks the clinician, who decides what to share |

**Display-privacy rule:** the actual risk isn't a single deliberate lookup — it's a desktop screen showing a **list or pattern across multiple students at once** (a visit log, an incident log, a "frequent visitor" flag) being glanced at by a passerby, who can then attach a specific named student to a health pattern ("he visits a lot, what's going on?"). So: the **Visit Log List, Incident Log List, and the Dashboard's frequent-visitor section default to the masked LRN**, not full name. A **single deliberate lookup — the full profile page, search results, and the masterlist — shows the full name normally**, since someone has already identified and is looking at one specific student for a legitimate reason. The masterlist shows names freely (it's just a roster) but shouldn't show medical/confidential fields inline — those still require opening the individual profile. **The LRN follows the same idea:** lists, pickers, the Dashboard, Reports and the Audit Log show it masked to the last four digits; a screen about one opened student, and its printout, show it in full (ADR-040); the Clinic Overview Report and the Monthly Report's incident tables print the full LRN with no names (ADR-044). Lists that include staff patients show the Staff No. instead of a name (ADR-043).

**Note for the agent:** a second external role, **Canteen Staff** (food allergies only), was designed but remains deferred to a future phase. See Section 9.

## 4. Complete Page/Screen Inventory

Give the agent this full list — it maps directly to the module groups (baseline + enhancements) in Modules & Features. The numbers are identifiers, kept stable so references stay valid; they are not a count, and removed screens leave gaps. Each screen is one route in the app.

### Auth & Shell
1. **Login** — username/password, role-aware redirect after login; a session lasts at most 1 week, and each role is signed out after its idle setting (Staff 60, Admin 30 minutes; ADR-078), after which Login says "You were signed out after N minutes of inactivity. Sign in again."; a "Forgot password?" link opens the authenticator recovery: the username is checked first, then a 6-digit code from the authenticator app or a recovery code, then a new password; an account with no authenticator is told to ask the Admin (ADR-073, which replaced the email reset; accounts have no email address)
2. **Force Password Change** — shown on first login (backend enforces this)
3. **App Shell/Nav** — role-aware sidebar or nav; Staff sees all modules, Admin sees Dashboard, Activity calendar, Students and Incidents (read only, ADR-038), Reports, Audit Log, Archive (ADR-072), Accounts and Backup. For the Admin, Ctrl+P / Cmd+P does nothing and the browser's own Print prints only "Printing is done by the clinician." (ADR-038). The header's account menu (#38, ADR-066) shows the signed-in user and holds Sign out. The header also includes a Staff search field ("/" focuses it, ADR-086); it searches students and staff patients, with an LRN search matching also on its last four digits (ADR-087, Sunday, November 22, 2026).

### Dashboard
4. **Staff Dashboard** — today's visit count, low-stock alerts, expiring-medicine alerts, backup status widget, quick "New Visit" action. Delivered on the shared Clinic Overview (#31): Staff get a backup-status indicator (status + last-backup date, linking to #32) in the header, above Date range (no Print, ADR-074), and the "New Visit" action on the view-tab row (above the tabs on phones)
5. **Admin Dashboard** — the same Clinic Overview (#31) without Staff-only actions; staff-patient incidents are left out of its totals (ADR-053)

### Student Records
6. **Student List** — searchable/filterable table (name, grade level, flags for incomplete records). Admin: read only, no Add Student (ADR-038)
7. **Student Profile (view)** — full record: demographics (the header shows the age when a birthdate is recorded, ADR-054), medical history, allergies, emergency contact, visit history for that student. Admin: read only (no Edit or Archive, no excuse letters), visits as text, Print disabled with "Printing is done by the clinician."; the view is audit-logged once per session (ADR-038)
8. **Add/Edit Student** — form with required-field validation (first name, last name, grade level, sex, LRN, emergency contact; the name is three fields, First name, Last name and Middle name (optional; labels carry no "(optional)" text: an optional field says "Optional" in its placeholder (Zean, November 5, 2026), and a "No middle name" tick clears and locks the middle name; the form is in four titled sections (Identity, School details, Emergency contacts, Medical history)), with example placeholders, ADR-064); allergies and conditions are one free-text field each whose suggestion and empty display read "None recorded" (ADR-049, 051), with type-ahead from an editable English and Filipino starter list (review round 2, R16); an optional **Birthdate** (ADR-054; a missing one makes the record incomplete, review round 2 R14; the student's own phone number is not recorded); the required mark shows only on a field that blocks saving (ADR-051); triggers duplicate-detection warning on save. On Edit the LRN is read-only ("The LRN is the student's identifier and can't be changed."); changing the name shows a required "Reason for the name correction" field (Sir Rey, October 25, 2026)
9. **Incomplete Records Review Queue** (`/students/incomplete`, Staff only) — list of Registrar-imported records flagged incomplete, with who-resolved-it tracking

### Staff Patients (ADR-043; School Clinician only)
9a. **Staff List** (`/staff`) — name, Staff No., type, department or role and Record status (Complete / Incomplete, ADR-067); search, type and record-status filters, "Show archived", and the "Incomplete records (N)" and "Import List" buttons (#9f, #9e). Sidebar item **Staff** in the group **Patient Care** (renamed from Student Care). The Admin has no Staff item and is redirected from `/staff` routes
9b. **Staff Profile** (`/staff/:id`) — record, allergy alert, emergency contacts, visit, incident and follow-up history; Record a visit, Record an incident, Edit, Archive
9c. **Add / Edit Staff** (`/staff/new`, `/staff/:id/edit`) — first name, last name (optional middle name, ADR-064), sex (Female or Male, ADR-063) and type required (types: Teacher, Non-teaching staff, Utility worker, Other, ADR-053); Staff No. read only on edit
9e. **Import Staff List** (`/staff/import`, ADR-069; Staff only, from the Staff List's "Import List" button) — three steps as on the student import: 1. choose a CSV (drop zone or file button), 2. match its columns (first name, last name or one full-name column, sex and type required; Staff No., middle name, department, contact number and one emergency contact optional), 3. review the preview (new, continuing and changed counts; rows with a problem listed and left out), then "Apply" with a confirmation dialog. A Staff No. updates that record (an archived one is restored); otherwise name and type match, or a new record gets the next Staff No.; staff missing from the file are left alone; blank cells keep what CLINIQ has. Audited with counts only. Keyboard: the file button, the column selects and the steps are reachable in order with Tab; the dialog keeps focus and Escape closes it. (Added Saturday, November 07, 2026 — 16:23 PHT, backend counter-check C-6.)
9f. **Incomplete Staff Records** (`/staff/incomplete`, ADR-067; Staff only, from the Staff List's "Incomplete records (N)" button) — the student queue's layout: open and resolved counts, a "Review queue" card with All / Open / Resolved (default Open), search by name, Staff No. or type, and columns Staff, Staff No., Type, Missing fields (no emergency contact, or no sex), Resolution and **Edit Record** (returns here after a save). A record is resolved when Edit Staff saves it complete, crediting who and when. No Imported column. Keyboard: the queue filter is one radio group (arrow keys), the search field filters as you type, and each Edit Record link is labelled with the staff member's name. (Added Saturday, November 07, 2026 — 16:23 PHT, backend counter-check C-6.)

### Yearly list (ADR-047, 051; School Clinician only)
9d. **Yearly Student List Import** (`/students/import`, mock level) — adds new students, updates continuing ones (filling the birthdate when the list has one, ADR-054), and lists the students missing from the new list; the clinician reviews that list before the import archives them automatically. A returning student is restored. Waits for the school's data privacy agreement

### Clinic Visit Monitoring
10. **Visit Log List** — daily/date-filterable list of visits (disposition filter includes Resting; "In clinic now only" and "Include entered in error" filters; chips for In clinic now, Escalated and Entered in error); shows **masked LRN**, not full name, per the display-privacy rule (a multi-student list, not a single deliberate lookup). Header has a primary **New Visit** button (→ #11) Rows per page 10, 20, 50 or 100 (Sir Rey, October 25, 2026; 50 and 100 added by Zean, October 31, 2026).
11. **New Visit Entry** — patient lookup (student or staff), visit date and time (default now; late-entry reason after 30 minutes), main symptom plus up to 3 "Other symptoms" tags under "What symptoms is the patient feeling? Choose all that apply." (labels only, ADR-070; data stays `complaint`; ADR-053; emergency-type symptoms hint "Escalate to an incident?"), a one-line Visit-versus-Incident hint (ADR-051), **Treatment notes**, **Medicines & supplies given** (searchable inventory picker + repeatable lines with quantity stepper, unit, optional instructions; recorded allergies shown beside the picker; ADR-018; with symptoms chosen, items tagged "Commonly used for" them come first under "Suggested for these symptoms" and the rest behind "Show all medicines", ADR-071), disposition (returned to class — "returned to work" for staff / resting in clinic / sent home / referred to hospital, with optional "Released to" (was collected-by, ADR-070), relationship (Other asks "Specify who", required) and time, and an optional "Stay home until cleared" note, ADR-049), a secondary **Escalate to incident** button (ADR-036); **this is where the first-aid checklist panel appears** once a complaint is selected. Notes or at least one line is required "Assisted by" suggests active account names and accepts free text; Parent or guardian is prefilled from the primary emergency contact when empty (Sir Rey, October 25, 2026).
12. **Visit Detail/Edit** — "Entered late" when it was, **Escalate to incident** and **Entered in error** (required reason; record kept, stock returned, letter voided, no further edits), an "Escalated to incident" link; shows treatment notes and the medicines given ("Paracetamol 500mg × 2 tablets (1 tablet every 6 hours)"); editing the lines adjusts stock through "visit edited" adjustments (ADR-018) Time out shows with the visit date (Sir Rey, October 25, 2026).
13. **Excuse Letter Generator** — pulls from a visit record, produces a printable letter; nurse checks and approves it, then it's stored permanently in the student's record as a printable document. **Medical certificates are out of scope** — those are hospital-issued, never generated by CLINIQ; don't conflate the two in the UI or data model Wording names the excused dates; Today only / +1 day / +2 days presets; "Save and approve now" and a non-blocking warning when the period is longer than 3 days (ADR-049); signature line on the printout; "Issue a replacement" (old letter Superseded, kept); Voided when the visit was entered in error. A draft stays on screen but Print / Save as PDF is disabled with "Approve the letter to print it." (ADR-038 item 6); approved, superseded and void letters print.
14. **PE/Sports Injury Referral Form** — logs referral, links into the same visit/treatment flow; its wording is editable starting text marked "to confirm" (ADR-053)

### Emergency Response
15. **Incident Log List** — shows which incidents are still Stage-1 (fast-capture, incomplete) vs fully completed; shows **masked LRN**, not full name, per the display-privacy rule. Header has a primary **New Incident** button (→ #16, Stage 1). Admin: read only, View Report only (ADR-038); staff-patient incidents are not listed for the Admin (ADR-043). Rows per page 10, 20, 50 or 100
16. **New Incident Entry — Stage 1 (fast capture)** — student and complaint required; the four readings (temperature, pulse, blood pressure, oximeter) optional; saves immediately, speed over completeness. Once the student is picked, a read-only card shows allergies, medical conditions and emergency contacts ("None recorded" when empty)
16b. **Incident Entry — Stage 2 (complete later)** — same record, opened afterward to fill in any further readings (still optional), treatment notes, hospital referral fields (destination, transport, departure time), optional body part affected; everything on Stage 2 is optional and "Complete Incident" is always available (ADR-065, which removed the "Nothing further was needed or done" tick); the form is in titled sections (Stage 1 record, Readings and care, Hospital referral, the notification log, Follow-up prompt)
17. **Parent Notification Outcome Logging** — timestamped, tied to the incident (Reached / No answer / Left message or voicemail / Wrong number), with who was called (a saved emergency contact or "Other")
18. **Incident Report View/Print** — generated summary for the nurse to review, sign, and print; "Approve Report" needs a completed (Stage 2) record; an empty one shows "No treatment recorded. Check this is correct before approving." (ADR-065); an older record's "nothing further" reason still prints. Admin: read only (no Approve, no visit link), Print disabled; the view is audit-logged once per session (ADR-038)

### Follow-Up Handling (feature spanning Clinic Visit Monitoring + Emergency Response)
18b. **Follow-Up Prompt (Staff)** — appears inline at the end of saving #11 (New Visit Entry) or #16 (Incident Entry, Stage 1): "Does this student need a follow-up?" If yes, capture follow-up date, reason/instruction, and optional notes in the same flow — not a separate screen Staff has to remember to visit afterward
18c. **Follow-Up List View (Staff)** — all follow-ups, filterable by status (Pending / Completed / Missed / Cancelled); each pending row has one status control to mark it Completed, Missed, or Cancelled (Missed and Cancelled ask for confirmation; Completed, the expected outcome, does not). Shows **masked LRN**, not full name, per the display-privacy rule (multi-student list). There is no separate follow-up detail screen Missed and Cancelled ask for a required reason (shown under the status), then offer "Set a new date". A pending follow-up is overdue 3 days after its date and closes itself as Missed with a "No response" note after 7 days (ADR-051).

### Reports Generation
19. **Monthly Report View/Generate** — Staff see "To send this to the Principal, print it or choose Save as PDF in the print window." under the heading, and each printout names the saved PDF, e.g. "CLINIQ Monthly Report, November 2026" (ADR-079); with a weekly breakdown and exact counts (ADR-050); the clinician can also print the **monthly inventory print** (New Purchase, Total Available, Ending Inventory per item). The Admin reads it on screen and cannot print: the Admin's Reports page is a Report month drop-down and the four monthly reports, each opened as a view-only sheet (ADR-077)
20. **Incident register** (formerly Incident Report Archive; rows open the report, or Complete Stage 2)
21. **Symptom summary** (formerly Complaint summary and Health Summaries View; label only, ADR-070)
42. **Settings** (ADR-078, `/settings`, Staff and Admin; sidebar, Administration): a "Sign out after inactivity" card with one line ("People are signed out after this many minutes without activity. Shorter is safer on a shared computer."), two whole-minute fields, **Staff (minutes)** and **Admin (minutes)** (10 to 240), and **Save** for Staff only; the Admin sees the fields disabled. **Idle warning** (App Shell, both roles): two minutes before the sign-out, a "Still there?" dialog with a live countdown ("You will be signed out in 2:00 because of inactivity", plus "Unsaved changes will be lost." when a form is dirty), **Stay signed in** (primary, focused) and **Sign out now**; Escape stays.
- **Archive (new, `/archive`, Staff and Admin):** a school-year switcher and tabs Students, Staff (Staff only), Reports (that year's months) and Audit log (the Audit Log table and filters on that year's dates), plus a **School year dates** card (Staff edit). Doors: the sidebar (Administration) and an "Archive (N)" button on the **Student List (#6)**. The Student and Staff Profiles' Archive dialog asks a required reason.
- **Archive, current school year (Saturday, November 07, 2026 — 12:05 PHT, ADR-075):** a "Current school year" card shows who started the year and when. Staff get one button for the next step, "End school year" or, after the break, "Start school year", each with a confirmation. **Dashboard (#31):** Staff see a short banner under the header from 7 days before an end or start is due: info colours while it is coming up, warning colours once overdue, with a "Go to Archive" button that opens the Archive with its End or Start button highlighted (changed from a chip, Saturday, November 07, 2026 — 12:39 PHT).
21b. **Admin Reports** (ADR-077, Admin only, `/reports`): page title and one help line; a **Report month** drop-down (shared `Select`: the current school year newest first, then earlier recorded years labelled with the year; opens on the latest month with records); the four monthly reports as a list (title, description, **Open**), with "No visits recorded this month" for an empty month. **Open** shows the Staff printout component as an on-screen A4 sheet (masked LRNs, no Prepared-by name) with **Back**; no Print, Save, Download or export. Staff-only report routes redirect the Admin here.
21a. **Sports Reports** (ADR-034, Staff only; entry from Reports): the saved-reports list, the builder (title, activity, requested by, look-back window, conditions option, students by name or LRN search or a whole grade; no per-student note since November 3, 2026), and the report view with its preview and A4 printout.
(All of these need print/export-friendly layouts — this is a paper-replacement feature, so print CSS matters.)

### (Removed) Screens #22–26
The QR screens (#22–24, #26) were removed with the QR feature (ADR-027), and the phone Emergency screen (#25) with the phone-only screens (ADR-033). Their numbers are kept so later screens keep theirs; Staff start an incident from Report Incident (#16).

### First-aid Checklist Quick-Reference (enhancement)
27. Not a standalone page — a checklist panel/modal embedded in **New Visit Entry** (#11), triggered by the selected complaint type

### Medicine & Supply Inventory Tracker (enhancement)
28. **Inventory List** — items with usable, expired and total stock worked out from received batches (ADR-030), low-stock/expiring flags; an optional "avoid if allergic to" tag raises a warning beside a student's allergies (ADR-049). Row actions: **Restock** (modal: quantity received + required expiration date, or an explicit no-expiration confirmation), **Adjust Stock** (modal: +/- change or set to counted quantity, required reason, optional note, never below 0), **Edit** (ADR-018) Since panel review part 5: Restock is the one visible row button; Adjust Stock, Batches and Edit sit under a "Manage" row menu; Adjust Stock uses Add / Remove with a positive quantity and shows the resulting stock.
28a. **Inventory Usage History** (`/inventory/history`) — Staff only; stock movements with masked patient numbers, reached from the row's Manage menu. Adjust Stock marks a large write-off in the audit (ADR-061); the note is optional (ADR-068).
29. **Add/Edit Inventory Item** — on Edit, current stock and expiration date are read-only (they change only through Dispense/Restock/Adjust Stock); on Add, an expiration date or the explicit "This item has no expiration date" tick (ADR-035), a a duplicate warning while typing (same name; an exact match is refused on save, Q11), and unit suggestions. Optional "Generic or branded" (Not specified by default), also shown in Batches and the Dispense picker, not as a list column (Sir Rey, October 25, 2026). Optional "Commonly used for" checkboxes (the Visit form's symptom options), Staff only, audited by field name (ADR-071)
30. **Dispense/Log Usage** — for non-visit use; must name a student or choose "Not for a student (general use)"; shows a notice linking to the student's visit today when one exists; expired items can't be picked (ADR-018)

### Clinic Overview Dashboard (enhancement, expanded from "Health Trends Dashboard"; Staff + Admin-facing)
31. **Dashboard View** (Overview and Trends only, `?view=` state, ADR-025, 032) — Overview starts with visit, incident, active-student, pending-excuse-letter, and due/overdue-follow-up totals; Inventory and incomplete-record attention counts drill through for Staff; Frequent visitors appear lower. Overview also shows the clinician a possible-cluster alert (3 or more students, same complaint and grade, within 3 days, ADR-050). Trends keep date-derived grouping, Chart/Table fallback, and display-private frequent-visitor warnings (starting value 3 visits in 14 days, ADR-051). Counts are exact. No print (ADR-074).
31a. **Activity calendar** (renamed from Clinic Calendar, ADR-050) — Staff and Admin top-level calendar with Weekly/Monthly/Yearly and Calendar/Table controls, holidays, visit/incident tags, and school-event management by Staff and the Admin (ADR-019, 042; the Admin does not get the "View visits" link) and read-only national holidays (ADR-020).

### Backup Verification Assistant (enhancement)
32. **Backup Status Screen** — last backup date/size/status, plus a plain-language guided recovery checklist, and a **Backup locations** list where the clinician adds and disables (never edits) the internal and external locations, keeping at least one enabled (review round 2, R32); the system creates a `.cliniq` folder on each (ADR-052) Since panel review part 6 (ADR-037): open to Staff and Admin/Principal, with "Back up now", the five most recent runs, and a Dashboard chip for both roles when the last good backup is older than 48 hours, failed, or missing.

### User Management
33. **User List** — Admin/Principal only (ADR-033); Staff and Admin/Principal accounts, with Disable/Enable and Reset Password (PE/Sports Instructors have no account, ADR-029)
34. **Add/Edit User & Role Assignment**

### Audit Log Viewer
35. **Audit Log** — Staff and Admin/Principal, view-only (kept 10 years, ADR-051); filterable by date range, user, action type, and target/module (`ADR-016`); masked LRN, not name, for student-related entries, per the display-privacy rule (full LRN only on its Staff printout); entries about staff records show the Staff No. only, and the Admin cannot open them (ADR-038, ADR-043)

### Account
37. **Change Password** (`/account/password`) — both roles, from the account menu: current password, new password, confirmation
38. **Account menu** (header, every screen; not a page) — ADR-066, Thursday, November 05, 2026 — 04:49 PHT: the header's avatar, name and role are one button (only the avatar and a chevron on a phone) that opens a menu: the account details (name, role, username, last sign-in), then Edit profile, Change password, Keyboard shortcuts (from `md` only), Report an issue, Privacy Policy, a separator and Sign out (red, still confirmed). Same items for every role. It replaced the header's Shortcuts button, padlock (Change password) and red sign-out icon. ARIA menu button; a full-width sheet under the header on a phone; not printed.
39. **Edit profile dialog** (a dialog over the current screen; no page and no route) — ADR-066: read-only username, role and last sign-in; the user's own Full name (at most 120 characters) and profile picture (Change picture, Remove picture); Save changes enabled only when something changed; a dirty close asks first (ADR-021); "Profile updated." on save. Audited by field name only.

### Sidebar Footer / Legal
36. **Privacy Policy** — accessible to every role (Staff, Admin/Principal), reached via a link in the sidebar footer; static content, no student data rendered on the page itself. Draft content: `09-References/Privacy-Policy.md`.

Several screens (Excuse Letter, Incident Report, Monthly Report, Sports Report) also need a distinct print layout — call that out to the agent explicitly since print CSS is easy to forget. Removed with their features: the QR screens and Student Number (ADR-027), the phone-only Emergency screen and phone navigation (ADR-033), and PE/Sports Instructor access (ADR-029).

## 5. Data Entities the Frontend Should Expect

Give the agent this even without a finalized API spec, so component props and forms are built against realistic shapes:

- **Student** — id (internal; the only key in URLs), **lrn** (12 digits, text, unique, entered by Staff; masked to the last four digits on lists, pickers, the Dashboard and Reports; a search matches also on the last four digits shown (ADR-087); in full on the Audit Log printout, masked on its screen (notes on ADR-040 and ADR-044); in full on every single-student screen, its printout, and the edit form, ADR-028, ADR-040), firstName, lastName and an optional middleName (the full name is built on read, never stored, ADR-064), grade level and section (from the yearly list, ADR-047), **sex** (Female or Male, ADR-031), **birthdate** (optional, ADR-054: a real date, never in the future; the age is calculated from it and never stored; shown in full only on the profile details, the edit form and the profile printout, and as an age in the profile header), allergies, medical conditions (an empty field reads "None recorded", ADR-049, 051), an ordered emergency-contact list (at least one required; first is primary; each has name, relationship, phone, and verification state), record-complete flag, **archived flag** (archived students stay in the database but are excluded from active lists/search by default)
- **Personnel** (a staff patient, ADR-043) — id, **staffNumber** (`STF-0001`, assigned by CLINIQ, stands in for the masked LRN on lists), firstName, lastName and optional middleName (ADR-064), **sex** (Female or Male, required, ADR-063), type (Teacher / Non-teaching staff / Utility worker / Other), optional department or role, contact, allergies, medical conditions, an ordered emergency-contact list (may be empty), archived flag. No LRN or grade
- **PatientRef** — a visit, incident, follow-up or medicine given is about a student **or** a staff member, exactly one: `studentId` or `personnelId`, the other `null`
- **User** — id, name, username, role (`staff` / `admin`), no email (a forgotten password is recovered with an authenticator app, ADR-073, which replaced ADR-048's email reset), optional profile picture, last login, deactivated-at (accounts are disabled, never deleted)
- **Visit** — id, patient (PatientRef), date/time (never in the future; a late-entry reason when saved more than 30 minutes after the visit), the grade and section the student had when it was saved (ADR-047), main complaint plus up to 3 extra complaint tags (ADR-053), treatment notes, **items given** (repeatable lines: item, quantity, unit, instructions, and the batch allocations they came from, ADR-018, 030), disposition (returned to class / resting in clinic / sent home / referred to hospital), optional collected-by (shown as "Released to", ADR-070), relationship and time, an excuse-letter draft, staff who logged it, an "entered in error" marker with reason (the record is never deleted), a link to the incident it was escalated to (ADR-036), **eventTag** (optional free text, e.g. "MCA Dance Program" — a lightweight tag, not a managed entity)
- **ExcuseLetter** — visit, excused from / until, teacher note, optional "stay home until cleared" note, status (draft / approved / superseded / voided) with reasons, the approved wording stored with the approval (ADR-049)
- **Incident** — id, student, time, complaint, vitals, hospital referral fields, parent-notification log (array of attempts with outcome + timestamp + who was called), optional body part affected, an older record's "nothing further was needed or done" reason (kept and printed, never written now, ADR-065), **stage** (`1`=fast-capture / `2`=complete) so the UI can show which incidents still need completion, **eventTag** (same optional free-text field as Visit), the grade and section at the time, items given, and the visit it was escalated from (if any)
- **FollowUp** — id, patient (PatientRef), related record (visit or incident id + type), follow-up date, reason/monitoring instruction, status (`pending` / `completed` / `missed` / `cancelled`; overdue after 3 days and closed automatically as missed after 7 days with a "No response" note, ADR-051), a reason when missed or cancelled, notes, created-by (staff)
- **InventoryItem** — id, name, category (medicine/supply), unit, low-stock threshold, optional generic/branded tag, optional "avoid if allergic to" tag, and its **batches** (ADR-030). Usable (non-expired), expired and total stock are **derived** from the batches, never stored on the item
- **InventoryBatch** — id, quantity remaining, expiration date or `null` for an explicit "no expiration date" (ADR-035), received date. Dispensing takes from the earliest-expiring usable batch first; an expired batch is disposed of by an explicit adjustment
- **StockTransaction** — item, type (dispense / restock / adjustment), quantity, batch allocations, linked visit or incident, staff, timestamp. Past transactions are never rewritten (ADR-018)
- **SportsReport** — title, activity, requested by, look-back window, include-conditions option, the list of students (no per-student note since November 3, 2026, ADR-034 note), archived flag. It stores the list only, never a copy of medical content (ADR-034)
- **CalendarEvent** — title (up to 60 characters), start date, optional end date; kept by Staff and the Admin/Principal (ADR-019, 042). National holidays come from a read-only feed (ADR-020)
- **Report** — type (monthly/incident/complaint summary), date range, generated file/data (reports are computed live; there is no "Finalize month", ADR-050)
- **BackupLocation** (ADR-052) — label, path, status (found / not found / not writable), last backup time and result, enabled flag; never deleted, only disabled
- **BackupLog** — last run timestamp, file size, status (ok/failed), verified-by
- **AuditLogEntry** — user, action type (login/logout/submit/approve/create/update/delete/archive/print/view — a profile or incident report opened by the clinician or the Admin, once per record per session, ADR-038, 048), target record, timestamp, and an optional summary that names fields or states only, never their values (e.g. "Updated allergies"; omitted when the action and target already say everything — ADR-017) — written for every action across every module

**Note on the calendar:** school events are their own managed entries (`CalendarEvent`, ADR-019, 042) shown on the Activity calendar beside national holidays; `eventTag` stays a free-text field on Visit/Incident, and a tag with the same text as an event on the same day shows once.

## 6. Key Interaction Flows Worth Getting Right

- **New Visit → First-aid checklist:** selecting a complaint (e.g. "fainting") surfaces a standardized checklist inline, not a separate page — it should feel like part of filling the form, not an interruption.
- **Duplicate detection:** on saving a new student, if name+grade level matches an existing record, block save and show a confirmation modal rather than silently creating a duplicate.
- **Low-stock / expiring-item alerts:** should be visible from the Staff Dashboard, not buried only inside the Inventory page.
- **Medicines given:** saving a visit takes every line out of inventory in one all-or-nothing save; expired batches can't be given, going over stock warns but allows the save, and editing a visit writes adjustments instead of rewriting history (ADR-018, 030). *Update (Friday, November 20, 2026, ADR-084):* giving more than the usable stock is now refused; an item at 0 shows "Out of stock".
- **Escalate to incident:** a visit that turns out to be an emergency opens Incident Stage 1 with the student, complaint, time and temperature; the visit stays, linked both ways, and the event counts once, as the incident (ADR-036).
- **Excuse letter:** the clinician can "Save and approve now"; a letter longer than 3 days warns but is never blocked; a draft can't be printed until approved (ADR-038, 049).
- **Report Incident → Stage 1 save:** starting an incident should reach a savable form in as few steps as possible — only the student and the complaint are required; the readings (temperature, pulse, blood pressure, oximeter) are optional and a reading outside the common range warns without blocking (ADR-051). Saving Stage 1 must succeed even if Stage 2 fields are empty; don't validate the full form up front or you defeat the point of the two-stage design.

## 7. Design & UX Guidelines

These are system-wide frontend design requirements — they should guide every UI/UX decision across every screen, not just the ones called out explicitly elsewhere in this brief. Apply them consistently rather than re-deriving a look-and-feel per screen.

### Overall Direction
Modern, minimalist, clean, professional, approachable, consistent, easy to scan, smooth and responsive, accessible to non-technical stakeholders. Some users may have difficulty reading small text or distinguishing between many interface elements, so prioritize clarity, readability, and intuitive interaction — without tipping into looking overly simplistic or childish. When a requirement doesn't specify a UI/UX behavior, decide using this priority order: **Usability → Clarity → Accessibility → Consistency → Efficiency → Visual polish.** Never trade usability or accessibility for aesthetics.

### Typography
Small-to-medium sizing throughout — not so small it strains readability, not so large it wastes screen space. Build hierarchy through font weight, spacing, and placement rather than simply bumping font size. Keep body text comfortable to read, and keep headings, labels, body text, supporting text, and important/status information clearly distinct from each other. The overall feel should be compact and information-efficient while still comfortable to read.

**Minimum size: no rendered text below 12px (`text-xs`).** This covers sidebar group labels, the brand subtitle, badges, and calendar event tags. The stated audience includes non-technical and possibly older users who have difficulty reading small text, so this is a floor, not a style preference. Build compactness with weight and spacing, never with a smaller size.

### Buttons, Controls & Shape Language
Small-to-medium, easy to identify, consistent throughout, clearly differentiated by purpose, comfortable to interact with. Use slightly rounded corners — softened modern UI, not sharp squares, but not pill-shaped or playfully rounded either. Apply this same restrained corner-radius logic consistently across buttons, inputs, cards, dialogs, and containers, using one consistent set of radius values system-wide.

**Concrete radius mapping:** panel surfaces (cards, dialogs/modals, and containers) and interactive controls (buttons, inputs, and dropdowns) use `--radius-md` (8px). Smaller chip-scale elements (badges and menu items) use `--radius-sm` (6px). Do not introduce a separate ordinary panel or control radius.

**Every interactive element needs a cursor and a hover state — no exceptions, checked per element, not assumed.** This applies to buttons, links, dropdown/select triggers, icon-only actions, and any list row or card that navigates on click:
- **Cursor:** `cursor: pointer` on hover for anything clickable. Anything *not* clickable keeps the default cursor.
- **Hover color, not just a cursor change:** primary buttons (filled `brand-green-dark`) lighten slightly on hover, never to a fill that drops their white label below 4.5:1; secondary/outlined buttons pick up a light `surface` background tint; destructive buttons darken their `error` fill the same way; plain list rows that navigate get a subtle `surface` background tint on hover.
- **Dropdowns/selects must be styled to match the design system, not left as native browser/OS chrome.** A native `<select>` renders with the OS's own default appearance unless overridden — never matches `brand-green` or this system's border-radius. At minimum: `appearance: none`, a custom chevron icon, and the same border/background/border-radius/focus-ring as a text input. Reach for a headless component (Radix UI, Headless UI) only if richer interaction is genuinely needed — not just to fix basic styling.

**Text inputs match standard dropdowns:** the shared `Input` is 40px tall with `border-border`, a light card shadow, semibold 14px values, and `brand-green` hover/focus treatment. Do not shrink a filter input below its paired standard dropdown.

### Button Hierarchy & Color
When multiple buttons appear together, use visual weight to guide the user toward the likely action: primary actions get stronger emphasis, secondary actions stay visually quieter, cancel/neutral actions remain visible without competing, destructive actions get an appropriate warning treatment. Not every button should be equally prominent. The interface should suggest "this is probably the action you want" through hierarchy, contrast, and placement — not intrusive prompts. Never rely on color alone; pair it with labels, icons, or positioning.

Concretely, with the tokens defined below: **primary** = filled `brand-green-dark`, white text. A button label is 14px text, which is *small* text under the Color System contrast rules below, and those rules allow small white text only on `brand-green-dark` (9.19:1) — never on `brand-green` (3.74:1, fails WCAG AA). `brand-green` stays for borders, icons, and focus rings; **secondary** = outlined or `surface`-filled with `brand-green` text, no heavy fill; **cancel/neutral** = plain text or a quiet gray outline; **destructive** = filled `error` red, reserved only for genuinely irreversible actions (per the Modals & Confirmation guidance below) — never used for routine negative actions like "cancel" or "go back."

### Color System
Restrained, cohesive palette. Prioritize strong text/background contrast, consistent semantic colors, and a clear, consistent distinction between normal, primary, warning, error, success, and disabled states. Keep highly saturated colors limited and accent-color usage consistent. Don't introduce a color just for decoration — every color should communicate the same thing everywhere it appears.

**Brand colors — extracted by actually sampling pixels from the uploaded logo and poster** (median-cut color quantization, cross-checked across both images), not eyeballed. The real values turned out more vivid than a visual guess would suggest — the "gold" is closer to a pure saturated yellow than a warm amber gold, which matters for contrast, below.

| Token | Hex (sampled) | Use |
|---|---|---|
| `brand-green` | `#039935` | Primary brand color — outlines, icons, focus rings, large headings. Not a button fill (button labels are small text). **Large text/non-text UI only when paired with white** (contrast 3.74:1 — passes the 3.0 threshold for large text and UI components, fails the 4.5 threshold for normal body text) |
| `brand-green-dark` | `#035419` | Sampled from the seal's shield outline. Safe for white text **at any size** (9.19:1) — use this, not `brand-green`, anywhere white text needs to be small (nav labels, dense buttons) |
| `brand-green-light` | `#8CCC7E` | The sage-green from the logo's circular badges. Background/surface tint only — pairs well with dark text (9.16:1) but is unusable with white (1.90:1) |
| `brand-yellow` | `#EAEA09` | Secondary/accent — highlights, non-critical CTAs, badges. **Never pair with white text (1.29:1, unusable)** — always `text-primary` or `brand-green-dark` (13.49:1, excellent) |
| `brand-yellow-dark` | `#AFAF07` | Hover/active state for yellow elements. Still needs dark text even when darkened (2.34:1 with white — still fails) |
| `text-primary` | `#1A1A1A` | Main body text, headings |
| `text-secondary` | `#616161` | Supporting/secondary text |
| `text-muted` | `#9E9E9E` | Placeholder-adjacent, disabled text, timestamps |
| `background` | `#FFFFFF` | Page background |
| `surface` | `#F5F5F5` | Card/panel background, distinct from page background |
| `border` | `#E0E0E0` | Dividers, input borders, card outlines |

**Semantic colors — each one checked for contrast, not assumed:**

| Token | Hex | Use | Contrast w/ white | Note |
|---|---|---|---|---|
| `success` | `#20753A` | Confirmation messages, success buttons/badges carrying white text | 5.73:1 — passes normal text | The original brighter green idea (`#2E9E4F`) only reaches 3.43:1 — fine for a large icon or bold label, not safe for a small white-text badge, so this darker shade is the one to actually build with |
| `success-light` | `#2E9E4F` | Icon color, or badge/accent paired with dark text, where a slightly brighter green reads better | — (used with dark text, not white) | |
| `warning` | `#E9882F` | Pending, due-soon, nearing-expiration, low-stock and review-needed states: borders, bars and solid fills only (ADR-062) | Never carries white text; a solid fill takes `text-primary` (6.65:1) | Words use `warning-text` `#9A4A00` (5.49:1 on `warning-fill` `#F6EFE6`). The former `#A85F00` and `warning-light` are gone (ADR-062) |
| `error` / `destructive` | `#D32F2F` | Delete/irreversible actions, validation errors, missed follow-ups | 4.98:1 — passes | Outside the brand palette entirely — unambiguous |
| `info` | `#1976D2` | Neutral system messages | 4.60:1 — passes | The one cool hue in the palette, reserved for neutral/informational only |

**Contrast rules, stated plainly:**
- Small white text: only ever on `brand-green-dark`, `success`, `error`, or `info` — never on `brand-green`, `brand-yellow`, `brand-yellow-dark`, `brand-green-light`, `success-light`, or `warning` (ADR-062).
- Large text (≈18pt+, or 14pt+ bold) and non-text UI such as icons and borders: `brand-green` becomes usable with white on top of the above list. A button's label is text, not a UI component, so a button fill follows the small-text rule above: primary buttons are `brand-green-dark`.
- The `-light` variants and `brand-green-light` exist specifically for badge/accent backgrounds — always pair them with `text-primary`, never white.
- Per the Accessibility guidance already in this document: pair every semantic color with an icon or label, never color alone — this matters even more here since `brand-green` is both the brand's primary identity color *and* the family `success` is drawn from.

### Layout & Spacing
Clean, organized, compact, comfortable, uncluttered — avoid both extremes: crowded/hard-to-interact-with, and so much whitespace the system feels inefficient. Use consistent spacing and alignment to show relationships between elements; group related information and visually separate unrelated information.

**Two page containers, and only two** — both are real tokens in `frontend/src/index.css`, centered in the content area:

| Token | Width | Use |
|---|---|---|
| `--container-page-wide` (`max-w-page-wide`) | 1200px | Lists, tables, reports, and dashboards |
| `--container-page-narrow` (`max-w-page-narrow`) | 832px (52rem; was 720px, changed Thursday, November 05, 2026) | Single-record forms and detail views, stacked in one column |

Don't introduce a third width for one screen.

### Forms
Should be especially intuitive for non-technical users. Use real labels, not placeholder-text-only. Group related fields, mark a field as required only when saving is blocked without it (a field that can be saved empty shows no mark, ADR-051), explain a confusing field when necessary, and give understandable validation messages rather than exposing raw technical errors. Preserve entered data when validation fails, where possible, and move focus to the first invalid field after a failed submit. Cancel on an entry or edit form asks "Discard unsaved changes?" only when something has been typed or chosen and not saved, with "Keep Editing" as the safe, focused choice (ADR-021). A user should always be able to answer: *What do I enter? → Why am I entering it? → What happens next?*

### Navigation
Predictable and simple. Familiar terminology over technical jargon. Make the current location obvious, keep important functionality easy to discover, keep recurring controls in a consistent place, and organize navigation around what the user is trying to do — not around the app's internal module structure. Every screen you can get stuck on (detail pages, forms, steps, error and not-found pages) has one Back button at the top left that returns to where the user came from, with a role-aware fallback when the page was opened directly; it says plain "Back" unless the target is always one named screen, and on a form it works exactly like Cancel (ADR-024). On a narrow window the sidebar is replaced by an "Open navigation" button that lists the same pages for that role (ADR-022).

### Accessibility
Treat as part of the normal design process, not an optional pass at the end. Ensure readable text, adequate contrast, clear labels, obviously-interactive elements, understandable error messages, visible focus/interaction states, meaningful feedback, and no dependence on color alone.

### Feedback & System States
Clearly communicate what's happening: loading, saving, success, error, warning, empty data, disabled, hover, focus, and completed-action states all need a defined look (hover and cursor specifics: see Buttons, Controls & Shape Language above — this was previously stated too vaguely and got missed in the first Dashboard build). Messages should be concise and actionable — prefer "Unable to save changes. Please check the required fields." over surfacing a raw database/API error.

*Update (Thursday, November 19 and Friday, November 20, 2026, ADR-083, ADR-084):* every action's result is its own bottom-right toast; field errors stay by the fields; a saved new-record form resets and scrolls to the top.
*Update (Sunday, November 22, 2026, ADR-085):* a reversible action's toast carries an 8-second Undo; an archived student or staff record can be restored.

**Loading state, specifically — skeleton screens, on every page, not spinners and not a blank screen.** Every screen that fetches data on load shows a skeleton (gray placeholder shapes matching the final layout) while that data is in flight. This is a stated rule, not a preference: it makes a load *feel* faster on the 4GB RAM target hardware (the eye has structure to anticipate rather than nothing), and reassures non-technical staff who could otherwise read a blank screen or lone spinner as "did it freeze?" Apply to every list, table, card grid, and detail view — a form pre-filled from a search result skeletons the fields being populated, not just appears blank. A save/submit button's own in-progress spinner is a separate, narrower state and doesn't need a full-page skeleton.

### Modals & Confirmation
Use only when they add real value — don't interrupt users with confirmations for harmless, reversible actions. For destructive or irreversible actions: clearly explain what will happen, visually distinguish the destructive action from the cancel option, and never make a destructive and a safe action look visually identical.

**Which actions confirm.** An action that can't be undone from the screen it's on asks first: archiving a student, approving an incident report or excuse letter, marking a backup verified, and closing a follow-up as Missed or Cancelled. The expected, routine outcome doesn't: marking a follow-up Completed applies at once, because adding friction to the normal path costs the nurse time on every record. Every confirmation uses the shared `Modal`, names the record it affects, and opens with focus on the safe choice.

### Animation & Microinteractions
Subtle, and only when it improves usability — communicating state changes, feedback, transitions, loading, or interaction responses. No bouncing effects, unnecessary transitions, or decorative motion. The system should feel smooth and responsive, not flashy. (This also serves the 4GB RAM performance constraint below — lightweight motion is both a UX and a hardware requirement here.)

### Consistency
Reuse established typography, font weights, spacing, colors, button styles, input styles, border radii, shadows, icons, and status/component states rather than creating a visually different one-off for a similar problem. In this stack, that means leaning on Tailwind's design tokens (spacing scale, color palette, radius scale) as the single source of truth, not ad hoc utility combinations per component.

### Labels, Titles, Dates & Times
- **Button labels are Title Case**, always: "Save Changes", "Add Item", "Mark as Verified", "Look Up Student". Short joining words (a, an, and, as, of, or, the, to) stay lowercase unless they come first. This applies to every button and every link styled as a button.
- **Page titles say what a nurse would call the screen**, in Title Case, not the internal spec label: "Visit Log" (not "Visit Log List"), "Visit Details" (not "Visit Detail/Edit"), "Incident Log", "Incomplete Records", "New Visit". The page title matches the browser-tab title.
- **One date and time format everywhere:** `Sep 27, 2026 · 9:05 AM` — short month, 12-hour clock, Philippine time. A date with no time is `Sep 27, 2026`. Never show a raw ISO string (`2026-09-27`) or a 24-hour time (`13:46`). Use `formatDateTime` and `formatDate` from `frontend/src/lib/dates.ts`; screens don't format dates themselves.
- **Never show an internal record id** (`visit-0001`, `incident-0022`) on anything a user sees or prints. Describe the record by what Staff recognise — the masked LRN and the time. A human-facing reference number for printed documents is a backend-phase item.

### Visual Hierarchy
Every page should let the user quickly answer: Where am I? What is this page for? What information matters? What actions are available? Which action is most relevant? What happened after I acted? Build this with size, weight, spacing, position, and contrast — not by making everything large, bold, or colorful.

### Implicit Decisions
Where a requirement doesn't specify behavior, use established usability judgment: clear empty states, tooltips where genuinely necessary, icon+text pairing when it helps, hover/focus/disabled/loading states, graceful error recovery, success feedback, logical grouping, responsive behavior, keyboard accessibility, and protection against accidental destructive actions. Don't add an element just because it looks good — every element needs a usability reason to exist.

### CLINIQ-Specific Implementation Notes
- Must render fast on a 4GB RAM machine — keep bundle size and animation weight modest; avoid heavy chart libraries if a lighter one covers the Clinic Overview Dashboard's needs.
- Tailwind CSS for styling; keep the palette simple and consistent across every screen.
- Print layouts are first-class, not an afterthought. Every printout is a purpose-built A4 document with the school letterhead, a line saying what it covers, content in reading order and no app chrome; the footer is the page number only ("Page X of Y"); printing never fetches new data; a draft excuse letter can't be printed; and the Admin/Principal never prints (ADR-026, 038, 046). The Dashboard prints the open tab (ADR-045).
- The system is primarily used on the one desktop workstation; every screen still keeps a usable responsive layout down to phone width.

## 8. Non-Functional Requirements

- No external CDN dependencies that require live internet access at runtime (clinic-PC-only deployment, ADR-079).
- RA 10173 (Philippine Data Privacy Act) awareness: only Staff and, read-only, the Admin/Principal see student health data (the Admin does not print and does not see staff patients); every login, action, print and profile or incident-report opening is logged (see the AuditLogEntry entity above) so access stays attributable and auditable. PE/Sports Instructors have no account (ADR-029).
- Role-based UI gating must be enforced by the backend too — don't rely on hiding buttons in the frontend as the only access control.

## 9. Explicitly Out of Scope — tell the agent NOT to build these

- Parent/guardian self-service portal or app
- Automated SMS/push notifications (parent contact stays a manual phone call, logged manually)
- Billing/invoicing of any kind
- Barcode/RFID scanning, purchase-order or vendor management
- Multi-location/multi-room inventory views (single clinic room only)
- Remote/off-campus access beyond the clinic computer (a future phase, not this build; whether the school ever goes online is undecided, ADR-029)
- QR codes, QR stickers and a system-made Student Number (ADR-027); an account for PE/Sports Instructors (ADR-029); a cloud or off-site backup copy (ADR-039)
- Immunization tracking, a clinic pass or queue, Excel export, a safety rule engine for doses, and incident severity levels (ADR-049, 053)
- **A separate scoped role for Canteen Staff** — designed but deferred. When it's picked up later: a scoped sign-in letting canteen staff enter an LRN to see only food allergies/restrictions. Nothing about the current build needs to change to support this later.

## 10. Supporting Reference Documents

Point the agent to these if it can ingest files — they contain the full reasoning behind every item above:
- **CLINIQ Project Plan** (Sections 5.1–5.3 especially — Requirements, Resources, System Overview)
- **CLINIQ Review of Related Systems** (useful if the agent needs to understand why a feature exists — each is traced back to a specific competitor gap or SWOT finding)
