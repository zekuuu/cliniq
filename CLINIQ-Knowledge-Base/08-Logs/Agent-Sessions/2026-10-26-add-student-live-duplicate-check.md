Date/Day/Time: Monday, October 26, 2026 — 14:40
Agent: Claude Code (Opus 5.5)
Task: Live duplicate feedback on Add Student's LRN and Full name
Status: Completed
Prompt/Request: "when adding a student, there should be feedback or indicator to know if what I'm typing in LRN or FUll name is already listed or already added in student list"
Files Modified:
- frontend/src/lib/mock-db/api.ts
- frontend/src/features/student-records/api/studentFormApi.ts
- frontend/src/features/student-records/StudentFormPage.tsx
- frontend/src/features/student-records/StudentFormPage.test.tsx
Changes Made:
- New `checkStudentDuplicates(lrn, fullName)` read: `lrnTaken` (a complete 12-digit LRN used by any student, archived included, matching the save rule) and `nameMatches` (active students with the same name, case-insensitive, in any grade). `DUPLICATE_LRN_MESSAGE` is shared with `DuplicateLrnError`.
- Add Student runs the check 300 ms after typing stops. A taken LRN shows the duplicate-LRN message as the field's error, without naming the other student (ADR-028). A matching name shows a warning note under Full name: "Already in the Student List:", each match's grade level and masked LRN, and "Check it isn't the same student. You can still save." Edit Student is unchanged.
- The save-time checks are unchanged: the LRN still blocks, and the same-name-and-grade duplicate dialog still asks for confirmation.
Reason: Staff only found out about a duplicate after pressing Save.
Testing Performed: `tsc -b` clean. New test: typing a taken LRN shows the message without the student's name; typing a listed name shows the note with grade and the last four LRN digits; nothing is audited. StudentFormPage, back-navigation and lib/mock-db suites pass except 4 failures that also fail on clean main (New Visit back-navigation x2, stock.test, sync.test).
Known Issues: Name matching is an exact match (case and outer spaces ignored); a misspelt or reordered name won't be caught. The masked LRN follows cliniq-display-privacy for lists and pickers.
Next Steps: None.
