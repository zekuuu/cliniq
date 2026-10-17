# Module Overview — Full Detail

This is the complete module/submodule breakdown, kept in sync with the canonical **Modules & Features** document (`09-References/Canonical-Documents/CLINIQ_Modules_and_Features.md`). If you edit one, edit both — see AGENTS.md's Source of Truth rule at the repo root.

---


Ten modules total: five baseline (from the Software Engineering I Technical Documentation) and five team-proposed enhancements (added during Software Engineering II planning). Every module is broken down to individual operations, each tagged with who can access it. Updated after the September 19, 2026 team meeting to bring PE/Sports Instructor access back into current scope, expand the dashboard, add a two-stage emergency flow, and add a screen-context display rule for student names.

**Roles in the system (current scope):**
- **Staff** — School Head Nurse / clinic assistants. Full read/write access.
- **Admin/Principal** — School Administration. Read-only access, scoped to reports and health summaries only.
- **PE/Sports Instructor** — Read-only access to a student's full profile (medical history, allergies, conditions, emergency contact) **and** their visit/incident history, so recent injuries are visible. No operational actions — no recording visits, no logging emergencies, no editing anything.

**Role documented for future development (not built this phase):** Canteen Staff — see "Future Development" at the end of this document.

**Display-privacy rule (applies across the whole system):** the actual privacy risk isn't a single deliberate lookup — it's a **desktop screen showing a list or pattern across multiple students at once** (a visit log, an incident log, or a "frequent visitor" flag) being glanced at by a passerby, who can then attach a specific named student to a health pattern ("he visits a lot, what's going on?"). So: the **Visit Log List, Incident Log List, and the Dashboard's frequent-visitor section default to Student Number**, not full name, since these are rolling, multi-student, glanceable-by-bystanders screens. A **single deliberate lookup of one specific student — the QR scan result (whether Staff or PE/Sports Instructor), the full profile page, search results, and the masterlist/directory — shows the full name normally**, since at that point someone has already identified and is looking at one particular student for a legitimate reason. The masterlist shows names freely (it's just a roster of who's enrolled) but should not show medical/confidential fields inline — allergies, conditions, or visit reasons still require opening the individual profile.

---

## Baseline Modules

### 1. User Management — *Access: Staff (manages accounts for all current roles)*
**Login Authentication** *(Staff, Admin/Principal, PE/Sports Instructor — everyone with an account)*
- Log in (username/password)
- Log out
- Session lasts 1 week, until the login token expires — there is no idle timeout. One session lifetime applies to every role (Staff, Admin/Principal, PE/Sports Instructor)
- Account lockout after 5 consecutive failed attempts (30-minute lock)
- Every login logged with who and when (see Audit Trail, below)

**User Account Management** *(Staff only)*
- Add new user account, including PE/Sports Instructor accounts
- Edit user account (name, username, role)
- Deactivate/remove user account
- View list of all user accounts
- Search/filter user accounts

**Password Management** *(Staff, Admin/Principal, PE/Sports Instructor — self-service for whoever is logged in)*
- Change password (self-service)
- Force password change on first login
- Prevent reuse of last 5 passwords
- Enforce minimum 8-character password length

**Role-Based Access** *(Staff only)*
- Assign role (Staff / Admin-Principal / PE-Sports Instructor)
- Edit role assignment
- View permissions per role

### 2. Student Records — *Access: Staff full read/write; PE/Sports Instructor read-only (full profile + visit/incident history); Admin/Principal has no direct access (reports and trends only)*

**Student Information Encoding**
- Add new student record — *Staff*
- Auto-generate the student's Student Number in `YYYY-NNNNN` format (enrollment year + zero-padded 5-digit sequence, e.g. `2026-00001`) — system-assigned, not manually entered; sequence resets each enrollment year, giving up to 99,999 new enrollees of headroom per year against the school's ~900-student population, so the format scales well past 20 years. This same number is embedded in the student's QR code (Module 6) and is the default label on visit/incident list and dashboard views, per the display-privacy rule above
- Edit student record — *Staff*
- View student profile/detail — *Staff (full); PE/Sports Instructor (read-only)*
- View list of all students (masterlist, shown with full names) — *Staff*
- Search/filter students (name, grade level, status, or Student Number) — *Staff*
- Archive/deactivate a student record (e.g., transferred or graduated) — *Staff*. Archived records are **not deleted** — they stay in the system for historical/audit continuity but are filtered out of default active-student lists, search results, and dropdowns unless a Staff member explicitly chooses to include archived records

