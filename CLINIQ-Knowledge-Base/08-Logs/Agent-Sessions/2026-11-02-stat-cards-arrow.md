Date/Day/Time: Monday, November 02, 2026 — 06:30 PHT
Agent: Claude Opus 5.5 (Claude Code)
Task: Show that a stat card is clickable
Status: Completed. Not committed.
Prompt/Request: "Then also add an indicator that it is clickable maybe an icon on the corner or what. Look for inspo".
Files Modified: `StatCard.tsx`, `review-round-2.test.tsx`, ADR-062 (note), `Design-System.md`, `Changelog.md`.
Changes Made: Cards with a link show a 16px `arrowRight` in the top-right corner, hidden on paper. It moves 2px on card hover, except under reduced motion. Cards that open nothing show no arrow.
Reason: UC Berkeley's card guidance recommends a second signal when the title is not underlined. Queensland Health's design system keeps chevrons for in-page changes and arrows for going to another page.
Testing Performed: Tests failed first, then passed. Typecheck 0, lint 1 at first (the test regex error, fixed in the next change), Vitest exit 0, build 0. Not viewed in a browser.
Known Issues: None.
Next Steps: Zean to check it on screen.
