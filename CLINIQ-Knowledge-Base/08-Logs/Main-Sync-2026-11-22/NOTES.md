# Main sync, Sunday, November 22, 2026

Run: Sunday, November 22, 2026 — 00:41 to 00:56 PHT (clock read with PowerShell `Get-Date`). It describes `main` at `b9fd646`, which equals `origin/main`; the tree was clean at the start and `git pull --ff-only` had nothing to bring.

**Since:** `533df61`, the last row of `Main-Sync-Log.md` (Friday, November 20, 2026 — 02:00 PHT). The run covers 23 commits (`git rev-list --count 533df61..b9fd646`). Seven of them are the previous sync's own commits and the frequent-visitor pager it excluded (`9cf39c8` to `60f57ec`), already described by that sync's documents. The new work is two batches: the ADR-084 bug fixes (`2933ef6` to `20bf84c`, Saturday, November 21, 2026 — 16:24 PHT) and the realistic demo school (`ab119ba` to `b9fd646`, 20:50 PHT).

## Other branches

`git rev-list --count origin/main..origin/<branch>` gives 0 for all 17 remote branches. None has a commit in the last 14 days that `main` lacks. Nothing was copied.

## Drift table

| Path | What it said | What the code says | Action |
|---|---|---|---|
| `README.md` | Last synced at `533df61`; 251 backend tests "with Pint and Larastan"; no ADR-084 | `b9fd646`; 255 passed (1,648 assertions), Larastan fails on `BackupService.php:171` (from `1524331`); ADR-084 (`2933ef6`, `901f74b`, `816c808`) | fix |
| `Start-Here-For-SRS-And-Project-Plan.md` | Last checked at `533df61`; ADR-001 to ADR-083; no digest for ADR-084 or the demo school | as above | fix, digest added |
| `README_ORIGINAL.md`, `CLINIQ-Knowledge-Base/README.md` | 251 tests; 83 ADRs; Last checked November 20 | 255; 84 | fix |
| `backend/README.md`, `Backend-Readiness-Checklist.md` | Pest 251, "Pint and Larastan pass" | 255 passed, Pint passes, Larastan fails on one pre-existing line | fix |
| `frontend/README.md` | Last checked November 20 | nothing else stale (no "below zero", no toast-id text) | Last checked line only |
| `Module-Overview.md` §8, `Development-Phases.md` | dispensing below zero "warns but does not block" | `StockService::take()` refuses with `409 stock_rule` (`2933ef6`, ADR-084) | fix, dated |
| `API-Contract.md` (dispense entry, rules table) | "Below zero warns, never blocks (ADR-018)"; "shortfall stays negative … `api.ts:2120`" | refused; mock `takeUsableBatches` at `api.ts:3785` | fix |
| `COMMANDS.md` (seeder) | one year "up to the real clock", "about 40 s" | five years to 2027-02-28, about 5.5 min (`37acfda`, `DemoSchoolSeeder::DEFAULT_UNTIL`) | fix |
| `screenshots/INDEX.md` (22, inventory list) | caption "below zero flags visible" | the picture predates ADR-084 | note added; picture untouched |
| `CLINIQ_Frontend_Context_Brief.md` | data layer, feedback and medicines-given lines without ADR-082/083/084 | ADR-082, ADR-083, ADR-084 | 3 dated pointer lines, approved by Zean |
| `CLINIQ_Frontend_Design_Reference.md`, `CLINIQ_Modules_and_Features.md` | toast and below-zero wording | ADR-083/084 | **leave**: not approved in the pop-up; DOC entries stay open |
| `Facts-Sheet.md` | from `20bf84c`, backend lines 16997, newest runs 251 / 1277 | `b9fd646`, 17009; 255 / 1278 from the November 21 session log | regenerated; newer-run line added by hand, not re-run |
| `ADR-Index.md`, `Functional-Requirements.md` traceability | generated November 20 | regenerated (84 ADRs; 0 missing links) | regenerated |
| `backend/tools/load/README.md`, `Load-Test-Nov16/NOTES.md`, `Decisions-Summary.md`, skills | updated by the two batches themselves | | fine |
| Diagrams | no Mermaid block or diagram describes stock below zero, toasts or the seeder | | fine, none regenerated |

## Decisions

- Canonical documents (pop-up, Zean): "Context Brief, 3 lines" approved; the Design Reference and Modules & Features lines were not chosen. The DOC "the data layer (ADR-082)" closed (Context Brief done, Project Plan listed in the digest) and moved to the archive; the ADR-083 and ADR-084 DOC entries stay open with a note.

## Checks

- `docs:check`: all six pass (numbers, links and anchors in 207 files, 31 Mermaid blocks parsed, Last checked lines, removed features, AGENTS = CLAUDE).
- `docs:adrs`: 84 ADRs. `docs:trace`: 24 requirements, 0 missing links.
- Three numbers by hand: API routes 130 `Route::` verbs in `backend/routes/api.php` + Sanctum's CSRF cookie = 131; tables 48 distinct `CREATE TABLE` in the 50 migration files; frontend router `AppRoutes.tsx` unchanged since `533df61` (47 stands). Backend lines 16997 to 17009 come from `ab119ba` and the cache line in `LoadGenerator::run()`.
- `screenshots/INDEX.md`: 34 files listed, 34 on disk, same names.
- Stale-phrase search: remaining hits are dated history (`Backend-Loop-Engineering.md` rule 3 has its dated note; `Module-Linkage-Diagram.md` "in the frontend phase").
- No database touched: no Pest, `composer`, `artisan`, `checks.php` or `bench.php`. Test counts are from `Agent-Sessions/2026-11-21-backend-realistic-demo-school.md`, not re-run.
- `git diff --name-status`: 18 modified files plus this file, the session log and the two log rows, all on the allowed list.

## Left over

- Larastan `cast.string` at `BackupService.php:171` (open FIX in `Backend-Issues-and-TODOs.md`, code, not docs).
- The Design Reference (ADR-083) and Modules & Features (ADR-084) pointer lines, on Zean's word.
- Screenshot 22 shows the old "Below zero" badge until a retake.
