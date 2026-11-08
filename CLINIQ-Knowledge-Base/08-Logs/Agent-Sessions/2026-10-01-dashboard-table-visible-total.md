# Dashboard Trend-Table Visible Total Correction

Date/Day/Time: Thursday, October 01, 2026 — 15:23 PHT
Agent: Codex
Task: Correct the Dashboard complaint-trend table Total when the table shows only the newest 12 periods.
Status: Completed
Prompt/Request: “Total count is incorrect, when I show all complaints there's no record all 0, but the total says 2. Also stop verifying in edge it make a lot of files.”
Files Modified:
- `frontend/src/features/dashboard/components/ComplaintTrends.tsx`
- `frontend/src/features/dashboard/components/ComplaintTrends.test.tsx`
- `CLINIQ-Knowledge-Base/08-Logs/Frontend-Changelog.md`
- `CLINIQ-Knowledge-Base/08-Logs/Frontend-Issues-and-TODOs.md`
Changes Made:
- Recomputed TrendTable row totals from the visible post-cap period indexes.
- Recomputed the table’s “All visits & incidents” total from the same visible periods.
- Kept the chart and Common complaints card on their existing full-range totals.
- Added a regression assertion that a row with activity only in an earlier hidden period displays `0` in the table Total when all visible periods are zero.
- Did not launch Edge or create browser-profile files, per the request.
Reason: A table Total that includes periods omitted from the table contradicts the visible row values and made zero-activity rows look active.
Testing Performed:
- Focused Vitest: 4 tests passed in `ComplaintTrends.test.tsx`.
- Full Vitest suite: 49 files passed, 214 tests passed.
- `npm.cmd run typecheck`: passed.
- `npm.cmd run build`: passed.
- No browser verification was run.
Known Issues: None introduced by this correction.
Next Steps: None for this request.
