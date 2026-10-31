# Development Phases — Frontend & Backend

The execution roadmap agents should actually follow, one phase at a time. This is more granular and agent-actionable than the Project Plan's Work Breakdown Structure (Section 6.2, which is sprint-level, written for a Gantt chart and a professor, not a build sequence) — that document still governs the academic timeline; this one governs what an agent opens `AGENTS.md`/`CLAUDE.md` and then actually does.

**Read `AGENTS.md` at the repo root before starting any phase below** — the before/during/after workflow, the timestamp rule, and the source-of-truth hierarchy all still apply per-phase, not just per-task. **Backend phases (B0 to B10) are built the way [`Backend-Loop-Engineering.md`](./Backend-Loop-Engineering.md) describes**, on a separate `backend` branch that changes only `backend/` (ADR-056).

---

## 0. Two Blocking Decisions — Resolved for Frontend Builds

Both choices are now recorded in ADR-012 and ADR-013. They were implemented during the frontend build sequence and should not be silently replaced by a different library later.

- **Data-fetching library:** plain promise-based `useAsyncData` with feature-local `api/` modules; see ADR-013.
- **Routing library:** React Router v7 with path-based routes and lazy-loaded guarded route entries; see ADR-012.

---

## Frontend Phases

Built first, per the interface-construction-first methodology (ADR-006) — shown to the client for feedback before backend logic is finalized. Uses mock/stub data throughout until the matching backend phase lands.

### Phase F0 — Environment, Design Foundation, Shared Components
1. Resolve the two blocking decisions above.
2. Run the actual Vite scaffold into the already-organized `frontend/` skeleton (`CLINIQ-Knowledge-Base/04-Development/Environment-Setup.md` has the exact commands — still not executed as of this writing).
3. Install confirmed dependencies: Tailwind, `chart.js` + `react-chartjs-2`, Vitest + RTL, plus whatever Phase 0's two decisions resolved to.
4. Encode the design tokens from `03-Design/Design-System.md` into Tailwind config / CSS custom properties — the sampled, contrast-verified colors (`brand-green #039935`, `brand-green-dark #035419`, `brand-yellow #EAEA09`, the semantic set), not placeholder values.
5. Build the generic shared components in `src/components/` — Button (with the primary/secondary/cancel/destructive hierarchy already specified), Card, Badge (with the icon+color+label pattern, never color alone), Input, Modal — the actual design-system-level pieces every screen will reuse.
6. Build `src/layouts/` — the role-aware App Shell/Nav (Staff sees everything, Admin sees only Reports+Dashboard).

**Definition of done:** a blank app shell renders, role-aware nav switches correctly with mock auth state, and every shared component from `components/` exists and matches the sampled color tokens — nothing screen-specific yet.

### Phase F1 — The 5 Reference Screens (Build These Carefully; Everything After Reuses Them)
Build in this order — each establishes a pattern the next several phases lean on. Full detail for each: `03-Design/Reference-Screens.md`.
1. **Student Profile** (`features/student-records/`) — establishes the detail/read-record pattern every other detail view will follow.
2. **New Visit Entry** (`features/clinic-visits/`) — establishes the core form pattern, including the dynamic first-aid checklist panel and the inline Follow-Up prompt.
3. **Incident Entry, two-stage** (`features/emergency-response/`) — establishes the urgency-styled, status-lifecycle pattern (Stage 1 fast-capture → Stage 2 complete-later badge).
4. *(Built, then removed with the QR feature, ADR-027.)* The QR Scan/Lookup Hub reference screen.
5. **Clinic Overview Dashboard** (`features/dashboard/`) — the most component-dense screen; built last in this phase specifically because it reuses stat cards, badges, and list-row patterns from the first four.

**Definition of done:** all 5 screens work end-to-end against mock data, an accessibility pass (`.claude/skills` — `better-accessibility`, `claude-a11y-skill`) has been run against each, and — per ADR-006 — these are what actually get shown to the client for feedback before continuing.

