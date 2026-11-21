Date/Day/Time: Sunday, November 22, 2026 — 02:15 PHT
Agent: Claude Code (Opus 5.5)
Task: The student search by LRN also matches the shown last 4 digits
Status: Completed
Prompt/Request: "also when searching for LRN it should check the masked start numbers and also the visible 4 last number"
Files Modified:
- frontend/src/lib/lrn.ts (`fullLrnMatchesSearch`), frontend/src/lib/mock-db/selectors.ts (`searchStudents`), frontend/src/lib/mock-db/search.test.ts, frontend/src/components/forms/StudentPicker.tsx (comment)
- backend/app/Shared/Support/Lrn.php (`searchMatches`), backend/app/Modules/StudentRecords/Services/StudentService.php (`matches`), backend/tests/Feature/StudentRecordsTest.php
- CLINIQ-Knowledge-Base/06-Decisions/ADR-087-LRN-Search-Also-Matches-The-Shown-Last-4.md (new), Decisions-Summary.md, 04-Development/API-Contract.md
- .claude/skills/cliniq-combobox-patterns/SKILL.md (old: LRN prefix only; new: prefix, or up to 4 digits in the shown last 4)
Changes Made: Typed digits find a student when they match the start of the full LRN, or, up to 4 digits, appear in its last 4. Five or more digits match only the start. The logs already matched the last 4 (ADR-080 item 7); this brings the student and patient searches (StudentPicker, PatientPicker, the top-bar search, the Student List's search through `StudentService::matches`) to the same view of the LRN.
Reason: Zean's request: the 4 digits shown on screen should find the student.
Testing Performed: frontend `tsc -b` clean; Vitest 136 of 136 in the search, student-records and New Visit tests (new: "0001" finds Gian Quizon, "60001" finds nothing); backend Pest 257 of 257 (new assertions: "0002" finds Ana Abad, "00002" finds nothing).
Known Issues: Modules & Features (Module 1) needs the new LRN search rule (ADR-087).
Next Steps: Not committed.
