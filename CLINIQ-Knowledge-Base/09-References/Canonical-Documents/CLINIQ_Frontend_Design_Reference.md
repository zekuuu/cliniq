# CLINIQ — Frontend Design Reference

This is a companion to `CLINIQ_Frontend_Context_Brief.md` (the fuller technical/functional spec), built specifically for **designing the UI**, not coding it. It carries over everything a designer needs — project context, roles, and the full visual design system — then goes deep on **5 reference screens**. Those 5 were picked because between them they use nearly every component type in the system; design them carefully and thoroughly, and the remaining ~30 screens should mostly be recombinations of the same patterns rather than new decisions. A mapping table at the end says which reference screen to follow for each of the rest.

---

## 1. Project Context

CLINIQ is a clinic tracking and monitoring system for Mendez Christian Academy, a private school in Cavite, Philippines, serving 900+ students with a single school nurse and one shared workstation. Users are not technical — the design has to be immediately understandable to someone who has never used a professional web app, without looking childish or oversimplified. Most screens run on one desktop workstation; every screen keeps a usable layout at phone width.

## 2. User Roles & Permissions

| Role | Can do |
|---|---|
| **Staff** (nurse/clinic assistant) | Full read/write on everything — students, visits, incidents, inventory; generates reports; manages accounts |
| **Admin/Principal** | Read-only: reports and the Clinic Overview Dashboard. Manages every account (ADR-033); no other edit access |
| **PE/Sports Instructor** | No account and no access (ADR-029). An instructor asks the clinician, who decides what to share |

