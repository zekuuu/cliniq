# Staging documentation sync — Thursday, November 26, 2026

**Run:** Thursday, November 26, 2026 — 22:16 PHT  
**Branch and base:** `staging` at `9400024d`, with uncommitted work; since `0a178b0` (the November 23 sync)  
**Commits covered:** 72 on staging, including ADR-088 through ADR-095 and the merged contact, Undo, performance, incident-timing and action-menu branches  
**Remote branch check:** 23 `origin/*` branches were compared with staging; none held commits staging lacked. No branch was merged by this sync.

## Drift and evidence

| Document or area | Before this run | Code or decision evidence | Action |
|---|---|---|---|
| Root README, Start Here, KB README | Last sync still named `main` `0a178b0`; folder tables omitted tracked directories | `git ls-tree` at `9400024d`; ADR-088–095 | Updated sync metadata, digest, and folder maps |
| Facts Sheet and generator | 54 migrations were described as 49 table creates and 5 data migrations | 48 `create_*_table`, 4 add/remove, 2 insert migration filenames in `backend/app/**/Database/Migrations`; `Reference-Schema.sql` has 47 current tables | Fixed generator classification and regenerated sheet |
| COMMANDS and root README | Command example still said 133 routes; database check explanation said 452 columns | `backend/routes/api.php`, route-list source in Facts Sheet: 139; Reference Schema: 453 columns | Corrected both and added missing root docs scripts |
| Backend README and KB README | Backend test count lagged at 261; constraint count lagged at 257 in backend README | [Incident-timing session](../Agent-Sessions/2026-11-26-incident-event-timing.md): 262 passed; Facts Sheet: 259 constraint cases | Corrected recorded-run attribution; no database command run here |
| Default seed and calendar docs | Described five similarly healthy supplies and no seeded holidays | `SimulationSeeder.php`, `CalendarService::sync`, bundled `holidays-ph.json` | Documented varied stock, case states and bundled holidays; DemoSchoolSeeder already loads holidays |
| Inventory List design | No explanation of the compact Actions position | `InventoryListPage.tsx`: 10.5rem Actions, right-justified menu | Updated Screen Inventory; table-pattern skill already requires menu at right edge |
| API Contract, ERD, Data Dictionary, Module Overview | Staging already contains ADR-088/089/091/093/094 updates | Routes and migrations at `9400024d`; ADR-088–095 | Kept existing source pages; no new endpoint or schema in this run |
| Generated traceability note | `docs:trace` still wrote “133 live routes” after routes grew to 139 | `backend/routes/api.php`, Facts Sheet 139 routes | Removed the fixed count from `docs-trace.mjs`, pointed readers to the Facts Sheet, and regenerated the table |
| Project Plan and SRS Markdown copies | Current SRS still required in-system emergency-contact verification, Stage 1 readings and idle-only Settings | ADR-088, ADR-089, ADR-091, ADR-093, ADR-094 and verified KB sources | Marked Project Plan 1 and SRS 8 edits; rebuilt combined copies; original PDF/Word files untouched |
| Screenshots index | 34 captions remain from earlier connected-API capture | `screenshots/INDEX.md`, Facts Sheet inventory 34 | Left as historical capture, no new screenshot claimed |

## Factual claim sweep

The sweep covered living READMEs, COMMANDS, Start Here, Facts Sheet, API Contract, Screen Inventory, Module Overview and the affected Plan/SRS sections. `docs:check` separately scanned its 249 registered Markdown files for links, numbers, removed features, and freshness. Historical session logs and old ADR decision text were treated as dated history.

