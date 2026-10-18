# Skills Setup — Local Agent Skills for CLINIQ

Two kinds of skills for this project: **bespoke** (written specifically for CLINIQ, already in `.claude/skills/`, nothing to install) and **external** (general-purpose, researched across the whole project lifecycle — accessibility, frontend, backend, security, testing — installed via the `skills` CLI once the repo has real `package.json`/`composer.json` files to install into).

This is a substantially expanded pass over the first one — that version only covered design/UI and basic Laravel patterns. This one covers everything found worth considering, organized by category, with reasoning for what's in and what's deliberately left out.

## Bespoke skills (already in the repo, install nothing)

**Recent sidebar-pattern update — Thursday, October 01, 2026 — 22:51:35 PHT:** Footer items are compact hyperlink-like text in the expanded sidebar (label-only hit and hover), keep 40px icon targets when collapsed, and use `·` as the visual divider.

**Recent table-pattern update — Saturday, October 3, 2026 — 14:59 PHT:** period headers in wide time-series tables drop the year (shown once in the card title, kept screen-reader-only in each header), with period columns sized to the short header.

**Earlier table-pattern update — Saturday, October 3, 2026 — 14:52 PHT:** `cliniq-table-patterns` now says a fixed-layout table that must overflow its scroller gets an explicit `minTableWidth` (its column-width sum) instead of `min-w-max`, and must keep `fixedLayout` rather than drop it for overflow. First applied to the Dashboard complaint-trend table.

