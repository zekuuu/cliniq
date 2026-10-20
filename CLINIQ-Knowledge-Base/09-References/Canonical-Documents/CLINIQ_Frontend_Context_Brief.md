# CLINIQ — Frontend Development Context Brief

This is the context package to hand to an AI coding agent before it writes any frontend code. Paste this whole document in as a system/context prompt, then layer your own house rules (naming conventions, component patterns, etc.) on top of it.

---

## 1. Project Context (the "why")

- **What it is:** CLINIQ is a clinic tracking and monitoring system for Mendez Christian Academy, a private school in Cavite, Philippines, serving 900+ students with a single school nurse and one shared workstation.
- **Who uses it:** A School Head Nurse and part-time clinic staff (full access), and School Administration/Principal (read-only reports). PE/Sports instructors have no account; they ask the clinician (ADR-029).
- **The constraint that shapes everything:** one existing low-spec Windows 11 workstation (Intel i3 / 4GB RAM), no budget for new hardware, non-technical staff, LAN-only deployment (no public internet). The UI has to be fast on weak hardware and usable by someone who has never used a web app professionally before.
- **Give the agent the two source documents if it can read files:** the CLINIQ Project Plan and the CLINIQ Review of Related Systems (both PDFs you already have). Section 5.3 of the Project Plan is the single source of truth for the module list.

## 2. Tech Stack & Conventions

- **Frontend:** React + TypeScript, styled with Tailwind CSS.
- **Backend (separate, consumed via REST API):** Laravel (PHP), MySQL, Laravel Sanctum for authentication.
- **Build target:** `npm run build` produces static assets served by Laravel/Apache on the local LAN — no SSR, no edge functions, no cloud-only APIs. Assume everything must work with zero internet access.
- **State/data fetching:** tell the agent your preferred library (React Query/TanStack Query, SWR, or plain fetch+context) — this brief intentionally leaves that open since it wasn't fixed in planning.
- **Auth model:** token-based login against Laravel Sanctum; two roles gate the UI (Staff, Admin/Principal — see Section 3). A session lasts **1 week, until the token expires — there is no idle timeout, so do not build inactivity-logout logic in the frontend.** When a token expires, the user simply lands back on Login.

## 3. User Roles & Permissions

| Role | Can do |
|---|---|
| **Staff** (nurse/clinic assistant) | Full read/write on students, visits, incidents, inventory; generates reports; manages own account and other Staff/Admin accounts |
| **Admin/Principal** | Read-only: reports, the Clinic Overview Dashboard. No edit access anywhere |
| **PE/Sports Instructor** | No account and no access (ADR-029). An instructor asks the clinician, who decides what to share |

**Display-privacy rule:** the actual risk isn't a single deliberate lookup — it's a desktop screen showing a **list or pattern across multiple students at once** (a visit log, an incident log, a "frequent visitor" flag) being glanced at by a passerby, who can then attach a specific named student to a health pattern ("he visits a lot, what's going on?"). So: the **Visit Log List, Incident Log List, and the Dashboard's frequent-visitor section default to Student Number**, not full name. A **single deliberate lookup — the full profile page, search results, and the masterlist — shows the full name normally**, since someone has already identified and is looking at one specific student for a legitimate reason. The masterlist shows names freely (it's just a roster) but shouldn't show medical/confidential fields inline — those still require opening the individual profile.

**Note for the agent:** a second external role, **Canteen Staff** (food allergies only), was designed but remains deferred to a future phase. See Section 9.

## 4. Complete Page/Screen Inventory

Give the agent this full list — it maps directly to the two module groups (baseline + enhancements) already finalized in planning.

### Auth & Shell
1. **Login** — username/password, role-aware redirect after login; the session lasts 1 week until the token expires, with no idle timeout
2. **Force Password Change** — shown on first login (backend enforces this)
3. **App Shell/Nav** — role-aware sidebar or nav; Staff sees all modules, Admin sees only Reports + Dashboard. The desktop header shows the signed-in user's name and role with a red, icon-only Log out control carrying an accessible label.

### Dashboard
4. **Staff Dashboard** — today's visit count, low-stock alerts, expiring-medicine alerts, backup status widget, quick "New Visit" action. Delivered on the shared Clinic Overview (#31): Staff get a strip under the header with the "New Visit" action and a backup-status indicator (status + last-backup date) linking to #32
5. **Admin Dashboard** — summary cards linking into Reports and the Clinic Overview Dashboard (no edit actions)

