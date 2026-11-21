# Main sync, Sunday, November 22, 2026 — 02:24 PHT (second run of the day)

`main` `b9fd646` to `1c41f73`: 27 commits (5 of them the previous sync's own). Clean tree; local `main` 8 commits ahead of `origin/main` (unpushed); 17 remote branches, 0 commits ahead of `origin/main` each. Docs only, nothing committed.

## Drift table

| Path | What it said | What the code says (file, commit) | Action | Why |
|---|---|---|---|---|
| `00-Project-Core/Facts-Sheet.md` | ADRs 85; FE test files 153; lines FE 71054, BE 17094 | 87 ADRs (`a9257ed`); 154 test files (`4d29d53`); lines FE 71265, BE 17106 | regenerated (`docs:facts`) | numbers moved |
| `00-Project-Core/Start-Here-For-SRS-And-Project-Plan.md` | last check at `b9fd646`; ADR-001 to ADR-085 | ADR-085 to ADR-087, two restore routes, top-bar search, LRN last 4 | new digest, "Last checked", folder-map line | groupmate digest |
| `README.md` | Last synced `b9fd646`; 255 backend tests; shortcuts without "/" | 257 tests (session log); "/" in `TopBarSearch.tsx` (`4d29d53`) | rewritten lines | stale |
| `CLINIQ-Knowledge-Base/README.md` | 255 tests; 85 ADRs | 257; 87 | counts | stale |
| `README_ORIGINAL.md`, `backend/README.md`, `04-Development/Backend-Readiness-Checklist.md` | 255 Pest tests (November 21) | 257 (1,673 assertions), `2026-11-22-lrn-search-last-4.md`, not re-run | counts | stale |
| `01-Requirements/Features/Module-Overview.md` | patient search on three forms; student search results "from the first character" | top-bar search (`456f08f`); typing pause (`a142343`); LRN last 4 (`baa9838`, `461ccc1`) | two dated notes | missing |
| `frontend/src/layouts/README.md` | AppShell: sidebar plus top bar | `TopBarSearch.tsx` for Staff (`456f08f`) | one sentence | missing |
| `frontend/src/hooks/README.md` | no `useDebouncedValue` | `hooks/useDebouncedValue.ts` (`a142343`) | one bullet | missing |
| `09-References/Canonical-Documents/CLINIQ_Frontend_Context_Brief.md` | toasts line up to ADR-084 | ADR-085 Undo | one dated line, Zean approved | DOC issue |
| `06-Decisions/ADR-Index.md`, `01-Requirements/Functional-Requirements.md` | 85 ADRs; trace table | 87 | regenerated (`docs:adrs`, `docs:trace`) | tools |
| `04-Development/API-Contract.md` | restore routes, LRN last 4 | already in `b11e1a6`, `f4a86d3` | fine | |
| `URL-Parameters.md`, `COMMANDS.md`, `screenshots/INDEX.md`, diagrams | no address, script, screenshot or schema change | | fine | |

## Pop-up

Context Brief pointers: Zean approved ADR-085 only; ADR-086 (App Shell item 3) and ADR-087 (Student `lrn`) not approved, logged as a DOC issue.

## Checks

`docs:check` all pass (after rewording two "before" values the checker read as current); `docs:adrs` 87; `docs:trace` 24 requirements, 0 missing; only allowed paths changed; no database touched; tests not re-run (counts from session logs).
