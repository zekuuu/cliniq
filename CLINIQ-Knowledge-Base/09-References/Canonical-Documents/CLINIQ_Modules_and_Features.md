# CLINIQ — Full Module & Submodule List (Complete Feature Breakdown)

Modules 1 to 5 are the baseline (from the Software Engineering I Technical Documentation); Modules 7 to 11 are team-proposed enhancements added during Software Engineering II planning (Module 6, QR, was removed, ADR-027); Module 2a covers teachers and school staff as patients (ADR-043). Every module is broken down to individual operations, each tagged with who can access it. Brought up to date with ADR-001 to ADR-053 on Thursday, October 29, 2026. This document says what the system should do; it does not say what is already built (see the repository README for that).

**Words used.** "Staff" in this document is the clinician role, called **School Clinician** in the app. Teachers and other employees who are seen at the clinic as patients are "staff patients" (ADR-043).

**Roles in the system (current scope):**
- **Staff** (School Clinician in the app) — School Head Nurse / clinic assistants. Full read/write access.
- **Admin/Principal** — School Administration. Read-only access to reports and health summaries, and read-only access to the Student List, Student Profile, Incident Log and Incident Report (ADR-038), plus account management (ADR-033): creates, edits, disables and resets accounts. The Admin/Principal can also Acknowledge a completed incident report (ADR-048), never prints or saves as PDF (ADR-038); the clinician prints. The Admin/Principal signs in at the clinic computer and is signed out after 30 idle minutes (ADR-029, 048).
- **PE/Sports Instructor** — No account and no access (ADR-029). An instructor asks the clinician, who decides what to share.

**Role documented for future development (not built this phase):** Canteen Staff — see "Future Development" at the end of this document.

**Display-privacy rule (applies across the whole system):** the actual privacy risk isn't a single deliberate lookup — it's a **desktop screen showing a list or pattern across multiple students at once** (a visit log, an incident log, or a "frequent visitor" flag) being glanced at by a passerby, who can then attach a specific named student to a health pattern ("he visits a lot, what's going on?"). So: the **Visit Log List, Incident Log List, and the Dashboard's frequent-visitor section default to the masked LRN**, not full name, since these are rolling, multi-student, glanceable-by-bystanders screens. A **single deliberate lookup of one specific student — the full profile page, search results, and the masterlist/directory — shows the full name normally**, since at that point someone has already identified and is looking at one particular student for a legitimate reason. The masterlist shows names freely (it's just a roster of who's enrolled) but should not show medical/confidential fields inline — allergies, conditions, or visit reasons still require opening the individual profile. On paper, a printout about one opened student shows the full LRN (ADR-040), and the Clinic Overview Report and the Monthly Report's incident tables print the full LRN with no names (ADR-044).

---

## Baseline Modules

### 1. User Management — *Access: Admin/Principal (manages every account, ADR-033)*
**Login Authentication** *(Staff, Admin/Principal — everyone with an account)*
- Log in (username/password)
- Log out
- A Staff session lasts 1 week, until the login token expires — there is no idle timeout, so urgent work is never interrupted (ADR-015). The Admin/Principal is signed out after 30 idle minutes, with a notice about a minute before (ADR-048)
- Account lockout after 5 consecutive failed attempts (30-minute lock)
- Every login logged with who and when (see Audit Trail, below)

