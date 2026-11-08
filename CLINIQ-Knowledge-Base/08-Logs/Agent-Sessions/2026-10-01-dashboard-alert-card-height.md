# Dashboard Alert Card Height

Date/Day/Time: Thursday, October 01, 2026 — 15:59
Agent: Codex
Task: Make the three Dashboard alert cards share one stable height and remove the clipped card-body effect.
Status: Completed
Prompt/Request: “make all these three same height, because at the middle it's same height, but there a cutout in the content”
Files Modified:
- `frontend/src/components/ui/ListCard.tsx`
- `frontend/src/features/dashboard/components/AlertLists.tsx`
- `frontend/src/features/dashboard/DashboardPage.test.tsx`
- `CLINIQ-Knowledge-Base/08-Logs/Frontend-Changelog.md`
Changes Made: Made loaded and skeleton list cards fill their grid track, made the scrollable list region the flexible card body with `min-h-0 flex-1`, explicitly stretched the alert grid items, and added a regression assertion that all three alert regions use the shared-height layout.
Reason: The alert cards had an implicit height relationship while their capped list regions were not explicit flex children, which allowed the content area to appear uneven or clipped after row-height changes such as stacked inventory badges.
Testing Performed: Dashboard tests passed (14 tests); full Vitest suite passed (49 files, 216 tests); `npm run build` passed; targeted Prettier check passed.
Known Issues: The unrelated existing `npm run lint` error in `frontend/src/features/issue-reports/ReportIssueModal.tsx` remains documented in `Frontend-Issues-and-TODOs.md`.
Next Steps: None for this layout change.
