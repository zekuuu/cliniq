# Decisions Summary

This is a quick, plain-language guide to the decisions recorded in the full decision records. Read the matching full record when a decision affects a requirement, system behavior, or the formal SRS.

## 001 Modern tools for the system

The team chose React, TypeScript, Tailwind CSS, and Laravel instead of plain web pages and plain PHP. These tools reduce repetitive work and help catch mistakes before clinic staff encounter them.

## 002 QR lookup as a Staff quick-action

QR lookup was made part of the Staff workflow instead of creating a separate QR-only account type. After identifying a student, Staff can move straight to recording a visit, emergency, or profile view. Replaced by 027: QR was removed from the app on Wednesday, October 21, 2026.

## 003 PE and Sports Instructor access

PE and Sports Instructors are included now, with mobile-only read access to a student's full profile and visit or incident history. They cannot change records, and each view is recorded so access remains accountable. Replaced by 029: the Instructor role was removed from the app on Wednesday, October 21, 2026.

## 004 Privacy on shared screens

Lists and dashboard areas that show several students use the masked LRN (its last four digits) instead of names, reducing what a passer-by can learn at a glance. A deliberate one-student lookup, such as a profile, shows the student's name normally.

## 005 Student Number format

Each student receives a system-made number in the form YYYY-NNNNN, based on the enrollment year and a sequence number. It is easy to type, avoids confusing letters, and is used for lookups. Replaced by the LRN on Wednesday, October 21, 2026 (see 028).

## 006 Interface-first work

The team will show usable screens with sample data before finishing the supporting system work behind them. This lets the client give feedback early, when changes are easier to make.

## 007 Chosen technology tools

The team selected dependable tools that fit the school's low-cost, low-spec environment, including Vite, Laravel Sanctum, XAMPP, QR tools that work on iPhones (removed with QR, see 027), and lightweight charts. The choices favor long-term support and practical use over newer-looking options that could fail or add weight.

## 008 Organizing the user-facing app

The user-facing app is grouped by clinic feature so everything for one area stays together. QR work was split into desktop, mobile, and shared parts; that folder was removed with QR (see 027).

## 009 Organizing the server side

The server side follows the same feature-based organization as the user-facing app. This keeps each clinic area easier to understand and change without adding a large extra system for managing modules.

## 010 What list rows may show

Multi-student lists may show a visit reason, complaint, or description beside the masked LRN. Keeping names out is considered enough protection for a casual glance while still giving the nurse useful context.

## 011 Dashboard scope

The Clinic Overview Dashboard is view-only for both Staff and Admin, so changes happen in the proper module rather than from a summary screen. Its first row is operational totals, while Staff also get links to start a visit and check backup status.

## 032 Dashboard summary and Calendar

The Dashboard now keeps Overview and Trends only. Inventory and incomplete-record counts are compact Staff drill-through chips, while the existing Calendar is a separate Staff/Admin screen with its own controls and state.

## 012 Clear page addresses

Each screen uses a normal, readable web address such as a student or visit page rather than a temporary screen switch. This makes navigation clearer, keeps roles on the right screens, and lets the app load only the screen needed.

## 013 Simple data loading for now

The app uses one small helper for loading information, showing errors, and trying again, with each feature keeping its own request functions. This is enough for the current stage and can be reconsidered later if more complex shared data handling is needed.

## 014 One shared set of sample data

All sample records live in one central file and are accessed through one shared layer. This keeps screens consistent, lets actions appear across related screens during a demonstration, and keeps fake personal information clearly fictional.

## 015 One-week sessions without an idle timer

Every role stays signed in for up to one week, then must sign in again; there is no automatic sign-out just because someone is inactive. The team chose this to avoid interrupting urgent work, while recognizing that users must still sign out on a shared workstation.

## 016 Audit Log Viewer

Staff and Admin can review a read-only history of important actions, filter it, and print or export it when needed. Nobody can change or delete its entries.

## 017 Audit entry summary and actor role

Audit Log rows now show the actor's role, the kind of record beside a short identifier, and an optional "what changed" line on updates (e.g. "Updated allergies"). The line names fields only, never values, so no health details appear in the list.

## 018 Medicines given come out of real stock

A visit's treatment is now two parts: free-text treatment notes, and medicines and supplies picked from inventory. Saving takes them out of stock in one all-or-nothing save; expired items can't be given, and going over stock warns instead of blocking. Editing a visit corrects stock with new adjustment records instead of rewriting old ones. Staff can also adjust stock for disposal, damage, or a recount, and the expiration date changes only through Restock.

