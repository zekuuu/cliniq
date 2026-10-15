Date/Day/Time: Thursday, October 15, 2026 — 19:22 PHT
Agent: Claude Code (Opus 5.5)
Task: Apply the agreed corner radius to the Dashboard view switcher and show a loading skeleton when switching views
Status: Completed
Prompt/Request: "Apply the agreed size of round to dashboard switcher. As well as apply the loading skeleton to the content when switching"
Files Modified:
- frontend/src/components/ui/Tabs.tsx
- frontend/src/features/dashboard/DashboardPage.tsx
- frontend/src/features/dashboard/components/VisitCalendar.tsx
- frontend/src/features/dashboard/DashboardPage.test.tsx
- frontend/src/features/dashboard/DashboardViews.test.tsx
- .claude/skills/cliniq-interactive-states/SKILL.md
Changes Made:
- Radius (Design-System.md, Shape Language: containers and controls use `--radius-md` 8px, chips and badges use `--radius-sm` 6px): Tabs track `rounded-lg` (12px) → `rounded-md`; tab chips `rounded-md` → `rounded-sm`, matching `SegmentedControl`. The Overview tab's alert-count badge changed from `rounded-full` (pill) to `rounded-sm`, like the shared `Badge`.
- Switch skeleton: `changeView` sets `switching`. For `VIEW_SWITCH_SKELETON_MS` (300ms), Overview and Trends render their existing shaped skeletons, and the calendar renders its own `CalendarSkeleton` through the new `showSkeleton` prop. Panels stay mounted, so the calendar's view, period, and selected day survive (ADR-025). Clicking the tab that is already selected does nothing, and a second switch restarts the timer.
- Skill `cliniq-interactive-states`: the toggles/view-tabs rule now names the radius pair. Old: no radius stated. New: 8px track with 6px chips.
Reason: The switcher used 12px, which is outside the agreed radius set. The user wants a switch to read as content loading rather than an instant jump.
Testing Performed: Updated 5 tests that read content immediately after a switch so they wait for it. Added assertions that the Trends and Calendar skeletons show right after a switch. Full suite: 74 files, 494 tests passed. Lint: 0 errors (2 existing warnings in unrelated files). `tsc -b` clean.
Known Issues: The 300ms skeleton is a deliberate delay, not a real fetch, because the panel data is already loaded. Not checked in a live browser.
Next Steps: Tune `VIEW_SWITCH_SKELETON_MS` if 300ms feels too short or too long.
