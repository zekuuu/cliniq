Date/Day/Time: Thursday, October 22, 2026 — 19:01 PHT
Agent: Claude Code (Claude Opus 5.5)
Task: Panel review, part 6 — Backup for both roles, Back up now and stale-backup alert, password re-entry, no default role, wording
Status: Completed
Prompt/Request: `Prompt-Build-Panel-Review-Fixes-Oct22.md`, Part 6, at Zean's "Continue next part and to the last part no stopping". Sources: AC-1 (decided), AC-4, AC-5, AC-7, BK-2, LG-4 and ADR-037, with defaults D5, D7 and D12 unchanged. The asks:
- Backup open to the Admin;
- "Back up now", and a stale-backup Dashboard alert for both roles after 48 hours (config);
- a shared "Confirm it's you" password re-entry before five sensitive actions;
- no default role on Add User;
- no "mock" wording in the UI;
- a Caps Lock hint on password fields;
- the 10-year audit retention in the documents only.

Files Modified:
- frontend/src/lib/mock-db/mock-db.json, types.ts, integrity.ts, dashboard.test.ts (config `staleBackupHours: 48`)
- frontend/src/lib/mock-db/api.ts (`recordBackupNow`, `backupAlertFor`, `confirmMockPassword`)
- frontend/src/lib/mock-db/dashboard.ts, frontend/src/types/dashboard.ts (`backupAlert`)
- frontend/src/routes/AppRoutes.tsx, frontend/src/layouts/navigation.ts (Backup for the Admin)
- frontend/src/features/backup/BackupStatusPage.tsx, api/backupApi.ts
- frontend/src/features/dashboard/components/AttentionChips.tsx, lib/urgentCount.ts
- frontend/src/hooks/useConfirmItsYou.tsx (new), frontend/src/hooks/useCapsLock.ts (new)
- frontend/src/features/student-records/StudentProfilePage.tsx, user-management/UserListPage.tsx, user-management/UserFormPage.tsx, emergency-response/IncidentReportPage.tsx (the five sensitive actions)
- frontend/src/features/auth/LoginPage.tsx, auth/ForcePasswordChangePage.tsx (Caps Lock), legal/PrivacyPolicyPage.tsx (wording)
- Tests:
  - frontend/src/features/backup/AccessAndBackup.test.tsx (new), frontend/src/test/confirmItsYou.ts (new helper)
  - updated to the new rules: ui-review-regressions.test.tsx, layouts/AppShell.test.tsx, routes/BackNavigation.test.tsx, dashboard/lib/printSummary.test.ts
- CLINIQ-Knowledge-Base:
  - 01-Requirements/Features/Module-Overview.md, User-Roles-and-Permissions.md, Non-Functional-Requirements.md
  - 03-Design/Screen-Inventory.md
  - 02-Architecture/Database/Data-Dictionary.md, ERD.md (10-year audit retention)
  - 06-Decisions/ADR-037 (status: built)
  - canonical CLINIQ_Modules_and_Features.md
  - 08-Logs

Changes Made:
- **Backup for both roles (ADR-037, D12).**
  - The `/backup` route allows `staff` and `admin`, and the Admin sidebar has Backup under Administration.
  - The data layer refuses neither role. The page now also lists the five most recent runs.
- **Back up now and the alert (BK-2, D5).**
  - "Back up now" (`recordBackupNow`) writes a successful run with a size close to the last one and audits it. The code comment and the mock-db docs say it is mock only and that the real job belongs to the backend phase.
  - `backupAlertFor` returns `never`, `failed` or `stale` (last success older than `config.staleBackupHours`, 48) against the store's clock.
  - The Dashboard shows the chip for both roles: "Last backup was more than 48 hours ago", "The latest backup failed" or "No successful backup yet", linking to Backup.
  - It counts in the Overview tab's urgent number (Part 4).
  - Verification is unchanged.
- **"Confirm it's you" (AC-7, D7).**
  - One hook, `useConfirmItsYou`, asks for the signed-in user's password before:
    - archiving a student record;
    - disabling or enabling an account;
    - resetting a password (asked before the reset dialog opens);
    - changing a role on Edit User;
    - approving an incident report.
  - `confirmMockPassword`:
    - checks the dev account's current password;
    - counts a miss toward the same lockout as sign-in (5 tries, 30 minutes);
    - audits each success as `login` with "Confirmed with password: <purpose>", never the password.
  - A wrong password shows "That password is not correct. Nothing was changed." and nothing happens.
  - Focus starts in the password field, and the shared `Modal` traps it and returns it.
  - Stock adjustments are not on the list (D7).
- **No default role (AC-4).** Add User starts with "Select a role", and it is required ("Choose a role."). Editing keeps the saved role.
- **Wording (AC-5).**
  - The picture hint now ends "It is center-cropped to a square." (was "… in this mock only").
  - The Privacy Policy's "is a placeholder" became "is not final".
  - Demo Accounts was left alone (separate `FIX`).
- **Caps Lock (LG-4).** `useCapsLock` shows "Caps Lock is on." on Login (refactored to the hook), on both Force Password Change fields, and in "Confirm it's you".
- **Retention (ADR-037).** Documents only:
  - Non-Functional-Requirements has a new audit-log retention bullet;
  - ERD section 7 and the `audit_logs` Data Dictionary entry say 10 years, provisional until the school confirms.
  - No purge job was added, and the Privacy Policy is unchanged.

Reason:
- The panel review findings above and ADR-037 (Zean, Thursday, October 22, 2026 — 15:44).

Testing Performed:
- Typecheck pass. Lint is back to the baseline (1 error, 2 warnings, all pre-existing).
- `AccessAndBackup.test.tsx` (7 new tests) covers:
  - the Admin opens `/backup` with Back up now;
  - both roles record a run, audited under each user;
  - the alert's quiet, stale, failed and never states;
  - password confirmation: wrong password refused and not audited, success audited without the password, the fifth miss locks, and the correct password is refused while locked;
  - the Disable flow: focus in the field, a wrong password changes nothing, then the right one disables, audited `login` then `update`;
  - the Caps Lock hint read as the field's description;
  - Add User with no role: required and blocked, and no "mock" text on the page.
- Updated to the new rules:
  - the archive and approval tests enter the password and expect `['login', 'archive']` and `['login', 'approve']`;
  - the duplicate-username test picks a role;
  - the Admin navigation test lists Backup;
  - the route-coverage exemption lists `admin /backup` (a top-level sidebar destination, like `staff /backup`).
- Affected suites: only baseline failures remain.
- Browser: Playwright + Chromium (not Edge), at 1440, 768 and 390 px:
  - Admin: Backup after "Back up now", the "Confirm it's you" dialog after a wrong password, Add User with the role error;
  - Staff: Backup, and the archive flow's password dialog. Focus was in the password input on open.
- All looked at. No horizontal scroll. axe found 0 violations on all five.
- The stale-backup chip itself was not seen in the browser: the seed's last good backup is under 48 hours old. Its states are covered by the test.

Known Issues:
- The password re-entry is enforced by the screens only. The mock data-layer actions (archive, approve, account changes) don't require a fresh confirmation token, so the backend must enforce it. Logged as a `LATER`.

Next Steps:
- Part 7 (students, wording, data and tests).
