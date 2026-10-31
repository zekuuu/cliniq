# Reference Screens — Full Detail

Complete detail for all 5 reference screens, kept in sync with the canonical **Frontend Design Reference** document (`09-References/Canonical-Documents/CLINIQ_Frontend_Design_Reference.md`). If you edit one, edit both.

---

## 4. The 5 Reference Screens

Design these five in full detail first. Everything else in the system should be a recombination of what's established here.

### Reference 1 — Clinic Overview Dashboard
*(Staff and Admin/Principal both see this; Admin's is view-only — same layout, no clickable resolve/complete actions. The calendar is its own screen, see Reference 1b)*

**Why this one:** the single most component-dense screen in the system — this is where most of your component library gets exercised at once.

**Layout, top to bottom:**
1. **Header** — page title, current date, a date-range filter control, and a **Print** button. For Staff only, the minimal **backup-status indicator** (status + last-backup date, linking to the Backup screen) sits in the header above Date range and Print, and a **New Visit** action sits on the view-tab row, right of the tabs (above them on phones). Both are navigation, not edits, so the Dashboard stays view-only. The Admin/Principal has no New Visit action; the Admin does see the stale-backup chip and can open Backup (ADR-037).
2. **View tabs under the header** — **Overview** (the default) and **Trends** only (ADR-025, 032). The chosen view is kept in the address (`?view=trends`) without adding Back steps, each view keeps its own state, and the Overview tab carries the count of urgent items (expired stock, overdue follow-ups, incidents awaiting Stage 2) so alerts stay noticeable from every view. The date range applies to Overview and Trends.
3. **Overview** — a row of stat cards (visits, incidents, active students, pending excuse letters, due or overdue follow-ups), each with an icon, a large number, a label that says what it counts, and a small change indicator that shows both counts ("4 vs 1 in the prior 22 days") while the earlier period is small. Then compact **attention chips** for Staff that drill through to the right list (inventory, incomplete records, in the clinic now, stale backup), and lower down the alert lists, each row in the list-row pattern (masked LRN, never a name):
   - Due/upcoming follow-ups (masked LRN, reason, due date, status badge)
   - Frequent-visitor warnings (masked LRN, visit count, `warning`-colored badge, labeled clearly as a warning, never styled to look like a diagnosis; the five with the most visits, with "Show all" for the rest; starting value 3 visits in 14 days, ADR-051)
   - A **possible-cluster alert** for the clinician: 3 or more students with the same complaint and grade within 3 days (ADR-050); students only
   - Low-stock / nearing-expiration inventory items (item name — not student-linked)
   - **Pending excuse letters (Staff):** there is no separate list; the "Pending excuse letters" stat card opens the Visit Log filtered to pending letters (ADR-011 amendment), where each pending visit has "Review Letter". Admin/Principal sees the count without a link.
4. **Trends** — common complaints by week/month (chart with a Chart/Table switch as the low-spec fallback), the Sex / Grade level card (aggregate counts only, no names; filters change the Trends charts but never the Overview totals, ADR-031), weekday patterns, and the symptom-clustering indicator. Counts are exact, with no masking of small groups (ADR-050).
5. **Print** prints the open tab as an A4 report: Overview prints the **Clinic Overview Report** (the stat cards, chip counts, a written summary and the lists behind them, with full LRNs and no names, ADR-044) and Trends prints the **Clinic Trends Report** (ADR-045). The Admin/Principal does not print (ADR-038).

**Components this exercises:** stat card, attention chip, list row with status badge, warning badge (with icon, not color alone), bar/line chart with a table fallback, tab strip, segmented toggle control, date-range picker, icon+text button.

**States:** loading (skeleton cards, not a blank screen), empty (no data in the selected range — a clear empty-state message, not a blank chart), error (failed to load, with a retry action).

---

### Reference 1b — Activity Calendar
*(Staff and Admin/Principal; its own top-level screen, not a Dashboard tab — ADR-032; renamed from "Calendar" by ADR-050)*

A Weekly / Monthly / Yearly switch and a Calendar / Table switch with their own state; a calendar grid showing visit-plus-incident count intensity per day (heatmap-style shading); free-text event tags from visits and incidents as small text on their day; school events as yellow chips (up to 2 per day, then "+N more"), and nationwide Philippine holidays as gray "Holiday" chips (a no-class holiday with no visits gets faint stripes). Clicking any day opens its panel: counts (past and today only), its events with edit and delete, Add event (title up to 60 characters, a start date, an optional end date), and for Staff only a "View visits" link. Staff and the Admin/Principal both keep events (ADR-019, 042). A line under the calendar says when the holiday list was updated. **States:** loading skeleton, empty month, error with retry.

---

### Reference 2 — New Visit Entry
*(Staff — the core data-entry pattern used throughout the system)*

**Why this one:** the richest **form** screen, including a dynamic embedded panel and an inline prompt at the end — the pattern every other data-entry screen should follow.

**Layout, top to bottom:**
1. **Patient header** — the student's name, full LRN and grade level (a single-student screen, ADR-040), or the staff member's name and Staff No.; picked on the form with one patient search whose results are labelled Student or Staff (ADR-043)
2. **Visit date and time** (defaults to now, never in the future; a late-entry reason appears when it is more than 30 minutes ago) and a **main complaint field** — free text with suggestions, plus up to 3 extra complaint tags (ADR-053); a one-line hint says a Visit is a common case and an Incident a worse one (ADR-051), and an emergency-type complaint shows "Escalate to an incident?"
3. **First-aid checklist panel** — appears dynamically the moment a complaint is selected: a titled checklist card ("Suggested first-aid steps for: [complaint]"), checkboxes, visually distinct from the surrounding form (e.g., `surface` background) so it reads as guidance, not a required field
4. **Treatment** — a **Treatment notes** textarea and repeatable **Medicines & supplies given** lines (searchable inventory picker showing stock and unit, a quantity stepper, optional instructions; the patient's recorded allergies are shown beside the picker; both parts are optional, ADR-018)
5. **Disposition** — segmented control or radio group: Returned to class ("Returned to work" for staff) / Resting in clinic / Sent home / Referred to hospital. Sent home and Referred show an "Excuse letter" section (students only) and optional collected-by, relationship and time (ADR-049)
6. **Follow-up prompt** — a collapsed/inline section at the bottom: "Does this student need a follow-up?" toggle; expanding it reveals a date picker, reason field, and optional notes — this should feel like a natural continuation of the same form, not a popup interruption
7. **Actions** — primary "Save Visit" button, a quieter secondary "Escalate to Incident" button (ADR-036), neutral "Cancel" text link

**Components this exercises:** search/select input, tag input, dynamic conditional panel, checklist, textarea, repeatable line items, segmented control, expandable/collapsible section, date picker, primary + neutral buttons, inline validation.

**States:** validation error (inline, under the specific field, not a generic banner), saving (button shows a loading state), success (a toast or banner confirms the save and clears the form), follow-up section expanded/collapsed.

---

### Reference 3 — Student Profile (Full Record View)
*(Staff sees Edit/Archive actions; the Admin/Principal sees the same record read-only, with no Print, ADR-038)*

**Why this one:** the richest **detail/read** screen — the template for viewing any single record in depth (a visit, an incident, an inventory item, a follow-up).

**Layout, top to bottom:**
0. **Allergy banner** — when allergies or conditions are recorded, a compact banner at the top lists them; otherwise nothing extra shows
1. **Header** — full name (large), the full LRN (smaller, secondary; the profile is the one screen that shows it in full), grade level, the age when a birthdate is recorded (for example "9 years old"; the full birthdate belongs in the details below, ADR-054), an archived-status badge if applicable
2. **Sectioned content** (tabs or stacked sections, designer's call, but pick one pattern and reuse it everywhere else this applies): Overview (demographics, emergency contact), Medical History (allergies and conditions as tag/chip components; an empty field reads "None recorded" in plain text, ADR-049, 051), Visit History (chronological list), Incident History (chronological list, including which are Stage 1/incomplete vs complete)
3. **Actions** (Staff only) — Edit, Print, Archive. Archive should visually read as a lower-emphasis, non-destructive action (it's reversible and doesn't delete anything) — don't style it like a destructive button

**Staff patients use the same template** (ADR-043): name and Staff No. in the header, no LRN, grade or sex.

**Components this exercises:** tag/chip, tabbed or sectioned content, list rows (reused from Reference 1's pattern), status badge, role-conditional action bar.

**States:** loading, a genuinely empty section (e.g., no incident history yet — a calm empty state, not an error), print-preview.

---

### Reference 4 — (Removed)
The QR Scan/Lookup Hub reference screen was removed with the QR feature (ADR-027). The number is kept so Reference 5 keeps its number.

---

### Reference 5 — Incident Entry (Emergency, Two-Stage)
*(Staff only — the pattern for anything with a "fast now, complete later" lifecycle)*

**Why this one:** the only screen in the system with an explicit incomplete/complete status lifecycle, and the one place urgency should visibly shape the design.

**Layout — Stage 1 (fast capture):**
1. **Student header** (picked on the form)
2. **Complaint field** and a **minimal readings group** (temperature, pulse, blood pressure, oximeter — all optional; a reading outside the common range for the student's age group warns and never blocks, ADR-051) — deliberately short; once the student is picked, a read-only card shows allergies, conditions and emergency contacts ("None recorded" when empty)
3. **Save button** — styled with urgency in mind (bigger, higher-contrast, `warning`-adjacent treatment) since speed matters more than anything else on this screen
4. **Post-save** — a clear "Needs completion" status badge/banner, not just a generic success toast

**Layout — Stage 2 (complete later, same record reopened):**
1. Stage 1 fields shown filled-in (editable or read-only, designer's call), status badge now showing "In progress"
2. **Additional fields unlocked:** full vitals, treatment notes, hospital referral group (destination, transport mode, departure time)
3. **Parent Notification log** — a repeatable list of attempts, each with an outcome (Reached / No answer / Left message or voicemail / Wrong number), who was called, and a timestamp — this is a multi-attempt log pattern, not a single field
4. Status badge changes to "Complete" once saved with at least one of treatment notes, a medicine line, a notification attempt or a hospital referral, or with "Nothing further was needed or done" ticked and a one-line reason
5. On the Incident Report screen the Admin/Principal can **Acknowledge** a completed report (who and when, ADR-048); the printed signature line stays

**Components this exercises:** urgency-styled primary button, stage/status badge (three states: Needs completion → In progress → Complete), multi-attempt log list, timestamped entries, hospital-referral field group.

**States:** Stage 1 saved/incomplete, Stage 2 in progress, fully complete — these three states should be visually distinguishable at a glance in list views (Reference 1's alert list and any incident log list use this same badge).

---

## 5. Extrapolating to the Rest of the Screens

| If the screen is... | Follow the pattern from... |
|---|---|
| Any other data-entry form (Add/Edit Student, Add/Edit Staff, Add/Edit Inventory Item, Add/Edit User, Follow-Up entry, Sports Report builder, Yearly list import) | **Reference 2** (New Visit Entry) |
| Any other detail/single-record view (Staff Profile, Inventory Item Batches, Incident Detail, Visit Detail) | **Reference 3** (Student Profile). There is no separate follow-up detail screen |
| Any other list view (Visit Log List, Incident Log List, Follow-Up List, Inventory List, User List) | The list-row + status-badge pattern from **Reference 1**'s alerts section |
| Login, Force Password Change | Simplest form treatment from **Reference 2**, no dynamic panels needed. Login is its own composition ("layout B"): a full-height white panel on the left holding the lockup at the top and the Sign In form centered, with a small footer line (Privacy Policy, version), beside the blurred school photo; no card, no overlap, no shadow |
| Reports (Monthly, Incident register, Complaint summary, Sports Reports) and print layouts | **Reference 3**'s sectioned-content pattern, adapted for print (no action buttons, no interactive elements) |
| Backup Status screen, including the Backup locations list (ADR-052) | **Reference 5**'s status-badge concept (backup status is also a lifecycle: last run → verified → needs attention); each location row uses the list-row pattern with a found / not found / not writable badge |
| Activity calendar | **Reference 1b** |