**Display-privacy rule — affects how student names appear across the system:** a screen showing a **list of multiple students at once** (visit logs, incident logs, the dashboard's frequent-visitor section) shows the **masked LRN**, not the name — these are the screens a bystander could glance at on a desktop monitor. A screen showing **one specific, deliberately-identified student** (the full profile, search results, the masterlist) shows the **full name** normally. Design both list rows and detail views with this in mind — a list row template should have no name field at all; a detail/card template should lead with the name prominently.

## 3. Full Design System

### Overall Direction
Modern, minimalist, clean, professional, approachable, consistent, easy to scan, smooth and responsive. Some users may struggle reading small text or distinguishing busy interfaces — prioritize clarity and intuitive interaction over visual cleverness, without tipping into looking simplistic. Priority order for any judgment call: **Usability → Clarity → Accessibility → Consistency → Efficiency → Visual polish.**

### Typography
Small-to-medium sizing throughout — never so small it strains reading, never so large it wastes screen space. Build hierarchy with weight, spacing, and placement, not just size jumps. Keep a clear, limited scale: heading, subheading, body, supporting/caption text — and use it identically everywhere.

### Color System
Brand colors extracted by **actually sampling pixels** from the uploaded logo and poster (median-cut quantization, cross-checked across both images) — not eyeballed. The real values are more vivid than a visual guess suggests, especially the yellow, which reads as a near-pure saturated yellow rather than a warm amber gold — that matters for contrast, below.

| Token | Hex (sampled) | Use |
|---|---|---|
| `brand-green` | `#039935` | Primary — buttons, active nav, headers. **Large text/UI only with white** (3.74:1 — passes the 3.0 threshold for large text/UI, fails 4.5 for normal text) |
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

**Contrast rules, stated plainly:** small white text only ever goes on `brand-green-dark`, `success`, `warning`, `error`, or `info` — never on `brand-green`, `brand-yellow`, `brand-yellow-dark`, `brand-green-light`, or the `-light` semantic variants. `brand-green` becomes usable with white once the text is large (≈18pt+/14pt bold) or it's a button fill/icon rather than a text passage. The `-light` variants exist for badge/accent backgrounds paired with dark text, never white. Never signal meaning with color alone — pair every semantic color with an icon or label, which matters even more here since `brand-green` is both the brand's identity color and the hue family `success` is drawn from.

### Buttons & Shape Language
Small-to-medium, consistent, comfortable to tap/click. Slightly rounded corners — softened modern UI, not sharp squares, not pill-shaped. One consistent radius scale across buttons, inputs, cards, dialogs, containers.

**Concrete radius mapping:** panel surfaces (cards, dialogs/modals, and containers) and interactive controls (buttons, inputs, and dropdowns) use `--radius-md` (8px). Smaller chip-scale elements (badges and menu items) use `--radius-sm` (6px). Do not introduce a separate ordinary panel or control radius.

**Cursor + hover on every interactive element, no exceptions:** `cursor: pointer` on anything clickable (buttons, links, dropdown triggers, navigable rows), never on static elements. A real hover color too, not just the cursor — primary buttons to `brand-green-dark`, secondary to a light `surface` tint, list rows to a subtle `surface` tint. Dropdowns/selects get the same border/radius/focus treatment as text inputs, `appearance: none` plus a custom chevron — never left as native OS styling.

**Hierarchy, using the tokens above:** primary = filled `brand-green`, white text (button-label text counts as large/UI text at this contrast level — see the contrast rules above for exactly where that line is). Secondary = outlined or `surface`-filled, `brand-green` text, no heavy fill. Cancel/neutral = plain text or quiet gray outline. Destructive = filled `error` red, reserved only for genuinely irreversible actions — never for routine "cancel" or "go back."

**Text input standard:** the shared `Input` matches the standard 40px dropdown control: `border-border`, light card shadow, semibold 14px values, and `brand-green` hover/focus treatment. Do not shrink a filter input below its paired standard dropdown.

### Layout & Spacing
Clean, organized, compact, uncluttered — avoid both crowding and excessive whitespace. Consistent spacing/alignment to show relationships; group related information, separate unrelated information visually.

### Forms
Real labels, not placeholder-only. Group related fields, mark required fields clearly, explain confusing fields, give understandable (not technical) validation errors, preserve entered data on validation failure. A user should always be able to answer: *What do I enter? → Why? → What happens next?*

### Navigation
Predictable, simple, familiar terminology over jargon. Current location always obvious. Organize around what the user is trying to do, not the app's internal module structure.

### Accessibility
Readable text, adequate contrast, clear labels, obviously-interactive elements, understandable errors, visible focus states, meaningful feedback, never color alone.

### Feedback & System States
Every screen needs defined looks for: loading, saving, success, error, warning, empty data, disabled, hover, focus, completed action. Messages concise and actionable — "Unable to save changes. Please check the required fields," never a raw technical error.

**Loading = skeleton screens, every page, not spinners, not blank.** Gray placeholder shapes matching the final layout, shown while data is in flight. Makes a load feel faster on the 4GB RAM target hardware, and reassures non-technical staff who'd otherwise read a blank screen as "did it freeze?" Applies to every list, table, card grid, and detail view — including a form pre-filling from a search result, which skeletons the fields being populated rather than sitting blank. A button's own save-in-progress spinner is separate and narrower — it doesn't need a full-page skeleton.

### Modals & Confirmation
Only for real value — don't interrupt for harmless, reversible actions. For destructive/irreversible actions: explain what will happen, visually distinguish the destructive option, make cancellation obvious, never let destructive and safe actions look visually identical.

### Motion
Subtle, only where it aids usability — state changes, feedback, loading. No bouncing, no decorative motion. Smooth and responsive, not flashy (this also matters for the 4GB RAM target machine — heavy animation is a performance cost here, not just a taste question).

---

## 4. The 5 Reference Screens

Design these five in full detail first. Everything else in the system should be a recombination of what's established here.

### Reference 1 — Clinic Overview Dashboard
*(Staff and Admin/Principal both see this; Admin's is fully view-only — same layout, no clickable resolve/complete actions)*

**Why this one:** the single most component-dense screen in the system — this is where most of your component library gets exercised at once.

**Layout, top to bottom:**
1. **Header** — page title, current date, a date-range filter control
   - **Staff shortcuts (Staff only, directly under the header):** a quick **New Visit** action and a minimal **backup-status indicator** (status + last-backup date) that links to the full Backup screen. Both are navigation, not edits, so the Dashboard stays view-only. Admin/Principal doesn't see this strip, since that role can open neither destination.
2. **Stat card row** — 3–4 cards: today's visit count, incident count, pending/incomplete records count, low-stock item count. Each: icon, large number, label, optional small trend indicator
3. **Alerts section** — three compact list groups, each row using the list-row pattern (masked LRN, not name, per the display-privacy rule):
   - Due/upcoming follow-ups (masked LRN, reason, due date, status badge)
   - Frequent-visitor warnings (masked LRN, visit count, `warning`-colored badge — labeled clearly as a warning, never styled to look like a diagnosis)
   - Low-stock / nearing-expiration inventory items (item name — not student-linked, no privacy concern here)
   - **Excuse letters awaiting approval (Staff only, below the alert groups):** shown only while drafts exist. Each row shows the masked LRN and links to its letter page. It is navigation only, so the Dashboard stays view-only and writes no audit entries. Admin/Principal doesn't see it, since that role can't open the letter page (ADR-011 amendment, October 07, 2026).
4. **Trends chart** — common complaints by week/month (bar or line chart), plus a symptom-clustering indicator (a simple highlighted marker on the chart, not a separate widget)
5. **Calendar view** — toggle control for weekly / monthly / yearly, a calendar grid showing visit+incident count intensity per day (heatmap-style shading), and any free-text event tag Staff attached to a visit/incident shown as small text on the relevant day
6. **Export/print button**

**Components this exercises:** stat card, list row with status badge, warning badge (with icon, not color alone), bar/line chart, segmented toggle control, calendar grid, date-range picker, icon+text button.

**States:** loading (skeleton cards, not a blank screen), empty (no data in the selected range — a clear empty-state message, not a blank chart), error (failed to load, with a retry action).

---

### Reference 2 — New Visit Entry
*(Staff, computer or mobile — the core data-entry pattern used throughout the system)*

**Why this one:** the richest **form** screen, including a dynamic embedded panel and an inline prompt at the end — the pattern every other data-entry screen should follow.

**Layout, top to bottom:**
1. **Student header** — name, masked LRN, grade level (picked on the form)
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
*(Staff sees Edit/Archive actions)*

**Why this one:** the richest **detail/read** screen — the template for viewing any single record in depth (a visit, an incident, an inventory item, a follow-up).

**Layout, top to bottom:**
1. **Header** — full name (large), the full LRN (smaller, secondary; the profile is the one screen that shows it in full), grade level, an archived-status badge if applicable
2. **Sectioned content** (tabs or stacked sections, designer's call, but pick one pattern and reuse it everywhere else this applies): Overview (demographics, emergency contact), Medical History (allergies and conditions as tag/chip components), Visit History (chronological list), Incident History (chronological list, including which are Stage 1/incomplete vs complete)
3. **Actions** (Staff only) — Edit, Print, Archive. Archive should visually read as a lower-emphasis, non-destructive action (it's reversible and doesn't delete anything) — don't style it like a destructive button

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
2. **Complaint field** and a **minimal vitals field group** (2–3 key fields only) — deliberately short
3. **Save button** — styled with urgency in mind (bigger, higher-contrast, `warning`-adjacent treatment) since speed matters more than anything else on this screen
4. **Post-save** — a clear "Needs completion" status badge/banner, not just a generic success toast

**Layout — Stage 2 (complete later, same record reopened):**
1. Stage 1 fields shown filled-in (editable or read-only, designer's call), status badge now showing "In progress"
2. **Additional fields unlocked:** full vitals, treatment notes, hospital referral group (destination, transport mode, departure time)
3. **Parent Notification log** — a repeatable list of attempts, each with an outcome (Reached / Not Reached / Voicemail / Left Message) and a timestamp — this is a multi-attempt log pattern, not a single field
4. Status badge changes to "Complete" once saved with all required fields present

**Components this exercises:** urgency-styled primary button, stage/status badge (three states: Needs completion → In progress → Complete), multi-attempt log list, timestamped entries, hospital-referral field group.

**States:** Stage 1 saved/incomplete, Stage 2 in progress, fully complete — these three states should be visually distinguishable at a glance in list views (Reference 1's alert list and any incident log list use this same badge).

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

## 6. Full Screen Inventory

For the complete list of all ~37 screens with their access rules and behavior — everything not detailed above — see `CLINIQ_Frontend_Context_Brief.md`, Section 4. This reference file intentionally does not repeat that full list; it's meant to sit alongside it, not replace it.
