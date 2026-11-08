Date/Day/Time: Saturday, November 07, 2026 — 05:20 PHT
Agent: Claude Code (Opus 5.5)
Task: Drop "Main" from the visit's symptom field label
Status: Completed
Prompt/Request: Zean, in chat: "Main symptom, remove Main"
Files Modified: frontend/src/features/clinic-visits/ComplaintField.tsx, NewVisitEntryPage.tsx, VisitDetailPage.tsx, ExtraComplaintsField.tsx; wording in 12 test files
Changes Made: The field reads "Symptom" (was "Main symptom", from Part 1 the same morning). Its messages follow: "Choose the symptom for this visit.", "The first-aid checklist follows the symptom.", "The checklist appears when the symptom matches a predefined type.", and the Other symptoms hint "Reports count only the symptom above." Labels only; data names unchanged (ADR-070).
Reason: Zean's request.
Testing Performed: typecheck 0, lint 0; tests 1083 passed, 3 failed (1086): the same three failures that predate Part 1 (FIX in Frontend-Issues-and-TODOs).
Known Issues: none new.
Next Steps: Part 2 of the consultation job.
