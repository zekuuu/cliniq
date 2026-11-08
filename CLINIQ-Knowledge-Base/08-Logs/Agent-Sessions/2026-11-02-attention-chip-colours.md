Date/Day/Time: Monday, November 02, 2026 — 06:45 PHT
Agent: Claude Opus 5.5 (Claude Code)
Task: Colour the Dashboard attention chips
Status: Completed. Not committed.
Prompt/Request: "is there still missed", then "apply".
Files Modified: `AttentionChips.tsx`, `review-round-2.test.tsx`, `Design-System.md`, `Frontend-Changelog.md`.
Changes Made: Incomplete records take the unfinished tint, low stock the warning tint, expired or expiring the error tint, all at 35% with `shadow-card` and no outline. Linked chips darken on hover. The backup alert chip is unchanged.
Reason: The same data should take the same colour. The 35% tint avoids overstating items that are only expiring; solid red stays for Expired.
Testing Performed: Test failed first, then passed. Typecheck 0, lint 0, Vitest exit 0, build 0. Text on these tints was computed earlier at 9.37:1 or better. Not viewed in a browser.
Known Issues: None.
Next Steps: Zean to check it on screen.
