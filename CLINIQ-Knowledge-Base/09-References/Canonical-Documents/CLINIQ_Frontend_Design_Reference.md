# CLINIQ — Frontend Design Reference

This is a companion to `CLINIQ_Frontend_Context_Brief.md` (the fuller technical/functional spec), built specifically for **designing the UI**, not coding it. It carries over everything a designer needs — project context, roles, and the full visual design system — then goes deep on **5 reference screens**. Those 5 were picked because between them they use nearly every component type in the system; design them carefully and thoroughly, and the remaining screens should mostly be recombinations of the same patterns rather than new decisions. A mapping table at the end says which reference screen to follow for each of the rest. Brought up to date with ADR-001 to ADR-053 on Thursday, October 29, 2026; it says what the screens should look like, not what is already built. **Words used:** "Staff" is the clinician role (School Clinician in the app); teachers and other employees seen as patients are "staff patients" (ADR-043).

---

## 1. Project Context

CLINIQ is a clinic tracking and monitoring system for Mendez Christian Academy, a private school in Cavite, Philippines, serving 900+ students with a single school nurse and one shared workstation. Users are not technical — the design has to be immediately understandable to someone who has never used a professional web app, without looking childish or oversimplified. Most screens run on one desktop workstation; every screen keeps a usable layout at phone width.

## 2. User Roles & Permissions

| Role | Can do |
|---|---|
| **Staff** (nurse/clinic assistant; School Clinician in the app) | Full read/write on students, staff patients, visits, incidents, inventory; generates and prints reports and Sports Reports; backup; own password |
| **Admin/Principal** | Reads the Clinic Overview Dashboard and Activity calendar (and keeps school events, ADR-042), reports, the Student List and Profile, the Incident Log and Report (ADR-038); can Acknowledge a completed incident report (ADR-048); reads the Audit Log and Backup (ADR-037); manages every account (ADR-033). Never prints; does not see staff patients |
| **PE/Sports Instructor** | No account and no access (ADR-029). An instructor asks the clinician, who decides what to share |

