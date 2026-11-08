Date/Day/Time: Monday, November 02, 2026 — 14:57 PHT
Agent: Claude Opus 5.5 (Claude Code)
Task: Remove the darker hover colour
Status: Completed. Not committed.
Prompt/Request: "Dont use darker color as hover effect for chips and cards".
Files Modified: `StatCard.tsx`, `AttentionChips.tsx`, `review-round-2.test.tsx`, `Design-System.md`, `Frontend-Changelog.md`.
Changes Made: Removed `hover:brightness-90` from linked stat cards and chips. Hover is now only the lift from `shadow-clickable` to `shadow-overlay`.
Reason: Zean does not want a darker colour on hover.
Testing Performed: Typecheck 0, lint 0, 957 of 957 tests, build 0. Not viewed in a browser.
Known Issues: Timestamps written with `TZ=Asia/Manila date` in Git Bash were UTC labelled PHT, 8 hours behind. See Frontend-Issues-and-TODOs.
Next Steps: None.
