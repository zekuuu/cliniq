# Toasts and form reset: inventory and wording (Thursday, November 19, 2026)

Run notes for ADR-083. Session: [2026-11-19-toasts-and-form-reset](../Agent-Sessions/2026-11-19-toasts-and-form-reset.md). Written for Zean and the groupmate to review the wording in one place; change a message in the screen's file and here together.

## A. Feedback found before the change

| Where | What it was | Now |
|---|---|---|
| `components/forms/SaveFeedback.tsx` (Archive, Backup locations, Follow-Ups, Settings, User form) | `role="status"` / `role="alert"` banner beside the button, from `useSaveFeedback` | Deleted; `useSaveFeedback().run` sends the toast |
| `lib/savedMessage.ts` (Student and Staff form, read by both profiles) | A message carried to the next screen, shown as a green panel | Deleted; the toast is sent before the move and stays across it |
| `layouts/AppShell.tsx` | Home-made fixed bottom-right notice (profile updated, issue submitted) | Toasts |
| New Visit, Visit Detail, PE referral, Incident entry, Parent notification, Dispense, Inventory form, Inventory list, Stock dialogs, Student form, Staff form, User list, Sports Reports list and print, Incident report, Backup, Login, Change password, Force password change, Forgot password, Authenticator, Edit profile, Calendar day events, Student and Staff import | Hand-made green or red panels, or a line of `role="status"` / `role="alert"` text | Toasts (state notices kept, see below) |
| Anywhere | `alert(`, `confirm(`, `prompt(`, `window.confirm` | None found before or after |
| `console.error` hiding a failure | None found | — |

**Kept inline on purpose:** field validation (`role="alert"` under each field, `ErrorSummary` on the incident form); `ErrorState` with Retry; empty states; skeletons; state notices: Visit "Entered in error" and "Escalated to incident", Excuse letter "Voided", "Superseded" and "approved and stored", Incident report "Can't be approved yet" and "No treatment recorded", Backup "No backup location is enabled", Inventory's duplicate-name and allergy warnings, the Student form's age and duplicate-name notes, the User form's picture status, the Dashboard filter line, Login's two arrival notices (see "Needs your call").

## B. Actions and their toasts

Success messages are past tense; failures go through `notify.apiError` with the fallback shown when the data layer gives no plain message. Validation everywhere: the field messages plus one error toast "Please check the highlighted fields." (or the form-level message itself).

