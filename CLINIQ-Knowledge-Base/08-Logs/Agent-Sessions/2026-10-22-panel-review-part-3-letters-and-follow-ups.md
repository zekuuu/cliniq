Date/Day/Time: Thursday, October 22, 2026 — 18:02 PHT
Agent: Claude Code (Claude Opus 5.5)
Task: Panel review, part 3 — excuse-letter wording, signature line, presets, replacement letters, reason on Missed and Cancelled
Status: Completed
Prompt/Request: `Prompt-Build-Panel-Review-Fixes-Oct22.md`, Part 3 (EX-1, EX-3, EX-4, FU-4), run straight after Part 2 at Zean's "Continue next part and to the last part no stopping". The asks:
- the letter names the dates it excuses;
- a signature line, with no internal text on paper;
- Today only, +1 day and +2 days presets;
- a voided letter for an entered-in-error visit, and "Issue a replacement" (old letter Superseded with a reason);
- a required reason on Missed and Cancelled follow-ups, then "Set a new date".

Files Modified:
- frontend/src/types/entities.ts (`FollowUp.statusReason`)
- frontend/src/lib/mock-db/types.ts (`ExcuseLetterApproval.superseded`)
- frontend/src/lib/mock-db/api.ts
- frontend/src/features/clinic-visits/api/excuseLetterApi.ts
- frontend/src/features/clinic-visits/ExcuseLetterPage.tsx
- frontend/src/features/clinic-visits/ExcusedPeriodPresets.tsx (new)
- frontend/src/features/clinic-visits/DispositionFields.tsx
- frontend/src/features/emergency-response/FollowUpListPage.tsx
- frontend/src/features/emergency-response/api/followUpApi.ts
- frontend/src/features/student-records/StudentProfilePage.tsx
- frontend/src/features/clinic-visits/ExcuseLettersAndFollowUps.test.tsx (new)
- frontend/src/features/emergency-response/FollowUpListPage.test.tsx
- frontend/src/features/print-documents.test.tsx
- CLINIQ-Knowledge-Base: 01-Requirements/Features/Module-Overview.md, 03-Design/Screen-Inventory.md, 02-Architecture/Database/Data-Dictionary.md, ERD.md, and the canonical CLINIQ_Modules_and_Features.md
- CLINIQ-Knowledge-Base/08-Logs: Changelog.md, Issues-and-TODOs.md, Issues-Done-Archive.md

Changes Made:
- **Wording (EX-4).**
  - `defaultBody(student, visit, period)` now says "is excused from <from> to <until>", or "on <date>" for one day.
  - It keeps "for school attendance documentation only", and "Not a medical certificate" stays on the letter.
  - The body follows the period (and the presets) until Staff edit the text.
- **Paper (EX-4).**
  - The printout and the on-screen preview have "Signature over printed name" under the clinician's name.
  - The preview's "Storage status" box is `print:hidden`.
  - The printout's reference block now says "Approved <date>", "Draft, not approved" or "Void" instead of "stored in the student record".
- **Presets (EX-1).** A shared `ExcusedPeriodPresets` (Today only, +1 day, +2 days from "Excused from") sits on the Excuse Letter page and on the visit form's letter section (New Visit and the Visit Detail edit). Nothing is pre-selected and the dates stay editable.
- **Replacement and voided letters (EX-3).**
  - One active letter per visit (`activeApproval`). `issueReplacementExcuseLetter` requires a reason, marks the approved letter `superseded` (kept), and opens a new draft with its period and note.
  - Approving the replacement gives it its own id (`excuse-<visit>-2`).
  - A voided letter (Part 2) can't be replaced.
  - The Excuse Letter page has "Issue a replacement", with a confirmation and a reason.
  - The Student Profile lists every letter with Pending approval, Approved, Superseded or Voided.
  - Audit: "Superseded; replacement draft opened". Letter numbers were not added (a separate `LATER`).
- **Follow-ups (FU-4).**
  - `setFollowUpStatus` requires a reason for Missed and Cancelled and stores it on the follow-up (`statusReason`, PROVISIONAL), not in the audit trail.
  - The dialog has a required Reason. The list shows "Reason: …" under the status.
  - Afterwards a "Set a new date?" dialog (`rescheduleFollowUp`) creates a new pending follow-up for the same student, record, reason and notes. It refuses a past date and is audited as `create`.

Reason:
- The panel review findings above.

Testing Performed:
- Typecheck pass. Lint shows only the pre-existing New Visit refs error.
- `ExcuseLettersAndFollowUps.test.tsx` (6 new tests) covers:
  - the wording for one and two days;
  - presets updating the body;
  - replacement: reason required, old letter kept as Superseded, new draft, own id, profile statuses, audit;
  - a voided letter can't be replaced;
  - the replacement dialog;
  - follow-up reason required, stored, past date refused, new pending follow-up with the same reason, audit order.
- Updated to the new rules, without weakening:
  - the follow-up confirmation test now also checks the required reason and declines "Set a new date";
  - the print test now expects "Approved <date>" and the signature line, and checks that "stored in the student record" is gone.
- Related suites pass, except baseline failures (Dashboard print, New Visit LRN, backup indicator).
- Browser: Playwright + Chromium (not Edge), Staff, 1440, 768 and 390 px. Screens:
  - the draft letter after "+1 day";
  - the approved letter with "Issue a replacement", and its dialog;
  - the A4 printout (PDF: signature line present, no storage wording);
  - the follow-up reason dialog, the "Set a new date?" dialog, and the list showing "Reason: Absent that day";
  - New Visit Sent home with the presets.
- All looked at. No horizontal scroll.
- axe found 0 violations on six screens, and 1 on New Visit with Sent home. That one is the empty "Excused until" DatePicker's "Select date" placeholder, which is the existing open `FIX` "DatePicker placeholder 'Select date' is 2.67:1", not new.

Known Issues:
- A superseded letter is listed in the profile but can't be opened or reprinted on its own: the Excuse Letter page shows the visit's current letter. Logged as a `LATER`.
- Presets count calendar days, not school days. A Friday "+2 days" ends on Sunday. Logged as a `NOTE`.

Next Steps:
- Part 4 (Dashboard and Reports).
