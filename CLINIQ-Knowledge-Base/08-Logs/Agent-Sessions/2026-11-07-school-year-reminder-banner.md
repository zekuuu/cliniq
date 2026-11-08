Date/Day/Time: Saturday, November 07, 2026 — 12:39 PHT (local clock, UTC+8)
Agent: Claude Code (Opus 5.5)
Task: Make the school-year reminder shorter and more visible
Status: Completed
Prompt/Request: Zean, in chat: "i think it's too long, and it shouldn't be on chips location but rather in more visible".

Files Modified: new `frontend/src/features/dashboard/components/SchoolYearBanner.tsx`; `frontend/src/features/dashboard/DashboardPage.tsx`; `frontend/src/features/dashboard/components/AttentionChips.tsx` (the reminder chip removed); `frontend/src/features/archive/ArchivePage.test.tsx`; `Screen-Inventory.md`, `Decisions-Summary.md`, `Frontend-Changelog.md`.

Changes Made:
- The reminder is now a banner directly under the Dashboard header card. It shows on every Dashboard tab, for Staff only. Before, it was a chip in the attention row lower down the Overview tab.
- Shorter text. Old: "School year 2026–2027 ends Apr 14, 2027: end it on the Archive page" and "School year 2026–2027 has not been ended (due Apr 14, 2027)". New: "School year 2026–2027 ends Apr 14, 2027." and "School year 2026–2027 was due to end Apr 14, 2027.", with an "End school year" or "Start school year" button that opens the Archive page.
- Coming up: info colours with a calendar icon and a secondary button. Overdue: warning colours with a warning icon and a primary button. It is a status region, and it is hidden on paper.

Reason: Zean, in chat, Saturday, November 7, 2026.

Testing Performed: The Archive tests now check the banner's text, its tone, its button and link, and that it sits outside the Summary counts section. Archive, Dashboard and review-round-2 tests: 95 passed, 2 failed (97). The 2 failures are the existing R9 calendar tests from commit `1b50a113`. Typecheck: 0 errors. Lint: 0 errors.

Known Issues: none new.

Next Steps: none.
