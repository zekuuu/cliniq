Date/Day/Time: Saturday, November 07, 2026 — 12:05 PHT (local clock, UTC+8)
Agent: Claude Code (Opus 5.5)
Task: Let Staff start (and so end) a school year by hand, with a Dashboard reminder when one is due
Status: Completed
Prompt/Request: Zean asked in chat: "Now where can clinician like start or end school year manually, not automatically based on the dates set". Offered three options, Zean answered "1, then if not started show reminder in dashboard".

Files Modified:
- `frontend/src/lib/schoolYear.ts` (+ test): `SchoolYearStart`, `schoolYearStarts` on the settings, `schoolYearOf` from the stored starts, `nextSchoolYear`.
- `frontend/src/lib/mock-db/api.ts`: `startSchoolYear`, `schoolYearDatesOf`; `getArchive` returns `next` and `currentStartedBy`; `getDashboardSummary` returns `schoolYearReminder` for Staff.
- `frontend/src/lib/mock-db/types.ts`, `integrity.ts`, `mock-db.json` (two seeded starts).
- `frontend/src/types/dashboard.ts`, `features/dashboard/components/AttentionChips.tsx` (the reminder chip).
- `frontend/src/features/archive/ArchivePage.tsx` (+ test): the "Current school year" card, Start button and confirmation; reworded the dates card.
- `frontend/src/features/ui-review-regressions.test.tsx`: the Audit Log screen now shows the masked LRN. This test still expected the full LRN and was missed in the earlier masking session ([2026-11-07-audit-log-masked-lrn](2026-11-07-audit-log-masked-lrn.md)).
- Documents: ADR-075, a note on ADR-072, `Decisions-Summary.md`, `Screen-Inventory.md`, `Changelog.md`.

Changes Made:
- **Start school year** (Archive page, Staff only): a card shows "Current school year: 2026–2027" and who started it and when. It also says when the next year is due, or that it is overdue. The button "Start school year 2027–2028" opens a confirmation. The new year starts today and the old one ends yesterday. The action is audited as "Started school year 2027–2028". Starting twice on the same day is refused. The Admin sees no button.
- **The year never changes by itself.** Past the due date, the current year stays and its end moves to today.
- **Dashboard reminder** (Staff only): once the due date has passed, a warning chip next to the backup chip reads "School year 2027–2028 has not been started (due Jun 15, 2027)". It links to `/archive`.
- The date settings card now says it only sets when the next year is due.

Reason: Zean, in chat, Saturday, November 7, 2026 (ADR-075).

Testing Performed:
- `schoolYear.test.ts`: start and end come from the starts; the current year holds past its due date; `nextSchoolYear` due and not due; dates before the first start.
- `ArchivePage.test.tsx`: no automatic change past the due date; the Staff reminder, none for the Admin, none before the due date; `startSchoolYear` Staff-only, audited, and refused twice on the same day; the year before ends yesterday; the UI confirmation; the Admin has no button. One existing expectation changed: after new dates are saved, the current year stays on its manual start (June 15, 2026) instead of moving.
- Typecheck 0 errors, lint 0 errors. Full run: 1128 passed, 3 failed (1131). The 3 failures are the existing calendar and Student Health Record tests from commit `1b50a113`.

Known Issues: none new.

Next Steps:
- Backend branch: store the starts and add a Staff-only start endpoint (see ADR-075 Consequences).
- Canonical documents (DOC).
