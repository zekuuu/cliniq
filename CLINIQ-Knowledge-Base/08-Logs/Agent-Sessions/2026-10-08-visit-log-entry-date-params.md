Date/Day/Time: Thursday, October 8, 2026 — 02:18 PHT
Agent: Codex
Task: Fix stale Visit Log date-entry parameters after an in-screen range change.
Status: Completed
Prompt/Request: "Fix stale date parameters on the Visit Log. Opening /visits from the Dashboard calendar's 'View visits' link uses ?from=YYYY-MM-DD&to=YYYY-MM-DD ... after the user changes the date range inside the screen, the old from and to stay in the URL."
Files Modified:
- `frontend/src/hooks/useDateRangeEntryParams.ts`
- `frontend/src/features/clinic-visits/VisitLogListPage.tsx`
- `frontend/src/features/clinic-visits/VisitLogListPage.test.tsx`
- `URL-Parameters.md`
- `CLINIQ-Knowledge-Base/06-Decisions/ADR-012-Frontend-Routing.md`
- `CLINIQ-Knowledge-Base/08-Logs/Frontend-Changelog.md`
- `CLINIQ-Knowledge-Base/08-Logs/Agent-Sessions/2026-10-08-visit-log-entry-date-params.md`
Changes Made:
- Added a shared date-entry helper/hook that accepts only real ISO calendar dates, applies a valid `from`/`to` pair once as a custom range, and clears only those parameters with React Router replace navigation.
- Wired the hook into Visit Log only. Changing a preset or applying a custom range keeps that selection in local state while removing stale entry parameters; search, sort, page, and disposition remain URL-free.
- Preserved every unrelated query parameter and added tests for valid, invalid, and partial input; replace-history behavior; parameter preservation; and remounting after clearing.
- Documented the entry-filter exception in the URL reference and added an ADR-012 clarification without changing its original decision text.
Reason: A Dashboard calendar deep link previously re-applied an obsolete custom range after an in-screen change and page reload.
Testing Performed:
- `npm.cmd test -- VisitLogListPage.test.tsx` — passed (13 tests).
- `npm.cmd run typecheck` — passed.
- `npm.cmd test` — 345/349 passed; four existing, unrelated New Visit time-of-day ordering failures remain, already recorded in the Changelog at 00:04 PHT.
- `npm.cmd run build` — passed.
- `git diff --check` — passed.
- Attempted requested live Playwright MCP verification. This session does not expose the configured Playwright MCP tool, and the available browser bridge fails before loading Playwright; no Edge fallback was used.
Known Issues: Live Playwright verification remains unavailable in this session. The full suite's four New Visit failures are pre-existing and unrelated to this change.
Next Steps: Run the documented Dashboard calendar deep-link flow in Playwright MCP when the configured server is available: confirm reload preserves the untouched deep link, then change the Visit Log range and confirm reload opens the default All range.