**Medical History Recording**
- Add/update medical history entry (allergies, past illnesses, family history) — *Staff*
- View medical history — *Staff (full); PE/Sports Instructor (read-only)*

**Allergy/Food Restriction Monitoring**
- Add/edit an allergy or food-restriction entry — *Staff*
- View/flag students with restrictions — *Staff*

**Contact Information Management**
- Add/edit emergency contact info — *Staff*
- View emergency contact — *Staff; PE/Sports Instructor (read-only)*
- Mark a contact number as verified/unverified — *Staff*

**Duplicate Detection**
- Auto-check for name + grade-level match on save
- Confirm or cancel when a duplicate warning appears

**Incomplete Record Handling**
- Auto-flag records missing required fields (full name, grade level, emergency contact, allergies, conditions)
- View the incomplete-records review queue (feeds the expanded Dashboard, Module 9)
- Resolve/complete a flagged record
- Log which staff member resolved each flag

**Parent Contact Validation**
- Prompt staff to verify the contact number on first save
- Re-flag the record if the number is unreachable during an emergency
- Log verification with class adviser/Registrar's Office

### 3. Clinic Visit Monitoring — *Access: Staff only*

**Daily Visit Logging**
- Add new visit entry. A visit opened without an identified student finds one by Student Number or student name (results appear from the first character typed, at most 8 active students, each shown with Student Number, full name, and grade). Incident Stage 1, PE/Sports Referral, Dispense, and the QR manual fallback use the same search. A `?student=` link or QR scan still identifies the student directly
- Edit visit entry
- View visit detail (full name shown — a deliberately opened single record)
- View list of visits (filterable by date) — shows **Student Number**, not full name, per the display-privacy rule, since this rolling multi-student list is the kind of screen a bystander could glance at
- Search visits by student

**Complaint Monitoring**
- Record complaint/symptom for the visit: free text with suggestions (the predefined complaint types plus complaints already recorded, most used first). "Other (type your own)" is always the first option; it clears and focuses the free-text field and is never stored as a complaint. Text matching a suggestion is stored in that suggestion's spelling, so counts don't split by capitalization. Smart Triage's checklist appears when the complaint matches a predefined type. Editing a visit uses the same field and the same normalization
- View a student's complaint history (also visible to PE/Sports Instructor as part of visit/incident history)

**Treatment Recording** *(two parts — ADR-018, Wednesday, October 07, 2026 — 10:43 PHT)*
- **Treatment notes** (free text): care that isn't stock — rest, cold compress, wound cleaning, advice
- **Medicines & supplies given** (repeatable lines): a searchable inventory picker (grouped medicines/supplies, showing current stock and unit), a whole-number quantity (minimum 1), the item's unit, optional instructions (max 120 characters, e.g. "1 tablet every 6 hours"). Picking an item already listed adds to its line. The student's recorded allergies show beside the picker for awareness only (no automatic matching)
- Treatment notes and medicines/supplies are both optional: a visit can be saved with neither. The form shows a quiet note ("No treatment recorded. You can still save.") and the visit detail shows "No treatment recorded" (amends ADR-018)
- Saving dispenses every line from inventory in the same atomic save (one dispense transaction per line, linked to the student and visit); expired items can't be given, nearing-expiry items warn, quantities above stock warn but are allowed
- Edit treatment record: changing a saved visit's lines writes stock adjustments linked to the visit (reason "visit edited") — a removed or lowered line returns stock, an added or raised one takes more; past transactions are never rewritten
- Medicines given show on the visit detail and in the student's visit history, e.g. "Paracetamol 500mg × 2 tablets (1 tablet every 6 hours)"
- Visits can't be deleted or voided (edit only), so there is no "remove all lines" path

