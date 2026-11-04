Date/Day/Time: Wednesday, November 04, 2026 — 00:15 PHT
Agent: Claude Code (Opus 5.5)
Task: Give radio buttons the CLINIQ look (Sex radios on the Student and Staff forms)
Status: Completed
Prompt/Request: "the radio style in sex student form is still using generic style or theme"
Files Modified:
- frontend/src/index.css
- frontend/src/components/forms/SexRadios.tsx
Changes Made:
- The global themed control rule in `index.css` covered only `input[type='checkbox']`, so radios still drew OS chrome tinted by `accent-color`. The rule now covers `input[type='radio']` too: round, text-secondary border, brand-green on hover, and when checked a brand-green-dark fill with a white inner ring (inset box-shadow) around the dot. Disabled, reduced-motion, forced-colors (hands back to the OS), and print rules include radios.
- `SexRadios` drops the now-dead `accent-brand-green-dark` class.
Reason: Radios should match the themed checkboxes instead of the browser default.
Testing Performed: `npx vitest run src/features/student-records src/features/staff-records` — 14 files, 92 tests passed.
Known Issues: None. Not checked in a live browser.
Next Steps: None.