| Skill | Location | Purpose |
|---|---|---|
| `cliniq-item-picker-patterns` | `.claude/skills/cliniq-item-picker-patterns/` | Keeps the searchable inventory picker (`InventoryItemPicker`) and the "Medicines & supplies given" lines (`ItemsGivenField`) on one shared, keyboard-usable pattern: grouped options with stock and unit, expired items disabled with a badge, nearing-expiry warned, duplicate picks add to the line, over-stock warns, allergies shown for awareness — added Wednesday, October 07, 2026 — 10:43 PHT (ADR-018) |
| `cliniq-combobox-patterns` | `.claude/skills/cliniq-combobox-patterns/` | Keeps every text field with a suggestion list on the shared ARIA `Combobox` (dropdown look, full keyboard support, free-text switch, loading / "No matches" / error states). Covers the New Visit free-text complaint field (ranked suggestions, normalization, Smart Triage matching) and the reusable `StudentPicker` (Student Number prefix or name, 2+ characters, max 8 active students) — added Wednesday, October 07, 2026 — 20:03 PHT; updated 20:37 PHT: no chevron on the field; updated 20:55 PHT: StudentPicker auto-dashes digits-only input (replaced 20:56 PHT: no formatting, Student Number matching ignores dashes); updated 21:48 PHT: the Complaint field is the shared `ComplaintField`, also used by the Visit Detail edit form, and `updateVisit` normalizes too; updated Monday, October 12, 2026 — 01:34 PHT: StudentPicker lists from the first character typed (was 2), placeholder "YYYY-NNNNN or student name", shows the picked student with Change itself (`selected`/`onClear`), and replaces the typed Student Number field everywhere (Incident Stage 1, PE/Sports Referral, Dispense, QR manual fallback); `StudentNumberField` removed; updated Saturday, October 17, 2026 — 12:14 PHT: Complaint's first option is the non-persisted "Other (type your own)" action; updated Saturday, October 17, 2026 — 13:41 PHT: selecting it now reveals and focuses a required "Specify other complaint" field, carrying over any typed text; updated Saturday, October 17, 2026 — 13:50 PHT: the combobox visibly retains Other while the specification field holds the saved text (old: selection left the trigger blank → new: visible selected state) |
| `cliniq-date-range-patterns` | `.claude/skills/cliniq-date-range-patterns/` | Keeps every date-range filter ordered with All first and opened on the unbounded All range (except the Clinic Overview Dashboard, which opens on This month — Friday, October 2, 2026 — 01:30), while preserving shared custom-range behavior — updated Friday, October 2, 2026 — 00:14: the custom popover is dismissable, applies only on Apply, and can align to the trigger's start edge |
| `cliniq-sorting-patterns` | `.claude/skills/cliniq-sorting-patterns/` | Keeps every meaningful table column on the Visit Log's accessible deterministic sort pattern, with sort state coordinated with filtering, pagination, privacy, and fixed layout |
| `cliniq-table-patterns` | `.claude/skills/cliniq-table-patterns/` | Keeps reusable DataTables stable when filters change rows, with deliberate column widths, sticky identifying/summary edge columns, readable capped time-series views, compact period headers, low-signal row toggles, and visually hidden but accessible captions |
| `cliniq-input-patterns` | `.claude/skills/cliniq-input-patterns/` | Keeps shared text inputs at the same 40px, semibold, lightly elevated treatment as standard selects; date and month fields use the themed `DatePicker`/`MonthPicker`, never native browser calendars (updated Friday, October 2, 2026 — 00:39). Optional decorative leading `icon`, and a built-in "Show password" toggle on every password field (updated Saturday, October 3, 2026 — 02:26); updated Wednesday, October 14, 2026 — 18:00 PHT: new "Failed submit" section (old: no rule → new: every entry/edit form uses `useFocusFirstInvalid`, focusing the first invalid field and announcing the count) |
| `cliniq-sidebar-patterns` | `.claude/skills/cliniq-sidebar-patterns/` | Keeps the shared sidebar's Healware system mark, favicon pairing, compact expanded CLINIQ/academy/attribution stack, vertically aligned collapse control, plain collapsed-logo treatment, lightweight horizontal footer links/modal actions, and compact version block consistent — updated Thursday, October 01, 2026 — 22:44 PHT; updated Wednesday, October 14, 2026 — 18:00 PHT: the attribution line (old: muted, 9px allowed → new: `text-xs` 12px `text-text-secondary`), the academy line corrected to the 12px already in code (old text said 11px), and a new "Navigation below `lg`" section (phone menu with Privacy Policy and Report an Issue; no menu button for a role with no entries; ADR-022) |
| `cliniq-dropdown-patterns` | `.claude/skills/cliniq-dropdown-patterns/` | Keeps every dropdown on one shared look (the Dashboard's date-range control) through the shared `Select`/`DateRangePicker`/`MultiSelect`, with selection feedback that is icon-free, compact, keyboard-accessible, and sized to the longest option — updated Wednesday, September 30, 2026 — 23:20: no native `<select>`; updated Wednesday, October 14, 2026 — 18:00 PHT: new "Placeholder" section (old: placeholder always the first option row → new: a prompt placeholder stays on the trigger only; a real "All ..." choice is listed via `Select`'s `clearable`) |
| `cliniq-display-privacy` | `.claude/skills/cliniq-display-privacy/` | Enforces the Student Number vs full name rule on every new screen |
| `cliniq-audit-trail` | `.claude/skills/cliniq-audit-trail/` | Ensures every mutating action gets logged per RA 10173 |
| `cliniq-interactive-states` | `.claude/skills/cliniq-interactive-states/` | Enforces cursor states, hover feedback, custom-styled dropdowns, and visible-at-rest affordances: widget names (stat labels, list titles) are the drill-down link via `TitleLink` with a small open-link icon and underline + darken/brand-green hover; smaller non-orphaning item chevrons — updated Friday, October 2, 2026 — 00:04:25 PHT. Clickable icons stay bare icons (hover recolors the icon, no background box) while remaining real labelled buttons — updated Saturday, October 3, 2026 — 02:37 PHT. Toggles (`SegmentedControl`) and page-level view tabs (`Tabs`) share one selected/hover look, in two sizes — updated Thursday, October 15, 2026 — 19:08 PHT (ADR-025) |
| `cliniq-multi-select-patterns` | `.claude/skills/cliniq-multi-select-patterns/` | Reuses the accessible checkbox filter popover, with an All option first and selected by default when no values are narrowed |
| `cliniq-pagination-patterns` | `.claude/skills/cliniq-pagination-patterns/` | Reuses the growing-list pager, including a complete filtered print view |
| `cliniq-modal-patterns` | `.claude/skills/cliniq-modal-patterns/` | Decides which actions need a confirmation (irreversible ones; not the expected routine outcome) and keeps every dialog on the shared, keyboard-safe `Modal` — added Wednesday, September 30, 2026, once confirmations were in use on five screens; updated Saturday, October 03, 2026 — 03:02:52 PHT: dialog surfaces use `--radius-md` (8px), matching the shared panel/control mapping; updated Sunday, October 11, 2026 — 20:30 PHT: the overlay scrolls, so a dialog taller than the viewport starts at its top with its title and ✕ reachable; no local `max-h`/`overflow-y-auto` on a dialog; updated Wednesday, October 14, 2026 — 18:00 PHT: Cancel on an entry/edit form confirms "Discard unsaved changes?" only with unsaved input (old: no rule, Cancel always left at once → new: `useCancelNavigation(fallback, isDirty)` and its `discardDialog`; ADR-021) |
| `cliniq-back-navigation-patterns` | `.claude/skills/cliniq-back-navigation-patterns/` | Decides which screens get a Back control (child, detail, form, flow-step, shell-free non-home, and dead-end screens; top-level sidebar screens only after a drill-through link), keeps every one on the shared `BackButton` (history back with a role-aware fallback, plain "Back" unless the target is fixed, Back = Cancel on forms, top-left before the `h1`, 44px on phones, print-hidden, shown while loading), and names the route-coverage test — added Wednesday, October 14, 2026 — 23:11 PHT (ADR-024) |
| `cliniq-print-patterns` | `.claude/skills/cliniq-print-patterns/` | Keeps every Print / Save as PDF a purpose-built A4 document on the shared print components (letterhead, scope line, printed-by and confidentiality footer with page numbers, no app chrome, privacy on paper, printing never fetches) — added Thursday, October 15, 2026 — 23:04 PHT (ADR-026; old: no print rule beyond "print layouts are first-class" → new: this skill) |

