Date/Day/Time: Friday, October 16, 2026 — 18:54 PHT
Agent: Claude (Sonnet 5.5), chat session, not Claude Code; no application code touched
Task: Record the decision to drop the QR feature and the CLINIQ Student Number, as a decision record plus a to-do list (no code change)
Status: Completed
Prompt/Request: Zean: "We will also drop the QR feature and drop the student number, and take it note for future maybe or what." Questions asked and answered: identifier after the drop ("LRN can be used too then Student name, but mostly student name"); how far to go ("Record it, then later I will ask for the prompt for all the fix"); PE Instructor lookup ("Not decided yet"). A later message in the same turn: CLINIQ will be independent and will not use any data from the school's NFC ID system "since it's another company".
Files Modified:
- CLINIQ-Knowledge-Base/06-Decisions/ADR-027-Drop-QR-And-Student-Number.md (new)
- CLINIQ-Knowledge-Base/06-Decisions/Decisions-Summary.md (027 added)
- CLINIQ-Knowledge-Base/06-Decisions/ADR-002, ADR-003, ADR-004, ADR-005, ADR-010, ADR-023 (status line only)
- CLINIQ-Knowledge-Base/08-Logs/Issues-and-TODOs.md
- CLINIQ-Knowledge-Base/08-Logs/Changelog.md
- CLINIQ-Knowledge-Base/08-Logs/Agent-Sessions/2026-10-16-qr-and-student-number-dropped.md (new)
Changes Made:
- ADR-027 records the decision, the open questions (display-privacy replacement, LRN handling, same-name students, Instructor lookup, the phone Emergency button), the alternatives offered, and the consequences. Status says recorded only, nothing built.
- Status lines: ADR-002, ADR-005, ADR-023 now "Superseded by ADR-027 (not built yet, so the app still behaves as described)"; ADR-003, ADR-004, ADR-010 get an "Amended by ADR-027 (decided, not built)" sentence. No other text in those ADRs was changed.
- Issues-and-TODOs.md: new section "QR feature and Student Number dropped (ADR-027)": 5 DECIDE, 2 FIX (remove QR; replace the Student Number with the name), 4 DOC (canonical documents, knowledge-base documents, ERD draft, skills), 1 LATER (future note), 2 NOTE. Three open DECIDEs resolved with `Resolved`: the barcode/QR scanner for the clinic PC, and two entries from this morning's professor-consultation section ("independent first", "defer QR"). Open work at a glance rebuilt by script.
- Decisions-Summary.md: plain-language 027 added.
Reason: The decision affects roughly 640 references to the Student Number, about 28 QR source files, many documents and several skills, and the display-privacy rule. Zean wants it on record now and the fix prompt later; recording it first stops agents from continuing to build on either feature and keeps the open questions visible.
Testing Performed:
- Counts of QR and Student Number mentions come from grep over the knowledge base, the skills and `frontend/src` on main at 0be6c54 (approximate matches, not a dependency analysis).
- ADR number 027 checked free on every branch.
- The glance-block script (validated earlier against the unmodified file) rebuilt the counts; the diff against the previous state shows only the new section, the three resolved entries and the glance block.
Known Issues:
- The display-privacy replacement rule is the real risk: names on lists reverse the reason ADR-004 exists. It is a DECIDE, not decided.
- Zean has not said whether to keep the professor-consultation DECIDE "Show the client both options"; it is flagged in the NOTE.
- `CLINIQ-Questions-for-the-School` and `CLINIQ-Questions-for-the-Clinic` (outside the repository) ask about Student Numbers, NFC cards and QR; those questions are out of date.
Next Steps:
- Zean asks for the removal prompt when ready; before that, decide the display-privacy rule, LRN handling, same-name rule, Instructor lookup and the phone Emergency button.
- Tag the last commit with QR before removing anything.
