Date/Day/Time: Monday, October 26, 2026 — 00:28 PHT
Agent: Claude Code (Opus 5.5)
Task: Dashboard header: drop today's date, already in the top bar
Status: Completed
Prompt/Request: (pasted the Dashboard header: "Monday, October 26, 2026 · Showing Oct 1 – Oct 26, 2026 · View only") "remove the redundant date today now since it's already in topbar"
Files Modified:
- frontend/src/features/dashboard/components/DashboardHeader.tsx
- CLINIQ-Knowledge-Base/08-Logs/Changelog.md
Changes Made:
- The header's info line now reads "Showing <range> · View only" from 640px up. Below 640px the top bar's clock is hidden (`AppShell.tsx` LiveClock is `hidden sm:block`), so the date stays in the header there (`sm:hidden`); otherwise phones would show no date.
Reason: User request; the top bar already shows the weekday, date and time.
Testing Performed: `npx tsc -b` clean; `vitest run src/features/dashboard src/layouts` 69/69.
Known Issues: None.
Next Steps: None.