### Phase F2 — Extrapolate to Remaining Screens, Module by Module
Follow the mapping table already defined in `03-Design/Reference-Screens.md` (§5, "Extrapolating to the Rest of the Screens") rather than re-deriving patterns from scratch. Suggested module order, matching the WBS's sprint grouping:
1. **Student Records** remainder — Student List (masterlist, full names per the display-privacy rule), Add/Edit Student, Incomplete Records Queue.
2. **Clinic Visit Monitoring** remainder — Visit Log List (masked LRN, not name — glanceable multi-student list), Visit Detail/Edit, Excuse Letter Generator (+ print layout), PE/Sports Referral Form.
3. *(Built, then removed with the QR feature, ADR-027.)* The rest of the QR Digital Health ID screens.
4. **Emergency Response** remainder — Incident Log List (masked LRN, status badge from the Phase F1 pattern), Parent Notification Outcome Logging, Incident Report View/Print.
5. **Medicine & Supply Inventory Tracker** — Inventory List, Add/Edit Item, Dispense/Log Usage (the stock-flow mechanics from `Modules-and-Features` §8 — threshold check, independent low-stock/nearing-expiry badges).
6. **Reports Generation** — Monthly / Incident register / Complaint summary views, all print-layout-first.
7. **User Management** — User List, Add/Edit User & Role Assignment (Staff, Admin/Principal).
8. **Backup Verification Assistant** — status screen, guided recovery checklist.

**Definition of done per module:** screens match their mapped reference pattern, the display-privacy rule is applied correctly (check against `.claude/skills/cliniq-display-privacy/`), and an `08-Logs/Agent-Sessions/` entry exists per the standard format.

### Phase F3 — Polish & Client Demo Prep
Keyboard shortcuts (`04-Development/Keyboard-Shortcuts-and-Efficiency.md`) wired up for the highest-frequency actions (jump to New Visit, jump to student search, save-and-new). Full accessibility sweep (`interface-review` skill) across every screen, not just the 5 references. Responsive check on the phone screens specifically — the rest of the app is desktop-primary by design, not by oversight.

---

## Backend Phases

Some backend work can't wait for frontend to finish (auth, schema, audit trail) — these start early and run alongside the frontend phases, not strictly after them. See "How These Interleave" below.

### Phase B0 — Environment & Scaffold
Run the actual Laravel scaffold into `backend/` (commands in `Environment-Setup.md`). Install Sanctum. Confirm the target XAMPP install's PHP version before picking a Laravel version (Laravel 11+ needs PHP 8.2+ — a check, not an assumption). Set up the modular folder structure (`app/Modules/<Module>/`, `app/Shared/`) and its PSR-4 mapping in `composer.json` before any module code gets written — see `06-Decisions/ADR-009-Modular-Backend-Architecture.md`. Retrofitting this after B4+ have already scattered code into Laravel's default flat structure is real, avoidable rework. **Prepared first, as the foundation round (ADR-056):** the scaffold, the modular folders, configuration, CORS, Sanctum SPA settings, middleware, one error format, the audit-log service contract and a health route, with no tables, and nothing connected to the frontend. A written API contract and an ERD review come before it. See the checklist in `Backend-Loop-Engineering.md`.

### Phase B1 — Database Schema — Awaiting Design Approval
**Don't guess or implement a schema.** [`ERD.md`](../02-Architecture/Database/ERD.md) is a proposed draft, not final or approved; it must be reviewed and approved before migrations begin. Inferring or extending it from the frontend-facing entity shapes is not a substitute for that team decision. Once the schema is approved, build migrations from it directly, consistent with the entity shapes already fixed in `CLINIQ_Frontend_Context_Brief.md` §5 (Student, User, Visit, Incident, FollowUp, InventoryItem, Report, BackupLog, AuditLogEntry) — those shapes are real commitments already made; the schema should match them, not reinvent them.

See `04-Development/Backend-Readiness-Checklist.md` for the current pre-migration readiness checklist.

### Phase B2 — Auth & RBAC
Sanctum SPA authentication. Two roles (Staff, Admin/Principal; PE/Sports Instructors have no account, ADR-029) with the specific per-module permission matrix already fully documented in `01-Requirements/Features/Module-Overview.md`'s Access Summary table — this is a direct implementation target, not a design task. Consider a Spatie `laravel-permission`-based approach (flagged in `Skills-Setup.md`) given how closely CLINIQ's access model matches that package's shape. Session lifetime is **1 week until the token expires, with no idle timeout** (`06-Decisions/ADR-015`) — set the expiry accordingly (**ADR-056 chose SPA cookie mode**, so this is the session lifetime, 10080 minutes, and not a token `expiration`).