Write more of these as new CLINIQ-specific rules get established — they encode decisions unique to this project that no public skill will ever have.

### Component skills

A component skill holds standing rules for a UI pattern that is already reused, or is reasonably likely to be reused, across many pages (for example, a dropdown, search bar, button, date picker, table, or modal). `AGENTS.md` ("Component skills — create only for reusable cross-page patterns") says when agents must look for one, create one, or update one.

- **Name:** `cliniq-<component>-patterns`, in `.claude/skills/`. Follow the format of `cliniq-dropdown-patterns`.
- **`description`** names the component and says when to apply it ("Apply when building or changing a CLINIQ …"), because that is what lets an agent find it by reading only the frontmatter.
- **Body:** the rules the user actually asked for, grouped by behavior; where the shared component lives; and a pointer to `cliniq-interactive-states` for hover/cursor rules instead of repeating them.
- **Create one only** when the agent reasonably expects the component pattern to recur across many pages. Don't create one merely because it is a major or shared component, and don't record visual rules the user never stated.
- **Don't** create one for a one-off widget used on a single screen.
- **Every create or edit** gets a row in the table above, an `Agent-Sessions/` entry, and a Changelog row.
- These skills are edited by agents in the live repo, so they are never copied over the repo from an export (`AGENTS.md`, Step 0).

---

## Accessibility

CLINIQ's own requirements already demand this (non-technical, possibly older users; the contrast work already done in ADR-007) — this category matters more than usual for this specific project.

```
npx skills add jakubkrehel/skills --skill better-accessibility
npx skills add neha/check-fix-accessibility --skill review-fix-a11y
npx skills add airowe/claude-a11y-skill
```
- `better-accessibility` — native-elements-first philosophy, focus ring recipes, ARIA discipline (from the original design/UI pack).
- `review-fix-a11y` — broader WCAG 2.2 A/AA workflow with a full reference doc (ARIA patterns, screen-reader testing, native mobile pointers) — a genuine audit-and-fix skill, not just a style guide.
- `claude-a11y-skill` — automated testing integration via **axe-core + jsx-a11y**, which pairs directly with the Vitest testing stack already confirmed (ADR-007). Worth combining with `vitest-axe` patterns (see Testing section) so accessibility checks run in CI, not just get remembered manually.

