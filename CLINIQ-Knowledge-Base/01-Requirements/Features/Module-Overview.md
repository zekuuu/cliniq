# Module Overview — Full Detail

This is the complete module/submodule breakdown, kept in sync with the canonical **Modules & Features** document (`09-References/Canonical-Documents/CLINIQ_Modules_and_Features.md`). If you edit one, edit both — see AGENTS.md's Source of Truth rule at the repo root.

---


Ten modules total: five baseline (from the Software Engineering I Technical Documentation) and five team-proposed enhancements (added during Software Engineering II planning). Every module is broken down to individual operations, each tagged with who can access it. Updated after the September 19, 2026 team meeting to bring PE/Sports Instructor access back into current scope, expand the dashboard, add a two-stage emergency flow, and add a screen-context display rule for student names.

**Roles in the system (current scope):**
- **Staff** — School Head Nurse / clinic assistants. Full read/write access.
- **Admin/Principal** — School Administration. Read-only access to reports and health summaries, and read-only access to the Student List, Student Profile, Incident Log and Incident Report (ADR-038), plus account management (ADR-033): creates, edits, disables and resets accounts. The Admin/Principal never prints or saves as PDF (ADR-038); the clinician prints.
- **PE/Sports Instructor** — No account and no access (ADR-029). An instructor asks the clinician, who decides what to share.

**Role documented for future development (not built this phase):** Canteen Staff — see "Future Development" at the end of this document.

**Display-privacy rule (applies across the whole system):** the actual privacy risk isn't a single deliberate lookup — it's a **desktop screen showing a list or pattern across multiple students at once** (a visit log, an incident log, or a "frequent visitor" flag) being glanced at by a passerby, who can then attach a specific named student to a health pattern ("he visits a lot, what's going on?"). So: the **Visit Log List, Incident Log List, and the Dashboard's frequent-visitor section default to the masked LRN**, not full name, since these are rolling, multi-student, glanceable-by-bystanders screens. A **single deliberate lookup of one specific student — the full profile page, search results, and the masterlist/directory — shows the full name normally**, since at that point someone has already identified and is looking at one particular student for a legitimate reason. The masterlist shows names freely (it's just a roster of who's enrolled) but should not show medical/confidential fields inline — allergies, conditions, or visit reasons still require opening the individual profile.

---

## Baseline Modules

### 1. User Management — *Access: Admin/Principal (manages every account, ADR-033)*
**Login Authentication** *(Staff, Admin/Principal — everyone with an account)*
- **Admin idle sign-out (ADR-048, built Friday, October 30, 2026 — 00:17 PHT):** the Admin/Principal is signed out after `config.adminIdleMinutes` (30) without pointer, key or scroll activity; a "Still there?" notice appears a minute before, and Login then says "You were signed out after 30 minutes of inactivity." The clinician has no idle timeout (ADR-015).
- Log in (username/password)
- Log out
- Session lasts 1 week, until the login token expires — there is no idle timeout. One session lifetime applies to every role (Staff, Admin/Principal)
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
- The student's own contact number is optional for every grade (Zean, October 26, 2026; it was optional only for Kinder under panel review ST-3, D8); the emergency contacts stay required for every grade, and no record is "incomplete" for lacking it
- View student profile/detail — *Staff*. When allergies or medical conditions are recorded, a compact banner at the top of the profile lists them; otherwise nothing extra shows (panel review ST-9)
- View list of all students (masterlist, shown with full names) — *Staff*
- Search/filter students (name, grade level, status, or LRN) — *Staff*
- Archive/deactivate a student record (e.g., transferred or graduated) — *Staff*. Archived records are **not deleted** — they stay in the system for historical/audit continuity but are filtered out of default active-student lists, search results, and dropdowns unless a Staff member explicitly chooses to include archived records

**Medical History Recording**
- Add/update medical history entry (allergies, past illnesses, family history) — *Staff*
- View medical history — *Staff*

