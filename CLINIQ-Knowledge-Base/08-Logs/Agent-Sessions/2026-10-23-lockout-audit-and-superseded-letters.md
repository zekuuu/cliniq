Date/Day/Time: Friday, October 23, 2026 — 05:49 PHT
Agent: Claude Code (Claude Opus 5.5)
Task: Audit-log lockouts; let a superseded or voided excuse letter be opened on its own
Status: Completed
Prompt/Request: Zean: "okay log lockout, regarding superseded I'll let you decide for the best and most appropriate approach". This answered the open `DECIDE` "Should opening a health record, or a lockout, be audit-logged?" (lockout half only) and the `LATER` "A superseded excuse letter can't be opened on its own".

Files Modified:
- frontend/src/lib/mock-db/api.ts (`logLockout`, `getExcuseLetterById`)
- frontend/src/routes/paths.ts (`excuseLetterVersion`)
- frontend/src/features/clinic-visits/api/excuseLetterApi.ts, clinic-visits/ExcuseLetterPage.tsx
- frontend/src/features/student-records/StudentProfilePage.tsx
- tests: frontend/src/features/backup/AccessAndBackup.test.tsx, clinic-visits/ExcuseLettersAndFollowUps.test.tsx
- CLINIQ-Knowledge-Base: 04-Development/Audit-Coverage.md, 01-Requirements/Features/Module-Overview.md, 01-Requirements/Non-Functional-Requirements.md, canonical CLINIQ_Modules_and_Features.md, 08-Logs

Changes Made:
- **Lockouts are audit-logged.**
  - When the fifth wrong password in a row locks an account for 30 minutes, an audit entry is written against that account: action `login`, target the user, summary "Account locked for 30 minutes after 5 wrong passwords (sign-in)", or `("Confirm it's you")` for the re-entry dialog. The passwords themselves are never recorded.
  - A single wrong password is not logged.
  - An unknown username has no account to attribute a lockout to, so nothing is written for it.
- **Superseded letters: the approach chosen.** Every stored letter is now its own viewable document, because the replacement flow keeps old letters as part of the record, and a record you can list but not open is incomplete.
  - "View letter" on the Student Profile, for superseded and voided letters, opens `/visits/<visit>/excuse-letter?letter=<id>` (new `getExcuseLetterById`).
  - The page shows that exact letter, read-only: the Superseded badge and banner with when and why, and "Open the current letter".
  - No approve or replace actions are offered, and the fields are locked.
  - The printout is stamped SUPERSEDED (or VOID) across the page and says it is not valid. Its reference block reads "Superseded <date>".
  - Letter reference numbers stay a separate `LATER`.
- **Issues.**
  - The `DECIDE` is narrowed to "Should opening a health record be audit-logged?", with an update recording the lockout decision.
  - The `LATER` is marked DONE and moved to the archive.

Reason:
- Zean's answers.
- A replaced letter has to stay inspectable and reprintable, never passable as valid.

Testing Performed:
- Typecheck pass. Lint unchanged (1 error, 2 warnings, pre-existing).
- 3 new tests:
  - the fifth wrong sign-in writes one lockout entry, four misses write none, and the password is absent from the entry;
  - a "Confirm it's you" lockout is logged;
  - the superseded letter view: banner, badge, approve disabled, no replacement, link to the current letter, printout stamped SUPERSEDED.
- Related suites pass, except the baseline `IncompleteRecordsQueuePage` failure.
- Browser (Playwright and Chromium, not Edge), Staff, at 1440, 768 and 390 px: replace a letter, open the Student Profile, click "View letter", see the superseded view. Looked at. No horizontal scroll; axe found 0 violations.

Known Issues:
- Still open: whether opening a health record should be audit-logged (school's privacy officer).

Next Steps:
- Review and commit.