**Excuse Letter Issuance**
- Generate an excuse letter from a visit record
- Route for nurse check and approval
- Once approved, store it in the student's record as a permanent, printable document
- Print excuse letter
- Excused periods ("Excused from" / "Excused until") are recorded so teachers and the registrar can cross-check attendance, and there is no attendance integration.
- On the visit form (new or edit), fields follow the disposition: none for Returned to class; for Sent home, an "Excuse letter" section ("Prepare an excuse letter", on by default; Excused from, default today; Excused until, required while ticked; optional note for the teacher); for Referred to hospital, the same section plus an optional "Referred to (hospital or clinic)". Fields clear when the disposition changes and are validated only while shown. Saving stores these as a draft with the visit, not an approved letter; "Review excuse letter" opens the letter prefilled, and approval moves the period and note onto the letter and clears the draft. Once a letter is approved, editing the visit (even to another disposition) never changes or removes it, and the form says so
- Drafts awaiting approval are findable without remembering the visit: the Student Profile's Staff-only Excuse Letters card lists them with a "Pending approval" badge and a "Review letter" link, and the Dashboard shows Staff an "Excuse letters awaiting approval" list (Student Number, excused period, visit time; oldest first), shown only while drafts exist
- Visit detail (Staff only) shows an "Excuse letter" section: Not prepared, Pending approval, or Approved, with the excused period, the teacher note, and a link to the letter; and "Referred to" when recorded
- **Out of scope:** medical certificates are hospital-issued documents, not generated by CLINIQ — the excuse letter is a distinct, clinic-issued document and the system should never conflate the two

**PE/Sports Injury Referral Logging**
- Log a referral submitted by a PE instructor
- Record clinical assessment
- Record disposition (returned to class / sent home / referred to hospital)
- Escalate to Emergency Response if hospital referral is needed

**Follow-Up Handling** — for cases where a student is told to return for monitoring or reassessment (e.g., "return tomorrow for monitoring"). Can originate from a visit here or from an incident in Emergency Response.
- Prompted inline at the end of Record Visit or Log Emergency — "Does this student need a follow-up?" — rather than a separate step Staff has to remember to do afterward
- Record: student, related visit/incident record, follow-up date, reason/monitoring instruction, notes
- Status lifecycle: Pending → Completed / Missed / Cancelled
- View list of all follow-ups (filterable by status)
- View due/upcoming follow-ups — surfaced on the Clinic Overview Dashboard (Module 9), computed fresh each time the page loads by comparing today's date to the follow-up date, not a background or push-based alert (the system has no external SMS/push service — see Module 9 and the Out of Scope notes)
- Mark a follow-up Completed, Missed, or Cancelled

### 4. Emergency Response — *Access: Staff only for recording; PE/Sports Instructor can view past incidents read-only as part of a student's history*

**Incident Recording — two-stage flow**
- **Stage 1 (fast capture):** open a prefilled emergency form (student already identified via QR scan or manual entry), complete only the essential fields (complaint, immediate vitals), and save immediately — speed matters more than completeness in the first moment. An optional Additional notes field is offered but never required; when filled, the notes show in Stage 2's Stage 1 summary and on the Incident Report
- **Stage 2 (complete later):** return to the same incident record to fill in remaining details (full vitals and referral specifics) once the immediate situation is handled. Treatment notes and medicines/supplies given are both optional; when neither is recorded, views show “No treatment recorded,” and the Incident Report gives Staff a non-blocking check-before-approving notice
- Edit incident entry
- View incident detail (full name shown — a deliberately opened single record)
- View list of incidents, including which are still in Stage 1 (incomplete) vs fully completed — shows **Student Number**, not full name, per the display-privacy rule

**Hospital Referral Monitoring**
- Add hospital referral (destination, transport mode, departure time)
- Edit referral details
- Track referral status

**Parent/Guardian Notification**
- Log a notification attempt
- Record outcome (Reached / Not Reached / Voicemail / Left Message)
- Timestamp every attempt, tied to the incident record
- Flag for re-verification if the contact is unreachable
- View full notification history for an incident

**Follow-Up Handling** — same feature as Clinic Visit Monitoring's Follow-Up Handling (Module 3); an incident can originate a follow-up the same way a routine visit can (prompted inline at the end of Log Emergency)

### 5. Reports Generation — *Access: Staff (generates) + Admin/Principal (views, read-only)*