**Allergy/Food Restriction Monitoring**
- Add/edit an allergy or food-restriction entry — *Staff*
- View/flag students with restrictions — *Staff*
- **ADR-051 (built Friday, October 30, 2026 — 00:02 PHT):** allergies and medical conditions stay one free-text field each and are optional on the student and staff forms. The suggestion reads **None recorded**; an empty field shows "None recorded" in plain text on the forms, profiles, alert card, pickers and printouts, with no warning style. Typed "None" or "None recorded" is stored as no entry. The incomplete-records rule is unchanged (it never read these fields).
- An inventory item can carry optional **"avoid if allergic to"** words (ADR-049). At the visit, incident and Dispense medicine pickers, a word that the patient's allergy entries mention (any case) shows "Avoid if allergic to penicillin: this patient lists penicillin." beside the allergies; it never blocks (ADR-018).

**Contact Information Management**
- Add/edit one or more emergency contacts — *Staff*. At least one is required; the ordered list has no fixed maximum, its first contact is primary, and Staff can move another contact to the top.
- View all emergency contacts, primary first, with each contact's verification state — *Staff*
- Mark each contact number as verified/unverified — *Staff*
- A student has **no number of their own** on the record (ADR-054): families are reached through the emergency contacts. Staff records keep theirs.
- **Birthdate (optional)** (ADR-054): a real date, never in the future. The form shows a soft note when the age is more than `config.unusualAgeYears` (3, to confirm) from the usual age for the grade (Kinder 5, Grade n is n + 5), and still saves. The age is calculated, never stored; the Student Profile header shows it. The date shows only in the profile details, the Add/Edit Student form and the profile printout, never on a list, picker, Dashboard, report or other printout.

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
- **Add / Edit Staff**: full name and type required; department or role (a value already in use, or Other to type a new one, at most 60 characters), contact number, emergency contacts, allergies and conditions optional. The Staff No. (`STF-0001`) is assigned by CLINIQ and never edited.
- A visit, incident, follow-up or medicine given is about a student **or** a staff member, exactly one. One patient search on New Visit, New Incident and Dispense labels each result Student or Staff.
- Not for staff: excuse letter, PE referral, Sports Report, incomplete-records queue, yearly list, Registrar import. An incident's calls go to the **emergency contact**.
- Lists with more than one person show the Staff No. (never the name) with a Student or Staff chip, and an Everyone / Students / Staff filter.

### 3. Clinic Visit Monitoring — *Access: Staff only*

**Grade at the time (ADR-047, built Friday, October 30, 2026 — 00:02 PHT):** a student's visit and incident store the grade level the student had when it was saved; the Visit and Incident Logs, the Student Profile history and the Dashboard trends by grade read it, so promotion never moves old records. Student records have no section, so none is kept; staff records have no grade. Records from before the field existed take the student's current grade, once.

