Date/Day/Time: Thursday, November 19, 2026 — 22:46 PHT (started about 21:50 PHT; clock read with PowerShell `Get-Date`)
Agent: Claude Code (Opus 5.5)
Task: Every button and action's feedback as a Sonner toast at the bottom right; after every successful form, clear the inputs and scroll to the top (ADR-083)
Status: Completed (three questions left for Zean, below and in `Frontend-Issues-and-TODOs.md`)

## Prompt/Request

Zean, Thursday, November 19, 2026: "For frontend, I want all buttons feedbacks like success, errors, etc. to be in toast notification on bottom right using sonner library (https://sonner.emilkowal.ski). Then also make sure all the success process like filling up a form or etc, should clear all inputs and automatically scrolls to top."

The prompt also set the following rules:
- Frontend and docs only; the one new dependency is `sonner`.
- One wrapper, `notify`, with an error mapper and privacy-safe copy.
- One shared reset-and-scroll behaviour.
- Tests, browser checks at 1536×960 and 390×844, and the docs.
- Built on `main`, nothing committed.

**Zean's answers in the pop-up:**
1. Replace the banners with toasts, and keep the button's "Saved ✓" check.
2. An edit form resets to the saved values.
3. Validation stays inline, plus one toast.
4. A next step becomes the toast's action button. Also: "use color to easily determine, e.g. for error like red progress line at the bottom of the toast that progress or gone base on seconds disppear".

## Files Modified

- **New:** `frontend/src/lib/notify.ts`, `frontend/src/lib/scrollToTop.ts`, `frontend/src/components/ui/Toaster.tsx`, `frontend/src/lib/notify.test.tsx`, `frontend/src/test/findToast.ts`.
- **Deleted:** `frontend/src/components/forms/SaveFeedback.tsx`, `frontend/src/lib/savedMessage.ts`.
- **Shared:**
  - `App.tsx`: `Toaster` and `ScrollRestoration`.
  - `index.css`: "Toasts" colours and the countdown line.
  - `Modal.tsx`: `data-modal-overlay`.
  - `useSaveFeedback.ts`: toasts.
  - `useFocusFirstInvalid.ts`: one validation toast.
  - `AppShell.tsx`: corner notice removed, sign-out toast, Scroll-to-top uses `scrollToTop`.
  - `eslint.config.js`: `sonner` restricted to `notify.ts` and `Toaster.tsx`.
  - `package.json` and `package-lock.json`: `sonner` 2.0.8 only.
- **Screens (37 source files use `notify`):**
  - Account: Authenticator, Edit profile, Report issue.
  - Auth: Login, Change password, Force password change, Forgot password.
  - Archive.
  - Backup: status, locations.
  - Clinic visits: New Visit, Visit Detail, PE referral, Excuse letter.
  - Dashboard: day events.
  - Emergency response: Incident entry, Incident report, Parent notification, Follow-Ups.
  - Inventory: form, dispense, list, stock dialogs.
  - Sports Reports: list, form, print.
  - Settings.
  - Records: Student form, profile and import; Staff form, profile and import.
  - Users: form, list.
- **Tests:** `test/setup.ts` mounts the Toaster before each test and stubs `window.scrollTo`. 24 test files were updated to read toasts instead of banners, and the PE referral test checks the reset.
- **Docs:**
  - ADR-083, `Decisions-Summary.md`, `ADR-Index.md` (regenerated).
  - `Design-System.md` ("Action results are toasts").
  - `Screen-Inventory.md`, `Tech-Stack.md`, `frontend/README.md`.
  - Skills: `cliniq-toast-patterns` (new); `cliniq-button-feedback-patterns` and `cliniq-input-patterns` edited; `Skills-Setup.md`.
  - `Facts-Sheet.md` (regenerated); the Knowledge Base `README.md` and Start Here (ADR range to 083).
  - `Toasts-Nov19/NOTES.md` (inventory and wording).
  - `Frontend-Issues-and-TODOs.md`, `Frontend-Changelog.md`, `Main-Sync-Log.md`.

## Changes Made

- **Sonner 2.0.8.** `npm view` confirmed the React 19 peer. One `<Toaster>` sits at the bottom right with `richColors`, a close button, 3 visible, collapsed and the light theme. Offsets are 64 px bottom and 16 px right, so the Scroll-to-top button stays clear. On a phone the toasts span the width inside the 16 px gutters. `containerAriaLabel` is "Notifications".
- **`notify`.**
  - Durations: 4 s success and info, 6 s error and warning, 8 s with an action.
  - Each toast gets a default id from its kind and message, so repeats show once.
  - `loading` and `promise` turn into the result by the same id.
  - `checkFields` sends the validation toast; `apiError` and `errorMessage` map failures. The mapper uses fixed sentences for 0, 401, 429 and 5xx, "Some fields need attention." for a 422 with field errors, and the server's text for 403, 404 and 409 (written for people by `ApiExceptionRenderer`). It uses the mock's own messages, and never a built-in `TypeError` text.
