Date/Day/Time: Thursday, November 05, 2026 — 04:49 PHT
Agent: Claude Code (Opus 5.5)
Task: Account menu in the header, Edit profile dialog and own-account operations (ADR-066)
Status: Completed
Prompt/Request: "Prompt — Account menu: make the header profile a drop-down with Edit profile, Change password, shortcuts, help links and Sign out" (Zean, Thursday, November 5, 2026 — 03:50 PHT; unattended run from 03:51 PHT; no profile page, 03:52 PHT). Make the header's avatar, name and role one button that opens the account actions, including the easily forgotten ones. Edit profile is a dialog. Own-account operations go in the mock layer. Then docs, an ADR and a backend hand-off note; commit with /komit and push when green.
Branch and start: `main` at `624e4553`, up to date with `origin/main`, clean tree.
Files Modified:
- New: frontend/src/layouts/AccountMenu.tsx, frontend/src/features/account/EditProfileDialog.tsx, frontend/src/lib/accountEvents.ts, frontend/src/test/accountMenu.ts, frontend/src/layouts/AccountMenu.test.tsx, frontend/src/lib/mock-db/ownProfile.test.ts
- frontend/src/layouts/AppShell.tsx, frontend/src/App.tsx, frontend/src/lib/mock-db/api.ts (`USER_NAME_MAX`, `OwnAccount`, `getOwnAccount`, `updateOwnProfile`), frontend/src/components/icons/Icon.tsx (`keyboard`, `flag`)
- Tests moved to the menu (same checks, the control is now a menu item): App.test.tsx, layouts/AppShell.test.tsx, features/review-round-2.test.tsx (R6), features/auth/ChangePasswordPage.test.tsx
- Docs: ADR-066 and Decisions-Summary; 03-Design/Screen-Inventory.md (37 to 39); 04-Development/Audit-Coverage.md; 01-Requirements/User-Roles-and-Permissions.md; 04-Development/Keyboard-Shortcuts-and-Efficiency.md; 01-Requirements/Features/Module-Overview.md; 08-Logs Changelog, Issues-and-TODOs (LATER) and Issues-Done-Archive (3 DONE)
Changes Made:
- **Header:** the clock stays. The avatar (now the user's picture or initials through `UserAvatar`), name and role are one button with a chevron. On a phone only the avatar and chevron show. The Shortcuts button, padlock (Change password) and red sign-out icon are gone. The Admin's idle sign-out, the live clock and `print:hidden` are unchanged.
- **Menu** (`layouts/AccountMenu.tsx`, the ARIA menu-button pattern):
  - Contents, top to bottom: an account header (avatar, name, role, username, "Last sign-in: …", outside the `role="menu"` element), then Edit profile, Change password (link to `/account/password`), Keyboard shortcuts (from 768px only, as the old button), Report an issue, Privacy Policy, a separator, and Sign out (`text-error`; opens the existing "Sign out of CLINIQ?" confirmation with Cancel focused).
  - Opening: Enter, Space or ArrowDown opens it on the first item; ArrowUp opens it on the last.
  - Moving: the arrows wrap, Home and End jump to the ends, and a first letter jumps to the matching item.
  - Closing: Escape closes and returns focus to the button. Tab, an outside click and any choice also close it.
  - A choice that opens a dialog first puts focus on the button, so the dialog returns focus there.
  - Rows are 44px. The menu is right-aligned under the button from `sm` and is a full-width sheet under the header on a phone.
  - The shared dropdown panel class was not used, because its `w-max` beat the phone's full width (`cn` does not merge Tailwind classes).
- **Edit profile dialog** (`features/account/EditProfileDialog.tsx`, the shared `Modal`, no route):
  - Shows username, role and last sign-in as read-only details, with "The username and role are managed by the Admin."
  - Full name: required, at most 120 characters (the approved `users.name`), focused on open.
  - Profile picture: Change picture and Remove picture through `profilePicture.ts`, with "A square photo works best. JPEG, PNG or WebP, up to 2 MB."
  - "To change your password, use Change password in the menu."
  - Cancel and Save changes. Save is disabled until something changed. A dirty close asks "Discard unsaved changes?" with ADR-021's wording; this is asked inside the same dialog rather than as a second modal.
  - On save the dialog closes and the shell shows "Profile updated."; a failed save keeps the dialog open with the error.
  - After a save the shell reads the account again, and `App` re-reads the session user (the `cliniq:account-changed` event), so the header and every page update at once.
- **Mock layer:** `getOwnAccount()` and `updateOwnProfile({ name, profilePicture })` act only on the signed-in account (`getMockSessionUser()`), never on a user id from the caller.
  - They refuse a disabled account ("This account is disabled.").
  - The name is trimmed and spaces are collapsed, then it must be non-blank and at most 120 characters. The picture must be a `data:image/` URL or null.
  - Audit by field name only: "Changed own name" and "Changed own profile picture". Nothing is written when nothing changed.
Decisions taken by default (Thursday, November 05, 2026 — 04:49 PHT; Zean asleep, unattended run):
1. A user can change their own display name (the recommended answer); the username and role stay Admin-only.
2. Keyboard shortcuts and Report an issue are in the menu; the sidebar footer keeps its links.
3. The dialog's buttons follow the project's order, Cancel then Save changes, so keyboard order is name, picture buttons, Cancel, Save changes. The prompt listed Save before Cancel; every other form puts Cancel first, so the project pattern was kept. Listed for review.
Audit actor finding: an audit entry stores only `userId` (`api.ts` `audit()`), and the Audit Log reads the name live from the users list (`selectors.ts` `auditLogList`, `userName: usersById.get(entry.userId)?.name`). After a rename, older entries show the new name. Kept unchanged, and covered by a test ("shows the live name on older audit rows"). For Zean's review: whether the audit log should keep the name at the time.
Left out on purpose (not built): a lock screen (Sign out is how to leave the desk); a user guide or help page (decided "not now"); an email field for password reset (needs the backend; LATER logged for the dialog); sign out of other sessions and "my recent activity" (backend and audit design; hand-off below); display settings (text size is left to the browser).
Testing Performed:
- Before: tsc 0 errors, eslint clean, vitest 121 files and 1034 tests passed.
- After: tsc 0 errors, eslint clean; vitest three runs of 123 files and 1061 tests passed (27 new: 7 in `ownProfile.test.ts`, 20 in `AccountMenu.test.tsx`); `npm run build` passes.
- The tests were written right after the code, not before it as the prompt asks; they cover every listed behaviour.
- axe-core (from the npx cache, injected through Playwright) at 375px, 768px and 1280px, Staff and Admin, on the header with the menu closed and open and on the Edit profile dialog: 0 violations everywhere.
- Real-browser keyboard walk (Chromium headless shell 155), both roles at all three widths: Space and Enter each open the menu once on Edit profile, ArrowDown moves to Change password, Escape returns focus to the button, and Sign out opens its confirmation with Cancel focused.
- With `print` media emulated, the header is not visible. On a phone the panel spans the viewport (0 to 360px, the scrollbar takes the rest).
- Screenshots (session scratchpad, outside the repository): `C:\Users\zeank\AppData\Local\Temp\claude\d--zeank-Desktop-Projects-cliniq\ceae7859-e122-4ac4-967b-df0b9aee2365\scratchpad\shots\account\` (staff and admin at 375, 768 and 1280: closed, open, edit-profile).
Known Issues:
- The Issues-and-TODOs "Done" count (now 467) was already one higher than the `[DONE]` lines in the archive (463 before, 466 now); that mismatch was there before this session and was not reconciled.
Next Steps: Zean to review the default decisions, the button order and the live-name audit behaviour.

## For the backend branch

- **Own-account operations** (the mock's `getOwnAccount` and `updateOwnProfile`) need `GET /me` and `PATCH /me` in the API contract, plus a picture endpoint or field. Rules:
  - They act on the authenticated user only (never a user id in the request).
  - They refuse a disabled account.
  - `PATCH /me` changes only `name` (trimmed, single-spaced, non-blank, at most 120 characters) and the profile picture (an image, or null to remove).
  - `username` and `role` are not accepted there; they stay Admin-only through the user management endpoints.
- **Audit:** `update` on target `user` (the user's own id) with the summary "Changed own name" or "Changed own profile picture". Never the old or new name, never image data. Nothing is written when nothing changed.
- **Rename and old audit rows:** the mock reads the actor's name live through `user_id`, so a rename changes how older rows display. The backend's `audit_logs` should decide whether to keep `actor_name` at the time (a rename must then not rewrite old rows) or keep reading it live; the mock keeps reading it live.
- **ERD and Data Dictionary to check:** `users.name` VARCHAR(120) with `chk_users_name_len`; where the profile picture is stored (the mock keeps a resized data URL).
- **Not built, for later:** an email field for password reset (ADR-048); sign out of all other sessions; "my recent activity". These need backend and audit design.
