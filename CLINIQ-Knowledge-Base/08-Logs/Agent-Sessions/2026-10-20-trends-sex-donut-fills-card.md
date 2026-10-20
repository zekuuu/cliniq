Date/Day/Time: Tuesday, October 20, 2026 — 19:25 PHT
Agent: Claude Code (Claude Opus 5.5)
Task: Remove the empty space under the Trends tab's "Visits by Sex" donut.
Status: Completed
Prompt/Request: "audit trends tab, there's a big space below the pie chart, wouldn't it be better if enlarge the chart"
Files Modified:
- `frontend/src/features/dashboard/components/ComplaintTrends.tsx`
- `CLINIQ-Knowledge-Base/08-Logs/Changelog.md`
Changes Made:
- Confirmed in Chromium: on desktop (`lg`) the "Visits by Sex" card is stretched to the height of the "Visits by grade level" card beside it, whose 13 grade buttons wrap onto several rows; the donut stayed a fixed 224px (`h-56`), leaving an empty band under the Female/Male buttons (about 180px at 1440, about 280px at 1024). Below `lg` the cards stack and there is no gap.
- On `lg` the card is a flex column, its body grows (`lg:flex-1`), and the donut's container grows into the free height (`lg:h-auto lg:min-h-56 lg:flex-1`; Chart.js already uses `maintainAspectRatio: false`). Below `lg` it stays `h-56`.
- Result: donut canvas 224px → 388px tall at 1440 (497px wide); the Female/Male buttons now sit at the bottom of the card, level with the grade card. At 1024 the donut is limited by the 289px column width, so the extra height is space around the donut inside the chart area. 768 and 390 unchanged.
Reason: Zean reported the empty space and suggested enlarging the chart; filling the card is the smallest change that removes it.
Testing Performed:
- Chromium screenshots and canvas/card measurements at 1440, 1024, 768 and 390 before and after (kept outside the repo, `%USERPROFILE%\cliniq-audit\trends-now-*.png`, `trends-after-*.png`).
- Dashboard tests: 43 passed. `tsc -b` passed. ESLint on the file: clean.
Known Issues:
- At 1024 the donut is width-limited, so its legend sits some way below it. A different column split (for example a wider grade card) would change that; not done without a decision.
Next Steps:
- None required.