## 019 Staff keep school events on the Dashboard calendar

The school-events calendar is no longer deferred. Staff click any day on the Dashboard calendar to add, edit, or delete events, including on future dates and days with no visits. Admin/Principal sees the same events but can't change them. Visit and incident tags still show, and a tag with the same text as an event shows only once.

## 020 National holidays on the Dashboard calendar

The calendar now shows nationwide Philippine holidays as gray "Holiday" chips, separate from Staff's yellow events and the visit and incident tags. Nobody edits them in CLINIQ; they come from a source, which for now is a checked list of the 2026 proclamations. A line under the calendar says when the list was updated and warns if the current year is missing. Updating it automatically is a backend task, and which outside source to use is still open.

## 021 Cancel asks before throwing away unsaved input

*Agent-decided, pending team review.* On an entry or edit form, Cancel now asks "Discard unsaved changes?" when something typed or chosen hasn't been saved yet. If nothing was entered, or it was just saved, Cancel leaves straight away. "Keep Editing" is the safe choice and has focus when the question opens. Leaving through the browser's Back button or a sidebar link doesn't ask yet; that needs a routing change and is listed for later.

## 022 Phones get a navigation menu

*Agent-decided, pending team review.* On a phone or small tablet, the sidebar is replaced by an "Open navigation" button in the top bar. It lists the same pages the sidebar shows for that role, plus Privacy Policy and Report an Issue.

## 023 QR lookup is for phones only

The clinic workstation has no QR scanner, so QR Lookup is gone from the desktop sidebar and the Alt + Q shortcut, and the desktop scan hub was removed. Staff and PE/Sports Instructors scan with a phone camera from the phone menu. Printing QR stickers stays on the workstation. Replaced by 027: QR was removed from the app on Wednesday, October 21, 2026.

## 024 Every screen you can get stuck on has a Back button

Every detail page, form, step, error or "not found" page, and phone screen without the sidebar now has one Back button at the top left. It returns to the screen you came from; if you opened the page directly, it goes to a screen your role is allowed to use (a PE/Sports Instructor is never sent to the Student List). It says just "Back" unless it always goes to one named screen, such as "Back to Sign In". On a form it works exactly like Cancel. Main sidebar pages don't get one, except when you opened a list from a Dashboard link.

## 025 The Dashboard shows one view at a time

The Dashboard has three tabs under its header: Overview (counts, alerts, and Staff's excuse letters), Trends, and Calendar. It opens on Overview, so the alerts are seen first, and the Overview tab shows how many alerts there are from every view. The chosen view is kept in the address (`?view=calendar`) without adding Back steps, each view keeps its state when you switch, and Print still prints the whole Dashboard (since 026, Print produces a one-to-two-page Clinic Overview Report instead). The Date range doesn't apply to the Calendar, which has its own period.

## 026 Every Print / Save as PDF is a proper A4 document

Printing no longer copies the screen. Every printout is an A4 document with the school letterhead, a line saying what it covers, its content in a sensible reading order, and a footer on every page with who printed it and when, a confidentiality line, and page numbers. The Dashboard prints a "Clinic Overview Report" (a summary of the chosen period); Reports prints the formal documents. Lists of several students show Student Numbers only. The school still needs to confirm that A4 is its paper.

## 027 We are dropping the QR feature and the Student Number

The team decided to drop the QR feature (printed QR stickers, the phone scan screen) and the Student Number CLINIQ made up for each student. At first the plan was to identify students mostly by name with the LRN as a helper; the team's meeting the same evening chose the LRN instead (see 028). CLINIQ stays independent and takes nothing from the school's existing ID card system, which belongs to another company. QR was removed from the app on Wednesday, October 21, 2026 (tagged first, so it can be restored); the Student Number was replaced by the LRN on Wednesday, October 21, 2026 (028). The open questions were taken up in 028 and 029. QR may come back as a future idea.

## 028 The LRN is how we identify students

With the QR code and our own Student Number gone, the team chose the LRN (the Learner Reference Number) as the one unique number for each student. Lists with many students show the LRN instead of the name, as the Student Number did before, so a screen left open does not show who visited the clinic. A student can be found by name and section, birthday or LRN. Built on Wednesday, October 21, 2026, with the defaults Zean confirmed: the LRN is 12 digits, required and unique; lists, pickers, printouts and the Audit Trail show only its last four digits, and only the student's own profile and edit form show it in full; a wrong LRN can be corrected and the change is recorded without the numbers; addresses never contain it. Students are found by name or LRN. Still to settle: the school's confirmation that every student, transferees included, has an LRN.

## 029 No direct access for PE instructors, and the Principal signs in at the clinic computer

Because CLINIQ runs locally, the PE instructor gets no account: they ask the clinician, who prints the health information and recent incidents of the chosen students. The Principal keeps an account but signs in on the clinic computer to see the Dashboard and the printable report; reaching it from his own office is only a future option if the school connects his Wi-Fi network to the clinic's or goes online (his office has Wi-Fi, but it is a different network from the clinic's). In an emergency, help the student first, use paper, and enter the record afterwards. The client has not yet been asked who provides the computer or whether the school will go online, so this may change. The Instructor role and its accounts were removed from the app on Wednesday, October 21, 2026; the Sports Report (034) was built the same day.