**User Account Management** *(Admin/Principal only, ADR-033)*
- Add new user account, with a temporary password that must be changed at first sign-in
- Edit user account (name, username, role)
- Optionally add, replace, or remove a staff-account profile picture (JPEG, PNG, or WebP, client-cropped/resized to a 256 px square); show an initials avatar when absent, keep the role badge visible, and audit the change by field name only
- Disable or re-enable a user account (never deleted: a disabled account stays listed and in the audit history, and can't sign in)
- Reset a password to a temporary one that must be changed at the next sign-in (no self-service recovery; a lost Admin password is fixed outside the app)
- Never disable or demote the last active Admin/Principal, including one's own account
- View list of all user accounts
- Search/filter user accounts

**Password Management** *(Staff, Admin/Principal — self-service for whoever is logged in)*
- Change password (self-service)
- Force password change on first login
- Prevent reuse of last 5 passwords
- Enforce minimum 8-character password length
- Recover a forgotten password by an email reset link when the computer is online, with the Admin's temporary-password reset as the fallback; this needs an email address on each account and a mail service (ADR-048)
- Disabling an account ends its open sessions (ADR-048)

**Role-Based Access** *(Admin/Principal only)*
- Assign role (Staff / Admin-Principal). Add Account starts with **no role selected** ("Select a role", required), so the smallest role needed is chosen on purpose (panel review AC-4)
- **No password re-entry** (ADR-041, Sunday, October 25, 2026 — 23:18 PHT; supersedes ADR-037's "Confirm it's you"): no action asks for the password again. Archiving a student and approving an incident report keep their plain confirmation dialogs. Password fields show a "Caps Lock is on." hint (Login, Force Password Change)
- Edit role assignment
- View permissions per role

### 2. Student Records — *Access: Staff full read/write; Admin/Principal reads the Student List and Student Profile only (ADR-038)*

**Student Information Encoding**
- Add new student record — *Staff*
- Record the required **Sex** recorded by the school (Female or Male). Show it on the deliberate single-student profile and Student Health Record; audit changes by field name only, never the value.
- Record the student's LRN (Learner Reference Number, ADR-028), entered by Staff from the school records: exactly 12 digits, kept as text so leading zeros survive, required and unique (a repeat shows "This LRN is already used by another student record" without naming that student); spaces and dashes are removed when typed or pasted; a wrong LRN is corrected in Edit Student and audited as "Updated LRN" with neither value. Lists, pickers, the Dashboard, Reports and the Audit Trail show it masked to the last four digits (`●●●●●●●●1234`, read as "LRN ending in 1234"); a screen about one opened student, and its printout, show it in full (ADR-040); only the Student Profile and the edit form show it in full; addresses carry the internal id, never the LRN
- Edit student record — *Staff*. The LRN is locked once the record exists (read-only on Edit Student and refused by the data layer); a name correction stays possible but asks for a reason of at least 3 characters, which the audit entry records ("Name corrected; reason: ...") without the old or new name (Sir Rey, Sunday, October 25, 2026)
- Admin/Principal opening a student profile is audit-logged once per record per sign-in session (ADR-038 item 4); visits on the profile show as text, not links, for the Admin
- The student's own number is called **Student's mobile number** and is optional for every grade (Zean, October 26, 2026; renamed by ADR-051 so it is not read as the student number); the emergency contacts stay required for every grade, and no record is "incomplete" for lacking it
- View student profile/detail — *Staff*. When allergies or medical conditions are recorded, a compact banner at the top of the profile lists them; otherwise nothing extra shows (panel review ST-9)
- View list of all students (masterlist, shown with full names) — *Staff*
- Search/filter students (name, grade level, status, or LRN) — *Staff*
- Archive/deactivate a student record (e.g., transferred or graduated) — *Staff*. Archived records are **not deleted** — they stay in the system for historical/audit continuity but are filtered out of default active-student lists, search results, and dropdowns unless a Staff member explicitly chooses to include archived records

**Medical History Recording**
- Add/update medical history entry (allergies, past illnesses, family history) — *Staff*
- Allergies and medical conditions are one free-text field each. The suggestion and the display for an empty field read **"None recorded"**, in plain text with no warning style and no extra states (ADR-049, amended by ADR-051)
- View medical history — *Staff*

**Allergy/Food Restriction Monitoring**
- Add/edit an allergy or food-restriction entry — *Staff*
- View/flag students with restrictions — *Staff*

**Contact Information Management**
- Add/edit one or more emergency contacts — *Staff*. At least one is required; the ordered list has no fixed maximum, its first contact is primary, and Staff can move another contact to the top.
- View all emergency contacts, primary first, with each contact's verification state — *Staff*
- Mark each contact number as verified/unverified — *Staff*

**Yearly List and Archiving (ADR-047, ADR-051)**
- Grade level and section come from one yearly import of the registrar's student list; there is no bulk promotion button. The import adds new students, updates continuing ones and flags students missing from the new list. It waits for the school's data privacy agreement
- Before the import is applied, the clinician sees the list of students that would be archived. A student missing from the new list is then archived automatically, without a reason (a generic archived flag is enough); a returning student is restored, not re-created
- The clinician can also archive a single record at any time
- A visit and an incident keep the grade and section the student had when they were saved, so reports by grade stay correct after the new year
- A student's record is kept **5 years from the archive date**, then deleted; the audit log is kept 10 years

**Forms.** A field shows the required mark only when saving is blocked without it; a field that can be saved empty shows no mark (ADR-051).

**Duplicate Detection**
- Auto-check for name + grade-level match on save
- Confirm or cancel when a duplicate warning appears

**Incomplete Record Handling**
- Auto-flag records missing required fields (full name, grade level, sex, emergency contact, allergies, conditions)
- View the incomplete-records review queue (feeds the expanded Dashboard, Module 9)
- Resolve/complete a flagged record
- Log which staff member resolved each flag

**Parent Contact Validation**
- Prompt staff to verify the contact number on first save
- Re-flag the record if the number is unreachable during an emergency
- Log verification with class adviser/Registrar's Office

### 2a. Staff Patients (ADR-043) — *Access: Staff (School Clinician) only*
Teachers, non-teaching staff and utility workers can be clinic patients. Built Monday, October 26, 2026.
- **Staff List** (`/staff`): name, Staff No., type, department or role; search by name or Staff No., filter by type, "Show archived". A masterlist, so names are shown.
- **Staff Profile** (`/staff/:id`): the record, the allergy alert, emergency contacts, and visit, incident and follow-up history; "Record a visit" and "Record an incident" open those forms with the person chosen. Archive, never delete.
- **Staff types** are Teacher, Non-teaching staff, Utility worker and **Other** (ADR-053). A staff visit says **"Returned to work"** where a student's says "Returned to class" (the stored value is the same).
- **Add / Edit Staff**: full name and type required; department or role (a value already in use, or Other to type a new one, at most 60 characters), contact number, emergency contacts, allergies and conditions optional. The Staff No. (`STF-0001`) is assigned by CLINIQ and never edited.
- A visit, incident, follow-up or medicine given is about a student **or** a staff member, exactly one. One patient search on New Visit, New Incident and Dispense labels each result Student or Staff.
- Not for staff: excuse letter, PE referral, Sports Report, incomplete-records queue, yearly list, Registrar import. An incident's calls go to the **emergency contact**.
- Lists with more than one person show the Staff No. (never the name) with a Student or Staff chip, and an Everyone / Students / Staff filter.
- The Admin/Principal does not see staff patients, and the Admin's Dashboard totals leave staff incidents out, matching the Admin's Incident Log (ADR-043, 053). The clinician's totals count everyone.

### 3. Clinic Visit Monitoring — *Access: Staff only*

**Daily Visit Logging**
- Add new visit entry. A visit opened without an identified student finds one by LRN or student name (results appear from the first character typed, at most 8 active students, each shown with masked LRN, full name, and grade). Incident Stage 1, PE/Sports Referral, and Dispense use the same search.
- Edit visit entry, including correcting its date and time (never in the future; audited as "Updated date and time")
- Logbook fields (Sir Rey, Sunday, October 25, 2026): "Assisted by" suggests the display names of the active accounts and still accepts free text for someone without an account; on New Visit, Parent or guardian starts as the student's primary emergency contact when the field is empty (never overwriting what was typed, editable); Time out stays a time-only input and is shown with the visit's date
- View visit detail (full name shown — a deliberately opened single record)
- View list of visits (filterable by date) — shows **masked LRN**, not full name, per the display-privacy rule, since this rolling multi-student list is the kind of screen a bystander could glance at
- Search visits by student
- **Visit date and time** (panel review part 2, Thursday, October 22, 2026): defaults to now and is editable, never in the future. A visit dated more than 30 minutes before it is saved is a **late entry** (ADR-029: records are often entered afterwards): an optional "Reason for late entry" appears, and the visit detail and the audit entry say "Entered late"
- **Entered in error**: a visit recorded by mistake is never deleted. "Entered in error" on Visit Details asks for a required reason; the visit then leaves every list, count and report (the Visit Log's "Include entered in error" shows it), its medicines go back to stock through the same "visit edited" adjustments, its excuse letter (draft or approved) is voided, its pending follow-ups are cancelled with the same reason, and it can't be edited afterwards. Audit-logged
- **Escalate to incident** (ADR-036): on Visit Details, and as a shortcut on New Visit (nothing saved). It opens Incident Stage 1 with the student, complaint, the visit's time and the temperature. A saved visit and its incident are linked both ways; the visit is kept with an "Escalated" chip, its medicines stay on the visit (shown on the incident as "Given at the visit", never copied), and the event counts once, as the incident, in visit totals, the calendar, the Dashboard and reports. An emergency-type complaint on a visit (one on the incident complaint list) shows a non-blocking "This looks like an emergency. Escalate to an incident?" hint. A Visit is a common case; an Incident is a worse case that needs fast two-stage capture. A one-line hint on both forms says so (ADR-051); the clinician's own wording is still to be confirmed

**Complaint Monitoring**
- Record complaint/symptom for the visit: free text with suggestions (the predefined complaint types plus complaints already recorded, most used first). "Other (type your own)" is always the first option; it clears and focuses the free-text field and is never stored as a complaint. Text matching a suggestion is stored in that suggestion's spelling, so counts don't split by capitalization. The first-aid checklist appears when the complaint matches a predefined type. Editing a visit uses the same field and the same normalization
- A visit has one required **main complaint** and can carry up to **3 extra complaint tags**. Reports and the Dashboard count the main complaint only, so one visit is counted once (ADR-053)
- View a student's complaint history

**Treatment Recording** *(two parts — ADR-018, Wednesday, October 07, 2026 — 10:43 PHT)*
- **Treatment notes** (free text): care that isn't stock — rest, cold compress, wound cleaning, advice
- **Medicines & supplies given** (repeatable lines): a searchable inventory picker (grouped medicines/supplies, showing current stock and unit), a whole-number quantity (minimum 1), the item's unit, optional instructions (max 120 characters, e.g. "1 tablet every 6 hours"). Picking an item already listed adds to its line. The student's recorded allergies show beside the picker for awareness only (no automatic matching)
- Treatment notes and medicines/supplies are both optional: a visit can be saved with neither. The form shows a quiet note ("No treatment recorded. You can still save.") and the visit detail shows "No treatment recorded" (amends ADR-018)
- Saving dispenses every line from inventory in the same atomic save (one dispense transaction per line, linked to the student and visit); expired items can't be given, nearing-expiry items warn, quantities above stock warn but are allowed
- Edit treatment record: changing a saved visit's lines writes stock adjustments linked to the visit (reason "visit edited") — a removed or lowered line returns stock, an added or raised one takes more; past transactions are never rewritten
- Medicines given show on the visit detail and in the student's visit history, e.g. "Paracetamol 500mg × 2 tablets (1 tablet every 6 hours)"
- When Treatment notes name a stocked item (whole word, without its strength, names under 4 letters ignored), a non-blocking hint offers to add it under Medicines & supplies given so stock stays correct (panel review VS-4)
- Visits are never deleted. A mistaken visit is marked "Entered in error" (above), which returns its stock and voids its letter; there is no "remove all lines" path

**Excuse Letter Issuance**
- Generate an excuse letter from a visit record
- Route for nurse check and approval
- Once approved, store it in the student's record as a permanent, printable document
- Print excuse letter
- The letter's wording names the dates it excuses ("is excused from <from> to <until>", or "on <date>" for one day) and follows the excused period until Staff edit the text; it stays non-diagnostic ("Not a medical certificate", "for school attendance documentation only"). The printout has a signature line ("Signature over printed name") under the clinician's name and no internal storage wording; the on-screen "Storage status" box is hidden when printing (panel review part 3, Thursday, October 22, 2026)
- Quick "Excused until" buttons beside the dates: **Today only**, **+1 day**, **+2 days** (counted from "Excused from"; nothing pre-selected; dates stay editable)
- **Save and approve now** (ADR-049): the clinician can save and approve a letter in one step. A warning, never a block, shows when the excused period is longer than 3 days (the number is a setting). The final approved wording is stored with the approval, and a visit later edited to "Returned to class" gets an "outcome changed since approval" label. The letter keeps one basic format (student, dates, reason, clinic signature); a faint school logo goes with the boxed DRAFT warning on screen
- An optional **"Stay home until cleared"** note that the clinician sets can go on a follow-up or a letter; there is no fixed list of conditions (ADR-049)
- **Issue a replacement** (approved letter of a still-valid visit, e.g. the fever lasted longer): asks for a reason, marks the old letter **Superseded** (kept, never valid again) and opens a new draft with the same period and note. A letter whose visit was entered in error shows **Voided**, can't be approved, and prints marked VOID. Every letter, including superseded and voided ones, stays in the student's record. A superseded or voided letter opens on its own from the student's record ("View letter"): read-only, marked Superseded or Voided with the reason, with a link to the current letter, and its printout is stamped SUPERSEDED or VOID (decided Friday, October 23, 2026)
- Excused periods ("Excused from" / "Excused until") are recorded so teachers and the registrar can cross-check attendance, and there is no attendance integration.
- On the visit form (new or edit), fields follow the disposition: none for Returned to class; for Sent home, an "Excuse letter" section ("Prepare an excuse letter", on by default; Excused from, default today; Excused until, required while ticked; optional note for the teacher); for Referred to hospital, the same section plus an optional "Referred to (hospital or clinic)". Fields clear when the disposition changes and are validated only while shown. Saving stores these as a draft with the visit, not an approved letter; "Review excuse letter" opens the letter prefilled, and approval moves the period and note onto the letter and clears the draft. Once a letter is approved, editing the visit (even to another disposition) never changes or removes it, and the form says so
- Drafts awaiting approval are findable without remembering the visit: the Student Profile's Staff-only Excuse Letters card lists them with a "Pending approval" badge and a "Review letter" link, and the Dashboard's Staff-only "Pending excuse letters" card opens the Visit Log filtered to visits whose letter awaits approval (ADR-011 amendment)
- Visit detail (Staff only) shows an "Excuse letter" section: Not prepared, Pending approval, or Approved, with the excused period, the teacher note, and a link to the letter; and "Referred to" when recorded
- **Out of scope:** medical certificates are hospital-issued documents, not generated by CLINIQ — the excuse letter is a distinct, clinic-issued document and the system should never conflate the two

**Visit form details (ADR-049)**
- "Show more fields" opens by itself for fever, headache or chills
- For Sent home and Referred to hospital, optional fields record who collected the child, the relationship and the time
- The outcome keeps its default, "Returned to class" ("Returned to work" for staff). No first-visit prompt; the first-aid checklist stays as it is, owned and signed off by the clinician
- Optional vitals ranges: a reading outside the most common normal range for the student's age group (picked from the grade level, since records have no birth date) shows a warning and never blocks. The ranges are starting values marked "to confirm" with the nurse; the fever flag stays at 37.0 °C (ADR-051)

**PE/Sports Injury Referral Logging**
- Log a referral submitted by a PE instructor (the referral wording is editable starting text, marked "to confirm" on screen, ADR-053)
- Record clinical assessment
- Record disposition (returned to class / resting in clinic / sent home / referred to hospital). **Resting in clinic** (panel review VS-1) is a student kept for observation; today's resting visits with no Time out are "in the clinic now" and show as a Dashboard chip that opens the filtered Visit Log. Only Sent home and Referred get an excuse letter. The default stays Returned to class (open `DECIDE`)
- Escalate to Emergency Response if hospital referral is needed

**Follow-Up Handling** — for cases where a student is told to return for monitoring or reassessment (e.g., "return tomorrow for monitoring"). Can originate from a visit here or from an incident in Emergency Response.
- Prompted inline at the end of Record Visit or Log Emergency — "Does this student need a follow-up?" — rather than a separate step Staff has to remember to do afterward
- Record: student, related visit/incident record, follow-up date, reason/monitoring instruction, notes
- Status lifecycle: Pending → Completed / Missed / Cancelled. A follow-up is overdue 3 days after its date and is closed automatically as Missed with a "No response" note after 7 days (ADR-051)
- View list of all follow-ups (filterable by status)
- View due/upcoming follow-ups — surfaced on the Clinic Overview Dashboard (Module 9), computed fresh each time the page loads by comparing today's date to the follow-up date, not a background or push-based alert (the system has no external SMS/push service — see Module 9 and the Out of Scope notes)
- Mark a follow-up Completed, Missed, or Cancelled
- Missed and Cancelled ask for a confirmation **and a required reason**, kept on the follow-up and shown in the list; afterwards "Set a new date" offers to create a new pending follow-up for the same student, record and reason (panel review FU-4). Audit-logged

### 4. Emergency Response — *Access: Staff; Admin/Principal reads the Incident Log and Incident Report and can Acknowledge a completed report (ADR-038, 048), audit-logged once per report per session*

**Incident Recording — two-stage flow**
- **Stage 1 (fast capture):** open a prefilled emergency form (student picked on the form), complete only the essential field (the complaint) plus whichever readings the case needs (temperature, pulse, blood pressure, oximeter; none is required, "don't force all 4 if not relevant to the case"), and save immediately — speed matters more than completeness in the first moment. An optional Additional notes field is offered but never required; when filled, the notes show in Stage 2's Stage 1 summary and on the Incident Report. Once the student is picked, a read-only card shows the student's allergies, medical conditions and emergency contacts (an empty list reads “None recorded”, never “No allergies”); it adds no input
- **Complaint:** chosen from the incident complaint types, or "Other (type your own)" to type one (at most 60 characters; Zean, Monday, October 26, 2026).
- **Stage 2 (complete later):** return to the same incident record to fill in remaining details (any further readings, still all optional, and referral specifics) once the immediate situation is handled. Treatment notes and medicines/supplies given are both optional; when neither is recorded, views show “No treatment recorded.” An optional **Body part affected** (free text with suggestions) is recorded at Stage 2 and printed on the report when filled. The record can be **completed and approved** only when it has at least one of treatment notes, a medicine line, a parent notification attempt or a hospital referral; otherwise the nurse ticks “Nothing further was needed or done” and writes a one-line reason, printed on the report as “No treatment or notification: <reason>”. No reading is ever required (panel review part 1, Thursday, October 22, 2026)
- Edit incident entry. Additional notes can be corrected until the incident is approved; medicines cannot be edited after Stage 2 (ADR-049)
- Readings outside the common range for the student's age group show a warning and never block (ADR-051)
- View incident detail (full name shown — a deliberately opened single record)
- View list of incidents, including which are still in Stage 1 (incomplete) vs fully completed — shows **masked LRN**, not full name, per the display-privacy rule

**Hospital Referral Monitoring**
- Add hospital referral (destination, transport mode, departure time)
- Edit referral details
- Track referral status

**Parent/Guardian Notification**
- Log a notification attempt
- Record outcome (Reached / No answer / Left message or voicemail / Wrong number) and **who was called**: one of the student's emergency contacts, or “Other” with a typed name and number
- Timestamp every attempt, tied to the incident record
- Flag for re-verification if the contact is unreachable
- View full notification history for an incident

**Not part of an incident (ADR-049, 053):** no head-injury watch list, no "parents unreachable" or "released to" fields, no emergency-medicine fields, no severity levels, and no safety rule engine for doses, ages, weights or repeat intervals — the clinician decides and the system records and keeps a trail.

**Follow-Up Handling** — same feature as Clinic Visit Monitoring's Follow-Up Handling (Module 3); an incident can originate a follow-up the same way a routine visit can (prompted inline at the end of Log Emergency)

### 5. Reports Generation — *Access: Staff (generates) + Admin/Principal (views, read-only)*

**Monthly Reports**
- Generate monthly report — *Staff*
- View monthly report — *Staff, Admin/Principal*
- Print/export monthly report as PDF — *Staff* (the Admin/Principal reads it on screen; ADR-038)
- The report has a **weekly breakdown** like the clinic's paper report, and exact counts with no masking of small groups; Sex counts are included (ADR-050, 051). There is no "Finalize month": reports are computed live (ADR-050)
- A separate **monthly inventory print** lists, per item, New Purchase, Total Available and Ending Inventory (ADR-050)
- Complaints are grouped by a clean list: trimmed, case-insensitive and matched to the suggestion list, with no merge screen (ADR-050)

**Incident Reports**
- Generate incident report from an incident record — *Staff*
- Route for nurse review and sign-off — *Staff*. Only a completed (Stage 2) record can be approved
- Print incident report — *Staff* (ADR-038)
- **Acknowledge** a completed incident report — *Admin/Principal*: records who and when, shows on the report and is audit-logged; the printed signature line stays (ADR-048)
- The month's **Incident register** (renamed from "Incident Report Archive", panel review RP-4: it holds unfinished incidents, so it isn't an archive) lists every incident of the month by masked LRN; for Staff each row opens its report, or "Complete Stage 2" for a Stage 1 record; for the Admin/Principal every row opens the report read-only (ADR-038)

**Complaint summary** (renamed from "Health Summaries", panel review RP-7: it holds complaint counts only)
- Generate aggregated complaint summary — *Staff*
- View complaint summary — *Staff, Admin/Principal*
- Export complaint summary — *Staff* (ADR-038)

**Sports Reports (ADR-034)** — *Staff only; the Admin/Principal cannot open them*
- Build a saved, reusable list of students for a PE or sports activity: title, activity, requested by (the instructor's name), look-back window (30, 60 or 90 days or the school year; default 90), "Include recorded conditions and allergies" (off by default) — *Staff*
- Add students by name or LRN search or a whole grade level at once, with an optional note per student; shown by full name and grade level, a decided exception to the display-privacy rule — *Staff*
- Edit, duplicate and archive a saved report — *Staff*
- The clinician chooses which entries to include (ADR-051). Archived students stay on the saved list but are left out of the printout with a count; the school year starts June 15; an incident outcome reads "Referred to hospital" or "No hospital referral recorded" (ADR-050)
- Print the report (A4): each student's visits and incidents in the window (date, what happened, outcome), the note, and conditions only if ticked; never notes, vitals, medicines, contacts or the LRN; signature lines for the clinician and the receiving instructor; every print audited — *Staff*

---

## Team-Proposed Enhancements

### 6. (Removed) — the QR Digital Health ID module was removed from the app (ADR-027)
Staff identify a student through Students search or each form's student picker. Module numbers 7–11 are kept unchanged so existing references stay valid.

### 7. First-aid Checklist Quick-Reference — *Access: Staff only*

**Complaint-Based Checklist Prompts**
- Select a complaint type during visit entry
- Display the matching standardized first-aid checklist
- Check off checklist items during the visit
- Save checklist completion with the visit record
- Add/edit checklist content per complaint type (Head Nurse only, as a clinical-protocol decision)

### 8. Medicine & Supply Inventory Tracker — *Access: Staff only*

**Stock Flow — how a number actually moves (previously undocumented, added here):**
1. Every item has a **low-stock threshold** and is held in **received batches**, each with a quantity, an expiration date and a received date (ADR-030, which replaced the earlier one-expiration-date-per-item design). The **usable** (not expired) stock, the **expired** stock and the **total on hand** are worked out from the batches, and low stock uses usable stock only. A stock count exactly at the threshold counts as low (ADR-051).
2. **Dispensing (stock decreases):** happens either directly from the Inventory List, or — more commonly — as the "Dispense Medicine" quick-action linked to a visit or incident (see Modules 3 and 4). Staff selects the item and quantity; the system takes the quantity from the **earliest-expiring usable batch first**, records which batches it came from, and logs the dispensation (item, quantity, linked visit/incident if any, staff, timestamp). If dispensing would take stock below zero, the system **warns but does not block the save** — a software constraint should never get in the way of actually recording that care was given.
3. **Threshold check (automatic):** immediately after any decrement, the system checks the new stock level against that item's low-stock threshold. Crossing it auto-flags the item — this flag is what surfaces on the Staff Dashboard, the Inventory List itself, and the Clinic Overview Dashboard (Module 9).
4. **Restocking (stock increases):** a separate, manually-initiated action — Staff enters the quantity received and the **new batch's** expiration date, or explicitly confirms that the batch has no manufacturer expiration date. The system adds a batch (earlier batches are never overwritten) and logs the restock event (item, quantity, expiration choice, staff). This also clears a low-stock flag if the usable total is back above threshold.
5. **Expiration check (automatic):** runs independently of stock level — an item can be well-stocked and still flagged as nearing expiration (the warning window starts at 30 days, a setting, ADR-051). Expired units stay visible until Staff records a disposal against that batch. Both flags (low-stock, nearing-expiration) can be active on the same item at once and are shown as distinct badges, not merged into one generic "attention needed" indicator.

**Inventory Item Management**
- Add inventory item
- Optional "Generic or branded" tag on an item (Generic, Branded, or Not specified, the default), shown on the item form, the item's Batches details and the Dispense picker, not as a list column (Sir Rey, Sunday, October 25, 2026)
- An expiration date can't be in the past, on Add Item or Restock; today is allowed (Zean, Sunday, October 25, 2026 — 23:55 PHT).
- On Add Item the first batch follows Restock's rule (ADR-035, panel review IV-2): an expiration date, or an explicit "This item has no expiration date" confirmation; a blank date alone can't be saved (also enforced in the data layer). A non-blocking warning appears when the name and unit match an existing item (case, spacing and a trailing "s" ignored: "Paracetamol 500mg tablet already exists. Restock it instead?", with a link); the unit is free text with suggestions from the units already used (panel review IV-3)
- An item can carry an optional **"avoid if allergic to"** tag. When a student's recorded allergies match, a warning shows beside the allergies; there is no medicine-to-allergen map, and the system warns and never blocks (ADR-049, ADR-018)
- Edit inventory item
- Delete/archive inventory item
- View inventory list
- Search/filter inventory (by name, category, stock level)
- View item detail

**Stock Operations** *(stock-integrity rules: ADR-018, Wednesday, October 07, 2026 — 10:43 PHT)*
- Dispense/log usage (decrements stock). From a visit or an incident's Stage 2, dispensing happens through that record's "Medicines & supplies given" lines. The standalone Dispense page is for non-visit use: it must name a student or choose "Not for a student (general use)", and if the student already has a visit today it links to that visit so the medicine is added there instead
- Inventory is held in received batches (quantity, expiration date, received date). The list derives usable non-expired stock, expired stock, and total on hand; low stock uses usable stock only. Expired quantities remain visible until explicitly disposed, and the list filters to items with expired stock.
- Expired batches can't be dispensed (rejected by the data layer, not just the UI); items with no expiration date are always dispensable. Dispensing uses the earliest-expiry usable batch first and records the allocation so visit edits return stock to its original batch.
- Restock/add stock (row action: quantity received + the **new batch's** required expiration date, or an explicit **no expiration date** confirmation; adds a batch; logs the restock). It never overwrites earlier batches; the dialog warns when expired stock remains. Edit Item no longer edits stock or expiry.
- **Adjust Stock** (Staff, under the row's **Manage** menu with Batches and Edit; Restock stays the one visible row action, with the help line "Restock when new stock arrives. Adjust Stock to correct a count.", panel review IV-1): choose a batch, then **Add** or **Remove** a positive quantity (no typed minus sign; the batch's resulting stock shows before saving, panel review IV-7) or "set to counted quantity", with a required reason (Expired - disposed / Damaged or spilled / Miscount correction / Other with a required note). The selected batch cannot go below 0. Writes an adjustment transaction and audit entry; a disposal remains in batch movement history.
- View inventory usage history/log — not built yet; when built, it shows the masked LRN, never the name

**Alerts & Thresholds**
- Set/edit the low-stock threshold per item
- Auto-flag items below the low-stock threshold
- Track the expiration date of each batch
- Auto-flag items nearing expiration
- The monthly inventory print (Module 5) reads from the same stock records (ADR-050)

### 9. Clinic Overview Dashboard *(expanded from "Health Trends Dashboard")* — *Access: Staff + Admin/Principal (view-only, except that Staff and the Admin maintain calendar events; ADR-019, ADR-042)*
Broadened from complaint trends alone into an overall operational snapshot, per the September 19 meeting. The Dashboard has two views, Overview and Trends; the calendar is its own screen, the **Activity calendar** (ADR-025, 032, 050). Counts are exact, with no masking of small groups (ADR-050).

- View total clinic counts (visits, incidents, active students)
- View pending/incomplete records (pulled from the Student Records review queue, Module 2)
- *Staff only:* the "Pending excuse letters" stat card opens the Visit Log filtered to visits whose letter awaits approval, each with a "Review Letter" link (ADR-011 amendment, October 19, 2026; the separate Overview list was removed). Navigation only, so the dashboard stays view-only (ADR-011)
- View common-complaint aggregation by week/month
- View aggregate-only Sex and grade-level Trend counts, in one card with a Sex / Grade level switch (Sir Rey, Sunday, October 25, 2026). The Trends view uses at most four hues: brand green, a neutral, the warning color, and the female/male pair. Selecting either dimension filters only the Trend charts and complaint/weekday statistics; no student name appears and the Overview totals stay unfiltered. A production minimum-group-size rule remains open.
- **Possible-cluster alert** (clinician only): 3 or more students with the same complaint and the same grade within 3 days (the numbers are settings); students only; nothing is sent to the Principal (ADR-050)
- Every total says what it counts (panel review DB-8): the Clinic visits figure is visits only, the sex and grade-level charts and the calendar count visits and incidents, and a visit escalated to an incident counts once, as the incident (ADR-036). A stat card's change against the prior period shows both counts ("4 vs 1 in the prior 22 days") when the prior count is under `config.percentMinPriorCount` (5), and a percentage from there up (DB-2). The number on the Overview tab counts urgent items only: expired stock, overdue follow-ups and incidents awaiting Stage 2 (DB-4); low stock, expiring soon, incomplete records and frequent visitors keep their own chips
- View frequent-visitor flags (the Overview lists the five students with the most visits, with "Show all" for the rest; the count badge shows the total; the config switch `showFrequentVisitors` can hide it; Zean, Sunday, October 25, 2026; starting value 3 or more visits in 14 days, for the nurse to confirm, ADR-051), shown by **masked LRN** per the display-privacy rule, not full name — **a warning only**, never a diagnosis or suggested action; it exists to help the nurse decide what to do next, not to decide for her
- **Due/upcoming follow-ups** (Module 3/4's Follow-Up Handling) — this is the system's internal reminder mechanism, since there's no external SMS/push service; computed fresh on page load by comparing today's date to each follow-up's date, not a background alert
- **Activity calendar** (renamed from "Calendar"; nothing else added, ADR-050): visit and incident counts, toggleable weekly / monthly / yearly, for spotting patterns at a glance (e.g., a calendar-style heatmap of how many visits happened each day). It also surfaces any free-text event tag Staff applied when logging a visit or incident (e.g., "MCA Dance Program") on the relevant day, so clinic activity can be read in context
- **School events, maintained by Staff and the Admin** (ADR-019, ADR-042): Staff and the Admin click any calendar day (past, today, or future) to open that day's panel: its visit and incident counts (past and today only), its events with edit and delete, Add event, and, for Staff only, a "View visits" link to the Visit Log filtered to that day. An event has a title (up to 60 characters), a start date, and an optional end date for multi-day events. Each event shows as a yellow chip on every day it covers (up to 2 chips per day, then "+N more"); a visit/incident tag with the same text on the same day shows once. Create, edit, and delete are audit-logged. Admin/Principal sees the same chips but can't open or change anything
- **National holidays, read-only** (ADR-020): nationwide Philippine holidays (regular, special non-working, special working, Islamic) appear as gray "Holiday: <name>" chips in the Month, Week, Year, and Table views, including future days; long names truncate with the full name in a tooltip, and an unconfirmed date shows "(estimated)". A no-class holiday (anything but a special working day) with zero visits gets faint stripes, so it reads as "no class", not "no illness". Staff's day panel lists the date's holidays with no edit or delete controls. A line under the calendar shows "Holidays updated <date> · Source <name>" to Staff and Admin, with a warning if no holidays are loaded for the current year. Holidays come from a source through the data layer (a bundled 2026 list for now); no role edits them. Local town/province days and class suspensions are entered by Staff as events. Automatic yearly updating is a backend task (Phase B9); the source is still open
- Filter any of the above by custom date range
- **Print the open tab** (Staff only; the Admin/Principal does not print, ADR-038): Overview prints the Clinic Overview Report (the stat cards, chip counts, a written summary and the lists behind them); Trends prints the Clinic Trends Report (the sex and grade-level tables, complaints and visit activity). Every printout is an A4 document with the page number as its only footer, and the Clinic Overview Report prints full LRNs with no names (ADR-026, 044, 045, 046)
- The Admin's totals leave staff-patient incidents out (ADR-053)

### 10. Backup Verification Assistant — *Access: Staff and Admin/Principal (ADR-037; the same abilities for both)*
- View backup status (last backup date, file size, status)
- Trigger a manual backup-status check
- View the guided recovery checklist
- Mark a backup as verified (nurse confirmation)
- **Back up now** (panel review part 6): starts a backup from the Backup page, either role. In the frontend phase it records a successful run in the mock data; the real copy to the external drive is backend-phase work. Audit-logged
- **Stale-backup alert** for both roles: a Dashboard chip "Last backup was more than 48 hours ago" (`config.staleBackupHours`), "The latest backup failed" or "No successful backup yet", linking to Backup; it also counts in the Overview tab's urgent number
- View backup history/log
- **Backup locations** (ADR-052): the clinician adds, edits and disables the internal and external backup locations on the Backup screen (a label, a path, a status of found / not found / not writable, the last backup time and result, and an enabled switch). A location is never deleted, only disabled, and the screen warns when none is enabled. Every change is audit-logged
- A backup runs to **every enabled location** and shows each result; "Back up now", the nightly backup and the backup at sign-out use the same list
- The system **creates the folders itself**: `<location>\.cliniq\` with a marker file `cliniq.json`, `backups\YYYY\MM\cliniq-YYYY-MM-DD_HHmm.zip` and `logs\backup-YYYY-MM.log`. Each zip holds the database dump, uploaded files and a manifest with a checksum; the oldest backups beyond the latest 60 per location are removed (a setting)
- **Decided (ADR-039, 052):** backups stay local on the clinic computer's internal drive and an external drive. There is no cloud copy (off-site health data needs the parents' consent and a provider agreement, and the school has no IT staff), and a second copy held by the Principal was suggested and withdrawn. Whether an extra layer is ever needed remains an open question

---

### 11. Audit Log Viewer — *Access: Staff (view); Admin/Principal (view)*

A dedicated screen to review the Audit Trail (below), not just write to it — added by `ADR-016` after the write side existed with no way to actually read it back.

- View the audit log, filtered by date range, user, action type (login/logout/submit/approve/create/update/delete/archive/print/viewed by the Admin), and target/module type — *Staff, Admin/Principal*
- Each entry: timestamp, who, action type, and the target record (masked LRN, not name, when the target is a student — per the display-privacy rule) — *Staff, Admin/Principal*
- Export/print a filtered view, for handing to a DPO or during a compliance review — *Staff* (ADR-038). The printout states the filters in words and lists every matching entry (ADR-026)
- The audit log is kept **10 years** (ADR-037, 051; not yet confirmed by the school or its privacy officer)
- Operational lists (Visit Log, Incident Log, Audit Log) offer 10 or 20 rows per page; the choice lasts for the browser session (Sir Rey, Sunday, October 25, 2026)
- **No role can edit or delete an entry.** The log is read-only by design; that's what makes it a log.

---

## Audit Trail (Cross-Cutting — Expanded Per September 19 Meeting)
Applies to every module above. Every one of the following gets logged with **who** performed it and **when**:
- Login and logout (Module 1)
- Every form submission (new visit, new incident, inventory dispense/restock, etc.)
- Every approval (excuse letter sign-off, incident report sign-off)
- Every create/update/delete/archive action on a record
- Opening a student or staff profile or an incident report, by the clinician or the Admin/Principal, once per record per sign-in session (ADR-038, 048); lists and searches are not logged
- Every Print / Save as PDF of a page containing student or clinic health information: one entry with the signed-in user, real time, and document title; log from shared `beforeprint` handling so buttons and Ctrl+P are covered.
This satisfies RA 10173 (Data Privacy Act) alignment and is the mechanism that makes every access accountable — each action is attributable to a signed-in account and timestamped. **Module 11, Audit Log Viewer, is the read side of this same requirement** — see `ADR-016`.

---

## Access Summary at a Glance (Current Scope)

| Module | Staff | Admin/Principal |
|---|---|---|
| 1. User Management | Login + own password only | Full (accounts, ADR-033) |
| 2. Student Records | Full | Read Student List and Profile (ADR-038) |
| 2a. Staff Patients (ADR-043) | Full | — (no Staff screens; staff incidents left out of the Incident Log) |
| 3. Clinic Visit Monitoring | Full | — |
| 4. Emergency Response | Full | Read Incident Log and Report, and Acknowledge (ADR-038, 048) |
| 5. Reports Generation | Full | View only, no printing (ADR-038) |
| 7. First-aid Checklist Quick-Reference | Full | — |
| 8. Medicine & Supply Inventory Tracker | Full | — |
| 9. Clinic Overview Dashboard | View | View |
| 10. Backup Verification Assistant | Full | Full (ADR-037) |
| 11. Audit Log Viewer | View | View |

PE/Sports Instructors have no account (ADR-029).

---

## Recommendations for Future Consideration (Not Costed Into Current Scope)

These came out of the September 19 meeting as good ideas worth flagging, but they are **recommendations**, not committed deliverables for this phase — no budget or timeline currently accounts for them.

- **UPS (Uninterruptible Power Supply).** Power loss, not just data loss, was identified as the main operational risk — it can take down the router/server, not just interrupt a save. Recommended for the client to source (or for the team to price into a future budget revision) so a brief outage doesn't take the whole system offline.
- **An additional backup layer beyond local + external drive.** Not planned: ADR-039 keeps backups on the clinic computer and its external drive with no cloud copy. The question of whether an extra layer is ever needed stays open.

---

## Open Questions (Pending Client Input)

- **Who manages the clinic system when the School Head Nurse is absent?** Currently no role has elevated access beyond Staff, and there is exactly one Staff account holder in the client's own org chart. This is pending a reply from Ms. Jennesse Baas — no system design decision should be made here until the client responds.

---

## Future Development — Deferred Items (Documented, Not Built This Phase)

### Future Role: Canteen Staff Access
A second external role, **Canteen Staff**, was also designed but remains deferred to a later phase.
- **What it would do:** Let canteen staff enter a student's LRN to check food allergies/restrictions before serving food — a digital version of the "Canteen health restriction enforcement" service already named in the Technical Documentation, which today is handled manually by the clinic head.
- **Access model:** A scoped sign-in with its own narrow role.
- **Data scope:** Food allergies/restrictions only. No conditions, no emergency contact, no visit history.
- **Auditability:** Same per-view logging pattern as everything else in this document.
- **Why still deferred:** It stays a documented future addition. Note that a local-only deployment cannot reach canteen staff either (ADR-029).

### Considered and deliberately not added (ADR-049, 053)
Immunization tracking, a clinic pass, a queue, Excel export and SMS were suggested during planning and are deferred. There is no head-injury watch list, no incident severity levels, no safety rule engine, and no first-visit prompt. PE/Sports Instructor accounts and QR stickers were removed (ADR-027, 029).

### Future Decision: Full School-Events Calendar — *resolved Wednesday, October 07, 2026 (ADR-019)*
**Resolved:** Staff maintain school events from the calendar's day panel; since ADR-042 (Sunday, October 25, 2026 — 23:55 PHT) the Admin/Principal can too (see Module 9). National holidays are shown read-only (ADR-020). The original note is kept below for history.

The Dashboard's calendar (Module 9) currently supports only a lightweight, free-text event tag on visits/incidents — deliberately kept minimal for this phase. A fuller calendar, where school events (academic, sports, performances, assemblies, field trips) are their own managed entries plotted alongside clinic activity, was discussed but the two real open questions were left for a future decision rather than guessed at:
- **Who maintains the events** — Staff manually (adds data-entry work to the one role this whole project is trying to reduce workload for), or Admin/Principal (would require giving that role its first write permission, since it's 100% read-only today)?
- **What the management screens look like** — a full add/edit/delete events interface, versus importing from an existing school calendar source, if one exists digitally.
Nothing about the current lightweight tagging needs to change to support this later — it's an additive upgrade, not a redesign.