| Screen | Action | Success toast | Failure toast (fallback) | Form? After success |
|---|---|---|---|---|
| New Visit | Save Visit / Save and approve now | "Visit recorded" + "An excuse letter draft was saved with it." or "The excuse letter was approved and stored." and "A pending follow-up was created."; action **Review letter** / **Open letter** (8 s) | "The visit was not saved. Please try again."; a stock refusal stays under Medicines & supplies given | Create: resets (already did), top |
| New Visit, Visit Detail, Incident | Stock went below zero | Warning: "Some stock is now below zero. Recount and restock in Inventory." | — | — |
| Visit Detail | Save Changes | "Visit updated" | "The visit was not saved. Please try again." | Edit: shows saved values, top |
| Visit Detail | Mark as entered in error | "Visit marked as entered in error" | "The visit was not marked. Please try again." | Dialog closes, top |
| PE/Sports referral | Save Referral | "PE/Sports referral saved" (or "… Emergency Response escalation was queued.") | "The referral was not saved. Please try again." | Create: **now** resets (it did not before), top |
| Incident | Save Stage 1 | "Incident Stage 1 saved" + "This incident still needs completion." | "Stage 1 was not saved. Please try again." | Two-stage: moves to Stage 2, top |
| Incident | Complete Incident | "Incident completed" | "The incident was not completed. Please try again." | Shows the saved record, top |
| Parent notification | Add Attempt | "Notification attempt saved" | "The attempt was not saved. Please try again." | Note, contact and outcome reset, top |
| Incident report | Approve Report | "Report approved and logged" | "The report was not approved. Please try again." | Dialog closes |
| Excuse letter | Approve | "Excuse letter approved and stored" | "The letter was not approved. Please try again." | Top |
| Excuse letter | Issue a replacement | "Replacement letter started" | "The replacement was not started. Please try again." | Dialog closes |
| Follow-Ups | Mark Completed / Missed / Cancelled | "Follow-up marked completed" (missed, cancelled) | "Not saved. Nothing you typed was lost. Please try again." | Row action |
| Follow-Ups | Set a new date | "New follow-up date set" | "The new date was not set. Please try again." | Dialog closes |
| Dispense | Record Dispensation | Patient: "Dispensation recorded"; general use: "N unit of Item recorded for general use"; + "Remaining stock: N." | Stock refusal: reason beside the item + "Nothing was recorded. See the reason above the button."; else "Nothing was recorded. Please try again." | Create: all fields reset (before: only item and quantity), top |
| Dispense | Stock below zero | Warning: "Stock is now below zero. Recount and restock." | — | — |
| Inventory form | Add Item / Save Changes | "Item added" / "Changes to Item saved" | "The item was not saved. Please try again." | Create: **now** blank; edit keeps saved values; top |
| Inventory list | Restock / Adjust Stock (dialogs) | "Item restocked with N unit. Stock is now N unit." / "Item adjusted (reason). Usable stock is now N unit." | "Stock was not changed. Please try again." (above the open dialog) | Dialog closes |
| Student form | Save Student | "Student record created", action **Open record** | "The student record was not saved. Please try again." (any error other than a duplicate LRN used to be thrown and never shown) | Create: resets (already did), top |
| Student form | Save Changes | "Student record updated" | as above | Edit: returns to the profile (or the queue) |
| Staff form | Save | "Staff record created" / "Staff record updated" | "The staff record could not be saved. Please try again." | Moves to the profile |
| Student / Staff profile | Archive | "Student record archived" / "Staff record archived" | "The record was not archived. Please try again." | Dialog closes |
| Student / Staff import | Apply | "List applied: N added, N updated, N archived, N left out" or "Nothing to change. The … records already match this list" | "The list was not applied. Please try again." | Back to step 1 with no file, top |
| User form | Create User / Save Changes | "User account created" / "User account updated" | Field errors (duplicate username, last admin); else "Not saved. Nothing you typed was lost. Please try again." | Create: **now** blank (name, username, role, picture); edit keeps saved values; top |
| User list | Enable / Disable | "Name's account enabled" / "… disabled" | Last-admin message; else "The account was not changed. Please try again." | Row action |
| User list | Reset password | "Password reset. Name must change it at the next sign-in." | "The password could not be reset. Please try again." | Dialog closes |
| Settings | Save (sign-out times) | "Sign-out times saved" | The settings error, or the save fallback | Edit: keeps values, top |
| Archive | End / Start school year | "School year X ended. The break has begun." / "School year X started." | The rule message, or the save fallback | Dialog closes |
| Archive | School year dates | "School year dates saved. Archived records keep the school year they were filed under." | as above | Dialog closes |
| Backup | Back up now | Loading "Backing up…", then "Backup recorded" + "Each location's result is under Backup locations. Check the files, then mark it verified." | "The backup did not run. Please try again." (or "No backup location…") | — |
| Backup | Mark verified | "Verification recorded in the audit trail" | "The verification was not recorded. Please try again." | Dialog closes |
| Backup locations | Add location | "Label added. Backups now go there too" | The save fallback | Dialog closes |
| Backup locations | Enable / Disable | "Label enabled" / "Label disabled" (was silent) | "The location was not changed. Please try again." | — |
| Calendar day | Add / Save / Delete event | "Event added" / "Event updated" / "Event deleted" | "The event could not be saved. Please try again." / "… deleted. …" | Dialog returns to the day |
| Sports Reports | Save report | "Sports report saved" / "Sports report updated" | "The report was not saved. Please try again." | Moves to the report |
| Sports Reports list | Duplicate / Archive / Restore | "Sports report copied" / "“Title” archived" / "“Title” restored" | "The report was not copied. …" / "The report was not changed. …" | — |
| Sports Report | Print with no students | Error: "This report has no students to print. Edit the report and add at least one active student." | "The report could not be prepared for printing. Please try again." | — |
| Login | Sign In fails | Error: "Unable to sign in with those credentials." (+ attempts left) or the lock message | "Unable to sign in. Please try again." | Username kept, **password cleared** |
| Forgot password | Each step | Refusals as error toasts; the end: "Password changed. You can sign in." | The recovery message | Dialog closes, username filled |
| Change password | Save Password | "Password changed" | "Unable to update the password. Please try again." (or the mock's reason) | Fields cleared (already), top |
| First sign-in password | Set password | "Password set. Welcome to CLINIQ" | as above | Moves to the Dashboard |
| Authenticator | Set up / disable / copy codes | "Authenticator app set up. Save the recovery codes now" / "Authenticator app disabled" + advice / "Recovery codes copied" | "That did not work. Please try again." / "Could not copy. Select the codes and copy them by hand." | — |
| Account menu | Edit profile | "Profile updated" | "Your profile could not be saved. Please try again." | Dialog closes |
| Account menu | Report an issue | "Issue submitted. An email draft was opened as a fallback." (warning if the draft could not open) | "The issue could not be saved. Please try again." | Dialog closes |
| Account menu | Sign out | "Signed out" (was silent) | "Could not sign out. Please try again." (was silent) | Moves to Login |

**Count (measured with `grep` on the uncommitted tree, Thursday, November 19, 2026):** the table above lists 44 actions. There are 120 `notify` call sites in 37 source files under `features/`, `layouts/` and `hooks/`. 14 screens reset and call `scrollToTop()` on success (15 call sites: Change password, Excuse letter, New Visit, PE referral, Visit Detail, Incident entry, Parent notification, Dispense, Inventory form, Settings, Staff import, Student form, Student import, User form). The Staff form, Student edit, Sports Report form and first sign-in move to a screen that starts at the top. Removed: `SaveFeedback.tsx`, `savedMessage.ts`, the shell's corner notice, and 24 inline result elements (`role="status"`/`role="alert"` lines deleted from source files, tests excluded). Newly given feedback (silent before): sign out, the backup location toggle, archiving a student or staff record, copying the recovery codes, approving an excuse letter, a new follow-up date, the Sports Report copy, archive and restore, marking a visit entered in error. Failures that were thrown and never shown before: New Visit, Visit Detail and Incident non-stock errors, Inventory form, Stock dialogs, Student form, PE referral, Parent notification, Dispense, the Backup run, and the calendar's error cases.

## C. Forms

All forms hold their state in plain `useState`, with validation in the screen (`useFocusFirstInvalid` for focus). None keeps a draft in `localStorage` or `sessionStorage`. Unsaved-changes guards (`useCancelNavigation`) compare against the defaults or the saved values, so a reset form is clean and the guard does not fire. Search bars, filters, sort and page size are screen state, not forms, and are never reset.

## D. Scrolling

The window scrolls (the shell has no inner scroller); a `Modal` scrolls its own fixed overlay (`data-modal-overlay`). Before this run nothing scrolled on a route change; `App` now mounts React Router's `ScrollRestoration` (a data router is already used).

## Needs your call

**Update Thursday, November 19, 2026 — 23:01 PHT (Zean's answers):** 1. Login keeps both notices and also shows one warning toast ("Signed out after N minutes of inactivity", "Your session has ended"). 3. "Visit recorded" carries one short fragment line: "N items taken from stock · Follow-up created · Letter draft saved" (or "Letter approved and stored"). 2. Still open: suggestion is extra bottom space on the shell's `<main>`.

1. **Login's arrival notices stay inline.** "You were signed out after N minutes of inactivity" and "Your session has ended" are not results of a button press, and an idle sign-out happens while nobody is at the PC. A toast would vanish before anyone read it. Say if you want them as toasts anyway.
2. **A toast can cover the pager at the very end of a long list** for its few seconds. In the 1536×960 check, Inventory's "Page 1 of 2" sat under a validation toast. The pager moves with the page, so no fixed offset avoids it; the toast can be closed, swiped or hovered to pause.
3. **Item counts left out of "Visit recorded".** The old panel said "3 items were taken from inventory"; the toast does not, to keep medicine detail off the toast. Say if the count (not the names) should come back.
4. No native `confirm()` exists, so nothing was left there.