## 030 Inventory batches and explicit expired-stock disposal

Inventory tracks each received batch rather than replacing one item's expiry date at restock. Usable, expired, and total quantities are derived from batches; expired units stay visible until Staff records a disposal against that batch. Dispensing uses the earliest non-expired batch first, and visit edits return stock to the same batches.

## 031 Student Sex and aggregate demographic Trends

Student Sex is required as recorded by the school (Female or Male). It is available only in the single-student record and aggregate-only Trends; chart filters never change Overview totals or expose student names. The team must still choose a minimum safe group size before production reporting.

## 033 Phone-only screens are removed, accounts move to the Admin/Principal, and QR is removed now (reversible)

The phone Emergency screen and the phone-only navigation are removed, and the Admin/Principal (not Staff) manages accounts. QR is removed now with the others; it had been on hold until the client's answer on online hosting, so it is tagged first and can be restored if the client agrees to go online (ADR-027 unchanged). The last active Admin can never be disabled or demoted. All three are built (Wednesday, October 21, 2026).

## 034 The Sports Report for the PE instructor

The clinician (Staff only) builds a saved, reusable and editable list of students for a sports activity and prints a report with each student's full name, recent visits and incidents (default 90 days), a note she writes, and the student's conditions only if she ticks it. Saved lists hold only the list and notes, never a copy of medical content; every print is audited. Full names are an exception to the LRN-on-lists rule. What the nurse and Principal agree to release is still open. Built Wednesday, October 21, 2026, under Reports (Staff only).

## 035 Restock requires an expiry decision

Every newly restocked batch needs an expiration date unless the clinician explicitly confirms that it has no manufacturer expiration date. A blank date alone cannot be saved as no expiration, preventing an accidental omission from bypassing expiry checks. The rule is enforced in the Restock dialog and inventory write layer; the future Inventory API must enforce the same one-of choice.

## 036 Visits and incidents stay separate, with an "Escalate to incident" button

Two forms stay, matching the clinic's two logbooks. A visit can be escalated to an incident from Visit Details or from the New Visit form, carrying the student, complaint, time and temperature; the visit is kept, linked, and its medicines are not copied, so stock is deducted once, and the event counts once, as the incident. Emergency-type complaints on a visit show a hint, not a block. The nurse's rule for what counts as an emergency is still open. Decided Thursday, October 22, 2026; not built yet.

## 037 Backup and the Audit Log for both roles, 10-year audit retention, password re-entry

The Principal and the clinician can both see the Audit Log and Backup (the review's advice to hide them from the clinician is declined and its risk accepted). The audit log is kept 10 years (Zean's answer; the school has not confirmed it). The Backup page gets "Back up now" and the Dashboard warns when the last good backup is over 48 hours old. A "Confirm it's you" password re-entry guards archiving a student, disabling or enabling an account, resetting a password, changing a role and approving an incident report. Decided Thursday, October 22, 2026; not built yet.

## 038 Admin reads student profiles and incidents but cannot print; a draft letter cannot be printed

The Admin/Principal can open the Student List, Student Profile, Incident Log and Incident Report read only (no write controls, visits shown as text, views audit-logged by default), and cannot print or Save as PDF anywhere; the clinician prints and hands over the printout. A draft excuse letter cannot be printed or saved as PDF until it is approved (it replaces the printed DRAFT mark). No Super Admin role, and the Admin does not get the clinician's features. Decided Sunday, October 25, 2026 after Sir Mina's and Sir Rey's feedback; built Sunday, October 25, 2026 — 21:57. ADR-029 and ADR-026 carry a note. [ADR-038](ADR-038-Admin-Read-Only-Access-No-Printing-And-No-Printing-Of-Draft-Letters.md)