**Monthly Reports**
- Generate monthly report — *Staff*
- View monthly report — *Staff, Admin/Principal*
- Print/export monthly report as PDF — *Staff, Admin/Principal*

**Incident Reports**
- Generate incident report from an incident record — *Staff*
- Route for nurse review and sign-off — *Staff*
- Print incident report — *Staff, Admin/Principal*

**Health Summaries**
- Generate aggregated health summary — *Staff*
- View health summary — *Staff, Admin/Principal*
- Export health summary — *Staff, Admin/Principal*

---

## Team-Proposed Enhancements

### 6. QR Digital Health ID — *Access: Staff (full, computer + mobile); PE/Sports Instructor (mobile, read-only)*
Scanning is a **mobile flow** only: the clinic workstation has no QR scanner hardware, so the computer system prints QR codes but does not scan them (ADR-023). On the workstation, Staff identify a student through Students search or each form's student picker.

**QR Code Generation & Printing** *(Staff only)*
- Generate a QR code per student, encoding their Student Number
- Print QR sticker/ID card (Student Number also printed in human-readable text as a fallback)
- Regenerate a QR code (invalidates the old one) if lost or damaged

**Mobile Scan/Lookup (Staff)**
- Scan QR Code, or search by Student Number or student name as a fallback (pick from the list)
- Form auto-fills the student's basic information
- Staff completes only what's missing (visit reason, etc.) and saves
- **Emergency button**, separate from the normal flow: opens a prefilled Stage-1 emergency form (see Module 4) for the fastest possible path when speed matters most

**Mobile Scan/Lookup (PE/Sports Instructor)**
- Scan QR Code, or search by Student Number or student name (pick from the list)
- View the student's full profile read-only, full name shown (this is a deliberate single-student lookup, not a glanceable list — see the display-privacy rule): allergies, conditions, emergency contact, and visit/incident history (so recent injuries are visible)
- No action buttons — no recording, no editing, nothing operational
- Every profile view logged in the audit trail

**Student Quick-Actions (Staff, after identifying a student)**
- View at-a-glance info, full name shown (a QR scan is a deliberate lookup of one student, per the display-privacy rule)
- **Record Visit** — jumps into Clinic Visit Monitoring's New Visit Entry, pre-filled
- **Log Emergency** — jumps into the Stage-1 emergency form, pre-filled
- **View Full Profile** — opens the student's full record
- **Dispense Medicine** — jumps into the Inventory Tracker's Dispense/Log Usage, pre-linkable to the current visit

### 7. Smart Triage Quick-Reference — *Access: Staff only*

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
4. **Restocking (stock increases):** a separate, manually-initiated action — Staff enters the quantity received and the date, the system increments stock accordingly, and logs the restock event (item, quantity, date, staff). This also clears a low-stock flag if the new total is back above threshold, and is the point where Staff confirms the item's current expiration date.
5. **Expiration check (automatic):** runs independently of stock level — an item can be well-stocked and still flagged as nearing expiration. Both flags (low-stock, nearing-expiration) can be active on the same item at once and are shown as distinct badges, not merged into one generic "attention needed" indicator.

**Inventory Item Management**
- Add inventory item
- Edit inventory item
- Delete/archive inventory item
- View inventory list
- Search/filter inventory (by name, category, stock level)
- View item detail

