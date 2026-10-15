Date/Day/Time: Thursday, October 15, 2026 — 19:37 PHT
Agent: Claude Code (Opus 5.5)
Task: Trend table sorting, independent Common complaints height, Report Incident shortcut
Status: Completed
Prompt/Request: "In visits trend table, remove the sorting in dates, only complaints and total. Also the div of common complaints height is depending on the height of trend, it should be independent. Then also add a keyboard shortcut for adding incident"
Files Modified:
- frontend/src/features/dashboard/components/ComplaintTrends.tsx
- frontend/src/features/dashboard/components/ComplaintTrends.test.tsx
- frontend/src/components/KeyboardShortcuts.tsx
- frontend/src/components/KeyboardShortcuts.test.tsx
Changes Made:
- `TrendTable`: period columns no longer have `sort`. The row-value getter now handles only `complaint` and `total`. The `tableBucketName` helper is removed because it no longer had a caller.
- `TRENDS_GRID`: added `items-start`, so the Common complaints card sizes to its own content and is no longer stretched to the Visits trend card's height. The skeleton shares the same grid.
- `KeyboardShortcuts`: `Alt + I` opens `/incidents/new` (Report Incident) and is listed in the "?" help. Report Incident is Staff-only, like New Visit, and the route guard handles other roles.
Reason: Requested directly.
Testing Performed: Added assertions that no period column has a sort button while Complaint does, and that `Alt + I` navigates to `/incidents/new`. Full suite: 74 files, 495 tests passed. `tsc -b` clean. Lint: 0 errors. Not checked in a live browser.
Known Issues: None.
Next Steps: None.
