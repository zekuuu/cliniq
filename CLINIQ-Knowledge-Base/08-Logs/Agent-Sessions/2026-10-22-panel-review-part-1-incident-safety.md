Date/Day/Time: Thursday, October 22, 2026 — 16:53 PHT
Agent: Claude Code (Claude Opus 5.5)
Task: Panel review, part 1 — incident alert card, no empty completion or approval, clearer parent-notification log, body part
Status: Completed
Prompt/Request: `Prompt-Build-Panel-Review-Fixes-Oct22.md`, "This run: Part 1" (Zean picked Part 1 when asked, because the "This run" line was blank): "Carry out only the part named in 'This run'." Part 1, from panel review IN-1, IN-3 and IN-6, plus Zean's answer on body part (Thursday, October 22, 2026 — 15:44):
- a read-only Stage 1 alert card with allergies, medical conditions and emergency contacts, where an empty list reads "None recorded";
- no completion or approval of an empty record, unless "Nothing further was needed or done" is ticked with a reason;
- the parent-notification outcomes become Reached, No answer, Left message or voicemail, Wrong number (D6), with who was called;
- an optional body part affected (D11).

The Step 0 defaults table (D1–D13) was shown and used unchanged.

Files Modified:
- frontend/src/types/entities.ts
- frontend/src/lib/itemsGiven.ts
- frontend/src/lib/mock-db/api.ts
- frontend/src/lib/mock-db/store.ts
- frontend/src/lib/mock-db/integrity.ts
- frontend/src/lib/mock-db/mock-db.json
- frontend/src/lib/mock-db/README.md
- frontend/src/features/emergency-response/notificationOutcomes.ts (new)
- frontend/src/features/emergency-response/CalledContactField.tsx (new)
- frontend/src/features/emergency-response/StudentAlertCard.tsx (new)
- frontend/src/features/emergency-response/IncidentEntryPage.tsx
- frontend/src/features/emergency-response/IncidentReportPage.tsx
- frontend/src/features/emergency-response/ParentNotificationPage.tsx
- frontend/src/features/emergency-response/api/incidentEntryApi.ts
- frontend/src/features/emergency-response/api/incidentRecordApi.ts
- frontend/src/components/forms/ItemsGivenField.tsx
- frontend/src/features/emergency-response/IncidentSafety.test.tsx (new)
- frontend/src/features/emergency-response/IncidentEntryPage.test.tsx
- frontend/src/features/ui-review-regressions.test.tsx
- frontend/src/lib/mock-db/stock.test.ts
- CLINIQ-Knowledge-Base/01-Requirements/Features/Module-Overview.md
- CLINIQ-Knowledge-Base/03-Design/Screen-Inventory.md
- CLINIQ-Knowledge-Base/03-Design/Reference-Screens.md
- CLINIQ-Knowledge-Base/02-Architecture/Database/Data-Dictionary.md
- CLINIQ-Knowledge-Base/02-Architecture/Database/ERD.md
- CLINIQ-Knowledge-Base/02-Architecture/Database/Reference-Schema.sql
- CLINIQ-Knowledge-Base/09-References/Canonical-Documents/CLINIQ_Modules_and_Features.md
- CLINIQ-Knowledge-Base/09-References/Canonical-Documents/CLINIQ_Frontend_Context_Brief.md
- CLINIQ-Knowledge-Base/09-References/Canonical-Documents/CLINIQ_Frontend_Design_Reference.md
- CLINIQ-Knowledge-Base/08-Logs/Changelog.md
- CLINIQ-Knowledge-Base/08-Logs/Issues-and-TODOs.md
- CLINIQ-Knowledge-Base/08-Logs/Issues-Done-Archive.md

Changes Made:
- **Stage 1 alert card (IN-1).** `StudentAlertCard` appears once a student is picked or preset. It shows allergies and conditions as chips, and the emergency contacts in saved order with the first marked Primary. An empty list reads "None recorded". It has no input.
  - Stage 2's medicine-picker note now reads "Allergies: None recorded." instead of "No recorded allergies." This note is shared, so New Visit says the same.
- **No empty completion or approval (IN-3).** One rule, `incidentCompletionBlocker` (`lib/itemsGiven.ts`), passes on any one of:
  - treatment notes,
  - a medicine line,
  - a parent notification attempt,
  - a hospital referral,
  - a "Nothing further was needed or done" reason.

  Where the rule applies:
  - Stage 2 shows the tick only while none of the others exist. A ticked box needs a one-line reason. "Complete Incident" is disabled, with the rule as its description.
  - "Approve Report" is disabled with "Can't be approved yet" plus the rule.
  - The data layer refuses both, in `completeIncidentStageTwo` before any stock moves, and in `approveIncidentReport`.

  What is saved and shown:
  - The reason is saved as `Incident.noFurtherActionReason` (PROVISIONAL).
  - It is shown and printed as "No treatment or notification: <reason>".
  - The audit names the field, never the text.
  - No reading became required, and Stage 1 is unchanged.