**Daily Visit Logging**
- Add new visit entry. A visit opened without an identified student finds one by LRN or student name (results appear from the first character typed, at most 8 active students, each shown with masked LRN, full name, and grade). Incident Stage 1, PE/Sports Referral, and Dispense use the same search.
- Edit visit entry, including correcting its date and time (never in the future; audited as "Updated date and time")
- Logbook fields (Sir Rey, Sunday, October 25, 2026): "Assisted by" suggests the display names of the active accounts and still accepts free text for someone without an account; on New Visit, Parent or guardian starts as the student's primary emergency contact when the field is empty (never overwriting what was typed, editable); Time out stays a time-only input and is shown with the visit's date
- View visit detail (full name shown — a deliberately opened single record)
- View list of visits (filterable by date) — shows **masked LRN**, not full name, per the display-privacy rule, since this rolling multi-student list is the kind of screen a bystander could glance at
- Search visits by student
- **Visit date and time** (panel review part 2, Thursday, October 22, 2026): defaults to now and is editable, never in the future. A visit dated more than 30 minutes before it is saved is a **late entry** (ADR-029: records are often entered afterwards): an optional "Reason for late entry" appears, and the visit detail and the audit entry say "Entered late"
- **Entered in error**: a visit recorded by mistake is never deleted. "Entered in error" on Visit Details asks for a required reason; the visit then leaves every list, count and report (the Visit Log's "Include entered in error" shows it), its medicines go back to stock through the same "visit edited" adjustments, its excuse letter (draft or approved) is voided, its pending follow-ups are cancelled with the same reason, and it can't be edited afterwards. Audit-logged
- **Escalate to incident** (ADR-036): on Visit Details, and as a shortcut on New Visit (nothing saved). It opens Incident Stage 1 with the student, complaint, the visit's time and the temperature. A saved visit and its incident are linked both ways; the visit is kept with an "Escalated" chip, its medicines stay on the visit (shown on the incident as "Given at the visit", never copied), and the event counts once, as the incident, in visit totals, the calendar, the Dashboard and reports. An emergency-type complaint on a visit (one on the incident complaint list) shows a non-blocking "This looks like an emergency. Escalate to an incident?" hint. The one-line Visit-versus-Incident rule waits for the clinician's wording

**Complaint Monitoring**
- Record complaint/symptom for the visit: free text with suggestions (the predefined complaint types plus complaints already recorded, most used first). "Other (type your own)" is always the first option; it clears and focuses the free-text field and is never stored as a complaint. Text matching a suggestion is stored in that suggestion's spelling, so counts don't split by capitalization. The first-aid checklist appears when the complaint matches a predefined type. Editing a visit uses the same field and the same normalization
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
- **Issue a replacement** (approved letter of a still-valid visit, e.g. the fever lasted longer): asks for a reason, marks the old letter **Superseded** (kept, never valid again) and opens a new draft with the same period and note. A letter whose visit was entered in error shows **Voided**, can't be approved, and prints marked VOID. Every letter, including superseded and voided ones, stays in the student's record. A superseded or voided letter opens on its own from the student's record ("View letter"): read-only, marked Superseded or Voided with the reason, with a link to the current letter, and its printout is stamped SUPERSEDED or VOID (decided Friday, October 23, 2026)
- Excused periods ("Excused from" / "Excused until") are recorded so teachers and the registrar can cross-check attendance, and there is no attendance integration.
- On the visit form (new or edit), fields follow the disposition: none for Returned to class; for Sent home, an "Excuse letter" section ("Prepare an excuse letter", on by default; Excused from, default today; Excused until, required while ticked; optional note for the teacher); for Referred to hospital, the same section plus an optional "Referred to (hospital or clinic)". Fields clear when the disposition changes and are validated only while shown. Saving stores these as a draft with the visit, not an approved letter; "Review excuse letter" opens the letter prefilled, and approval moves the period and note onto the letter and clears the draft. Once a letter is approved, editing the visit (even to another disposition) never changes or removes it, and the form says so
- Drafts awaiting approval are findable without remembering the visit: the Student Profile's Staff-only Excuse Letters card lists them with a "Pending approval" badge and a "Review letter" link, and the Dashboard shows Staff an "Excuse letters awaiting approval" list (masked LRN, excused period, visit time; oldest first), shown only while drafts exist
- Visit detail (Staff only) shows an "Excuse letter" section: Not prepared, Pending approval, or Approved, with the excused period, the teacher note, and a link to the letter; and "Referred to" when recorded
- **ADR-049 (built Thursday, October 29, 2026 — 23:49 PHT):** "Save and approve now" beside Save on New Visit and the Visit Details edit form saves the visit and approves its prepared letter in one step (both audit entries); the letter page keeps its tick-then-"Approve and Store" path. An excused period longer than `config.medicalCertificateAfterDays` (3, both dates counted) shows "More than 3 days: a medical certificate is usually needed." on the visit form and the letter page; it never blocks. Approval stores the final recipient and body, and the letter prints from that stored text; letters approved earlier get their wording from the template once, on load. An approved letter whose visit is no longer Sent home or Referred shows "Outcome changed since approval" on Visit Details and the Student Profile. An optional "Stay home until cleared" tick and note on the letter prints "Stay home until cleared by the school clinic."
- **Out of scope:** medical certificates are hospital-issued documents, not generated by CLINIQ — the excuse letter is a distinct, clinic-issued document and the system should never conflate the two

**PE/Sports Injury Referral Logging**
- Log a referral submitted by a PE instructor
- Record clinical assessment
- **Who collected the student** (ADR-049): for Sent home and Referred to hospital, optional Collected by, Relationship (suggestions Parent, Guardian, Relative, Other; free text) and Time collected (now by default, never in the future). Shown on Visit Details. Not asked for a staff patient. "Show more fields" (body temperature) opens by itself when the complaint is Fever, Headache or Chills (matched like the first-aid checklist; "Chills" was added to the complaint types); it can be closed. A follow-up (visit or incident) can carry "Stay home until cleared" with a note; the Follow-Up List shows it under the reason.
- Record disposition (returned to class / resting in clinic / sent home / referred to hospital). **Resting in clinic** (panel review VS-1) is a student kept for observation; today's resting visits with no Time out are "in the clinic now" and show as a Dashboard chip that opens the filtered Visit Log. Only Sent home and Referred get an excuse letter. The default stays Returned to class (open `DECIDE`)
- Escalate to Emergency Response if hospital referral is needed

**Follow-Up Handling** — for cases where a student is told to return for monitoring or reassessment (e.g., "return tomorrow for monitoring"). Can originate from a visit here or from an incident in Emergency Response.
- Prompted inline at the end of Record Visit or Log Emergency — "Does this student need a follow-up?" — rather than a separate step Staff has to remember to do afterward
- Record: student, related visit/incident record, follow-up date, reason/monitoring instruction, notes
- Status lifecycle: Pending → Completed / Missed / Cancelled
- View list of all follow-ups (filterable by status)
- View due/upcoming follow-ups — surfaced on the Clinic Overview Dashboard (Module 9), computed fresh each time the page loads by comparing today's date to the follow-up date, not a background or push-based alert (the system has no external SMS/push service — see Module 9 and the Out of Scope notes)
- Mark a follow-up Completed, Missed, or Cancelled
- Missed and Cancelled ask for a confirmation **and a required reason**, kept on the follow-up and shown in the list; afterwards "Set a new date" offers to create a new pending follow-up for the same student, record and reason (panel review FU-4). Audit-logged

### 4. Emergency Response — *Access: Staff; Admin/Principal reads the Incident Log and Incident Report only (ADR-038), audit-logged once per report per session*

**Acknowledge (ADR-048, built Friday, October 30, 2026 — 00:17 PHT):** on an approved incident report the Admin/Principal has an Acknowledge button (with a confirmation); it records "Acknowledged by <name> on <date>" on the report and its printout, writes an audit entry, and can't be undone. It is the Admin's only write. The clinician's opening of a student or staff profile or an incident report is now audit-logged once per record per session, like the Admin's. The clinician's Dashboard Overview shows a **"Possible cluster"** row when 3 or more students with the same complaint and grade (grade at the time) were seen in the last 3 days (`config.clusterMinStudents`, `clusterWindowDays`; ADR-050); students only, never for the Admin, nothing sent.

**Incident Recording — two-stage flow**
- **Stage 1 (fast capture):** open a prefilled emergency form (student picked on the form), complete only the essential field (the complaint) plus whichever readings the case needs (temperature, pulse, blood pressure, oximeter; none is required, "don't force all 4 if not relevant to the case"), and save immediately — speed matters more than completeness in the first moment. An optional Additional notes field is offered but never required; it stays editable on Stage 2 until the incident report is approved (ADR-049; each change is an audited edit), then shows read-only in the Stage 1 summary and on the Incident Report. Once the student is picked, a read-only card shows the student's allergies, medical conditions and emergency contacts (an empty list reads “None recorded”, never “No allergies”); it adds no input
- **Complaint:** chosen from the incident complaint types, or "Other (type your own)" to type one (at most 60 characters; Zean, Monday, October 26, 2026).
- **Stage 2 (complete later):** return to the same incident record to fill in remaining details (any further readings, still all optional, and referral specifics) once the immediate situation is handled. Treatment notes and medicines/supplies given are both optional; when neither is recorded, views show “No treatment recorded.” An optional **Body part affected** (free text with suggestions) is recorded at Stage 2 and printed on the report when filled. The record can be **completed and approved** only when it has at least one of treatment notes, a medicine line, a parent notification attempt or a hospital referral; otherwise the nurse ticks “Nothing further was needed or done” and writes a one-line reason, printed on the report as “No treatment or notification: <reason>”. No reading is ever required (panel review part 1, Thursday, October 22, 2026)
- Edit incident entry
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

**Follow-Up Handling** — same feature as Clinic Visit Monitoring's Follow-Up Handling (Module 3); an incident can originate a follow-up the same way a routine visit can (prompted inline at the end of Log Emergency)

### 5. Reports Generation — *Access: Staff (generates) + Admin/Principal (views, read-only)*

**Decisions build (ADR-050, built Friday, October 30, 2026 — 00:26 PHT):** reports group complaints after trimming, collapsing spaces and ignoring case and trailing punctuation, matched to the complaint types ("head ache" and "Headache." count as Headache; an unmatched complaint keeps its own cleaned text; no merge screen). The Monthly Report adds visits by complaint per week (Monday weeks clipped to the month, weekend days in the week before, a last week of three weekdays or fewer joined to the one before, labelled like the paper report, "1-4, 7-11, 14-18, 21-30"), with a total column, on screen and on paper. A new **Inventory sheet** (one A4 page per month) lists each item's New Purchase, Total Available and Ending Inventory, all computed from the stock movements. The Calendar is renamed **Activity calendar**.

**Monthly Reports**
- Generate monthly report — *Staff*
- View monthly report — *Staff, Admin/Principal*
- Print/export monthly report as PDF — *Staff* (the Admin/Principal reads it on screen; ADR-038)

**Incident Reports**
- Generate incident report from an incident record — *Staff*
- Route for nurse review and sign-off — *Staff*. Only a completed (Stage 2) record can be approved
- Print incident report — *Staff* (ADR-038)
- The month's **Incident register** (renamed from "Incident Report Archive", panel review RP-4: it holds unfinished incidents, so it isn't an archive) lists every incident of the month by masked LRN; for Staff each row opens its report, or "Complete Stage 2" for a Stage 1 record; for the Admin/Principal every row opens the report read-only (ADR-038)