## 039 Backup stays on the internal and external drives, with no cloud and no extra copy planned yet

The backup stays on the clinic computer and its external drive. No cloud backup, because off-site health data needs the parents' consent and a provider agreement and the school has no IT staff (ADR-029). A second copy held by the Principal was suggested and withdrawn; no extra layer is planned, and the question stays open. Decided Sunday, October 25, 2026. [ADR-039](ADR-039-Backup-Stays-Local-No-Cloud-No-Extra-Copy-Planned.md)

### ADR-040: The full LRN shows on every single-student screen and its printout

A screen about one deliberately opened student shows the full LRN, and so does its printout: the Student Profile, Incident Report, Excuse Letter, Visit Details, Parent Notifications, and the entry forms once a student is picked. Lists, pickers, the Dashboard, Reports and the Audit Trail stay masked to the last four digits. Decided and built Sunday, October 25, 2026 — 22:33 PHT. [ADR-040](ADR-040-Full-LRN-On-Single-Student-Screens-And-Printouts.md)

### ADR-041: No password re-entry before sensitive actions

The "Confirm it's you" password dialog from ADR-037 item 5 is removed from every action (Zean, Sunday, October 25, 2026 — 23:18 PHT). Archiving a student and approving an incident report keep their plain confirmation dialogs; account changes apply at once. The actions are still audit-logged.

### ADR-042: The Admin can add, edit and delete calendar events

On the Calendar screen the Admin opens any day and manages its events like Staff (Zean, Sunday, October 25, 2026 — 23:55 PHT). The "View visits" link stays Staff-only. Amends ADR-019.

### ADR-043: Teachers and school staff are clinic patients, with their own Staff screens

Teachers, non-teaching staff and utility workers (called personnel in documents and code, because "Staff" is the clinician role) can be patients (Zean, Monday, October 26, 2026 — 02:56 PHT). They get their own Staff List, Profile and Form under a sidebar group renamed Patient Care. A record has name, type, department or role, contact, emergency contacts, allergies and conditions, and a system-assigned Staff No.; no LRN, grade or sex. Visits, incidents, follow-ups and medicine given are about a student or a staff member, exactly one. Lists show the Staff No., not the name. No excuse letter, PE referral or Sports Report for staff. The School Clinician only; the Admin does not see staff. Zean approved the defaults and reported the clinician's yes on Monday, October 26, 2026 — 03:07 PHT. Not built yet; wanted for the presentation on October 27. [ADR-043](ADR-043-Teachers-And-School-Staff-Are-Clinic-Patients-With-Their-Own-Screens.md)

### ADR-044: Full LRN on the Dashboard printout

The Clinic Overview Report (the Dashboard's printout) prints the full LRN wherever it lists a student, still with no names (Zean, Monday, October 26, 2026 — 11:04 PHT). The Dashboard screen and every other list and printout stay masked. Amended Monday, October 26, 2026 — 14:43 PHT: the Monthly Report printouts (incident table and Incident register) print the full LRN too; the Reports screen stays masked. Narrows ADR-004 and ADR-028. [ADR-044](ADR-044-Full-LRN-On-The-Dashboard-Printout.md)

### ADR-045: The Dashboard prints the open tab

Overview prints the Clinic Overview Report: the screen's five stat cards and three chip counts, the written summary, and the lists behind them (due follow-ups, frequent visitors, excuse letters awaiting approval, low-stock and expiring items). Trends prints the Clinic Trends Report: the sex and grade-level tables, complaints, and visit activity. The scope line names the tab (Zean, Monday, October 26, 2026 — 11:13 PHT). Amends ADR-026. [ADR-045](ADR-045-Dashboard-Prints-The-Open-Tab.md)

### ADR-046: Printouts footer with the page number only

Every printout's footer is "Page X of Y" at the bottom right; the "Printed … by …" line and the confidentiality line (including the Sports Report's own) are removed to unclutter the page (Zean, Monday, October 26, 2026 — 11:35 PHT). Prints stay audit-logged. The browser's own header and footer are turned off in the print dialog, since code can't remove them without losing the page number. Amends ADR-026 and ADR-034. [ADR-046](ADR-046-Print-Footer-Page-Number-Only.md)

