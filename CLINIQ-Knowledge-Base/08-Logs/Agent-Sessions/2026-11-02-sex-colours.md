Date/Day/Time: Monday, November 02, 2026 — 15:13 PHT
Agent: Claude Opus 5.5 (Claude Code)
Task: Give Female and Male their own colours in the Trends sex bar
Status: Completed. Not committed. Not viewed in a browser.
Prompt/Request: Zean: "then for colors in Sex, better to apply respective color as Female and Male"
Files Modified: `frontend/src/index.css`, `frontend/src/features/dashboard/components/ComplaintTrends.tsx`, `ComplaintTrends.test.tsx`, `03-Design/Design-System.md`, `06-Decisions/ADR-062-One-Colour-For-Each-Meaning.md` (note), `08-Logs/Changelog.md`.
Changes Made: New tokens `sex-female` `#c74375` (the pink removed by ADR-062) and `sex-male` `#2f6aa6`. The bar's Female part was green and Male was grey; No sex recorded stays light grey. Each Female and Male button now starts with a small swatch of its colour, so a part too thin for its words still matches its button.
Reason: Zean's request. The old male blue `#3d7cbc` was not reused: white text on it is 4.37:1, under 4.5:1, so the darker `#2f6aa6` (5.63:1) is used. Female `#c74375` is 4.68:1.
Testing Performed: Contrast computed with a script. The dataviz palette validator passed the pair, with a CVD warning (protan ΔE 7.8) that is legal with direct labels, which the bar and buttons have. Typecheck clean, ESLint clean on `features/dashboard`, Vitest on `features/dashboard`: 8 files, 58 tests passed, and the production build passed.
Known Issues: The female pink is close in hue to `unfinished` `#e95e90`, though on a different screen part and never as a status. The printed Trends tables have no colour, so they are unchanged.
Next Steps: Zean to view it on the Dashboard.
