---
name: cliniq-toast-patterns
description: Apply when building or changing any CLINIQ action that reports a result (save, add, update, delete, archive, approve, status change, copy, backup, print, sign in or out) or any form that should reset after a successful submit. Keeps every result in one bottom-right Sonner toast sent through `notify`, and every successful form back to a clean state at the top (ADR-083).
---

# CLINIQ Toast Patterns

Use with `cliniq-button-feedback-patterns`, which keeps busy and done feedback on the button itself, and with `cliniq-input-patterns`, which covers field validation. The decision is ADR-083 (Zean, Thursday, November 19, 2026: "all buttons feedbacks like success, errors, etc. to be in toast notification on bottom right using sonner library … all the success process like filling up a form or etc, should clear all inputs and automatically scrolls to top").

## Where it lives

- `frontend/src/lib/notify.ts`: the only module that imports `sonner` (an ESLint rule refuses it anywhere else). Durations, ids, the error mapper and the copy rules are there.
- `frontend/src/components/ui/Toaster.tsx`: the one `<Toaster>`, mounted once in `App`. Bottom right, light result colours, close button, three at a time.
- `frontend/src/lib/scrollToTop.ts`: back to the top after a success (the window, or the open dialog's overlay), with focus on the main content.
- `frontend/src/index.css`, "Toasts": result toasts use the light ADR-062 fill for their kind (success: brand-green-fill, error: error-fill, warning: warning-fill, info: info-fill) and its accent border. The shrinking bottom line keeps that accent. This changes the November 19 white-card rule at Zean's request (ADR-096). Keep dark text and the app's outline `Icon`s in each meaning's text shade, set once in `Toaster.tsx` (never Sonner's filled ones).

## The rules

- **Every result is a toast.** Send it with `notify.success`, `notify.error`, `notify.warning` or `notify.info`. A failure from the data layer goes through `notify.apiError(cause, 'X was not saved. Please try again.')`, never `cause.message` straight into the screen. `useSaveFeedback().run` already sends both.
- **No inline result banners**, no `alert()`, no "Saved." line beside a button.
- **What stays inline:** field validation beside its field. A failed submit calls `useFocusFirstInvalid().report(count, message?)`, which also sends one "Please check the highlighted fields" toast, or `message` for a form-level check with no field of its own. Page-load failures with Retry, empty states, skeletons, and on-screen states (Voided, Approved and stored, a duplicate warning) stay inline too.
- **Confirmation dialogs stay dialogs**; only their result is a toast.
- **One toast per action (ADR-084):** every call is its own toast, so repeated results stack; toasts are never merged by text or id. An `id` only pairs a slow action's `notify.loading(text, { id })` with its result sent under the same id, or use `notify.promise`.
- **A next step rides on the toast:** `action: { label: 'Open record', onClick }`. Such a toast stays 8 s.
- **Undo (ADR-085, amended by ADR-089):** every mutation with a supported, safe reverse offers an eight-second Undo through `notify.undoable(message, reverse, { undone: 'Undone: …', checkCurrent, onUndone: reload })`, or `useSaveFeedback().run(action, { saved, undo: (value) => ({ run, checkCurrent, undone, onUndone }) })`. Edits capture prior editable values before saving and check the current state before reversing; refuse a stale Undo. Undo sends the reverse request (never a delayed save), so the audit keeps both entries. Previously one-way actions await an explicit per-action reversal decision.
- **Undo action look:** on the light success toast, use the shared dark green text, a visible focus ring, hover and pressed feedback; do not leave Sonner's default black action fill.
- **Copy:** sentence case, one short sentence, past tense naming what ("Visit recorded", "Staff record archived"). No exclamation marks, no "successfully", no emoji. An error says what failed and what to do next.
- **Privacy:** never a diagnosis, symptom, vitals, medicine or other health detail. Name a record by its number or the screen's own label, and a person only where the same screen already shows them. If a refusal's text names a medicine (a stock rule), show it beside the items and keep the toast plain.

## After a successful submit

1. Send the success toast.
2. Reset the form. A **create** form goes back to what a new one looks like: its own defaults, no picked student, no file (clear the file input's `value`), no errors. An **edit** form keeps what was saved. Never clear search, filters, sort or page size.
3. Call `scrollToTop()`. Pass an element from inside a dialog that stays open, so its overlay scrolls instead.
4. A form that moves to another screen sends the toast first and then moves. `ScrollRestoration` starts the new screen at the top; do not scroll twice.

On failure, clear nothing. Login keeps the username and clears only the password.

## Tests

`test/setup.ts` mounts the Toaster before every test. Read a toast with `screen.findByText('Visit recorded')`, or with `findToast(text)` (`test/findToast.ts`) when the old assertion matched part of a message.
