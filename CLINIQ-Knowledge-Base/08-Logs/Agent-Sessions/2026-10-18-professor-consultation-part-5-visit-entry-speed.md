Date/Day/Time: Sunday, October 18, 2026 — 13:37 PHT
Agent: Codex
Task: Professor consultation Part 5 — visit-entry speed, system side only
Status: Partial
Prompt/Request: Continue to the next part of "Fix what the professor suggested and criticized (October 16 consultation)". Make New Visit require fewer clicks and use safe defaults, but do not invent the clinic workflow or the unseen paper form.
Files Modified:
- `frontend/src/components/ui/Select.tsx`
- `frontend/src/features/clinic-visits/ComplaintField.tsx`
- `frontend/src/features/clinic-visits/NewVisitEntryPage.tsx`
- `frontend/src/features/clinic-visits/NewVisitEntryPage.test.tsx`
- `.claude/skills/cliniq-combobox-patterns/SKILL.md`
- `CLINIQ-Knowledge-Base/04-Development/Skills-Setup.md`
- `CLINIQ-Knowledge-Base/08-Logs/Issues-and-TODOs.md`
- `CLINIQ-Knowledge-Base/08-Logs/Changelog.md`

Changes Made:
- Old: an unselected New Visit did not deliberately focus its first meaningful field. New: Student lookup receives focus when no student is identified; Complaint receives focus when the route already identifies the student.
- Old: every newly prepared visit reset disposition to Returned to class. New: the next blank visit uses only the last disposition that saved successfully in the same open session. An unsaved selection still counts as unsaved work.
- Kept: current signed-in user remains the recorder; the system uses the current date/time; Save and prepare another still clears the completed visit and prepares the next one.
- Kept intentionally: Enter remains control-specific (for example, selecting a StudentPicker result). A global "advance" behavior was not added because it would conflict with listbox selection and treatment-note new lines without a nurse-approved workflow.
- Corrected the reusable pattern record: Complaint is a short `Select` list plus explicit Other detail field, not a free-text Combobox.

System interaction inventory (source and focused-test walkthrough, not a human-time study):

| Scenario (identified student) | Clicks | Key presses | User-entered/selected fields | Elapsed time |
|---|---:|---:|---:|---|
| Routine complaint, no medicine | 3 (open Complaint, select complaint, Save) | 0 | 1 | Not measured: automated/UI source walkthrough is not a valid human timing result. |
| One medicine | At least 5 (routine path plus add/select item and quantity/action) | Depends on item search | At least 3 | Not measured: requires observed clinician workflow. |
| Sent home | 4 (open/select Complaint, choose Sent home, Save) | 0 | 2 | Not measured: requires observed clinician workflow. |

Reason: The safe defaults reduce repeated entry without assuming the clinic's clinical or paper process. The clinic manual form has not been inspected, so seconds, paper-writing steps, and a paper-versus-system target would be fabricated if recorded now.
Testing Performed:
- `npm.cmd test -- src/features/clinic-visits/NewVisitEntryPage.test.tsx` — 19 passed.
- `npm.cmd run typecheck` — passed.
Known Issues:
- The nurse's manual form and observed timings are unavailable. The open professor `FIX` remains open by design.
- Need clinician direction before changing Enter into a form-wide advance command.
Next Steps:
- Obtain the manual form and conduct the recorded three-scenario comparison with the clinician; set the target from the observed medians.
