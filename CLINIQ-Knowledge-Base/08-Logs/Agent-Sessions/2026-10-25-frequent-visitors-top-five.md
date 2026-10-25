Date/Day/Time: Sunday, October 25, 2026 — 22:16 PHT
Agent: Claude Code (Claude Opus 5.5)
Task: Bring back the Dashboard's Frequent-visitor panel, showing only a few students
Status: Completed
Prompt/Request: Zean: "I think bring back frequent-visitor but make it not show many"
Files Modified: frontend/src/features/dashboard/components/AlertLists.tsx, frontend/src/lib/mock-db/{mock-db.json,store.ts,types.ts}, frontend/src/types/dashboard.ts, frontend/src/features/dashboard/{DashboardPage.test.tsx,DashboardViews.test.tsx,README.md}, frontend/src/lib/mock-db/README.md, CLINIQ-Knowledge-Base/01-Requirements/Features/Module-Overview.md, 08-Logs (Changelog, Issues-and-TODOs)
Changes Made:
- `config.showFrequentVisitors` is now true, and the persisted-state migration defaults to true.
- The Overview panel lists the five students with the most visits (already sorted most visits first). A "Show all <n>" header button expands the list and "Show top 5" collapses it; the count badge keeps the total.
- On a phone, the header button drops below the title instead of squeezing it.
- The Clinic Overview Report printout still lists every frequent visitor (the "not show many" ask was about the crowded screen).
Reason: Zean's call; the threshold (3 visits in 30 days) still waits for the nurse.
Testing Performed: Dashboard and mock-db tests 168/170. The 2 failures (stock.test, sync.test) were already failing before this change. A new test covers top five, Show all and Show top 5. Typecheck and lint are clean for the changed folders. Screenshots at 1440 and 390 px opened and checked: no horizontal scroll. Screenshots are in the session scratchpad, outside the repo.
Known Issues: A browser that saved mock state with the switch off keeps it off until the saved state is reset (open the app with `?mockReset=1`).
Next Steps: Set the real threshold when the nurse answers.
