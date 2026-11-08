Date/Day/Time: Sunday, September 27, 2026 — 13:41
Agent: Codex
Task: Diagnose the Inventory sidebar item still appearing disabled.
Status: Completed
Prompt/Request: “inventory sidebar still disabled”
Files Modified:
- `cliniq-frontend/src/layouts/AppShell.test.tsx`
- `CLINIQ-Knowledge-Base/08-Logs/Frontend-Changelog.md`
Changes Made:
- Confirmed `navGroupsFor('staff')` returns Inventory as an enabled link to `/inventory`.
- Added a regression test asserting the Staff sidebar renders Inventory as a link with the correct route.
- Confirmed Admin intentionally receives only Dashboard and Reports navigation.
Testing Performed:
- AppShell navigation tests: 3 passed.
- TypeScript typecheck passed.
Known Issues: The mock role persists in browser `sessionStorage`; an Admin or Instructor preview will not show an enabled Staff Inventory item.
Next Steps: Open the app with `?role=staff` or clear the `cliniq.mockRole` session-storage value, then reload.
