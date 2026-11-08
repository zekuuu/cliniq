Date/Day/Time: Thursday, November 05, 2026 — 22:34 PHT
Agent: Claude Code (Opus 5.5)
Task: Import Staff List (ADR-069)
Status: Completed
Prompt/Request: "add import in staff similar to student". ADR-043 item 7 excluded a staff import, so the agent asked three questions; Zean chose the recommended answers: match by Staff No., else by name; leave staff missing from the file alone; core columns plus contacts.
Files Modified:
- frontend/src/lib/staffImport.ts (new), frontend/src/lib/mock-db/api.ts (previewStaffImport, applyStaffImport, shared resolveIfCompleted)
- frontend/src/features/staff-records/StaffImportPage.tsx (new), StaffListPage.tsx (Import List button), StaffImport.test.tsx (new)
- frontend/src/routes/paths.ts, frontend/src/routes/AppRoutes.tsx
- frontend/sample-data/staff-list-sample.csv (new; follow-up "then also provide sample csv for it"), and frontend/sample-data/student-list-sample.csv (moved from frontend/src/test/fixtures/; follow-up "move both sample csv in folder can be easy to find or open"). Inside frontend/ because Vite refuses to load files outside its root.
- Docs: ADR-069 (new), Decisions-Summary.md, Module-Overview.md, Frontend-Issues-and-TODOs.md
Changes Made:
- `/staff/import`, "Import Staff List": drop zone, column matching (guessed from headers; the contact-number guess skips "emergency" headers), preview (new, matched and changed, skipped rows with the reason), confirm, apply. No archive step.
- Matching and checks per ADR-069. Blank cells keep CLINIQ's value; a contact from the file is added only when the record has none. An archived record matched by Staff No. is restored. A record completed by the import is resolved on the staff Incomplete Records page, credited to the importer (the resolve code now shared with Edit Staff).
- Audit: one "submit" entry on target type `staff-import`, counts only.
- Sample file `frontend/sample-data/staff-list-sample.csv` (fictional people), beside the student sample: 2 rows completing records by Staff No., 1 update by name, 4 new staff; a test checks it imports with nothing skipped (4 new, 3 matched, 3 changed).
Reason: User request; Zean's choices.
Testing Performed: ESLint clean; new tests (column guess, preview, apply, contact kept, no-op writes nothing, page flow); full `npx vitest run src`: 124 files, 1072 passed; the sample-file test added after (staff import tests: 6 passed). Not checked in a browser.
Known Issues: No import batch record (file name, counts) is kept for staff, unlike students.
Next Steps: Canonical and backend docs (DOC entry).
