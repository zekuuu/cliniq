Date/Day/Time: Monday, October 26, 2026 — 00:24 PHT
Agent: Claude Code (Opus 5.5)
Task: Calendar Table view, Yearly: same narrow count columns
Status: Completed
Prompt/Request: "what about yearly" (after [2026-10-26-calendar-table-narrow-counts](2026-10-26-calendar-table-narrow-counts.md))
Files Modified:
- frontend/src/features/dashboard/components/VisitCalendar.tsx (per-month table)
- CLINIQ-Knowledge-Base/08-Logs/Changelog.md
Changes Made:
- The Yearly table (one row per month) had no widths, so its six columns were equal. Now Month 9rem (fits "September 2026"), Visits 4.5rem, Incidents 6rem, Total 4.5rem; Holidays and Events share the rest.
Reason: User request; the Weekly/Monthly day table already had these widths.
Testing Performed: Screenshot at 1366px: headers and counts on one line; month-long holiday and event lists wrap. `npx tsc -b` clean; `vitest run src/features/dashboard` passes.
Known Issues: None.
Next Steps: None.