- **Parent-notification log (IN-6, D6).**
  - One shared outcome list (`notificationOutcomes.ts`) replaces three copies.
  - Saved `not_reached` becomes `no_answer`, and `voicemail`/`left_message` become `left_message_or_voicemail`. The seed's 9 rows were changed, and `migratePersistedState` migrates a copy saved in localStorage.
  - Each attempt records who was called (`ParentNotificationAttempt.calledContact`, PROVISIONAL snapshot). It defaults to the primary contact. "Other" needs a typed name and number.
  - Who was called is shown in the Stage 2 log, on the Parent Notification page, on the report screen, and as a column in the printed table. Older attempts read "Not recorded".
  - The attempt time is still set automatically and is not editable, as before.
  - Stage 2's outcome control is now a `Select`, as on the Parent Notification page, because the four longer labels did not fit side by side at 390 px.
- **Body part affected (D11).** An optional free-text combobox on Stage 2, with suggestions (head, face, neck, chest, abdomen, back, arm, hand, leg, foot). It is saved as `Incident.bodyPart` (PROVISIONAL). The report screen and the printout show it only when it is filled.
- **Knowledge base.**
  - Module Overview and the canonical Modules & Features got the alert card, the completion rule, body part, the new outcomes and who was called. **Canonical documents changed:** `CLINIQ_Modules_and_Features.md`, `CLINIQ_Frontend_Context_Brief.md` and `CLINIQ_Frontend_Design_Reference.md`. Their originals outside the repo need the same edit.
  - Screen Inventory #16, #16b, #17 and #18, and Reference Screens.
  - Data Dictionary, ERD and Reference Schema: the outcome CHECK list, `outcome` widened from `varchar(12)` to `varchar(30)` because `left_message_or_voicemail` is 25 characters, and `body_part` and `no_further_action_reason` marked PROVISIONAL.
  - The mock-db README now covers the migration.

Reason:
- Panel review IN-1: the nurse saw no allergies or contacts at the moment of an emergency, and "No recorded allergies" cannot be told apart from "never asked". The three-state `DECIDE` is still open, so the wording is "None recorded".
- Panel review IN-3: an incident could be completed and approved with nothing recorded.
- Panel review IN-6: the code had `voicemail` and `left_message` side by side, and nothing said who was called.
- Body part was Zean's answer.

Testing Performed:
- **Baseline before any edit:**
  - typecheck pass;
  - lint 1 error and 2 warnings (`254:23 Cannot access refs during render`);
  - tests 17 failed / 561 passed (the open FIX says 15 tests and 5 lint errors; counts have moved);
  - build pass.
- **After:**
  - typecheck pass;
  - lint unchanged at 1 error and 2 warnings, all pre-existing;
  - build pass.
- **New tests:** `IncidentSafety.test.tsx` has 13 tests covering:
  - the alert card for an empty student and for an allergic student with no contacts;
  - the contact order;
  - Complete disabled until the tick and a reason;
  - the tick hidden once care exists;
  - Approve disabled, and refused by the data layer;
  - the printed reason;
  - the rule's five branches;
  - the four outcomes and the saved primary contact;
  - "Other" requiring a name and number, and being printed;
  - the migration of the three old values;
  - body part optional, saved, shown and printed only when filled.
- **Updated tests, without weakening:**
  - The four `IncidentEntryPage` tests that completed an empty record now tick "Nothing further" with a reason, or add treatment notes for the focus test.
  - The UI-review approval test picks an incident the rule allows.
  - `stock.test.ts` got a rejection test and the reason on the accepting test.
- **Full suite results:**
  - After the change: 591 tests, 554–566 passing across three runs.
  - Every new failure was a timeout or a `findBy` miss in Student Form, New Visit, PE referral, Login or AppRoutes. They change from run to run, and those files pass 120/120 when run alone.
  - The stashed baseline, run under the same load (dev server running), failed 32 tests, so the flakiness is environmental and not from this change. See the new `VERIFY`.
- **Browser:**
  - Playwright 1.58 driving the installed Chromium 1228 (not Edge), with tools installed in the session scratchpad, Staff role (the only role with incident routes), at 1440, 768 and 390 px.
  - Screens checked: Stage 1 for a student with two contacts and for one with allergies and no contacts; Stage 2 with the tick, body part and "Other" caller; the Parent Notification log after an attempt; the report blocked and allowed; the A4 print (PNG and PDF).
  - All screenshots were opened and looked at: no horizontal scroll (scrollWidth ≤ clientWidth at every width), labels intact, focus ring fully visible on the focused Reason input.
  - axe (`@axe-core/playwright` 4.10): 0 violations on all six screens.
  - The Impeccable detector on the five changed UI files found nothing.
  - Screenshots are kept outside the repo, in the session scratchpad `pw/shots/`.

Known Issues:
- At 1440×900 the alert card pushes Stage 1's optional notes and the Save button below the fold: Save ends at 996 px, while the complaint and all four readings stay above it. Allergies and conditions now sit side by side to save height. Logged as a `VERIFY` for Zean.
- The attempt note is still required on Stage 2 and optional on the Parent Notification page, and it is never saved on either. This predates Part 1; logged as a `FIX`.
- A Stage 1 incident that has a notification logged from the Parent Notification page passes the rule, so it can be approved before Stage 2. Who approves, and when, is open; logged as a `DECIDE`.
- Reopening a completed incident still drops its saved referral. This is the existing open `FIX` "Reopening a completed incident hides its hospital referral".

Next Steps:
- Review and commit Part 1. Then run Part 2 (or Part 5 or 6, which need no other part).
- Copy the canonical-document edits to the originals.
