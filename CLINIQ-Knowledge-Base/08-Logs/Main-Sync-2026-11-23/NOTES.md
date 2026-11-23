# Main-Sync-2026-11-23 notes

**Run:** Monday, November 23, 2026 — 18:07 PHT  
**HEAD:** `0a178b0`  
**Since:** `9da38fa` (Sunday, November 22, 2026 — 14:22 PHT, last sync point)  
**Commits covered:** 9 (`1f0fc47` to `0a178b0`), all documentation/chore

## Commit summary

| SHA | Message |
|---|---|
| `0a178b0` | docs(logs): main sync 3 and canonical-document pointer sessions |
| `7fb9c73` | docs(readme): sync metadata and groupmate digest to 9da38fa |
| `2894d3b` | docs(project-documents): Plan and SRS edits for ADR-068 and ADR-084 to ADR-087 with inline markers |
| `25c6cfc` | docs(canonical): ADR-083 to ADR-087 pointer lines |
| `b2f8141` | docs(dev): backup linkage mock/API modes and account-disable session check |
| `93a7f84` | docs(decisions): regenerate ADR index and mark ADR-056 summary historical |
| `399237d` | docs(facts): regenerate Facts sheet at 9da38fa |
| `4efcf0b` | docs(dev): traceability note reflects the live API routes |
| `1f0fc47` | chore(git): ignore local Claude settings |

All 9 commits are the committed output of the November 22 sync run. No product behavior, ADR, route, or schema changes.

## Drift table

| File | Status | Evidence |
|---|---|---|
| `README.md` | stale (Last synced/Last checked pointed to `9da38fa`) | updated to `0a178b0` |
| `README_ORIGINAL.md` | stale (Last checked pointed to `9da38fa`) | updated to `0a178b0` |
| `Start-Here-For-SRS-And-Project-Plan.md` | stale (Last checked / digest) | updated; new digest section added |
| `WHAT-CHANGED.md` | stale (top line `9da38fa`) | updated to `0a178b0` |
| `Facts-Sheet.md` | regenerated; numbers unchanged | `docs:facts` ran at 17:56 PHT |
| All other allowed files | fine | `docs:check` passed (240 files) |

## Numbers

No numbers changed. All Facts-sheet values identical to the `9da38fa` run.

## Checks

| Check | Result |
|---|---|
| `docs:facts` | Ran; no number changes |
| `docs:adrs` | 87 ADRs (unchanged) |
| `docs:check` | All pass (240 files, 41 Mermaid blocks, links, numbers, AGENTS=CLAUDE) |
| `docs:trace` | 24 requirements, 0 missing |
| `docs:documents` | Built both combined files; `--check` pass |
| `docs:diagrams` | Chrome not found (pre-existing env issue; Mermaid source unchanged; 41 blocks verified by `docs:check`) |
| Stale-phrase grep | All hits in `08-Logs/Agent-Sessions/` or ADR dated notes — no live docs affected |
| `git diff --name-status` allowed-list check | All edits within allowed paths |

## Project documents

No content edits. Section files unchanged. `WHAT-CHANGED.md` top line updated to `0a178b0`.

## Remote branches

18 remote branches; all 0 commits ahead of `origin/main`. No active branch holds docs `main` lacks.

## Leftovers / Needs your call

None.