### Student Records
6. **Student List** — searchable/filterable table (name, grade level, flags for incomplete records)
7. **Student Profile (view)** — full record: demographics, medical history, allergies, emergency contact, visit history for that student
8. **Add/Edit Student** — form with required-field validation (full name, grade level, emergency contact, allergies, conditions); triggers duplicate-detection warning on save
9. **Incomplete Records Review Queue** — list of Registrar-imported records flagged incomplete, with who-resolved-it tracking

### Clinic Visit Monitoring
10. **Visit Log List** — daily/date-filterable list of visits; shows **Student Number**, not full name, per the display-privacy rule (a multi-student list, not a single deliberate lookup)
11. **New Visit Entry** — student lookup, complaint, treatment, disposition (returned to class / sent home / referred to hospital); **this is where the Smart Triage checklist panel appears** once a complaint is selected
12. **Visit Detail/Edit**
13. **Excuse Letter Generator** — pulls from a visit record, produces a printable letter; nurse checks and approves it, then it's stored permanently in the student's record as a printable document. **Medical certificates are out of scope** — those are hospital-issued, never generated by CLINIQ; don't conflate the two in the UI or data model
14. **PE/Sports Injury Referral Form** — logs referral, links into the same visit/treatment flow

### Emergency Response
15. **Incident Log List** — shows which incidents are still Stage-1 (fast-capture, incomplete) vs fully completed; shows **Student Number**, not full name, per the display-privacy rule
16. **New Incident Entry — Stage 1 (fast capture)** — student, complaint, immediate vitals only; saves immediately, speed over completeness
16b. **Incident Entry — Stage 2 (complete later)** — same record, opened afterward to fill in full vitals, treatment notes, hospital referral fields (destination, transport, departure time)
17. **Parent Notification Outcome Logging** — timestamped, tied to the incident (Reached / Not Reached / Voicemail / Left Message)
18. **Incident Report View/Print** — generated summary for the nurse to review, sign, and print

### Follow-Up Handling (feature spanning Clinic Visit Monitoring + Emergency Response)
18b. **Follow-Up Prompt (Staff)** — appears inline at the end of saving #11 (New Visit Entry) or #16 (Incident Entry, Stage 1): "Does this student need a follow-up?" If yes, capture follow-up date, reason/instruction, and optional notes in the same flow — not a separate screen Staff has to remember to visit afterward
18c. **Follow-Up List View (Staff)** — all follow-ups, filterable by status (Pending / Completed / Missed / Cancelled); each pending row has one status control to mark it Completed, Missed, or Cancelled (Missed and Cancelled ask for confirmation; Completed, the expected outcome, does not). Shows **Student Number**, not full name, per the display-privacy rule (multi-student list). There is no separate follow-up detail screen

### Reports Generation
19. **Monthly Report View/Generate**
20. **Incident Report Archive**
21. **Health Summaries View**
(All three need print/export-friendly layouts — this is a paper-replacement feature, so print CSS matters.)