**Why this matters more than a generic checklist here specifically:** the Student Profile, New Visit, and Incident Entry screens are used by one nurse, repeatedly, under time pressure — keyboard-only operability and correct focus management aren't nice-to-haves for this user.

---

## Frontend — React, TypeScript, Tailwind, Forms, State

```
npx skills add Pythoughts-labs/react-frontend-skills -s typescript,tailwind,ui-design,web-design-guidelines,react-hook-form,zod,vitest,msw,tdd
```
This one pack covers nearly everything needed for the actual React build: TypeScript compiler config and async patterns, Tailwind v4 utility/theming patterns, UI/UX and broader web-design-guideline rule sets (100+ rules), React Hook Form + Zod for CLINIQ's many forms (student intake, visit entry, incident entry), and Vitest/MSW/TDD for the testing side. Each listed skill has 40+ individual rules — genuinely substantial, not a thin wrapper.

**Deliberately left out of that install command:**
- `shadcn` / `nuqs` — shadcn/ui and nuqs are both real options but nothing in the Frontend Context Brief commits to either; installing them now would push a component-library and URL-state-management decision that hasn't actually been made. Add later if/when chosen.
- `tanstack-query` — same reasoning: the Frontend Context Brief explicitly leaves the data-fetching library open ("React Query/TanStack Query, SWR, or plain fetch+context"). Install this specific skill only once that decision is made, not before — otherwise it's optimizing for an assumption.

```
npx skills add questfortech-investments/claude-code-skills --skill react-vite-expert
```
Complements the above with Vite-specific config, bundle analysis, and component-scaffolding scripts the Pythoughts pack doesn't cover.

---

## Design & UI Quality

Carried over from the first pass — still the right fit:
```
npx skills add jakubkrehel/skills --skill better-colors
npx skills add jakubkrehel/skills --skill better-typography
npx skills add jakubkrehel/skills --skill better-layout
npx skills add jakubkrehel/skills --skill better-ui
npx skills add jakubkrehel/skills --skill interface-review
```
`interface-review` is worth running against every new screen before calling it done — the same instinct behind `03-Design/Design-Audit-Reference-Mockup.md`, automated per-screen instead of a one-time pass.

---

## Backend — Laravel, PHP, Database

This category grew the most on the second pass. Three real options, not fully overlapping:

### Option A — `edulazaro/laraclaude` (recommended as the primary pick)
```
/plugin marketplace add edulazaro/laraclaude
/plugin install laraclaude@laraclaude-marketplace
```
30+ Laravel-specific slash commands, actively maintained. The two most relevant to CLINIQ specifically:
- **`/lc:security-audit`** — scans for SQL injection, XSS, mass-assignment, and exposed secrets, with a `--dry-run` fix preview. Given CLINIQ handles minors' health records under RA 10173, running this before every deploy is cheap insurance, not overkill.
- **`/lc:consolidate-migrations`** and **`/lc:unused-columns`** — useful once the proposed [`ERD.md`](../02-Architecture/Database/ERD.md) is approved and migrations exist; the draft is not final, so it must not be implemented yet. They keep schema history clean rather than accumulating cruft.

### Option B — `Foysal50x/skills` (from the first pass, still solid)
```
npx skills add Foysal50x/skills --skill laravel-patterns
npx skills add Foysal50x/skills --skill laravel-eloquent
npx skills add Foysal50x/skills --skill laravel-rest-api
npx skills add Foysal50x/skills --skill laravel-async
npx skills add Foysal50x/skills --skill laravel-testing
```
More traditional "reference rules" format (60+45+35+33+20 rules) versus laraclaude's command-based workflow. Not mutually exclusive with Option A — laraclaude's commands are things you *run*, Foysal50x's skills are things Claude *reads* before writing code. Reasonable to install both.

