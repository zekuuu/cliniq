Date/Day/Time: Monday, November 02, 2026 — 14:56 PHT
Agent: Claude Opus 5.5 (Claude Code)
Task: Restore the earlier stat card design
Status: Completed. Not committed.
Prompt/Request: "bring back this design, this is better. because the current design doesnt match the UI style", with a screenshot of the earlier cards.
Files Modified: `StatCard.tsx` and `StatCardRow.tsx` (restored from the last commit), `TitleLink.tsx`, `Icon.tsx`, `AttentionChips.tsx`, `ReportsPage.tsx`, tests, ADR-062 (note), `Design-System.md`, `Frontend-Changelog.md`.
Changes Made: Fill, left bar, corner icon, coloured label and figure, and the link icon are back. Kept: the flicker fix in `TitleLink`, `shadow-clickable`, and the stronger hover. Removed the corner arrow and `arrowUpRight`. Report totals gained icons. Chips moved from the 35% tints to the pale fills so they match the cards.
Reason: The later designs did not match the rest of the interface.
Testing Performed: Typecheck 0, lint 0, 957 of 957 tests, build 0. Not viewed in a browser. Tests for the strip, tint and arrow versions were replaced.
Known Issues: The chips stay coloured although the screenshot shows them grey, because Zean asked for that colour separately.
Next Steps: None.