**Display-privacy rule — affects how student names appear across the system:** a screen showing a **list of multiple students at once** (visit logs, incident logs, the dashboard's frequent-visitor section) shows the **masked LRN**, not the name — these are the screens a bystander could glance at on a desktop monitor. A screen showing **one specific, deliberately-identified student** (the full profile, search results, the masterlist) shows the **full name** normally. Design both list rows and detail views with this in mind — a list row template should have no name field at all; a detail/card template should lead with the name prominently. The same applies to the LRN: lists show it masked to the last four digits, and a screen about one opened student, and its printout, show it in full (ADR-040). Lists that include staff patients show the Staff No. instead of a name (ADR-043).

## 3. Full Design System

### Overall Direction
Modern, minimalist, clean, professional, approachable, consistent, easy to scan, smooth and responsive. Some users may struggle reading small text or distinguishing busy interfaces — prioritize clarity and intuitive interaction over visual cleverness, without tipping into looking simplistic. Priority order for any judgment call: **Usability → Clarity → Accessibility → Consistency → Efficiency → Visual polish.**

### Typography
Small-to-medium sizing throughout — never so small it strains reading, never so large it wastes screen space. Build hierarchy with weight, spacing, and placement, not just size jumps. Keep a clear, limited scale: heading, subheading, body, supporting/caption text — and use it identically everywhere. **No rendered text below 12px**, including sidebar group labels, badges and calendar tags; compactness comes from weight and spacing, never from a smaller size.

### Color System
Brand colors extracted by **actually sampling pixels** from the uploaded logo and poster (median-cut quantization, cross-checked across both images) — not eyeballed. The real values are more vivid than a visual guess suggests, especially the yellow, which reads as a near-pure saturated yellow rather than a warm amber gold — that matters for contrast, below.

| Token | Hex (sampled) | Use |
|---|---|---|
| `brand-green` | `#039935` | Primary brand color — outlines, icons, focus rings, large headings. Not a button fill (button labels are small text). **Large text/UI only with white** (3.74:1 — passes the 3.0 threshold for large text/UI, fails 4.5 for normal text) |
| `brand-green-dark` | `#035419` | Sampled from the seal's shield outline. Safe for white text at **any** size (9.19:1) |
| `brand-green-light` | `#8CCC7E` | Sage-green from the logo's circular badges — surface/accent only, pairs with dark text (9.16:1), unusable with white (1.90:1) |
| `brand-yellow` | `#EAEA09` | Secondary/accent — highlights, badges. **Never white text** (1.29:1 — unusable); always `text-primary` or `brand-green-dark` (13.49:1) |
| `brand-yellow-dark` | `#AFAF07` | Hover/active for yellow — still needs dark text even darkened (2.34:1 with white, still fails) |
| `text-primary` | `#1A1A1A` | Body text, headings |
| `text-secondary` | `#616161` | Supporting text |
| `text-muted` | `#9E9E9E` | Placeholders, disabled text, timestamps |
| `background` | `#FFFFFF` | Page background |
| `surface` | `#F5F5F5` | Card/panel background |
| `border` | `#E0E0E0` | Dividers, input borders |

Semantic colors, each contrast-checked rather than assumed:

| Token | Hex | Use | Contrast w/ white |
|---|---|---|---|
| `success` | `#20753A` | Confirmations, success buttons/badges with white text | 5.73:1 — passes. (A brighter `#2E9E4F` only hits 3.43:1 — use that lighter shade as `success-light` for icons/dark-text badges only, not for white text) |
| `warning` | `#A85F00` | Low-stock, nearing-expiration, frequent-visitor flags — anywhere with white text | 4.88:1 — passes. The first candidate, `#ED8B00`, measured **2.53:1 — an outright fail**, not borderline; keep that shade only as `warning-light` for dark-text badges |
| `error` / `destructive` | `#D32F2F` | Delete/irreversible actions, validation errors | 4.98:1 — passes |
| `info` | `#1976D2` | Neutral system messages | 4.60:1 — passes |

**Contrast rules, stated plainly:** small white text only ever goes on `brand-green-dark`, `success`, `warning`, `error`, or `info` — never on `brand-green`, `brand-yellow`, `brand-yellow-dark`, `brand-green-light`, or the `-light` semantic variants. `brand-green` becomes usable with white once the text is large (≈18pt+/14pt bold) or it's an icon or border rather than a text passage. A button's label is 14px text, so a button fill follows the small-text rule: primary buttons are `brand-green-dark`. The `-light` variants exist for badge/accent backgrounds paired with dark text, never white. Never signal meaning with color alone — pair every semantic color with an icon or label, which matters even more here since `brand-green` is both the brand's identity color and the hue family `success` is drawn from.

### Buttons & Shape Language
Small-to-medium, consistent, comfortable to tap/click. Slightly rounded corners — softened modern UI, not sharp squares, not pill-shaped. One consistent radius scale across buttons, inputs, cards, dialogs, containers.

**Concrete radius mapping:** panel surfaces (cards, dialogs/modals, and containers) and interactive controls (buttons, inputs, and dropdowns) use `--radius-md` (8px). Smaller chip-scale elements (badges and menu items) use `--radius-sm` (6px). Do not introduce a separate ordinary panel or control radius.

**Cursor + hover on every interactive element, no exceptions:** `cursor: pointer` on anything clickable (buttons, links, dropdown triggers, navigable rows), never on static elements. A real hover color too, not just the cursor — primary buttons (filled `brand-green-dark`) lighten slightly without dropping their white label below 4.5:1, secondary buttons pick up a light `surface` tint, list rows a subtle `surface` tint. Dropdowns/selects get the same border/radius/focus treatment as text inputs, `appearance: none` plus a custom chevron — never left as native OS styling.

**Hierarchy, using the tokens above:** primary = filled `brand-green-dark`, white text. Secondary = outlined or `surface`-filled, `brand-green` text, no heavy fill. Cancel/neutral = plain text or quiet gray outline. Destructive = filled `error` red, reserved only for genuinely irreversible actions — never for routine "cancel" or "go back."

**Text input standard:** the shared `Input` matches the standard 40px dropdown control: `border-border`, light card shadow, semibold 14px values, and `brand-green` hover/focus treatment. Do not shrink a filter input below its paired standard dropdown.

### Layout & Spacing
Clean, organized, compact, uncluttered — avoid both crowding and excessive whitespace. Consistent spacing/alignment to show relationships; group related information, separate unrelated information visually. **Two page widths only:** 1200px for lists, tables, reports and dashboards, and 720px for single-record forms and detail views stacked in one column.

### Forms
Real labels, not placeholder-only. Group related fields, mark a field as required only when saving is blocked without it (a field that can be saved empty shows no mark, ADR-051), explain confusing fields, give understandable (not technical) validation errors, preserve entered data on validation failure, and move focus to the first invalid field after a failed submit. Cancel asks "Discard unsaved changes?" only when something unsaved has been typed or chosen, with "Keep Editing" as the safe, focused choice (ADR-021). A user should always be able to answer: *What do I enter? → Why? → What happens next?*

### Navigation
Predictable, simple, familiar terminology over jargon. Current location always obvious. Organize around what the user is trying to do, not the app's internal module structure. **Back:** every screen you can get stuck on (detail pages, forms, steps, error and not-found pages) has one Back button at the top left; it returns to where the user came from, with a role-aware fallback when the page was opened directly, says plain "Back" unless the target is always one named screen ("Back to Sign In"), and on a form works exactly like Cancel; main sidebar pages have none, except a list opened by a Dashboard link (ADR-024). **Narrow windows:** the sidebar becomes an "Open navigation" button listing the same pages for that role (ADR-022).

### Accessibility
Readable text, adequate contrast, clear labels, obviously-interactive elements, understandable errors, visible focus states, meaningful feedback, never color alone.

### Feedback & System States
Every screen needs defined looks for: loading, saving, success, error, warning, empty data, disabled, hover, focus, completed action. Messages concise and actionable — "Unable to save changes. Please check the required fields," never a raw technical error.

**Loading = skeleton screens, every page, not spinners, not blank.** Gray placeholder shapes matching the final layout, shown while data is in flight. Makes a load feel faster on the 4GB RAM target hardware, and reassures non-technical staff who'd otherwise read a blank screen as "did it freeze?" Applies to every list, table, card grid, and detail view — including a form pre-filling from a search result, which skeletons the fields being populated rather than sitting blank. A button's own save-in-progress spinner is separate and narrower — it doesn't need a full-page skeleton.

### Modals & Confirmation
Only for real value — don't interrupt for harmless, reversible actions. For destructive/irreversible actions: explain what will happen, visually distinguish the destructive option, make cancellation obvious, never let destructive and safe actions look visually identical.

### Labels, dates and printing
Button labels are Title Case ("Save Changes", "Look Up Student"); page titles use the nurse's words ("Visit Log", "Visit Details", "Incident Log"). One date format everywhere: `Sep 27, 2026 · 9:05 AM` (short month, 12-hour clock, Philippine time); never a raw ISO string and never an internal record id. **Every printout is a purpose-built A4 document** — school letterhead, a line saying what it covers, content in reading order, no app chrome — with the page number ("Page X of Y") as its only footer; printing never fetches new data; a draft excuse letter can't be printed; the Admin/Principal never prints (ADR-026, 038, 046).

### Motion
Subtle, only where it aids usability — state changes, feedback, loading. No bouncing, no decorative motion. Smooth and responsive, not flashy (this also matters for the 4GB RAM target machine — heavy animation is a performance cost here, not just a taste question).

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
1. **Header** — full name (large), the full LRN (smaller, secondary; the profile is the one screen that shows it in full), grade level, an archived-status badge if applicable
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

## 6. Full Screen Inventory

For the complete list of screens with their access rules and behavior — everything not detailed above — see `CLINIQ_Frontend_Context_Brief.md`, Section 4. This reference file intentionally does not repeat that full list; it's meant to sit alongside it, not replace it.
