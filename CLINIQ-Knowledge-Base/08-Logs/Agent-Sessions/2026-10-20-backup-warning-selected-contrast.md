Date/Day/Time: Tuesday, October 20, 2026 — 16:43 PHT
Agent: Codex (GPT-5)
Task: Restore contrast for the selected Backup sidebar item’s warning badge.
Status: Completed
Prompt/Request: "now it's not contrast when the page is selected"
Files Modified:
- `frontend/src/layouts/Sidebar.tsx`
- `frontend/src/layouts/AppShell.test.tsx`
- `CLINIQ-Knowledge-Base/08-Logs/Changelog.md`
Changes Made:
- Made the Backup warning badge white with an amber alert glyph only while Backup is the selected green sidebar item; its normal inactive state remains solid amber with a white glyph.
- Added selected-state regression coverage.
Reason: The normal amber badge did not stand apart sufficiently from the selected green navigation background.
Testing Performed:
- `npm.cmd test -- --run src/layouts/AppShell.test.tsx` — passed (14 tests).
- `npm.cmd run typecheck` — passed.
Known Issues:
- No new issues found.
Next Steps:
- None.
