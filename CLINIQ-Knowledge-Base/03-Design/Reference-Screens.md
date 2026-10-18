# Reference Screens — Full Detail

Complete detail for all 5 reference screens, kept in sync with the canonical **Frontend Design Reference** document (`09-References/Canonical-Documents/CLINIQ_Frontend_Design_Reference.md`). If you edit one, edit both.

---

## 4. The 5 Reference Screens

Design these five in full detail first. Everything else in the system should be a recombination of what's established here.

### Reference 1 — Clinic Overview Dashboard
*(Staff and Admin/Principal both see this; Admin's is fully view-only — same layout, no clickable resolve/complete actions)*

**Why this one:** the single most component-dense screen in the system — this is where most of your component library gets exercised at once.

**Layout, top to bottom:**
1. **Header** — page title, current date, a date-range filter control
   - **Staff shortcuts (Staff only; since Thursday, October 15, 2026 — 20:38, at Zean's request, the backup indicator sits in the header above Date range and Print, showing the status and the short last-backup date, and New Visit sits on the view-tab row, right of the tabs, above them on phones):** a quick **New Visit** action and a minimal **backup-status indicator** (status + last-backup date) that links to the full Backup screen. Both are navigation, not edits, so the Dashboard stays view-only. Admin/Principal doesn't see this strip, since that role can open neither destination.
2. **Stat card row** — 3–4 cards: today's visit count, incident count, pending/incomplete records count, low-stock item count. Each: icon, large number, label, optional small trend indicator
3. **Alerts section** — three compact list groups, each row using the list-row pattern (Student Number, not name, per the display-privacy rule):
   - Due/upcoming follow-ups (student number, reason, due date, status badge)
   - Frequent-visitor warnings (student number, visit count, `warning`-colored badge — labeled clearly as a warning, never styled to look like a diagnosis)
   - Low-stock / nearing-expiration inventory items (item name — not student-linked, no privacy concern here)
   - **Pending excuse letters (Staff):** no separate list on the Overview since Monday, October 19, 2026 (ADR-011 amendment). The "Pending excuse letters" stat card opens the Visit Log at `?letter=pending` ("Excuse letter: Pending approval" filter, clearable), where each pending visit has "Review Letter". Admin/Principal sees the count without a link. The Dashboard printout still lists the pending letters.
4. **Trends chart** — common complaints by week/month (bar or line chart), plus a symptom-clustering indicator (a simple highlighted marker on the chart, not a separate widget)
5. **Calendar view** — toggle control for weekly / monthly / yearly, a calendar grid showing visit+incident count intensity per day (heatmap-style shading), and any free-text event tag Staff attached to a visit/incident shown as small text on the relevant day
6. **Export/print button**

**Views (Thursday, October 15, 2026 — 19:08, ADR-025, requested by the project manager):** sections 2–5 no longer show all at once. A tab strip under the header and the Staff shortcuts switches between **Overview** (stat cards, the alerts, and Staff's excuse letters; the default), **Trends** (section 4), and **Calendar** (section 5). The Overview tab carries the alert count, so alerts stay noticeable from every view. The view is kept in `?view=`; Print still prints every section in the order above. (Superseded Thursday, October 15, 2026 — 23:04 by ADR-026: Print now produces the "Clinic Overview Report", a period summary on A4, whichever view is open; the button reads "Print overview".)

**Components this exercises:** stat card, list row with status badge, warning badge (with icon, not color alone), bar/line chart, segmented toggle control, calendar grid, date-range picker, icon+text button.

**States:** loading (skeleton cards — this is the universal pattern, see Design-System.md's Feedback & System States, not a Dashboard-specific choice), empty (no data in the selected range — a clear empty-state message, not a blank chart), error (failed to load, with a retry action).

---

### Reference 2 — New Visit Entry
*(Staff, computer or mobile — the core data-entry pattern used throughout the system)*

**Why this one:** the richest **form** screen, including a dynamic embedded panel and an inline prompt at the end — the pattern every other data-entry screen should follow.

**Layout, top to bottom:**
1. **Student header** — name, Student Number, grade level (already identified via search, scan, or manual entry before reaching this screen)
2. **Complaint field** — dropdown or searchable select
3. **Smart Triage panel** — appears dynamically the moment a complaint is selected: a titled checklist card ("Suggested first-aid steps for: [complaint]"), checkboxes, visually distinct from the surrounding form (e.g., `surface` background) so it reads as guidance, not a required field
4. **Treatment field** — textarea
5. **Disposition** — segmented control or radio group: Returned to class / Sent home / Referred to hospital
6. **Follow-up prompt** — a collapsed/inline section at the bottom: "Does this student need a follow-up?" toggle; expanding it reveals a date picker, reason field, and optional notes — this should feel like a natural continuation of the same form, not a popup interruption
7. **Actions** — primary "Save Visit" button, neutral "Cancel" text link

**Components this exercises:** search/select input, dynamic conditional panel, checklist, textarea, segmented control, expandable/collapsible section, date picker, primary + neutral buttons, inline validation.

**States:** validation error (inline, under the specific field, not a generic banner), saving (button shows a loading state), success (a toast or banner confirms the save and clears the form), follow-up section expanded/collapsed.

---

### Reference 3 — Student Profile (Full Record View)
*(Staff sees Edit/Archive actions; PE/Sports Instructor sees the identical layout read-only, no action buttons)*

**Why this one:** the richest **detail/read** screen — the template for viewing any single record in depth (a visit, an incident, an inventory item, a follow-up).

**Layout, top to bottom:**
1. **Header** — full name (large), Student Number (smaller, secondary), grade level, an archived-status badge if applicable
2. **Sectioned content** (tabs or stacked sections, designer's call, but pick one pattern and reuse it everywhere else this applies): Overview (demographics, emergency contact), Medical History (allergies and conditions as tag/chip components), Visit History (chronological list), Incident History (chronological list, including which are Stage 1/incomplete vs complete)
3. **Actions** (Staff only) — Edit, Print, Archive. Archive should visually read as a lower-emphasis, non-destructive action (it's reversible and doesn't delete anything) — don't style it like a destructive button

**Components this exercises:** tag/chip, tabbed or sectioned content, list rows (reused from Reference 1's pattern), status badge, role-conditional action bar.

**States:** loading (skeleton — see Design-System.md's Feedback & System States), a genuinely empty section (e.g., no incident history yet — a calm empty state, not an error), print-preview.

---

### Reference 4 — QR Scan/Lookup Hub + Quick-Actions (Mobile)
*(Staff and PE/Sports Instructor both use a version of this — the only screens in the system designed mobile-first)*

**Why this one:** the only genuinely mobile-native pattern in CLINIQ, and it needs to work one-handed, in a hurry, possibly outdoors (PE field) or in a crowded hallway.

**Layout — Staff version:**
1. **Entry screen** — one large, unmistakable "Scan QR Code" button (camera icon) as the dominant element; a secondary "Enter Student Number manually" link/input below it for the fallback path
2. **Post-identification — Quick-Actions** — student header (full name, since this is a deliberate single lookup), then a grid or stack of large, thumb-friendly action buttons: **Record Visit**, **Log Emergency**, **View Full Profile**, **Dispense Medicine**
3. **Emergency button** — treated as visually distinct and more urgent than the others (a `warning`-or-stronger color treatment, not the calm brand green), and reachable even faster than the others if a scan just happened

**Layout — Instructor version:**
1. Same entry screen (scan or manual entry)
2. Post-identification — a read-only profile card (allergies, conditions, emergency contact, injury/visit history) with **no buttons at all** — make the absence of actions visually obvious (no greyed-out buttons implying near-clickability), just a clean stop-here display

**Components this exercises:** large touch-target buttons (bigger than the desktop button scale), camera/scanner UI, manual-entry fallback input, icon+label button grid, read-only info card, urgency-styled button variant.

**States:** scanning in progress, scan failed/retry, student not found (routes to the manual-entry fallback).

---

### Reference 5 — Incident Entry (Emergency, Two-Stage)
*(Staff only — the pattern for anything with a "fast now, complete later" lifecycle)*

**Why this one:** the only screen in the system with an explicit incomplete/complete status lifecycle, and the one place urgency should visibly shape the design.

**Layout — Stage 1 (fast capture):**
1. **Student header** (from the QR/quick-action flow that led here)
2. **Complaint field** and a **minimal vitals field group** (2–3 key fields only) — deliberately short
3. **Save button** — styled with urgency in mind (bigger, higher-contrast, `warning`-adjacent treatment) since speed matters more than anything else on this screen
4. **Post-save** — a clear "Needs completion" status badge/banner, not just a generic success toast

**Layout — Stage 2 (complete later, same record reopened):**
1. Stage 1 fields shown filled-in (editable or read-only, designer's call), status badge now showing "In progress"
2. **Additional fields unlocked:** full vitals, treatment notes, hospital referral group (destination, transport mode, departure time)
3. **Parent Notification log** — a repeatable list of attempts, each with an outcome (Reached / Not Reached / Voicemail / Left Message) and a timestamp — this is a multi-attempt log pattern, not a single field
4. Status badge changes to "Complete" once saved with all required fields present

**Components this exercises:** urgency-styled primary button, stage/status badge (three states: Needs completion → In progress → Complete), multi-attempt log list, timestamped entries, hospital-referral field group.

**States:** Stage 1 saved/incomplete, Stage 2 in progress, fully complete — these three states should be visually distinguishable at a glance in list views (Reference 1's alert list and any incident log list use this same badge). Reopening a record for Stage 2 skeletons the existing Stage 1 data while it loads, per the universal loading rule in Design-System.md.

---

## 5. Extrapolating to the Rest of the Screens

| If the screen is... | Follow the pattern from... |
|---|---|
| Any other data-entry form (Add/Edit Student, Add/Edit Inventory Item, Add/Edit User, Follow-Up entry) | **Reference 2** (New Visit Entry) |
| Any other detail/single-record view (Inventory Item Detail, Incident Detail, Visit Detail, Follow-Up Detail) | **Reference 3** (Student Profile) |
| Any other list view (Visit Log List, Incident Log List, Follow-Up List, Inventory List, User List) | The list-row + status-badge pattern from **Reference 1**'s alerts section |
| Login, Force Password Change | Simplest form treatment from **Reference 2**, no dynamic panels needed |
| Reports (Monthly, Incident, Health Summary) and print layouts | **Reference 3**'s sectioned-content pattern, adapted for print (no action buttons, no interactive elements) |
| Backup Status screen | **Reference 5**'s status-badge concept (backup status is also a lifecycle: last run → verified → needs attention) |

