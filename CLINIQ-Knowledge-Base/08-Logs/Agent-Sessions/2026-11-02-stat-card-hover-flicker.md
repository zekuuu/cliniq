Date/Day/Time: Monday, November 02, 2026 — 06:10 PHT
Agent: Claude Opus 5.5 (Claude Code)
Task: Fix the cursor flicker on Dashboard stat cards
Status: Completed. Not committed.
Prompt/Request: "when hovering to cards in dashboard, my mouse flickers".
Files Modified: `TitleLink.tsx`, `review-round-2.test.tsx`, `.claude/skills/cliniq-interactive-states/SKILL.md`, `Changelog.md`.
Changes Made: Root cause: R3 stretched the link's `::after` over the card, while `TitleLink` applied `hover:brightness-75`. A `filter` makes the link the containing block of its own `::after`, so on hover the click area collapsed to the label, the hover ended, the area stretched back, and it repeated. Removed the `darken` variant, which only StatCard used. Stat card labels now only underline on hover; the card still lifts with its shadow.
Skill change: `cliniq-interactive-states`, old: tinted or grey labels darken with `hover="darken"`. New: stat card labels change no further, because a `filter` on a stretched link flickers.
Reason: Bug introduced by review round 2, R3.
Testing Performed: New regression test failed first, then passed. Typecheck 0, lint 0, Vitest exit 0, build 0. The test checks the classes; the flicker itself was not reproduced in a browser.
Known Issues: None.
Next Steps: None.