- **Countdown line.** Zean's extra request: a 4 px line in the toast's ADR-062 accent along the bottom, shrinking over `--toast-ms`. It pauses with Sonner's timer on hover, sits under `:root` selectors because Sonner injects its CSS later, and is drawn as a background layer because Sonner uses both `::before` and `::after`. The toasts use ADR-062's fill, accent and text shades.
- **Replaced feedback:** `SaveFeedback` (6 screens), `savedMessage` (Student and Staff to the profiles), the shell's corner notice, and 24 inline result elements. **Kept inline:** field validation, `ErrorSummary`, `ErrorState` with Retry, empty states, and on-screen states (see NOTES).
- **New feedback where there was none:** sign out; the backup location toggle; archiving a record; copying the recovery codes; approving a letter; a new follow-up date; the Sports Report copy, archive and restore; marking a visit entered in error.
- **Failures that used to be thrown unseen** now toast. These are a visit's or incident's non-stock errors, the Student form's non-duplicate errors, Inventory form and stock dialogs, Dispense, PE referral, Parent notification, the backup run and the calendar.
- **Privacy.** "Visit recorded" names no medicine, and the below-zero warning names no item. A stock refusal that names an item stays beside the items, as a field error, with a plain toast. A patient's dispensation reads "Dispensation recorded". Student and staff names are left out of the record toasts.
- **Reset and top.**
  - 14 screens reset on success and call `scrollToTop()`.
  - Newly reset: PE referral (its comment said so, but it never cleared), Add Item, Add User, and Dispense (now also the recipient and patient).
  - Edit forms keep what was saved.
  - Login clears only the password after a failure.
  - The import pages clear the file input's value, so the same file can be chosen again.
  - `ScrollRestoration` is new: before it, nothing reset the scroll on a route change.

## Reason

Zean's request above. The design choices and the alternatives turned down are in ADR-083.

## Testing Performed

- `npm run lint`: 0 errors. The 1 warning, in `ErrorSummary.tsx`, was there before; that file is unchanged.
- `tsc -b`: clean.
- `npm run build`: passes (the existing chunk-size warning only).
- Prettier: every changed file is clean (`--end-of-line auto`).
- Full suite, from `D:\`: 1,262 of 1,263 passed. The one failure is "keeps the custom-range popover dismissable" in `VisitLogListPage.test.tsx`, a 5-second timeout under full-suite load. That file and the two others that timed out once pass alone (50 of 50). This is the load flakiness already logged as `[VERIFY]` on October 22.
- New tests in `lib/notify.test.tsx` (14, all pass):
  - every status in the mapper, network, a 422 with field errors, mock errors, built-in errors and an unknown value;
  - dedupe by id;
  - loading to success by the same id;
  - the countdown duration;
  - `scrollToTop` on the window, inside a dialog overlay, and under reduced motion.
  - The PE referral test now checks the form is empty after a save.
  - The "failure keeps the typed input" case is the `useSaveFeedback` harness in `consultation-part-2.test.tsx`.
- Browser, Chromium through Playwright from `screenshots/_capture/node_modules` (not Edge), mock mode, a scratch script outside the repo. 10 of 10 checks pass:
  - At 1536×960: the Settings toast is a success at the bottom right; the countdown runs at 4000 ms; Add Item clears the name, returns `scrollY` to 0 and focuses `#main-content`; an empty Add Item gives a 6 s error toast; a toast over the open Restock dialog is the top element at its centre; the toast clears the Scroll-to-top button.
  - At 390×844: the toast sits inside the 16 px gutters; it does not cover Save; no horizontal scroll.
  - Seen in the screenshots: on Inventory, a toast sat over the list's pager row at the bottom of the screen (see Known Issues).
- Search checks: `sonner` is imported only in `notify.ts` and `Toaster.tsx`; there is no `alert(`, `confirm(`, `prompt(` or `window.confirm`; `SaveFeedback` and `savedMessage` are gone.
- `npm run docs:facts`: ADRs 82 to 83, frontend test files 151 to 152, frontend lines 70,312 to 70,618; the backend numbers are unchanged. `npm run docs:adrs` regenerated. `npm run docs:check`: all six checks pass (run after this log was written).
- No database touched; `.env` files not opened; nothing committed.
- **Screenshots:** none of the 34 in `screenshots/` shows a toast, so all stay valid and none was retaken. The Project Plan can add one toast screenshot later if the groupmate wants it.

## Known Issues

- **[DECIDE]** for Zean, three questions:
  1. Login's two arrival notices stay inline.
  2. A toast can cover the pager at the end of a long list for a few seconds.
  3. The item count is gone from "Visit recorded".
- **[DOC]** The Frontend Design Reference and the Frontend Context Brief need a line for ADR-083 (canonical documents, not edited here).
- **[NOTE]** ADR-082 has no entry in `Decisions-Summary.md`, so its index row has an empty "Effect".
- Not one shared "reset" hook: the forms hold plain `useState`. Each resets its own state; the shared parts are `notify` and `scrollToTop` (ADR-083, Alternatives).

## Next Steps

Zean reviews, commits and pushes. Suggested commits:
- `feat(frontend): action results as Sonner toasts, form reset and scroll to top` (the `frontend/` source, tests, ESLint config, package files)
- `docs(frontend): ADR-083, design system, skills, tech stack, README` (the Knowledge Base pages, the skills, the Facts sheet)
- `docs(logs): toasts session` (this log, NOTES, the changelog, the issues file, `Main-Sync-Log.md`)
