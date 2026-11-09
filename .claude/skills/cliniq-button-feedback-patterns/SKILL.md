---
name: cliniq-button-feedback-patterns
description: Apply when building or changing a CLINIQ button that runs an action, such as Save, Add, Update, Record, Confirm, Copy or Back up now. Keeps busy and done feedback on the button itself, using the one shared Button.
---

# CLINIQ Button Feedback Patterns

Use this with `cliniq-interactive-states`, which covers cursor, hover and focus. The shared component is `frontend/src/components/ui/Button.tsx`.

## Busy: `loading`

- While the action runs, pass `loading`. The button spins, reads the action's "-ing" form ("Save Changes" reads "Saving…"), and refuses repeat clicks.
- Use `loadingText` only when the default from the label doesn't fit.

## Done: `done` (Zean, Sunday, November 8, 2026: "the same concept as the Copied feedback … everywhere … also for Save buttons … add check icon")

- When the action worked, the button briefly reads its past form with a **check icon**, such as "Saved", "Added", "Updated", "Recorded", "Copied" or "Backed up". After `DONE_MS` (2 seconds) it returns to its label.
- Pass the screen's own success signal: `done={Boolean(saved)}`, or `done={feedback.result?.kind === 'saved'}` with `useSaveFeedback`.
- The button stays clickable during the done state, so the next one can be added at once (Zean, November 8, 2026: "Add Attempt goes Added, then i will need to add more"). Never disable it for the done state.
- It shows each time `done` turns true. Reset the signal before the next run, so a second success shows it again. For example, Back up now sets `backedUp` to false first.
- The past forms come from `doneLabel` in `buttonClassName.ts`. Add a verb there instead of hard-coding a label, and pass `doneText` only when the default doesn't fit.
- A failure never shows the done state. Failure messages stay with `SaveFeedback` or the field error.
- The done state is extra. Keep the existing `role="status"` message (`SaveFeedback`) or other success text, which screen readers announce.
- Skip it when success closes a dialog or leaves the page. The button is gone, so there is nothing to show.
