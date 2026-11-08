Date/Day/Time: Saturday, October 03, 2026 — 02:07 PHT
Agent: Codex
Task: Prevent the Visits Trend table from overlapping the sticky AppShell top bar while scrolling.
Status: Completed
Prompt/Request: “The main problem in Visits trend is when you scroll it's overlapping in topbar.”
Files Modified:
- frontend/src/layouts/AppShell.tsx
- frontend/src/layouts/AppShell.test.tsx
- CLINIQ-Knowledge-Base/04-Development/Frontend-Loop-Engineering.md
- CLINIQ-Knowledge-Base/08-Logs/Frontend-Issues-and-TODOs.md
- CLINIQ-Knowledge-Base/08-Logs/Frontend-Changelog.md
Changes Made:
- Raised the shared sticky AppShell header from `z-10` to `z-30`, above the trend table’s `z-20` sticky edge cells and below the existing modal/toast layers.
- Added a shell regression assertion for the sticky header stacking class.
Reason: The shared DataTable correctly layers sticky columns above its scrolling cells, but that layer was higher than the shell header, so vertical page scrolling allowed it to paint over the top bar.
Testing Performed:
- Focused Vitest: AppShell and trend-table files, 14 tests passed.
- Typecheck passed.
- Focused ESLint passed.
- `git diff --check` passed.
Known Issues: None for this overlap.
Next Steps: None.
