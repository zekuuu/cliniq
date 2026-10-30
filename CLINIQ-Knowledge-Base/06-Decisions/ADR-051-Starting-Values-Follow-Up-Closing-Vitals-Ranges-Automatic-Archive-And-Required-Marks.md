# ADR-051: Starting numbers, follow-up closing, vitals ranges, automatic archive with 5-year retention, the allergy wording and required marks

**Date:** Thursday, October 29, 2026 — 13:46 PHT
**Status:** Accepted (Zean, in chat, Thursday, October 29, 2026 — 13:42 PHT, answering the follow-up questions on the decisions sheet). Amends ADR-047 and ADR-049. **Items 1 to 5, 8, 9 and 10 built** (item 9 in Part 2, the rest Friday, October 30, 2026 — 03:21 PHT, on `build/decisions-sheet-answers-oct29`, [Part 5 session](../08-Logs/Agent-Sessions/2026-10-30-decisions-build-part-5-clinic-settings-and-rules.md)); item 6 (the automatic archive by the yearly import) is not built, the import itself being blocked. Item 9 revised Thursday, October 29, 2026 — 15:13 PHT (Zean: minimal states, then "None recorded"). **Item 5 amended by [ADR-054](ADR-054-Student-Own-Number-Dropped-Birthdate-Added-Age-Group-By-Age.md) (Friday, October 30, 2026 — 21:14 PHT):** the age group follows the birthdate when there is one.

## Context
Zean's first pass through the decisions sheet (ADR-047 to ADR-050) left some answers unclear or in conflict. Claude put 11 follow-up questions to him; this ADR records the answers.

## Decision
1. **Starting numbers** (Claude chose, nurse to confirm, all in `config`): a frequent visitor is 3 or more visits in 14 days and the panel is switched back on; follow-up reminder window 7 days; expiry warning 30 days; top 5 complaints; stock exactly at the threshold counts as low.
2. **Visit versus Incident:** "common and worse". A Visit is a common case, an Incident a worse case that needs fast two-stage capture. A one-line hint goes on both forms; the two forms and the Escalate button stay (ADR-036).
3. **Follow-ups:** overdue 3 days after the follow-up date, closed automatically after 7 days with a "no response" note.
4. **Sports Report:** the clinician chooses which entries to include; conditions only when she ticks that option (ADR-034).
5. **Vitals:** the most common normal ranges by age group are applied as starting values and marked "to confirm"; a reading outside them warns and never blocks (ADR-018). Student records have no birth date, so the grade level picks the age group. The fever flag stays at 37.0 °C (the team's rule of October 20).
6. **Yearly import archives automatically** (amends ADR-047, which left it open): a student missing from the new list is archived by the import, without asking for a reason. Claude's safeguard, unless Zean objects: show the list of students that would be archived before the import is applied. A student archived by mistake can be restored.
7. **Retention:** a student's record is kept 5 years from the archive date. The audit log is kept 10 years, our own decision based on what the Principal said about keeping documents (ADR-037); the school has not confirmed it.
8. **Sex** stays on the student form and is added to the Monthly Report counts.
9. **Allergies and conditions stay one field each** (amends ADR-049, which had chosen three states): the suggestion "None" is renamed **None recorded**, and an empty field is shown with the same words in plain text, not as a warning. Zean asked for minimal states to avoid confusion and reduce workload. The student's "Student contact information" is renamed **Student's mobile number** (optional), because "Student's own number" read like the student number.
10. **Required marks:** a field shows the required mark only when saving is blocked without it. A field that can be saved empty (for example a staff member's emergency contact) shows no mark. This replaces the line in ADR-049 that kept the indicator on a field that did not block.
11. **Deployment** stays local on one clinic computer (ADR-029); no online-hosting decision is recorded.

## Alternatives Considered
- **Flag missing students for the clinician to confirm** (the answer to the "one yearly import" question). Replaced by automatic archiving at Zean's choice; the review list and Restore keep the risk small.
- **Wait for the nurse for every number.** Rejected by Zean ("do what's best"); the numbers are starting values she can change.
- **A three-state control (Not recorded, None known, Has).** Rejected by Zean: more clicks and more confusion for the clinician. A separate warning style for an empty field was also dropped (15:12).

## Consequences
- Needs `config` additions (`frequentVisitorWindowDays` 14, `followUpOverdueAfterDays`, `followUpAutoCloseDays`, vitals ranges).
- The backend needs a daily job for follow-ups and a review step before archiving.
- The ERD's retention policy gets "5 years from the archive date" when the design is next reviewed (`DOC` entry).
- Session: [2026-10-29-decisions-sheet-follow-up-answers](../08-Logs/Agent-Sessions/2026-10-29-decisions-sheet-follow-up-answers.md)
