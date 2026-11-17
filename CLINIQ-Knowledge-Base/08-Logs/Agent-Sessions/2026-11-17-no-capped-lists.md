Date/Day/Time: Tuesday, November 17, 2026 — 21:04 PHT (PowerShell `Get-Date`)
Agent: Claude Code (Opus 5.5)
Task: No capped lists: every paginated list pages through all matching records, 10 rows by default
Status: Completed
Prompt/Request: Zean's rule: no operational list may be silently capped. Every paginated list pages through every record that matches its search and filters, and every pager defaults to 10 rows per page. The Student List fetched only 80 students (`listStudents({ ...query, limit: 80 })`), so 903 active students showed as "80 results shown", Page 1 of 8. Find every list cap and every pager default, report them (file:line, screen, value, intended?) before editing, trace each one's origin with `git log -S`, then apply the smallest root-cause fix. Leave suggestion dropdowns and fixed-height dashboard widgets alone. Ask before any backend change. Add tests, run lint, tsc, tests and build. Log it. Do not commit.

Files Modified:
- `frontend/src/features/student-records/api/studentListApi.ts`: `limit: 80` removed.
- `frontend/src/features/student-records/StudentListPage.test.tsx`: +1 test ("pages through every matching student, 10 a page, with no cap").
- `frontend/src/hooks/usePageSize.test.ts` (new): default 10, an invalid stored value falls back to 10, and another choice is kept for the session.
- `.claude/skills/cliniq-pagination-patterns/SKILL.md`: "No hidden caps" rule.
- `CLINIQ-Knowledge-Base/04-Development/Skills-Setup.md`: pagination row updated (old → new).
- `CLINIQ-Knowledge-Base/08-Logs/Frontend-Changelog.md`: one row.
- `CLINIQ-Knowledge-Base/08-Logs/Issues-Done-Archive.md`: the issue, found and resolved in this session, under "No capped lists". Resolved entries go straight to the archive, so the open list in `Frontend-Issues-and-TODOs.md` is unchanged.

Changes Made:

Audit on `main`. `main` has only the mock data layer (`lib/mock-db`); `lib/api/` and `lib/data/` exist only on `feat/connect-frontend`.

| # | File:line | Screen | Value | Origin | Intended? | Action |
|---|---|---|---|---|---|---|
| 1 | `features/student-records/api/studentListApi.ts:12` | Student List, Staff and Admin (one `StudentListPage`, `AppRoutes.tsx:262`) | `limit: 80` | scaffold `8ccef85`, 2026-09-28; no ADR | No | **Removed** |
| 2 | `hooks/usePageSize.ts:8` | All 8 pagers: Students, Staff, Visit Log, Incident Log, Follow-ups, Inventory, Inventory History, Audit Log, Archive | `DEFAULT = 10`; options 10/20/50/100 | Sir Rey, 2026-10-25 (skill) | Yes | Kept; test added |
| 3 | `lib/mock-db/api.ts:1191` | `listStudents` | `.slice(0, query.limit ?? Infinity)` | — | Yes: caps only when a caller passes `limit` | Kept |

Left alone (not list caps):
- Search suggestions: `searchStudents`, `searchPersonnel` and `searchPatients`, all `limit = 8` (`selectors.ts:332/393/412`, `api.ts:1201/1970/1975`).
- Complaint suggestions: `ComplaintField.tsx:6` and `ExtraComplaintsField.tsx:33`, both 8.
- `getStudentHistory` and `getPersonnelHistory`: `limit = 8` by default, but the profile callers pass `Infinity`; ADR-026 says the screen lists the eight most recent.
- Backup "Recent runs": `history.slice(0, 5)` (`BackupStatusPage.tsx:215`, `c1c432d`), a labelled summary.
- `ListCard`'s `max-h-80`, the dashboard `AlertLists`, and `ComplaintTrends`' `MAX_VISIBLE_TABLE_PERIODS = 12`: fixed-height widgets.
- `finite()` → 200 in `lib/api/http/records.ts:55`, on `feat/connect-frontend` only. It caps a profile's history request, not a pager. Not touched, because the work was on `main`.

Callers of the changed function: `fetchStudentList` is used only by `StudentListPage` and tests. The Visit Log, Incident Log and Sports Reports call `listStudents` directly without a limit, so they were already uncapped.

API mode (for when `main` is merged into `feat/connect-frontend`): `/students/query` returns every row when `limit` is null (`StudentService::list`, `take($limit ?? $rows->count())`), so the fix needs no backend change. That branch's `records.test.ts:16,28` passes `limit: 80` to `listStudents` directly to test the request mapping; the merge does not affect it.

Reason: The scaffold's limit hid 823 of 903 active students from the pager. Filtering, sorting and paging all run on the client over the fetched rows, so removing the limit fixes the total, the page count, search, filters, "Include archived" and sorting at once. The skill already said "Default 10" but said nothing about fetch limits, so it gained the rule.

Testing Performed:
- The new Student List test fails with `limit: 80` restored ("Unable to find an element with the text: 148 results shown") and passes without it.
- `npm run lint`: 0 errors, 1 warning, which is not caused by this change (`components/forms/ErrorSummary.tsx:10`, react-refresh).
- `npx tsc -b`: clean.
- `npm test`: 136 files, 1188 tests passed.
- `npm run build`: built.
- `prettier --check` on the changed files: clean.
- No browser was opened.

Known Issues: none from this change. `feat/connect-frontend` still has `limit: 80` until `main` is merged into it.

Next Steps: Zean decides whether to commit. Merge `main` into `feat/connect-frontend` so that branch drops the cap too.
