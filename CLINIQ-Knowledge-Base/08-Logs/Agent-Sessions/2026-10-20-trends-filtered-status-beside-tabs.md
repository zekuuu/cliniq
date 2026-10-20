Date/Day/Time: Tuesday, October 20, 2026 — 19:32 PHT
Agent: Claude Code (Claude Opus 5.5)
Task: Move the Trends "Filtered" status beside the Trends tab and make it easier to see, without overdoing it.
Status: Completed
Prompt/Request: "move the Filtered status beside the trends button also improve its visibility but not overdoing it"
Files Modified:
- `frontend/src/components/ui/Tabs.tsx` (new optional `status` slot; the tab row wraps with actions right-aligned)
- `frontend/src/components/ui/Tabs.test.tsx`
- `frontend/src/components/icons/Icon.tsx` (new `filter` funnel icon)
- `frontend/src/features/dashboard/DashboardPage.tsx`
- `CLINIQ-Knowledge-Base/08-Logs/Changelog.md`
Changes Made:
- The "Filtered: Female × Grade 5 · Clear" note moved from the top of the Trends panel to the tab row, directly after the Overview/Trends tabs, through a new `status` prop on the shared `Tabs`. It shows only while Trends is selected (the filter narrows Trends only). It keeps `role="status"` and its Clear button.
- Visibility: it was a grey `bg-surface` pill on the `surface` page background, nearly invisible. It is now a white pill with a thin `brand-green` border, `brand-green-dark` semibold text (9.19:1) and a 14px funnel icon; Clear is `text-primary`, underlined. No fill color, no animation.
- `Tabs` row: when the tabs, the note and the actions do not fit on one line, the actions (Dashboard's New Visit) move to their own line, right-aligned (`md:flex-wrap`, actions in an `md:ml-auto` wrapper), so the note stays beside the tabs. Below `md` the existing stacked order is unchanged.
Reason: Zean asked for the filter state to sit by the Trends tab and to be more visible.
Testing Performed:
- Chromium screenshots with `?view=trends&sex=female&grade=Grade%205` at 1440, 1024, 768, 390 (`%USERPROFILE%\cliniq-audit\filtered-*.png`): beside the Trends tab at 1440/1024/768 (New Visit on its own line at 1024 and 768); below the tabs on phones.
- Tests: Dashboard, Tabs and layouts, 65 passed. One existing Tabs assertion was updated from "the action shares the tablist's parent" to "the tab row contains the action and is hidden in print" (the action is now in a right-aligning wrapper; tab order is still checked). A new test covers the status slot. `tsc -b` passed; ESLint clean on the changed files.
Known Issues:
- None.
Next Steps:
- None.
