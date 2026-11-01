Date/Day/Time: Sunday, November 1, 2026 — 11:44 PHT
Agent: Claude Opus 5.5 (Claude Code)
Task: Follow-ups to Frontend clean-up, Part 1: Edit Staff Back, Follow-Ups header, the patient badge, the "in clinic now" chip
Status: Completed. Nothing committed.
Prompt/Request: "Edit Staff has the same Back defect as Edit Student. fix", then, with three screenshots: "Then fix this layout. Also remove this button in clinic now, we dont need that. Then also fix this badge wrapping"
Files Modified: `StaffFormPage.tsx`, `StaffProfilePage.tsx`, `FollowUpListPage.tsx`, `PatientFilterSelect.tsx`, `PatientNumber.tsx`, `VisitLogListPage.tsx`, `AttentionChips.tsx`, `routes/paths.ts`, `frontend-cleanup.test.tsx`, `URL-Parameters.md`, `Issues-and-TODOs.md`, `Issues-Done-Archive.md`, `Changelog.md`
Changes Made:
- Edit Staff returns with `navigate(-1)` and `lib/savedMessage.ts`, as Edit Student does.
- Follow-Ups header: Patient and Status both have their label beside the field.
- `PatientNumber` no longer wraps its badge. The LRN column is 14rem on Follow-Ups and on the Visit Log, whose minimum table width went from 48rem to 56rem.
- Removed the Dashboard "in clinic now" chip added for C12, at Zean's word. `?inClinic=1` still filters the Visit Log; the code comment and `URL-Parameters.md` say no screen links to it.
Reason: Zean's review of the Part 1 result.
Testing Performed: The Edit Staff test failed first, then passed. Chromium at 1280, 1024 and 375: no overflow of the badge on Follow-Ups, Visit Log or Incident Log; Patient and Status labels on one line. Final numbers are in the Changelog row.
Known Issues: At 1280 the Follow-Ups table is wider than its card (60rem minimum), so the Actions column needs a side scroll. That minimum is older than this change.
Next Steps: Zean's answers on the two open `FIX` entries from Part 1, then Part 2.