### ADR-047: The yearly list drives grade and section, a visit keeps the grade it had, and archiving is yearly

No bulk promotion: grade and section come from one yearly import of the registrar's list, which flags students missing from it. Archive in one yearly batch plus single archives by the clinician; a returning student is restored; no reason for leaving. Visits and incidents keep the grade and section they had when saved. Students missing from the new list are archived automatically and records are kept 5 years from the archive date (amended by ADR-051). Zean, decisions sheet, Thursday, October 29, 2026 — 12:33 PHT. [ADR-047](ADR-047-Yearly-List-Drives-Grade-And-Section-Visit-Keeps-Its-Grade-Archive-Yearly.md)

### ADR-048: Admin sign-out, Acknowledge on an incident report, email password reset, and logging who opens a record

The Admin is signed out after 30 idle minutes (amends ADR-015); the Admin can Acknowledge an incident report (amends ADR-038); passwords can be reset by email when online, with the Admin reset as fallback; disabling an account ends its sessions; the clinician opening a profile or an incident report is audit-logged. Zean, decisions sheet, Thursday, October 29, 2026 — 12:33 PHT. [ADR-048](ADR-048-Admin-Sign-Out-Acknowledge-Email-Reset-And-Logging-Record-Opens.md)

### ADR-049: Clinical record rules: letters, allergies, notes and what the clinic does not add

"Save and approve now"; a warning past 3 days; the approved wording stored; one allergies field and one conditions field that say "None recorded" (amended by ADR-051), with an "avoid if allergic to" tag on medicines (warn, never block); the student's mobile number optional; optional collected-by, stay-home and notes rules; no safety rule engine and no extra emergency fields. Zean, decisions sheet, Thursday, October 29, 2026 — 12:33 PHT. [ADR-049](ADR-049-Clinical-Record-Rules-Letters-Allergies-Notes.md)

### ADR-050: Reports, Dashboard and calendar: exact counts, a cluster alert, weekly and inventory prints, and "Activity calendar"

Exact counts with no masking; a clinician-only cluster alert (3 students, same complaint and grade, 3 days); the Monthly Report gets a weekly breakdown and a monthly inventory print; no Finalize month; the Calendar is renamed Activity calendar. Zean, decisions sheet, Thursday, October 29, 2026 — 12:33 PHT. [ADR-050](ADR-050-Reports-Dashboard-And-Calendar-Exact-Counts-Cluster-Alert-Weekly-And-Inventory-Prints.md)

### ADR-051: Starting numbers, follow-up closing, vitals ranges, automatic archive with 5-year retention, the allergy wording and required marks

Starting values chosen for the clinic (frequent visitor 3 visits in 14 days, follow-ups overdue after 3 days and closed after 7); a Visit/Incident hint ("common and worse"); the clinician picks which entries the Sports Report prints; common vitals ranges as warnings; the yearly import archives missing students automatically after a review list, records kept 5 years from archive and the audit log 10 years; allergies and conditions say "None recorded" instead of "None", also when empty (no three-state control, no warning style) and the student's own number is renamed "Student's mobile number"; the required mark shows only where saving is blocked. Amends ADR-047 and ADR-049. Zean, in chat, Thursday, October 29, 2026 — 13:46 PHT. [ADR-051](ADR-051-Starting-Values-Follow-Up-Closing-Vitals-Ranges-Automatic-Archive-And-Required-Marks.md)

### ADR-052: Backup locations are chosen in the system and the folders are created automatically

The clinician chooses, adds and edits the internal and external backup locations on the Backup screen; the system creates a `.cliniq` folder structure on each (backups by year and month, logs, a marker file) and keeps the latest 60 backups per location. Still local, no cloud, no extra copy (ADR-039). Zean, in chat, Thursday, October 29, 2026 — 22:15 PHT. [ADR-052](ADR-052-Backup-Locations-Chosen-In-The-System-With-Automatic-Folders.md)

### ADR-053: Extra complaint tags, staff wording, Admin counts, two patient tables and the PE wording

Up to 3 extra complaint tags on a visit (reports count the main complaint); the staff type "Other"; "Returned to work" for staff; the Admin's totals leave staff incidents out; two patient tables in the ERD; the PE wording marked "to confirm"; the printable Monthly Report is enough for now. Zean, in chat, Thursday, October 29, 2026 — 22:15 PHT. [ADR-053](ADR-053-Extra-Complaint-Tags-Staff-Wording-Admin-Counts-And-Two-Patient-Tables.md)

