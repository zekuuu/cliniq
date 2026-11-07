Date/Day/Time: Thursday, November 05, 2026 — 20:37 PHT
Agent: Claude Code (Opus 5.5)
Task: Show what an incomplete student record still lacks when it's opened from the queue; remove the shortcut-tip outline
Status: Completed
Prompt/Request: Pasted feedback: "possible kaya here na pagkapindot ng edit record automatically na mapupunta si sir kung saan kulang nung student or like may nagred ung box nung kulang nung student ganon para mas madali mahanap — kasi example may tumawag saglit sa nurse so iniwan niya tas pagbalik nakalimutan ano ung kulang hahanapin pa" (after Edit Record, go straight to what's missing, or mark the missing boxes red, because a nurse interrupted by a call forgets what was left). User: "like a glow indicator that disappears or what?" Then mid-task: "nvm, remove outlines in keyboard shortcuts tips"; "add a bit more space for shortcut tip, like Alt+D is too close".
Files Modified:
- frontend/src/features/student-records/StudentFormPage.tsx
- frontend/src/features/student-records/StudentFormPage.test.tsx
- frontend/src/components/ui/ShortcutHint.tsx
Changes Made:
- Persistent marks instead of a fading glow (a glow would be gone by the time the nurse came back). In Edit Student, every field an incomplete record still lacks (the same fields as missingRequiredFields: first/last name, grade level, sex, birthdate, each emergency contact's name, relationship and phone) shows the red field state with "Missing. Fill this in to complete the record." Each mark clears as soon as that field is filled. A real validation error still takes precedence. Saving never blocks on them (ADR-054).
- On opening Edit Student for a record with gaps, focus and scroll land on the first missing field (the shared focusFirstInvalid), with the "N fields need attention." announcement.
- Add Student is unchanged (its required checks run on save).
- ShortcutHint: outline removed again (plain muted text); keys shown spaced ("Alt + D") and 12px from the label (pl-3, was 8px).
Reason: User request; recovering the task after an interruption.
Testing Performed: New test (lands on and marks the missing emergency contact name; typing clears it). ESLint clean; full `npx vitest run src` (see summary). Not checked in a browser.
Known Issues: A blank contact added during an edit is marked missing at once.
Next Steps: None.
