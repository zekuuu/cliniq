Date/Day/Time: Wednesday, October 07, 2026 — 23:05 PHT (system clock)
Agent: Claude Code (Opus 5.5)
Task: Make excuse-letter drafts findable after leaving New Visit
Status: Completed
Prompt/Request: "How can I see the draft excuse letter if I'm not in visits or I exit it and didnt click review letter". The only path was Visit Log, then the visit, then its Excuse letter card. Two fixes were offered (drafts on the Student Profile card; a Staff Dashboard list of drafts). The answer: "Fix the gap, choose the best."

Choice: both. The Dashboard list closes the gap, because Staff find a draft without knowing which student or visit it was. The profile card is a small change, and without it the card hid drafts while describing itself as the student's letters.

Files Modified:
- `frontend/src/lib/mock-db/api.ts`: `getStudentExcuseLetters` also returns drafts, with `status: 'approved' | 'pending'`; new `listPendingExcuseLetters()` (every visit draft for active students, oldest visit first, Student Number only).
- `frontend/src/features/dashboard/api/dashboardApi.ts`: `fetchPendingExcuseLetters`.
- New `frontend/src/features/dashboard/components/PendingExcuseLetters.tsx`; `DashboardPage.tsx` renders it for Staff only, below the alert groups.
- `frontend/src/features/student-records/StudentProfilePage.tsx`: pending rows show a "Pending approval" badge and a "Review letter" link to the letter page; approved rows keep "View visit".
- Tests: `DashboardPage.test.tsx`, `StudentProfilePage.test.tsx`, `ExcusedPeriod.test.ts`.
- Docs: `Module-Overview.md` (Modules 3 and 9), `ADR-011` (amendment), `Frontend-Issues-and-TODOs.md`, `Frontend-Changelog.md`, this log.

Changes Made: as listed. Decisions: the list has its own fetch, separate from the date-range summary, because a draft is current state like a due follow-up. Admin never requests it. The card is hidden when there are no drafts, so it doesn't sit empty on most days. Rows link the Student Number to the profile and "Review letter" to the letter. Display privacy: the Dashboard list shows the Student Number only (ADR-004); the profile is a single deliberate lookup. Audit trail: read-only, no new writes.

Reason: a draft saved with a visit could be forgotten if Staff left New Visit without clicking "Review excuse letter".

Testing Performed:
- `npm run typecheck`: clean.
- `npm test`: 61 files, 341 tests passed.
- `npm run build`: succeeded.
- Live Playwright script (MCP not attached; scratchpad `playwright-core`, cached Chromium, `vite` on 5199, `?mockPersist=on`): saved a Sent home visit with a draft and left without reviewing. The Dashboard listed it (2026-00001) and the seed draft (2021-00005), with no names. "Review letter" opened the Draft letter. The profile showed "Pending approval" with "Review letter". After approval the row left the Dashboard. Admin saw no card. No console errors. The one failed check, a 375px overflow, also appears for Admin without this card: it comes from the Visit Calendar and is logged in Frontend-Issues-and-TODOs.

Known Issues: see "Pending excuse letters on the Dashboard and profile" in `Frontend-Issues-and-TODOs.md`.

Next Steps: Phase 2 re-audit of the Dashboard (#31) and Student Profile (#7); fix the Visit Calendar's 375px overflow; carry the ADR-011 amendment into the canonical documents.
