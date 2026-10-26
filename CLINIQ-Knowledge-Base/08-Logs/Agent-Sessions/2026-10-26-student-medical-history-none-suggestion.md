Date/Day/Time: Monday, October 26, 2026 — 14:47
Agent: Claude Code (Opus 5.5)
Task: Suggest "None" in the Student Form's medical history fields
Status: Completed
Prompt/Request: "In add student, medical history, add when clicked the field, it automatically suggests None for input, looks like a drop down"
Files Modified:
- frontend/src/features/student-records/StudentFormPage.tsx
- frontend/src/features/student-records/StudentFormPage.test.tsx
Changes Made: Allergies and Medical conditions switched from `Input` to the shared `Combobox` (free text, opens on focus, cliniq-combobox-patterns). It lists "None" while the field is empty or typed toward "none", and nothing otherwise (`noMatchesText={null}`). Hint now reads "Comma-separated list, or pick None." Applies to Add and Edit Student; the Staff Form is unchanged.
Reason: Most students have no allergies or conditions; one click beats typing None.
Testing Performed: `tsc -b` clean; new test picks None from Allergies and checks it's not offered after typing "Asthma". Student-records and back-navigation suites pass except 3 failures that also fail on clean main.
Known Issues: None.
Next Steps: Same suggestion on the Staff Form if wanted.
