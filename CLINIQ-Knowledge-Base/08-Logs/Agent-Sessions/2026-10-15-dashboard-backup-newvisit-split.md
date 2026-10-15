Date/Day/Time: Thursday, October 15, 2026 — 20:38 PHT
Agent: Claude Code (Claude Opus 5.5)
Task: Move Staff's backup indicator above Print and New Visit onto the Dashboard tab row
Status: Completed
Prompt/Request: Zean, with a screenshot of the header after `2026-10-15-dashboard-header-strip-merge.md`: "I have a suggestion on layout edit then tell me if it's good or not. Moving the Backup Need verification (without the last update date) button on top of print/save then moving the New visit button aligned with the dashboard switcher." The agent judged it good with two conditions: keep a short last-backup date, since a verified but old backup would otherwise look fine and Reference 1 / ADR-011 name status plus last-backup date; and put New Visit above the tabs on phones. Zean replied "Okay".

Files Modified:
- `frontend/src/components/ui/Tabs.tsx`: optional `actions` slot on the tab row
- `frontend/src/components/ui/Tabs.test.tsx`: new test for `actions`
- `frontend/src/components/README.md`
- `frontend/src/features/dashboard/DashboardPage.tsx`
- `frontend/src/features/dashboard/components/DashboardHeader.tsx`: `status` slot, `ml-auto` action group
- `frontend/src/features/dashboard/components/StaffShortcuts.tsx`: now exports `BackupStatusLink` and `NewVisitLink`; the `StaffShortcuts` strip was removed
- `frontend/src/features/dashboard/README.md`
- `frontend/src/features/dashboard/DashboardViews.test.tsx`, `frontend/src/features/ui-review-regressions.test.tsx`
- `CLINIQ-Knowledge-Base/03-Design/Reference-Screens.md`
- `CLINIQ-Knowledge-Base/06-Decisions/ADR-025-Dashboard-Views.md`: amendment note
- `CLINIQ-Knowledge-Base/08-Logs/Issues-and-TODOs.md`, `CLINIQ-Knowledge-Base/08-Logs/Changelog.md`
- this file

Changes Made:
- **Backup indicator.** It moved into the header's action group, above Date range and Print. It reads "Backup [status badge] Oct 14". The short date is the date part of `formatDateTime`, in Philippine time. The link's accessible name carries the full "Last backup Oct 14, 2026 · 2:00 AM". It is a borderless link with a hover fill, `min-h-10`, and `print:hidden`. The loading, error ("Status unavailable"), and no-backup states are kept.
- **New Visit.** It moved onto the view-tab row through `Tabs` `actions`. The row is `flex-col-reverse` below `md` (New Visit above the tabs) and `md:flex-row md:items-center md:justify-between` from `md` up (New Visit right of the tabs, vertically centered). The row is `print:hidden` with `printAll`.
  - DOM order is tabs, then New Visit, then the panel. This keeps desktop reading order natural.
  - On phones New Visit shows visually above the tabs but comes after them in Tab order. This was accepted to keep the tabs directly over their panel.
- **Wrapping.** The header's action group got `ml-auto`, so it stays right-aligned when it wraps under the title (Staff at 768 and 1280). Without it, at 1280 the Backup line floated mid-card over left-aligned buttons.
- **Admin.** Unchanged: no backup indicator and no actions, so the tablist renders exactly as before.

Reason: Zean's suggestion. It removes the divider band and shortens the header, and New Visit fills the empty space right of the tabs.

Testing Performed:
- Chromium (Playwright, headless Chromium 1228; no Microsoft Edge), Overview view, Staff and Admin at 375/390/768/1280/1875. Screenshots were opened and looked at, including a first pass at 1280 where the wrapped action group was left-aligned; fixed with `ml-auto` and re-checked.
- Gaps: header card to tab row 16px and tabs to first card 12px at every width for both roles. New Visit is centered on the 50px tablist (offset 5px) from 768 up. On phones it sits 12px above the 54px tablist.
- Top bar to first stat card, Staff: 503 → 464 (375/390), 349 → 324 (768/1280), 293 → 230 (1875). Admin unchanged: 364 / 276 / 220.
- `scrollWidth <= viewport width` everywhere. axe-core 4.10 found no violations on all 10 combinations.
- Print emulation at A4 and Letter (Staff and Admin): the tab row, New Visit, and the backup link are hidden, and all three panels print.
- `npm run typecheck` pass; `npm run build` pass; `npm run lint` 0 errors, 2 pre-existing warnings; `prettier --check` on the changed files pass; `npm test` 495 → 496 passed.
  - New: a `Tabs` actions test (row placement, `print:hidden`, Tab order).
  - The Staff-shortcuts tests were updated, not weakened. They no longer look for the removed `Staff shortcuts` region. They now find New Visit by name and the backup link by its full name, including the full last-backup date and time, and check the visible short date. For Admin, both links are still asserted absent.

Known Issues: on phones, New Visit appears above the tabs but follows them in Tab order (see Changes Made).
Next Steps: the canonical Frontend Design Reference (Reference 1) needs the new Staff shortcuts placement (logged as DOC). The open `AUDIT` entry "Dashboard views" covers the Phase 2 re-audit. Nothing committed.