### Role-based access control — worth flagging specifically
A Laravel skill built around **Spatie's `laravel-permission` package** (RBAC: roles, permissions, scoped route model binding) showed up in research and is worth calling out on its own — CLINIQ's whole access model (Staff full / Admin read-only / PE Instructor scoped read-only) is exactly this kind of role-based permission structure. Search `npx skills find laravel rbac` once the backend scaffold exists to find the current best-maintained version, since this is a strong structural fit worth getting right rather than improvising CLINIQ's RBAC from scratch.

---

## Security & Privacy — new category this pass

Not in the first pass at all, and it should have been, given what CLINIQ actually stores.

```
npx skills add gosprinto/compliance-skills/pii-detector
```
This one's GDPR-branded (`gdpr-compliance-checker` is the sibling skill), and CLINIQ answers to RA 10173, not GDPR — **don't install the GDPR-checker itself**, its rule set is the wrong jurisdiction. But `pii-detector` is more general-purpose: scanning code, logs, and error messages for personal-data leakage is a useful check regardless of which specific law applies, and directly supports the audit-trail/data-retention work already built into the project (Project Plan Section 5.3, ADR references in the vault).

Laravel's own **Security Auditor** pattern (OWASP Top 10, auth/authz review, CSRF/XSS, secure file uploads — found bundled in a couple of the Laravel agent packs above) covers the backend half of the same concern. Between `/lc:security-audit` (Option A above) and a PII scanner, CLINIQ gets reasonable coverage on both "is the code secure" and "is student data leaking somewhere it shouldn't."

---

## Testing — consolidated view

Testing skills are scattered across several packs above rather than one dedicated source — consolidating what's already included:

| Layer | Already covered by |
|---|---|
| Backend (Pest) | `Foysal50x/skills --skill laravel-testing`, or laraclaude's Pest-related commands |
| Frontend unit/component (Vitest) | `Pythoughts-labs/react-frontend-skills -s vitest` |
| API mocking (MSW) | `Pythoughts-labs/react-frontend-skills -s msw` |
| TDD workflow | `Pythoughts-labs/react-frontend-skills -s tdd` |
| Accessibility testing | `airowe/claude-a11y-skill` (axe-core + jsx-a11y, pairs with Vitest) |

No separate install needed here — this table exists so it's clear the testing side isn't a gap, just spread across the categories above rather than its own line item.

---

## Deliberately not recommended

- **Anything Vue/Nuxt/Inertia-based** — several bundled Laravel packs default to this frontend pairing. CLINIQ is React, not Vue; skip those specific skills even when installing the rest of a bundled pack.
- **A third-party git/commit-convention skill** — CLINIQ already has its own Conventional Commits + trunk-based branching rules in `AGENTS.md`/`CLAUDE.md`. A generic one risks conflicting instructions rather than adding value.
- **`tanstack-query`, `shadcn`, `nuqs`** — see the Frontend section above; each corresponds to a library decision that hasn't actually been made yet. Installing the skill before the decision is backwards.
- **Dedicated print/PDF-report skills** — the ones found (funding-proposal generators, newsletter/report designers via headless Chromium) are built for a different use case than CLINIQ's actual need (in-browser `@page` print CSS for excuse letters, reports, and QR stickers rendered directly from the React app). No strong fit found — follow the print-layout guidance already in the Frontend Context Brief instead of forcing in a skill that doesn't quite match.
- **GDPR-specific compliance checkers** — wrong jurisdiction (CLINIQ answers to RA 10173, a different legal framework); the general-purpose `pii-detector` is the useful half of that pack, not the GDPR-rule-specific half.

## When to revisit this list
Skill ecosystems move fast — re-check maintenance status the same way ADR-007 did for the tech stack (last real release, current adoption) before installing, rather than assuming this list stays accurate indefinitely. Revisit specifically once: the data-fetching library gets chosen (add the matching skill), the database schema is actually designed (unblocks the migration-focused Laravel skills), and the backend scaffold exists (unblocks actually running any of this).
