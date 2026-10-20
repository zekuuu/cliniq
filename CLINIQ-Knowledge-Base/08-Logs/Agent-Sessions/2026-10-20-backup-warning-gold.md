Date/Day/Time: Tuesday, October 20, 2026 — 16:49 PHT
Agent: Codex (GPT-5)
Task: Apply a gold selected-state treatment to the Backup sidebar warning.
Status: Completed
Prompt/Request: "try gold"
Files Modified:
- `frontend/src/layouts/Sidebar.tsx`
- `frontend/src/layouts/AppShell.test.tsx`
- `CLINIQ-Knowledge-Base/08-Logs/Changelog.md`
Changes Made:
- Changed the selected Backup warning badge from light amber to a muted gold fill (`#c69214`) with a dark glyph. The inactive badge remains semantic amber.
Reason: Gold retains clear separation from the selected green row without the harshness of bright yellow.
Testing Performed:
- `npm.cmd test -- --run src/layouts/AppShell.test.tsx` — passed (14 tests).
- `npm.cmd run typecheck` — passed.
Known Issues:
- No new issues found.
Next Steps:
- None.
