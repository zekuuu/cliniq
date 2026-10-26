Date/Day/Time: Monday, October 26, 2026 — 14:33
Agent: Claude Code (Opus 5.5)
Task: Shorter emergency contact labels with icons; student contact information optional; feedback after Add Student
Status: Completed
Prompt/Request: (1) "This one is being redundant, maybe remove another 'Primary emergency' word each, like just 'Contact name', then add icons to be easily determined" (screenshot of the Primary emergency contact fieldset). (2) "Make the student contact information optional". (3) "Also when saving, there's no communication or feedback like student saved, or it should redirect to back or make fields empty indicating a new input for new student".
Files Modified:
- frontend/src/features/student-records/StudentFormPage.tsx
- frontend/src/features/staff-records/StaffFormPage.tsx
- frontend/src/components/ui/Combobox.tsx
- frontend/src/components/icons/Icon.tsx
- frontend/src/lib/mock-db/selectors.ts
- frontend/src/lib/students.ts (deleted)
- tests: StudentFormPage, KinderAndBanner, IncompleteRecordsQueuePage, back-navigation
- 01-Requirements/Features/Module-Overview.md, 02-Architecture/Database/Data-Dictionary.md
Changes Made:
- Emergency contact fields (Student and Staff forms) show "Name" (user icon), "Relationship" (users icon) and "Phone" (new phone icon, `type="tel"`). The fieldset legend still says "Primary emergency contact" / "Emergency contact N"; each field keeps the full name ("Primary emergency contact name") as its `aria-label`, so screen readers and tests can tell repeated contacts apart.
- `Combobox` gained optional `icon` and `aria-label` props, matching `Input`.
- Student contact information is optional for every grade: `contactInfoRequired` removed, the form no longer requires it, and `missingRequiredFields` no longer lists it, so the Incomplete Records queue does not flag it.
- Add Student: after a create, the form resets to empty for the next student, and the "Student record created for …" banner is a `role="status"` message scrolled into view. Edit still goes to the profile with its banner. Chosen over a redirect because the back-navigation test pins "Add Student stays, Back leaves without asking".
Reason: The repeated "Primary emergency contact" made labels wrap; the user asked for icons. The create banner sat at the top of a long form, out of view of the Save button, and the filled fields looked unsaved.
Testing Performed: `tsc -b` clean. Vitest on student-records, staff-records, back-navigation, components/ui and lib/mock-db (`--testTimeout=30000 --no-file-parallelism`): all pass except 5 failures that fail identically on clean main (New Visit back-navigation x2, Student Profile excused periods, stock.test expired stock, sync.test renamed student). Fixed two stale tests on the way: Incomplete Records used old labels; Add Student back-navigation never picked Sex.
Known Issues: The 5 pre-existing failures above are not addressed. This reverses panel review ST-3/D8's "required except Kinder" at the user's request; canonical CLINIQ_Modules_and_Features.md may need the same update.
Next Steps: Confirm the canonical Modules & Features wording.
