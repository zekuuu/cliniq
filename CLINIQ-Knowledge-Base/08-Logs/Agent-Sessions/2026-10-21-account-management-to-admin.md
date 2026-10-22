Date/Day/Time: Wednesday, October 21, 2026 — 06:37 PHT (ADR and Issues entries carry 06:35, read from the system clock when they were written)
Agent: Claude (Opus 5.5), Claude Code in VS Code
Task: Part 4 of `Prompt-Build-Removals-QR-LRN-Mobile-Instructor-UserMgmt.md` — move account management to the Admin/Principal (ADR-033 item 2)
Status: Completed (on branch `feat/removals-qr-phone-instructor-oct21`)
Prompt/Request: After Parts 1–3, Zean asked to "finish all the way" (Parts 4, 5 and 6). Part 4: "the Admin/Principal creates, edits, disables and resets accounts. Staff no longer sees or opens them." Safeguards: the last active Admin can never be disabled, demoted or deleted (enforced in the data layer); new and reset accounts must change the password at first sign-in, reusing Force Password Change; every account action is audited under the signed-in Admin, naming the account without any password; disabled accounts stay listed and in the audit history and can't sign in. Backup stays with Staff. Only the Admin manages accounts, with no deputy (Zean).

Files Modified:
- frontend: `types/entities.ts` (`User.deactivatedAt`), `lib/mock-db/api.ts` (`AccountPermissionError`, `LastAdminError`, `setUserActive`, `resetUserPassword`, temporary passwords, disabled accounts refused at sign-in), `lib/mock-db/integrity.ts`, `features/user-management/{api/userApi.ts,UserListPage.tsx,UserFormPage.tsx}`, `routes/AppRoutes.tsx`, `layouts/navigation.ts`; tests `features/user-management/accounts.test.ts` (new), `features/user-management/profilePicture.test.ts`, `features/ui-review-regressions.test.tsx`, `layouts/AppShell.test.tsx`, `routes/{AppRoutes,BackNavigation}.test.tsx`.
- Knowledge base: `01-Requirements/{Features/Module-Overview,User-Roles-and-Permissions}.md`, `02-Architecture/Database/Use-Case-Diagram.md`, `03-Design/Screen-Inventory.md`, canonical Modules & Features, Frontend Context Brief, Frontend Design Reference, ADR-033, `Decisions-Summary.md`, `08-Logs/{Issues-and-TODOs,Issues-Done-Archive,Changelog}.md`, this log.

Changes Made:
- Routes: `/users`, `/users/new`, `/users/:userId/edit` are `roles: ['admin']`; Staff opening them by address land on the Dashboard (the existing guard). Navigation: the Admin sidebar gains Administration → Accounts (Audit Log stays once, under Reporting); the Staff sidebar keeps Backup and Audit Log, without Accounts.
- Data layer (the rules hold even if a screen is bypassed): every account action requires an Admin actor; the last active Admin can't be disabled or have its role changed (its own account included); a new account requires a temporary password (8+ characters) and must change it at first sign-in; Reset Password sets a new temporary password, clears the in-memory password history and forces the change; disabled accounts get `deactivatedAt`, stay listed, and their sign-in is refused with the usual "Unable to sign in" (no hint that the account exists); audit entries: `create`, `update` "Updated role", "Disabled account", "Enabled account", "Reset password" — under the Admin, targeting the account, never containing a password.
- User Management screen: a Status column (Active / Disabled), Disable / Enable (no confirmation: it is reversible from the same screen, `cliniq-modal-patterns`) and Reset Password (a dialog on the shared `Modal` with a temporary-password field). Add User: a required "Temporary password" field. Edit User: a role change that would leave no Admin shows the reason on the Role field. Copy "Passwords are provisioned through the future Sanctum account workflow" removed; the page now says what the Admin can do. `UserFormPage` takes a `viewer` like the other screens.

Reason: ADR-033 item 2.

Testing Performed:
- New `accounts.test.ts`: Staff refused for every action; the last active Admin can't be disabled or demoted, but can be once a second Admin is active; a new account needs a temporary password and must change it; reset forces a change and the old password stops working; a disabled account can't sign in and can again after Enable; the five audit entries are under the Admin with the expected summaries and no password. Route tests: Staff sent to the Dashboard from the three account addresses; the Admin opens all three. Navigation tests updated for both roles.
- Typecheck pass; lint unchanged (1 error, 2 warnings, from the baseline); Vitest 17 failed / 535 passed (552), every failure from the `d50ca71` baseline list; build pass.
- Browser (Playwright + Chromium, never Edge; screenshots outside the repo): Admin User Management, its Reset Password dialog and Add User, and Staff opening `/users`, at 1440, 768 and 390 px; opened the images; no horizontal scroll; axe-core 4.10.3: 0 violations on all 12.

Known Issues:
- A session already open when the account is disabled keeps working until Log out or expiry (logged as a `DECIDE`).
- A lost Admin password has no in-app recovery (logged as a `NOTE`, per Zean's decision).
- The two baseline audit gaps remain: "Updated role" is the only role-change wording (no old/new role in the entry, by the field-names-only rule of ADR-017).

Next Steps: Part 5 (LRN) with Zean's Step 0 answers; then Part 6 (Sports Report).
