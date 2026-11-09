Date/Day/Time: Sunday, November 08, 2026 — 20:32 PHT (clock read with PowerShell `Get-Date`; Git Bash's `TZ=Asia/Manila date` printed UTC in this environment)
Agent: Claude Code (Opus 5.5)
Task: Staff idle sign-out; idle times become settings (Part 1 of `Prompt-Frontend-Staff-Idle-Signout-And-Clinic-Only-Nov8.md`), ADR-078
Status: Completed (Part 1). Part 2 (the clinic-PC-only ADR and the LAN grep) was not run in this session.
Prompt/Request: Zean, Sunday, November 8, 2026 (chat, about 18:03 to 18:10 PHT), simulating the system on the clinic PC: "The clinic room is not locked, and other people use the PC when the clinician is absent. Decisions: (1) Staff get an idle sign-out, longer than the Admin's 30 minutes: default 60 minutes, a setting; (2) each covering person gets their own Staff account … the fixed 7-day maximum stays as the outer limit." Part 1: "generalise [the Admin's idle sign-out] rather than adding a second mechanism … Two minutes before sign-out a modal warns … At zero … Login shows 'You were signed out after N minutes of inactivity. Sign in again.'" This run came in the same session as the Admin Reports prompt (Zean's pop-up answer: "Both, Reports first"). Zean's pop-up answer on where the fields live: "New Settings page".
Files Modified:
- New: `frontend/src/features/settings/SettingsPage.tsx`, `frontend/src/lib/sessionActivity.ts`, `frontend/src/features/idle-signout.test.tsx`
- Code: `frontend/src/hooks/useIdleSignOut.ts`, `frontend/src/layouts/AppShell.tsx`, `frontend/src/App.tsx`, `frontend/src/features/auth/LoginPage.tsx`, `frontend/src/components/forms/UnsavedChanges.tsx`, `frontend/src/layouts/navigation.ts`, `frontend/src/routes/paths.ts`, `frontend/src/routes/AppRoutes.tsx`
- Mock: `frontend/src/lib/mock-db/api.ts`, `types.ts`, `integrity.ts`, `store.ts` (migration), `mock-db.json`, `devToggles.ts`
- Tests updated for the decision: `frontend/src/features/AdminAuditDashboardDecisions.test.tsx`, `frontend/src/layouts/AppShell.test.tsx`, `frontend/src/routes/BackNavigation.test.tsx`, `frontend/src/lib/mock-db/dashboard.test.ts`, and a new case in `frontend/src/App.test.tsx`
- Readmes: `frontend/src/features/auth/README.md`, `frontend/src/hooks/README.md`, `frontend/src/lib/mock-db/README.md`
- Documents: `06-Decisions/ADR-078-Staff-Idle-Signout-Idle-Times-Are-Settings.md` (new); dated notes at the top of `ADR-015` and `ADR-048`; `Decisions-Summary.md`, `01-Requirements/User-Roles-and-Permissions.md` (a Session line per role), `03-Design/Screen-Inventory.md` (Login, #42 Settings and the idle warning), `04-Development/Keyboard-Shortcuts-and-Efficiency.md`, `04-Development/Audit-Coverage.md`, `08-Logs/Frontend-Changelog.md`, `08-Logs/Frontend-Issues-and-TODOs.md`, `08-Logs/Issues-Done-Archive.md`
Changes Made:

**Settings (P1.1).** `config.adminIdleMinutes` is replaced by:
- `idleSignoutMinutesStaff`: default **60**.
- `idleSignoutMinutesAdmin`: default **30**.

Both allow whole minutes from **10 to 240**. A browser state saved with `adminIdleMinutes` keeps its value as the Admin's.

New mock functions:
- `getIdleSignoutSettings`.
- `getIdleSignoutMinutes(role)`.
- `saveIdleSignoutSettings`: Staff only (`IdleSignoutSettingsError` otherwise), audited as `update` on `settings/idle-signout` with field names only, for example "Updated Staff idle sign-out minutes".

`getAdminIdleMinutes` is gone. A new **Settings** page (`/settings`, Administration in the sidebar for both roles) shows a "Sign out after inactivity" card:
- The one line "People are signed out after this many minutes without activity. Shorter is safer on a shared computer."
- Two fields, **Staff (minutes)** and **Admin (minutes)**.
- **Save**, for Staff only. The Admin sees the fields disabled.

**Behaviour (P1.2).** `useIdleSignOut` stays the one mechanism and now serves both roles:
- **Activity:** keyboard, pointer, scroll, touch, and any API call. The mock's `simulateRequest` emits `cliniq:api-activity`.
- **Warning:** two minutes before (was one). It returns `secondsLeft` and `stay`.
- **New setting:** the shell reads the setting again when it is saved (`cliniq:idle-settings-changed`), so the next countdown uses it.

The "Still there?" dialog:
- Text: "You will be signed out in 2:00 because of inactivity", with a live countdown. A polite status region announces it every 30 seconds and in the last 10.
- Actions: **Stay signed in** (primary, focused) and **Sign out now** (an ordinary sign-out). Escape, the X and the backdrop all mean Stay signed in.

At zero:
- The audit log records `logout` with "Signed out (idle)".
- The app goes to Login, which says "You were signed out after N minutes of inactivity. Sign in again."

**Unsaved forms:** the sign-out discarded them silently before, as the Admin's did. This is still true, and the warning now says "Unsaved changes will be lost." when a form is dirty. `UnsavedChangesGuard`, which every form uses through `useCancelNavigation`, registers its dirtiness in `lib/sessionActivity.ts`.

**The 7-day maximum** (`SESSION_LIFETIME_MS`) is unchanged and still checked when the session is read.

**Bugs found and fixed on the way:**
1. **The warning closed itself.** It counted Tab and pointer moves as activity, so it closed under the person's hand and Sign out now could not be reached by keyboard or pointer. Found in the Chrome keyboard walk. Fix: while the warning is open, only Stay signed in, Escape, the X or the backdrop keep the session. Test: "keeps the warning open through Tab and pointer moves, so Sign out now can be reached".
2. **Login lost the inactivity message.** In the running app, clearing the user rendered the old route's Login redirect, whose `{ from }` state replaced the `signedOutAfterMinutes` state. This affected the Admin's sign-out before too; the tests only checked the callback. `App` now keeps the minutes and passes them to `LoginPage`. Test: `App.test.tsx` "lands on Login with the inactivity message".

**Tests changed for the decision, not weakened:**
- `AdminAuditDashboardDecisions.test.tsx`: the Admin's warning comes at 28 minutes, not 29. The audit summary is "Signed out (idle)". "Never times the clinician out" became "only after their own 60 minutes".
- `AppShell.test.tsx`: both roles' nav lists gain Settings.
- `BackNavigation.test.tsx`: `/settings` is added to the allowlist as a top-level sidebar destination.

**Formatting:** these files were already not Prettier-clean at `bc33132`, so they were edited by hand and not reformatted.

Reason: ADR-078. The clinic room is unlocked and shared, so an open Staff session lets anyone act as the clinician.
Testing Performed:
- Before Part 1 (after the Reports part): typecheck 0; lint 0 errors, 1 warning (`ErrorSummary.tsx`, existing); tests 1158 of 1158. Start of session: 1143 of 1143.
- After: typecheck 0; lint 0 errors, the same 1 warning; tests **1177 of 1177 three times**; build passes.
- New tests, `features/idle-signout.test.tsx`, idle sign-out:
  - signs Staff out after their own 60 minutes, warning exactly two minutes before;
  - signs the Admin out after the Admin setting, not the Staff one;
  - records "Signed out (idle)" with the user and action only;
  - applies a changed setting to the next countdown;
  - shows a live countdown, announced politely, and Stay signed in resets it;
  - keeps the warning open through Tab and pointer moves, so Sign out now can be reached;
  - treats Escape as Stay signed in;
  - signs out at once with Sign out now, as an ordinary sign-out;
  - counts an API call as activity;
  - says unsaved changes will be lost only when a form is dirty;
  - keeps the fixed 7-day maximum, whatever the activity.
- New tests, settings:
  - defaults to 60 minutes for Staff and 30 for the Admin;
  - allows 10 to 240 whole minutes, and refuses 9 and 241;
  - lets only Staff change them, audited by field name only;
  - shows Staff both fields with Save, and the Admin the values read only;
  - tells Login how many minutes ended the session.
- New test, `App.test.tsx`: lands on Login with the inactivity message.
- Browser: system Chrome through playwright-core with its fake clock, and axe-core, all outside the repo; no Edge.
  - axe at 375, 768 and 1280 on Settings and on the idle warning, for both roles: no violations, no horizontal scroll.
  - Keyboard: on Settings, Tab goes Staff, Admin, Save. The warning opens with focus on Stay signed in, Tab stays inside it, and Escape closes it.
  - After 60 minutes (Staff) or 30 (Admin) the app lands on `/login` with "You were signed out after 60 (30) minutes of inactivity. Sign in again."
  - Screenshots: `C:\Users\zeank\AppData\Local\Temp\claude\215c8086454e59e6\98563800-c113-4947-b879-478a3a9097c3\scratchpad\shots\` (`staff-settings-*.png`, `admin-settings-*.png`, `*-idle-warning-*.png`, `*-login-after-idle.png`).
Known Issues:
- The 7-day maximum is checked when the session is read (sign-in, reload). A tab left open past 7 days is signed out by the idle timer long before. The real backend enforces the maximum on every request (`session_expired`).
- ADR-057 is on the `backend` branch only, so its dated note is in the hand-off below.
Next Steps: Part 2 (clinic-PC-only ADR-079, the LAN wording grep, the monthly PDF check) in a new session. Canonical documents (DOC logged).

## For the backend branch

- **Settings, names, ranges and defaults:** `idleSignoutMinutesStaff` (60) and `idleSignoutMinutesAdmin` (30), whole minutes, each 10 to 240. Staff edit, the Admin reads, audited by field name only, e.g. "Updated Staff idle sign-out minutes". They replace `adminIdleMinutes`. These match what the backend-docs session wrote on `backend` today: `idle_signout_minutes_staff` and `idle_signout_minutes_admin` with `chk_settings_idle_signout`.
- **Idle rule:** each request checks the signed-in role's setting. Past it, the response is 401 `session_idle` and one audit entry, `logout` "Signed out (idle)" (user and action only). The 7-day maximum from sign-in still applies (`session_expired`).
- **Keep-alive (mock behaviour to specify):** the client counts keys, pointer, scroll and touch as activity, and every API call too. Typing a long incident form can go many minutes without a request, so the real client needs a cheap "I am still here" call while the person is active. Throttle it to at most once a minute. The server treats it as activity and can return the idle seconds left, so the two-minute warning follows the server's clock. While the warning is open, ordinary activity does not count; only Stay signed in does. Stay signed in should send the keep-alive at once.
- **ADR-057 (on `backend`):** add a dated note at its top saying that ADR-078 adds a per-role idle limit inside the 7-day maximum. This was not done on main, because the file is not there.
