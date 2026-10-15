Date/Day/Time: Thursday, October 15, 2026 — 20:29 PHT
Agent: Claude Code (Claude Opus 5.5)
Task: Redesign the Dashboard header / Staff strip / tabs layout
Status: Completed
Prompt/Request: Zean, with a screenshot of the Staff Dashboard after the spacing fix in `2026-10-15-dashboard-tabs-spacing.md`: "The layout still looks kinda off. Redesign the layout"

Files Modified:
- `frontend/src/features/dashboard/DashboardPage.tsx`
- `frontend/src/features/dashboard/components/StaffShortcuts.tsx`
- `frontend/src/features/dashboard/README.md`
- `CLINIQ-Knowledge-Base/03-Design/Reference-Screens.md`
- `CLINIQ-Knowledge-Base/08-Logs/Issues-and-TODOs.md`
- `CLINIQ-Knowledge-Base/08-Logs/Changelog.md`
- `CLINIQ-Knowledge-Base/08-Logs/Agent-Sessions/2026-10-15-dashboard-header-strip-merge.md` (this file)

Changes Made:
- `StaffShortcuts` now renders inside the header `Card`, after `DashboardHeader`, as the card's bottom band: `mt-4 border-t border-border pt-4`. It is still `print:hidden` and still the `Staff shortcuts` region.
- The Backup link lost its own border, background, and shadow (`-mx-2 px-2 py-1`, hover `bg-surface` kept, `min-h-10` kept). New Visit is unchanged (primary button, right of the band).
- Spacing from the previous session kept: header card to tabs 16px (`gap-4`), tabs to first card 12px (`gap-3`).
- Shared `Tabs` and `DashboardHeader` not changed.

Reason: in the screenshot, the Backup strip and the tabs were two left-aligned bordered boxes of different widths with New Visit floating at the right, so the area under the header read as loose widgets. Putting the shortcuts inside the header card makes the page chrome one block and leaves the tabs as the only element above the panel they switch.

Options considered:
- Chosen: strip as the header card's bottom band. It stays "directly under the header", as Reference 1 and the ADR-011 amendment say, and Admin's layout is unchanged.
- Tabs on one row with Backup and New Visit: rejected. The three need about 1,140px, but Staff content at 1280 is about 944px wide, so the row wraps; it also groups the tabs with the page chrome instead of their panel.
- Moving New Visit into the header's action group and Backup into the subtitle: rejected. It changes the documented strip into something else, which is the separate header-polish work, not this layout fix.

Testing Performed:
- Chromium (Playwright, headless Chromium 1228; no Microsoft Edge), Overview view, Staff and Admin at 375/390/768/1280/1875. Screenshots were opened and looked at: one header block, the tabs attached to the cards, no floating boxes; on phones the band stacks Backup over New Visit inside the card.
- Header card to tabs 16px and tabs to first card 12px at every width for both roles. Top bar to first stat card, Staff: 496 → 503 (375/390), 332 → 349 (768/1280), 276 → 293 (1875). The added space is the band's divider and padding. Admin unchanged: 364 / 276 / 220.
- `scrollWidth <= viewport width` at every width; axe-core 4.10 found no violations on all 10 combinations.
- Print emulation at A4 and Letter (Staff and Admin): the band and the tabs are hidden, and all three panels print.
- `npm run typecheck` pass; `npm run build` pass; `npm run lint` 0 errors, 2 pre-existing warnings; `prettier --check` on the changed files pass; `npm test` 74 files, 495 tests passed (unchanged; tests find the strip by its region name).
- Screenshots and scripts stayed in the session scratchpad, outside the repo.

Known Issues: none new.
Next Steps: the open `AUDIT` entry "Dashboard views" (ADR-025) covers the Dashboard Phase 2 re-audit. If the team wants the header polish, see `Prompt-Dashboard-Header-Layout-Polish`. Nothing committed.
