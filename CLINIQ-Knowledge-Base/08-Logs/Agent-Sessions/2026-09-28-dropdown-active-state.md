Date/Day/Time: Monday, September 28, 2026 — 19:44
Agent: Codex
Task: Refine the shared date-range dropdown selection state and menu sizing.
Status: Completed
Prompt/Request: "For all the drop downs not just this one. Please remove the check icon just an active indicator or just enough of that green text. then reduce the width of the box it should always depend on the longest text available"
Files Modified: `frontend/src/components/ui/DateRangePicker.tsx`, `frontend/src/features/dashboard/DashboardPage.test.tsx`, this session log, and `Frontend-Changelog.md`.
Changes Made: Removed the selected-option check icon from the reusable date-range menu. The selected option keeps its existing soft surface background and brand-green text treatment. The menu now uses its longest label for width, with a viewport safeguard for narrow screens.
Reason: Make date-range dropdowns lighter and more compact while retaining a clear non-color-only active treatment through selected text weight and background.
Testing Performed: Targeted Dashboard Vitest suite passed (12 tests); `npm.cmd run typecheck` passed; `npm.cmd run lint` completed with only the pre-existing `FollowUpPrompt.tsx` Fast Refresh warning; `git diff --check` passed.
Known Issues: None introduced. The pre-existing lint warning remains outside this change.
Next Steps: None.