**Complaint summary** (renamed from "Health Summaries", panel review RP-7: it holds complaint counts only)
- Generate aggregated complaint summary — *Staff*
- View complaint summary — *Staff, Admin/Principal*
- Export complaint summary — *Staff* (ADR-038)

**Sports Reports (ADR-034)** — *Staff only; the Admin/Principal cannot open them*
- Build a saved, reusable list of students for a PE or sports activity: title, activity, requested by (the instructor's name), look-back window (30, 60 or 90 days or the school year; default 90), "Include recorded conditions and allergies" (off by default) — *Staff*
- Add students by name or LRN search or a whole grade level at once, with an optional note per student; shown by full name and grade level, a decided exception to the display-privacy rule — *Staff*
- Edit, duplicate and archive a saved report — *Staff*
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
1. Every item starts with a **current stock count**, a **low-stock threshold**, and a **single expiration date** — deliberately tracked per item, not per batch. A more accurate pharmaceutical system would track expiration per batch (since newly restocked units may expire later than what's already on the shelf), but that adds real complexity a single small clinic doesn't need; when Staff restocks, they confirm/update the one expiration date on record for that item, assuming older stock is used first.
2. **Dispensing (stock decreases):** happens either directly from the Inventory List, or — more commonly — as the "Dispense Medicine" quick-action linked to a visit or incident (see Modules 3, 4, 6). Staff selects the item and quantity; the system decrements stock by that amount and logs the dispensation (item, quantity, linked visit/incident if any, staff, timestamp). If dispensing would take stock below zero, the system **warns but does not block the save** — a software constraint should never get in the way of actually recording that care was given.
3. **Threshold check (automatic):** immediately after any decrement, the system checks the new stock level against that item's low-stock threshold. Crossing it auto-flags the item — this flag is what surfaces on the Staff Dashboard, the Inventory List itself, and the Clinic Overview Dashboard (Module 9).
4. **Restocking (stock increases):** a separate, manually-initiated action — Staff enters the quantity received and the new batch's expiration date, or explicitly confirms that the batch has no manufacturer expiration date. The system increments stock accordingly and logs the restock event (item, quantity, expiration choice, staff). This also clears a low-stock flag if the new total is back above threshold.
5. **Expiration check (automatic):** runs independently of stock level — an item can be well-stocked and still flagged as nearing expiration. Both flags (low-stock, nearing-expiration) can be active on the same item at once and are shown as distinct badges, not merged into one generic "attention needed" indicator.

**Inventory Item Management**
- Add inventory item
- Optional "Generic or branded" tag on an item (Generic, Branded, or Not specified, the default), shown on the item form, the item's Batches details and the Dispense picker, not as a list column (Sir Rey, Sunday, October 25, 2026)
- An expiration date can't be in the past, on Add Item or Restock; today is allowed (Zean, Sunday, October 25, 2026 — 23:55 PHT).
- On Add Item the first batch follows Restock's rule (ADR-035, panel review IV-2): an expiration date, or an explicit "This item has no expiration date" confirmation; a blank date alone can't be saved (also enforced in the data layer). A non-blocking warning appears when the name and unit match an existing item (case, spacing and a trailing "s" ignored: "Paracetamol 500mg tablet already exists. Restock it instead?", with a link); the unit is free text with suggestions from the units already used (panel review IV-3)
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
- Track expiration date per item
- Auto-flag items nearing expiration

### Clinic settings and rules (ADR-051, built Friday, October 30, 2026 — 03:21 PHT)

- **Starting numbers** in `config`, each a starting value for the nurse to confirm: frequent visitor 3 visits in 14 days (the panel is on), follow-up reminder window 7 days, expiry warning 30 days, top 5 complaints; stock exactly at the threshold counts as low.
- **Follow-ups:** Upcoming before the date, "Due today" on it, "Due" for the next 3 days, then Overdue; 7 days after the date a pending follow-up reads as Missed with "No response (closed automatically after 7 days)". The Follow-Up List and the Dashboard use the same rule. (Before: Overdue started the day after the date, and nothing closed by itself.)
- **Vitals:** a reading outside the usual range for the patient's age group (by the age on the visit's or incident's own date when the student has a birthdate: under 6, 6 to 12, 13 and over, ADR-054; otherwise by grade: Kinder, Grades 1 to 6, Grades 7 to 12; staff adult) adds "Outside the usual range for this age (starting range, nurse to confirm): …" on the Visit and Incident forms; temperature below 36.0 °C and oximeter below 95% are noted too. Never blocks. The "looks unusual" sanity note stays the stronger message, and the fever flag stays at 37.0 °C.
- **Which form:** a one-line hint on the Visit form ("Visit: a common, routine case. A worse case that needs fast two-stage capture is an Incident.") and the Incident form; Escalate to incident stays.
- **Sports Report:** each visit and incident in the window has a tick, all ticked to start; only ticked entries print; the screen says how many are included.
- **Monthly Report:** visits by sex (Female, Male, All students), with staff patients counted apart, on screen and in the A4 printout.
- **Required marks:** a field shows the mark only when saving is blocked without it. The audit found every remaining mark already blocking; Allergies and Medical conditions lost theirs in Part 2.

### 9. Clinic Overview Dashboard *(expanded from "Health Trends Dashboard")* — *Access: Staff + Admin/Principal (view-only, except that Staff and the Admin maintain calendar events; ADR-019, ADR-042)*
Broadened from complaint trends alone into an overall operational snapshot, per the September 19 meeting.

- View total clinic counts (visits, incidents, active students)
- View pending/incomplete records (pulled from the Student Records review queue, Module 2)
- *Staff only:* the "Pending excuse letters" stat card opens the Visit Log filtered to visits whose letter awaits approval, each with a "Review Letter" link (ADR-011 amendment, October 19, 2026; the separate Overview list was removed). Navigation only, so the dashboard stays view-only (ADR-011)
- View common-complaint aggregation by week/month
- View aggregate-only Sex and grade-level Trend counts, in one card with a Sex / Grade level switch (Sir Rey, Sunday, October 25, 2026). The Trends view uses at most four hues: brand green, a neutral, the warning color, and the female/male pair. Selecting either dimension filters only the Trend charts and complaint/weekday statistics; no student name appears and the Overview totals stay unfiltered. A production minimum-group-size rule remains open.
- View symptom-clustering alerts (possible outbreak early warning)
- Every total says what it counts (panel review DB-8): the Clinic visits figure is visits only, the sex and grade-level charts and the calendar count visits and incidents, and a visit escalated to an incident counts once, as the incident (ADR-036). A stat card's change against the prior period shows both counts ("4 vs 1 in the prior 22 days") when the prior count is under `config.percentMinPriorCount` (5), and a percentage from there up (DB-2). The number on the Overview tab counts urgent items only: expired stock, overdue follow-ups and incidents awaiting Stage 2 (DB-4); low stock, expiring soon, incomplete records and frequent visitors keep their own chips
- View frequent-visitor flags (the Overview lists the five students with the most visits, with "Show all" for the rest; the count badge shows the total; the config switch `showFrequentVisitors` can hide it; Zean, Sunday, October 25, 2026), shown by **masked LRN** per the display-privacy rule, not full name — **a warning only**, never a diagnosis or suggested action; it exists to help the nurse decide what to do next, not to decide for her
- **Due/upcoming follow-ups** (Module 3/4's Follow-Up Handling) — this is the system's internal reminder mechanism, since there's no external SMS/push service; computed fresh on page load by comparing today's date to each follow-up's date, not a background alert
- **Calendar view** of visit and incident counts, toggleable weekly / monthly / yearly, for spotting patterns at a glance (e.g., a calendar-style heatmap of how many visits happened each day). It also surfaces any free-text event tag Staff applied when logging a visit or incident (e.g., "MCA Dance Program") on the relevant day, so clinic activity can be read in context
- **School events, maintained by Staff and the Admin** (ADR-019, ADR-042): Staff and the Admin click any calendar day (past, today, or future) to open that day's panel: its visit and incident counts (past and today only), its events with edit and delete, Add event, and, for Staff only, a "View visits" link to the Visit Log filtered to that day. An event has a title (up to 60 characters), a start date, and an optional end date for multi-day events. Each event shows as a yellow chip on every day it covers (up to 2 chips per day, then "+N more"); a visit/incident tag with the same text on the same day shows once. Create, edit, and delete are audit-logged. Admin/Principal sees the same chips but can't open or change anything
- **National holidays, read-only** (ADR-020): nationwide Philippine holidays (regular, special non-working, special working, Islamic) appear as gray "Holiday: <name>" chips in the Month, Week, Year, and Table views, including future days; long names truncate with the full name in a tooltip, and an unconfirmed date shows "(estimated)". A no-class holiday (anything but a special working day) with zero visits gets faint stripes, so it reads as "no class", not "no illness". Staff's day panel lists the date's holidays with no edit or delete controls. A line under the calendar shows "Holidays updated <date> · Source <name>" to Staff and Admin, with a warning if no holidays are loaded for the current year. Holidays come from a source through the data layer (a bundled 2026 list for now); no role edits them. Local town/province days and class suspensions are entered by Staff as events. Automatic yearly updating is a backend task (Phase B9); the source is still open
- Filter any of the above by custom date range
- Export/print the dashboard view

### Staff wording and extra complaints (ADR-053, built Friday, October 30, 2026 — 03:36 PHT)

- A visit can carry up to 3 **other complaints** as tags beside the one required complaint (from the same suggestions, or typed); a fourth is refused. Reports and the Dashboard count the main complaint only. The tags show on Visit Details and the Student and Staff Profile histories.
- Staff types are Teacher, Non-teaching staff, Utility worker and **Other**.
- A staff patient's "Returned to class" reads **"Returned to work"** on New Visit, Visit Details, the Visit Log and the Staff Profile; the stored value is the same. The Monthly Report's mixed total reads "Returned to class or work".
- The Admin's Dashboard incident counts leave staff incidents out, matching the Admin's Incident Log; the clinician's count everyone with the Students and Staff split.
- The PE referral's three pre-filled phrases stay editable and carry "Starting wording, to be confirmed" on screen only.

### 10. Backup Verification Assistant — *Access: Staff and Admin/Principal (ADR-037; the same abilities for both)*
- View backup status (last backup date, file size, status)
- Trigger a manual backup-status check
- View the guided recovery checklist
- Mark a backup as verified (nurse confirmation)
- **Back up now** (panel review part 6): starts a backup from the Backup page, either role. It runs to every enabled backup location and shows each location's result (ADR-052); in the frontend phase the mock records the run, and writing the files is backend-phase work. Audit-logged
- **Backup locations** (ADR-052, built Friday, October 30, 2026 — 03:36 PHT): the clinician adds, edits, disables and enables locations (label such as Internal drive or External drive, a path, a status of found, not found or not writable, the last backup time and result). A location is never deleted; each change is audit-logged; the screen warns when none is enabled. A preview shows the folders created on each location (`<location>\.cliniq\cliniq.json`, `backups\YYYY\MM\cliniq-YYYY-MM-DD_HHmm.zip`, `logs\backup-YYYY-MM.log`; the latest `config.backupKeepLast` (60) kept). The stale-backup alert reads the newest successful backup across enabled locations. The Admin sees the list read-only.
- **Stale-backup alert** for both roles: a Dashboard chip "Last backup was more than 48 hours ago" (`config.staleBackupHours`), "The latest backup failed" or "No successful backup yet", linking to Backup; it also counts in the Overview tab's urgent number
- View backup history/log
- **Open item:** a backup layer beyond the local workstation and the external USB/network-folder copy is still being evaluated by the team as of this writing — see "Recommendations for Future Consideration" below. Nothing about the current mysqldump-based backup changes because of this; it's an addition still being decided, not a redesign

---

### 11. Audit Log Viewer — *Access: Staff (view); Admin/Principal (view)*

A dedicated screen to review the Audit Trail (below), not just write to it — added by `ADR-016` after the write side existed with no way to actually read it back.

- View the audit log, filtered by date range, user, action type (login/logout/submit/approve/create/update/delete/archive/print/viewed by the Admin), and target/module type — *Staff, Admin/Principal*
- Each entry: timestamp, who, action type, and the target record (masked LRN, not name, when the target is a student — per the display-privacy rule) — *Staff, Admin/Principal*
- Export/print a filtered view, for handing to a DPO or during a compliance review — *Staff* (ADR-038)
- Operational lists (Visit Log, Incident Log, Audit Log) offer 10, 20, 50 or 100 rows per page; the choice lasts for the browser session (Sir Rey, Sunday, October 25, 2026; 50 and 100 added Saturday, October 31, 2026)
- **No role can edit or delete an entry.** The log is read-only by design; that's what makes it a log.

---

## Audit Trail (Cross-Cutting — Expanded Per September 19 Meeting)
Applies to every module above. Every one of the following gets logged with **who** performed it and **when**:
- Login and logout (Module 1)
- Every form submission (new visit, new incident, inventory dispense/restock, etc.)
- Every approval (excuse letter sign-off, incident report sign-off)
- Every create/update/delete/archive action on a record
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
| 4. Emergency Response | Full | Read Incident Log and Report (ADR-038) |
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
- **An additional backup layer beyond local + external drive.** The team is still evaluating what this should be (possible off-site/cloud destination, or another mechanism) — not yet decided, so nothing is implemented against it yet. Revisit once a specific approach is chosen.

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

### Future Decision: Full School-Events Calendar — *resolved Wednesday, October 07, 2026 (ADR-019)*
**Resolved:** Staff maintain school events from the calendar's day panel; since ADR-042 ({TS}) the Admin/Principal can too (see Module 9). The original note is kept below for history.

The Dashboard's calendar (Module 9) currently supports only a lightweight, free-text event tag on visits/incidents — deliberately kept minimal for this phase. A fuller calendar, where school events (academic, sports, performances, assemblies, field trips) are their own managed entries plotted alongside clinic activity, was discussed but the two real open questions were left for a future decision rather than guessed at:
- **Who maintains the events** — Staff manually (adds data-entry work to the one role this whole project is trying to reduce workload for), or Admin/Principal (would require giving that role its first write permission, since it's 100% read-only today)?
- **What the management screens look like** — a full add/edit/delete events interface, versus importing from an existing school calendar source, if one exists digitally.
Nothing about the current lightweight tagging needs to change to support this later — it's an additive upgrade, not a redesign.
