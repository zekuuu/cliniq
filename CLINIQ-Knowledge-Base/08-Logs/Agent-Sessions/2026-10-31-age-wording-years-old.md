# Age wording: "years old"

Date/Day/Time: Saturday, October 31, 2026 — 11:26 PHT
Agent: Claude Code (Opus 5.5)
Task: Change the age in the Student Profile header from "13 years" to "13 years old".
Status: Completed
Prompt/Request: Zean: "also this "13 years" shouldnt it be like 13 years old, or what".
Files Modified: `frontend/src/lib/age.ts`, `frontend/src/lib/age.test.ts`, `frontend/src/features/student-records/Birthdate.test.tsx`, `CLINIQ-Knowledge-Base/08-Logs/Changelog.md`
Changes Made: `ageText` now returns "13 years old" and "1 year old". The unusual-age note keeps its own wording ("Age 16 is unusual for Grade 1").
Reason: "13 years" reads as a length of time, not an age.
Testing Performed: `age.test.ts` and `Birthdate.test.tsx`: 26 passed. Typecheck clean.
Known Issues: None.
Next Steps: None.