### (Removed) Screens #22–26
The QR screens (#22–24, #26) were removed with the QR feature (ADR-027), and the phone Emergency screen (#25) with the phone-only screens (ADR-033). Their numbers are kept so later screens keep theirs; Staff start an incident from Report Incident (#16).

### Smart Triage Quick-Reference (enhancement)
27. Not a standalone page — a checklist panel/modal embedded in **New Visit Entry** (#11), triggered by the selected complaint type

### Medicine & Supply Inventory Tracker (enhancement)
28. **Inventory List** — items, current stock, expiration dates, low-stock/expiring flags
29. **Add/Edit Inventory Item**
30. **Dispense/Log Usage** — decrements stock, ties to a visit if applicable

### Clinic Overview Dashboard (enhancement, expanded from "Health Trends Dashboard"; Staff + Admin-facing)
31. **Dashboard View** — total visit/incident counts, pending/incomplete records (pulled from #9's queue), common complaints by week/month, symptom-clustering flag, frequent-visitor flag identified by **Student Number** per the display-privacy rule (a warning only, never a diagnosis), plus a **calendar view** of visit counts toggleable weekly/monthly/yearly. Charts should have a simple table fallback for the low-spec machine

### Backup Verification Assistant (enhancement)
32. **Backup Status Screen** — last backup date/size/status, plus a plain-language guided recovery checklist (Staff-only, likely nurse-only)

### User Management
33. **User List** — Staff only; Staff and Admin/Principal accounts (PE/Sports Instructors have no account, ADR-029)
34. **Add/Edit User & Role Assignment**

**Total: ~30 screens/views** (accounting for the two-stage incident entry; the four QR screens and the phone Emergency screen were removed, ADR-027 and ADR-033), several of which (Excuse Letter, Incident Report, Monthly Report) also need a distinct print layout — call that out to the agent explicitly since print CSS is easy to forget.

## 5. Data Entities the Frontend Should Expect

Give the agent this even without a finalized API spec, so component props and forms are built against realistic shapes:

- **Student** — id, **studentNumber** (format `YYYY-NNNNN`, system-generated at creation), full name, grade level, contact info, allergies, medical conditions, an ordered emergency-contact list (at least one required; first is primary; each has name, relationship, phone, and verification state), record-complete flag, **archived flag** (archived students stay in the database but are excluded from active lists/search by default)
- **User** — id, name, username, role (`staff` / `admin`), last login
- **Visit** — id, student, date/time, complaint, treatment, disposition, staff who logged it, **eventTag** (optional free text, e.g. "MCA Dance Program" — the lightweight version of calendar context described below, not a managed entity of its own)
- **Incident** — id, student, time, complaint, vitals, hospital referral fields, parent-notification log (array of attempts with outcome + timestamp), **stage** (`1`=fast-capture / `2`=complete) so the UI can show which incidents still need completion, **eventTag** (same optional free-text field as Visit)
- **FollowUp** — id, student, related record (visit or incident id + type), follow-up date, reason/monitoring instruction, status (`pending` / `completed` / `missed` / `cancelled`), notes, created-by (staff)
- **InventoryItem** — id, name, category (medicine/supply), current stock, unit, expiration date, low-stock threshold
- **Report** — type (monthly/incident/health-summary), date range, generated file/data
- **BackupLog** — last run timestamp, file size, status (ok/failed), verified-by
- **AuditLogEntry** — user, action type (login/logout/submit/approve/create/update/delete/archive/print), target record, timestamp, and an optional summary that names fields or states only, never their values (e.g. "Updated allergies"; omitted when the action and target already say everything — ADR-017) — written for every action across every module

**Note on the calendar:** there is deliberately no separate "SchoolEvent" entity this phase — `eventTag` is a free-text field on Visit/Incident, not a managed list. A fuller, independently-manageable school-events calendar is a documented future decision (see Section 9), not something to build now.

## 6. Key Interaction Flows Worth Getting Right

- **New Visit → Smart Triage:** selecting a complaint (e.g. "fainting") surfaces a standardized checklist inline, not a separate page — it should feel like part of filling the form, not an interruption.
- **Duplicate detection:** on saving a new student, if name+grade level matches an existing record, block save and show a confirmation modal rather than silently creating a duplicate.
- **Low-stock / expiring-item alerts:** should be visible from the Staff Dashboard, not buried only inside the Inventory page.
- **Report Incident → Stage 1 save:** starting an incident should reach a savable form in as few steps as possible — only complaint and immediate vitals required. Saving Stage 1 must succeed even if Stage 2 fields are empty; don't validate the full form up front or you defeat the point of the two-stage design.

## 7. Design & UX Guidelines

These are system-wide frontend design requirements — they should guide every UI/UX decision across all ~35 screens, not just the ones called out explicitly elsewhere in this brief. Apply them consistently rather than re-deriving a look-and-feel per screen.

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
| `warning` | `#A85F00` | Low-stock, nearing-expiration, frequent-visitor warnings — anywhere carrying white text | 4.88:1 — passes normal text | The first candidate (`#ED8B00`) measured **2.53:1 — an outright fail**, not just borderline. Genuinely don't use that shade with white text anywhere |
| `warning-light` | `#ED8B00` | Badge/icon backgrounds paired with dark text only | — (used with dark text, not white) | |
| `error` / `destructive` | `#D32F2F` | Delete/irreversible actions, validation errors, missed follow-ups | 4.98:1 — passes | Outside the brand palette entirely — unambiguous |
| `info` | `#1976D2` | Neutral system messages | 4.60:1 — passes | The one cool hue in the palette, reserved for neutral/informational only |

**Contrast rules, stated plainly:**
- Small white text: only ever on `brand-green-dark`, `success`, `warning`, `error`, or `info` — never on `brand-green`, `brand-yellow`, `brand-yellow-dark`, `brand-green-light`, `success-light`, or `warning-light`.
- Large text (≈18pt+, or 14pt+ bold) and non-text UI such as icons and borders: `brand-green` becomes usable with white on top of the above list. A button's label is text, not a UI component, so a button fill follows the small-text rule above: primary buttons are `brand-green-dark`.
- The `-light` variants and `brand-green-light` exist specifically for badge/accent backgrounds — always pair them with `text-primary`, never white.
- Per the Accessibility guidance already in this document: pair every semantic color with an icon or label, never color alone — this matters even more here since `brand-green` is both the brand's primary identity color *and* the family `success` is drawn from.

### Layout & Spacing
Clean, organized, compact, comfortable, uncluttered — avoid both extremes: crowded/hard-to-interact-with, and so much whitespace the system feels inefficient. Use consistent spacing and alignment to show relationships between elements; group related information and visually separate unrelated information.

**Two page containers, and only two** — both are real tokens in `frontend/src/index.css`, centered in the content area:

| Token | Width | Use |
|---|---|---|
| `--container-page-wide` (`max-w-page-wide`) | 1200px | Lists, tables, reports, and dashboards |
| `--container-page-narrow` (`max-w-page-narrow`) | 720px | Single-record forms and detail views, stacked in one column |

Don't introduce a third width for one screen.

### Forms
Should be especially intuitive for non-technical users. Use real labels, not placeholder-text-only. Group related fields, clearly mark required fields, explain a confusing field when necessary, and give understandable validation messages rather than exposing raw technical errors. Preserve entered data when validation fails, where possible. A user should always be able to answer: *What do I enter? → Why am I entering it? → What happens next?*

### Navigation
Predictable and simple. Familiar terminology over technical jargon. Make the current location obvious, keep important functionality easy to discover, keep recurring controls in a consistent place, and organize navigation around what the user is trying to do — not around the app's internal module structure.

### Accessibility
Treat as part of the normal design process, not an optional pass at the end. Ensure readable text, adequate contrast, clear labels, obviously-interactive elements, understandable error messages, visible focus/interaction states, meaningful feedback, and no dependence on color alone.

### Feedback & System States
Clearly communicate what's happening: loading, saving, success, error, warning, empty data, disabled, hover, focus, and completed-action states all need a defined look (hover and cursor specifics: see Buttons, Controls & Shape Language above — this was previously stated too vaguely and got missed in the first Dashboard build). Messages should be concise and actionable — prefer "Unable to save changes. Please check the required fields." over surfacing a raw database/API error.

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
- **Never show an internal record id** (`visit-0001`, `incident-0022`) on anything a user sees or prints. Describe the record by what Staff recognise — Student Number and time. A human-facing reference number for printed documents is a backend-phase item.

### Visual Hierarchy
Every page should let the user quickly answer: Where am I? What is this page for? What information matters? What actions are available? Which action is most relevant? What happened after I acted? Build this with size, weight, spacing, position, and contrast — not by making everything large, bold, or colorful.

### Implicit Decisions
Where a requirement doesn't specify behavior, use established usability judgment: clear empty states, tooltips where genuinely necessary, icon+text pairing when it helps, hover/focus/disabled/loading states, graceful error recovery, success feedback, logical grouping, responsive behavior, keyboard accessibility, and protection against accidental destructive actions. Don't add an element just because it looks good — every element needs a usability reason to exist.

### CLINIQ-Specific Implementation Notes
- Must render fast on a 4GB RAM machine — keep bundle size and animation weight modest; avoid heavy chart libraries if a lighter one covers the Clinic Overview Dashboard's needs.
- Tailwind CSS for styling; keep the palette simple and consistent across all ~35 screens.
- Print layouts (excuse letters, incident reports, monthly reports) are first-class, not an afterthought.
- The system is primarily used on the one desktop workstation; every screen still keeps a usable responsive layout down to phone width.

## 8. Non-Functional Requirements

- No external CDN dependencies that require live internet access at runtime (LAN-only deployment).
- RA 10173 (Philippine Data Privacy Act) awareness: only Staff see student health data; every login and action is logged (see the AuditLogEntry entity above) so access stays attributable and auditable. PE/Sports Instructors have no account (ADR-029).
- Role-based UI gating must be enforced by the backend too — don't rely on hiding buttons in the frontend as the only access control.

## 9. Explicitly Out of Scope — tell the agent NOT to build these

- Parent/guardian self-service portal or app
- Automated SMS/push notifications (parent contact stays a manual phone call, logged manually)
- Billing/invoicing of any kind
- Barcode/RFID scanning, purchase-order or vendor management
- Multi-location/multi-room inventory views (single clinic room only)
- Remote/off-campus access beyond the school LAN (a future phase, not this build)
- **A separate scoped role for Canteen Staff** — designed but deferred. When it's picked up later: a scoped sign-in letting canteen staff enter a Student Number to see only food allergies/restrictions. Nothing about the current build needs to change to support this later.

## 10. Supporting Reference Documents

Point the agent to these if it can ingest files — they contain the full reasoning behind every item above:
- **CLINIQ Project Plan** (Sections 5.1–5.3 especially — Requirements, Resources, System Overview)
- **CLINIQ Review of Related Systems** (useful if the agent needs to understand why a feature exists — each is traced back to a specific competitor gap or SWOT finding)
