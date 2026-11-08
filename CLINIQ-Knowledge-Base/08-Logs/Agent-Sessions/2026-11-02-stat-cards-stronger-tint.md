Date/Day/Time: Monday, November 02, 2026 — 06:27 PHT
Agent: Claude Opus 5.5 (Claude Code)
Task: Replace the card outline with a stronger tint
Status: Completed. Not committed.
Prompt/Request: "the outline style looks cheap and kinda doesnt match the UI of overall".
Files Modified: `StatCard.tsx`, `DashboardPage.test.tsx`, `review-round-2.test.tsx`, ADR-062 (note), `Design-System.md`, `Frontend-Changelog.md`.
Changes Made: Removed the 1px accent border. Cards use the accent at 35% (yellow 60%) over the page, with the standard `shadow-card`. Captions moved from `text-secondary` to `text-primary`.
Reason: Other cards have no coloured outline; visibility now comes from the tint.
Testing Performed: Tests failed first, then passed. Computed contrast at 35% on the page surface: `text-primary` at least 9.37:1 (error), `text-secondary` as low as 3.33:1, so captions changed. Typecheck 0, lint 1 at first (a control character in a test regex, fixed in the arrow change that followed), Vitest exit 0, build 0. Not viewed in a browser.
Known Issues: None.
Next Steps: Zean to check it on screen.