**Stock Operations** *(stock-integrity rules: ADR-018, Wednesday, October 07, 2026 — 10:43 PHT)*
- Dispense/log usage (decrements stock). From a visit or an incident's Stage 2, dispensing happens through that record's "Medicines & supplies given" lines. The standalone Dispense page is for non-visit use: it must name a student or choose "Not for a student (general use)", and if the student already has a visit today it links to that visit so the medicine is added there instead
- Inventory is held in received batches (quantity, expiration date, received date). The list derives usable non-expired stock, expired stock, and total on hand; low stock uses usable stock only. Expired quantities remain visible until explicitly disposed, and the list filters to items with expired stock.
- Expired batches can't be dispensed (rejected by the data layer, not just the UI); items with no expiration date are always dispensable. Dispensing uses the earliest-expiry usable batch first and records the allocation so visit edits return stock to its original batch.
- Restock/add stock (row action: quantity received + the **new batch's** expiration date; adds a batch; logs the restock). It never overwrites earlier batches; the dialog warns when expired stock remains. Edit Item no longer edits stock or expiry.
- **Adjust Stock** (Staff, row action): choose a batch, then a +/- change or "set to counted quantity", with a required reason (Expired - disposed / Damaged or spilled / Miscount correction / Other with a required note). The selected batch cannot go below 0. Writes an adjustment transaction and audit entry; a disposal remains in batch movement history.
- View inventory usage history/log — not built yet; when built, it shows the Student Number, never the name

**Alerts & Thresholds**
- Set/edit the low-stock threshold per item
- Auto-flag items below the low-stock threshold
- Track expiration date per item
- Auto-flag items nearing expiration

### 9. Clinic Overview Dashboard *(expanded from "Health Trends Dashboard")* — *Access: Staff + Admin/Principal (view-only, except that Staff maintain calendar events; ADR-019)*
Broadened from complaint trends alone into an overall operational snapshot, per the September 19 meeting.

- View total clinic counts (visits, incidents, active students)
- View pending/incomplete records (pulled from the Student Records review queue, Module 2)
- *Staff only:* excuse letters awaiting approval (Module 3), by Student Number, each linking to its letter; hidden when there are none. Navigation only, so the dashboard stays view-only (ADR-011)
- View common-complaint aggregation by week/month
- View symptom-clustering alerts (possible outbreak early warning)
- View frequent-visitor flags, shown by **Student Number** per the display-privacy rule, not full name — **a warning only**, never a diagnosis or suggested action; it exists to help the nurse decide what to do next, not to decide for her
- **Due/upcoming follow-ups** (Module 3/4's Follow-Up Handling) — this is the system's internal reminder mechanism, since there's no external SMS/push service; computed fresh on page load by comparing today's date to each follow-up's date, not a background alert
- **Calendar view** of visit and incident counts, toggleable weekly / monthly / yearly, for spotting patterns at a glance (e.g., a calendar-style heatmap of how many visits happened each day). It also surfaces any free-text event tag Staff applied when logging a visit or incident (e.g., "MCA Dance Program") on the relevant day, so clinic activity can be read in context
- **School events, maintained by Staff** (ADR-019): Staff click any calendar day (past, today, or future) to open that day's panel: its visit and incident counts (past and today only), its events with edit and delete, Add event, and a "View visits" link to the Visit Log filtered to that day. An event has a title (up to 60 characters), a start date, and an optional end date for multi-day events. Each event shows as a yellow chip on every day it covers (up to 2 chips per day, then "+N more"); a visit/incident tag with the same text on the same day shows once. Create, edit, and delete are audit-logged. Admin/Principal sees the same chips but can't open or change anything
- **National holidays, read-only** (ADR-020): nationwide Philippine holidays (regular, special non-working, special working, Islamic) appear as gray "Holiday: <name>" chips in the Month, Week, Year, and Table views, including future days; long names truncate with the full name in a tooltip, and an unconfirmed date shows "(estimated)". A no-class holiday (anything but a special working day) with zero visits gets faint stripes, so it reads as "no class", not "no illness". Staff's day panel lists the date's holidays with no edit or delete controls. A line under the calendar shows "Holidays updated <date> · Source <name>" to Staff and Admin, with a warning if no holidays are loaded for the current year. Holidays come from a source through the data layer (a bundled 2026 list for now); no role edits them. Local town/province days and class suspensions are entered by Staff as events. Automatic yearly updating is a backend task (Phase B9); the source is still open
- Filter any of the above by custom date range
- Export/print the dashboard view

### 10. Backup Verification Assistant — *Access: Staff only (specifically the School Head Nurse)*
- View backup status (last backup date, file size, status)
- Trigger a manual backup-status check
- View the guided recovery checklist
- Mark a backup as verified (nurse confirmation)
- View backup history/log
- **Open item:** a backup layer beyond the local workstation and the external USB/network-folder copy is still being evaluated by the team as of this writing — see "Recommendations for Future Consideration" below. Nothing about the current mysqldump-based backup changes because of this; it's an addition still being decided, not a redesign

---

### 11. Audit Log Viewer — *Access: Staff (view); Admin/Principal (view); PE/Sports Instructor — none*

A dedicated screen to review the Audit Trail (below), not just write to it — added by `ADR-016` after the write side existed with no way to actually read it back.

- View the audit log, filtered by date range, user, action type (login/logout/scan/submit/approve/create/update/delete/archive), and target/module type — *Staff, Admin/Principal*
- Each entry: timestamp, who, action type, and the target record (Student Number, not name, when the target is a student — per the display-privacy rule) — *Staff, Admin/Principal*
- Export/print a filtered view, for handing to a DPO or during a compliance review — *Staff, Admin/Principal*
- **No role can edit or delete an entry.** The log is read-only by design; that's what makes it a log.

---

## Audit Trail (Cross-Cutting — Expanded Per September 19 Meeting)
Applies to every module above, not just QR. Every one of the following gets logged with **who** performed it and **when**:
- Login and logout (Module 1)
- Every QR scan, whether by Staff or PE/Sports Instructor, and which student was viewed
- Every form submission (new visit, new incident, inventory dispense/restock, etc.)
- Every approval (excuse letter sign-off, incident report sign-off)
- Every create/update/delete/archive action on a record
This satisfies RA 10173 (Data Privacy Act) alignment and is the mechanism that makes the PE/Sports Instructor's read-only access accountable — every profile they open is attributable to their account and timestamped. **Module 11, Audit Log Viewer, is the read side of this same requirement** — see `ADR-016`.

---

## Access Summary at a Glance (Current Scope)

| Module | Staff | Admin/Principal | PE/Sports Instructor |
|---|---|---|---|
| 1. User Management | Full | Login + own password only | Login + own password only |
| 2. Student Records | Full | — | Read-only (full profile) |
| 3. Clinic Visit Monitoring | Full | — | — (visit history visible via Module 2/6) |
| 4. Emergency Response | Full | — | Read-only (past incidents, via history) |
| 5. Reports Generation | Full | View/print only | — |
| 6. QR Digital Health ID | Full (generate, mobile quick-actions) | — | Mobile read-only scan/lookup |
| 7. Smart Triage Quick-Reference | Full | — | — |
| 8. Medicine & Supply Inventory Tracker | Full | — | — |
| 9. Clinic Overview Dashboard | View | View | — |
| 10. Backup Verification Assistant | Full | — | — |
| 11. Audit Log Viewer | View | View | — |

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
The current build gives PE/Sports Instructors read-only QR access (Module 6). A second external role, **Canteen Staff**, was also designed but remains deferred to a later phase.
- **What it would do:** Let canteen staff scan or enter a student's Student Number to check food allergies/restrictions before serving food — a digital version of the "Canteen health restriction enforcement" service already named in the Technical Documentation, which today is handled manually by the clinic head.
- **Access model:** The same scoped sign-in pattern as PE/Sports Instructor access (reused, not reinvented).
- **Data scope:** Narrower than the Instructor view — food allergies/restrictions only. No conditions, no emergency contact, no visit history.
- **Auditability:** Same per-view logging pattern as everything else in this document.
- **Why still deferred:** Unlike PE/Sports Instructor access, this wasn't brought back into scope at the September 19 meeting — it stays a documented future addition, reusing infrastructure already being built now.

### Future Decision: Full School-Events Calendar — *resolved Wednesday, October 07, 2026 (ADR-019)*
**Resolved:** Staff maintain school events from the Dashboard calendar's day panel; Admin/Principal views them only (see Module 9). The original note is kept below for history.

The Dashboard's calendar (Module 9) currently supports only a lightweight, free-text event tag on visits/incidents — deliberately kept minimal for this phase. A fuller calendar, where school events (academic, sports, performances, assemblies, field trips) are their own managed entries plotted alongside clinic activity, was discussed but the two real open questions were left for a future decision rather than guessed at:
- **Who maintains the events** — Staff manually (adds data-entry work to the one role this whole project is trying to reduce workload for), or Admin/Principal (would require giving that role its first write permission, since it's 100% read-only today)?
- **What the management screens look like** — a full add/edit/delete events interface, versus importing from an existing school calendar source, if one exists digitally.
Nothing about the current lightweight tagging needs to change to support this later — it's an additive upgrade, not a redesign.
