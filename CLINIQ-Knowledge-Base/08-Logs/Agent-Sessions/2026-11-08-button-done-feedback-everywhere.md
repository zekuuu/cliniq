Date/Day/Time: Sunday, November 8, 2026 — 23:42 PHT
Agent: Claude Code (Opus 5.5)
Task: Bring the "Copied" button feedback to every action button
Status: Completed
Prompt/Request: "The same concept such as the Copied feedback button must be applied to everywhere not just for Copy button. Also for Save buttons, etc. then also add check icon"
Files Modified:
- frontend/src/components/ui/Button.tsx: new `done` and `doneText` props and `DONE_MS` (2000). When `done` turns true, the button shows a check icon and the past form for 2 s (`useDoneFlash`, adjusted while rendering, so no setState in an effect). Never while `loading`.
- frontend/src/components/ui/buttonClassName.ts: `doneLabel` and `DONE_VERBS` (Save to Saved, Add to Added, Copy to Copied, Back to Backed up, and so on), next to `busyLabel`.
- frontend/src/components/icons/Icon.tsx: new plain `check` icon.
- frontend/src/components/index.ts: exports `DONE_MS`.
- Wired to each screen's existing success signal: ChangePasswordPage, NewVisitEntryPage (both save buttons), PeSportsReferralPage, VisitDetailPage, ParentNotificationPage (Add Attempt), InventoryDispensePage, InventoryFormPage, StudentFormPage, BackupStatusPage (Back up now; `backedUp` now resets before each run), BackupLocationsPanel, SettingsPage and UserFormPage (`useSaveFeedback`), and AuthenticatorDialog Copy (now the shared done state).
- frontend/src/components/ui/Button.test.tsx (new).
- .claude/skills/cliniq-button-feedback-patterns/SKILL.md (new); Skills-Setup.md row.
Changes Made: A button whose action worked reads "Saved", "Added", "Recorded", "Backed up", "Copied" and the like, with a check icon, for 2 seconds. The existing success messages (`SaveFeedback`, `role="status"`) stay for screen readers.
Reason: Zean's request. One shared mechanism in Button, so future buttons get it by passing `done`.
Testing Performed: `tsc --noEmit` clean; `npm run lint` 0 errors (1 old warning); full suite 1182 of 1182. Button.test.tsx covers: the done label and reverting after DONE_MS, showing again on the next success, never while loading, and the verb mapping.
Known Issues: Buttons whose success closes a dialog or leaves the page (most dialog confirms, Create/Add forms that navigate, Sign In, imports' Apply List) are not wired: the button is gone at once. "Mark as Verified" would read "Marked" if wired later; pass `doneText="Verified"` then. On ChangePasswordPage, PeSportsReferralPage and ParentNotificationPage the success signal doesn't reset before the next save, so only the first success shows the done state.
Next Steps: Reset those three screens' success signals before each save if repeat feedback matters there.

Skill created: `cliniq-button-feedback-patterns`. There was no button-feedback skill before. It records the new done rule and the existing busy rule (`loading`, "Saving…"), so they hold together.