### Phase B3 — Audit Trail Infrastructure (Build Early, Not Late)
Build this as reusable middleware/service/trait *before* the module APIs below, so each subsequent phase hooks into existing infrastructure instead of retrofitting logging afterward. Must capture: who, what action type, what target record, when — for every login, scan, submission, approval, and create/update/delete/archive, across every module (`Modules-and-Features`, "Audit Trail" section; `.claude/skills/cliniq-audit-trail/`).

### Phase B4 — Student Records API
CRUD, LRN validation (12 digits, unique; ADR-028), duplicate detection (name + grade level), archive (not delete) semantics.

### Phase B5 — Clinic Visit Monitoring API
Visit CRUD, Excuse Letter generation/approval workflow, Follow-Up Handling endpoints (shared with B7 — same feature, two entry points).

### Phase B6 — (Removed)
The QR Digital Health ID API was removed with the feature (ADR-027). The phase number is kept so later phases keep theirs.

### Phase B7 — Emergency Response API
Two-stage incident endpoints (Stage 1 minimal-fields save; Stage 2 completion). Hospital referral, parent-notification log (multi-attempt, timestamped). Follow-Up Handling endpoints (shared with B5).

### Phase B8 — Inventory API
The stock-flow logic exactly as specified in `Modules-and-Features` §8: dispense decrements + auto threshold-check; restock is a separate action, increments + updates the one expiration date tracked per item; a dispense that would go negative warns but does not block the save (a deliberate, already-decided behavior — don't "fix" this into a hard block).

### Phase B9 — Dashboard & Reports API
Aggregation queries for the Clinic Overview Dashboard (counts, trends, frequent-visitor flags by masked LRN, due/upcoming follow-ups computed on request — not a background job, since none exists in this architecture). Monthly/Incident/Health Summary report generation.

**Holiday sync job (ADR-020).** A monthly scheduled job fetches this year's and next year's nationwide Philippine holidays when internet is available, stores them for `getHolidays`, keeps the last good data on failure, updates `lastUpdated`, and raises a warning when the last successful sync is stale (about 45 days) or next year's list is still missing in December. This is the one scheduled job in this architecture, and it never blocks a page load. The source is still open (ADR-020 lists two candidates); before choosing, read the source code, call it, compare its current-year output with the official proclamation, check Islamic and special days, test failure cases (site down, empty result, layout change), pin versions, and keep last-good data.

### Phase B10 — User Management & Backup Verification API
Account CRUD for all three roles. Backup-status endpoint reading whatever the `mysqldump`-based backup mechanism (Project Plan §5.3) actually produces — this is the same tracked-file-size signal that Modules & Features already names as the future trigger for building retention-purge tooling (`02-Architecture/Database/Data-Retention-Policy.md`).

---

## How Frontend and Backend Interleave

Per ADR-006, frontend leads and backend follows *per feature*, not "all frontend, then all backend":

| Frontend phase | Matching backend phase | Notes |
|---|---|---|
| F0 | B0 | Can run in parallel — no dependency |
| — | B1 (schema) | Blocked independently on the SRS; doesn't block F0/F1, since F1 runs on mock data |
| — | B2, B3 (auth, audit) | Should land *before* F2 gets far, since F2's screens increasingly assume real login state, not mocked |
| F1 (5 reference screens) | — | Runs entirely on mock data — this is the point; client feedback happens before backend logic is finalized |
| F2, module by module | B4–B10, matching module | Once a module's frontend is validated with the client, wire it to its real backend phase rather than leaving it on mocks indefinitely |
| F3 (polish) | — | No backend equivalent; purely frontend quality |

---

## Definition of Done, Every Phase

Regardless of frontend or backend: update the relevant `01`–`05` vault section if the phase changed how something works, add an `08-Logs/Agent-Sessions/` entry in the standard format (including the real timestamp — see `AGENTS.md`), add a one-line `Changelog.md` pointer, and update `Issues-and-TODOs.md` if anything was found or resolved. A phase isn't finished when the code works; it's finished when the next agent could pick up from here without re-asking what happened.