| Claim | Result | Evidence |
|---|---|---|
| Two roles, Staff and Admin | fine | `Reference-Schema.sql` `chk_users_role`; Facts Sheet Roles |
| 47 frontend routes | fine | `frontend/src/routes/AppRoutes.tsx`; Facts Sheet Frontend routes |
| 34 inventory screens | fine | `Screen-Inventory.md`; Facts Sheet Screens |
| 95 accepted ADR files | fine | `06-Decisions/ADR-001` through `ADR-095`; regenerated index |
| 47 current tables and 453 columns | fine | `Reference-Schema.sql`; regenerated Facts Sheet |
| 54 migration files: 48 create, 4 alter, 2 data | stale → fixed | Migration filenames; `docs-facts.mjs` |
| 139 live API routes | stale in root command → fixed | `routes/api.php`; Facts Sheet route-list source |
| 135 contract headings naming 137 endpoints | fine | `API-Contract.md`; Facts Sheet |
| Three scheduled jobs | fine | `backend/routes/console.php`; Facts Sheet |
| Contact verification removed only for emergency contacts | fine | ADR-088; removal migration and student/staff services |
| Backup verification remains | fine | ADR-088; BackupVerification module |
| Safe Undo uses an eight-second toast and refuses stale reversals | fine | ADR-089; frontend notify and backend reversal services |
| Stage 1 has no entered readings; Stage 2 accepts timed readings | stale in SRS → fixed | ADR-094; `IncidentService.php` |
| Settings exposes two warning periods besides idle timeout | stale in root/SRS → fixed | ADR-091; OperationalSettingsController and SettingsPage |
| Staff can print all matching Audit Log rows | stale in SRS → fixed | ADR-093; `AuditLogController.php` print stream |
| Default seed has five linked daily-use records and local holidays | stale in README → fixed | `DatabaseSeeder.php`, `SimulationSeeder.php`, bundled holiday file |
| Inventory ⋮ trigger sits at the right edge | stale in Screen Inventory → fixed | `InventoryListPage.tsx`, `cliniq-table-patterns` |
| Production clinic-PC response time and current Philippine holidays after 2027 | unverifiable here | No clinic-PC measurement or future official proclamation in this run |

## Project documents

The current section files changed: Project Plan `10-system-design.md` (FR-05), SRS `10-data-requirements.md` (DR-007, DR-008, DR-028, DR-049), and SRS `11-system-features.md` (FR-015, FR-036, FR-064, new FR-066). The SRS introduction remains unchanged because ADR-088 leaves contact confirmation in person; the independent reviewer caught this. `WHAT-CHANGED.md` records the nine edits and the generated combined copies are marker-free. The section files retain color markers for review.

## Checks and review

| Check | Result |
|---|---|
| `npm run docs:facts` | Regenerated from working tree; migration classification corrected |
| `npm run docs:adrs` | Wrote 95 ADRs |
| `npm run docs:trace` | 24 requirements, 0 missing links |
| `npm run docs:documents -- --check` | Both combined copies match sections before the final wording correction; rebuilt after that correction |
| `npm run docs:check` | Passed after source-map link fixes and Facts Sheet regeneration; rerun after the final log edits |
| Database-derived tests and seed command | Not run: this sync does not touch a database; seeder test assertions were updated for a later isolated run |
| Diagrams and GitHub math rendering | No Mermaid source changed in this run; diagrams and `gh api markdown` were not rendered here |

**Independent read-only review:** found that the SRS introduction's human contact-confirmation sentence remained true, the expired sample batch needed an earlier received date, completed/missed follow-ups needed past dates, one student needed an allergy example, and DR-049 needed narrower wording. All five findings were applied before final checks. The reviewer did not edit files or touch a database.

## Needs your call

- The separate groupmate-owned canonical Plan/SRS originals and Frontend Context Brief, Design Reference, and Modules & Features still need the group's ADR-088–095 pointer review. No original Word/PDF or canonical copy was changed here.
- The optional clinic-arrival field in ADR-094 awaits the nurse's confirmation; no new decision was made here.
- The seeder's MariaDB behavior is covered by updated test assertions but was not executed during this docs sync. Run it only against an explicitly selected disposable database.
