Date/Day/Time: Monday, November 02, 2026 — 05:44 PHT
Agent: Claude Opus 5.5 (Claude Code)
Task: Larger field labels
Status: Completed. Not committed.
Prompt/Request: "isnt username and password font size small or no", then "fix it".
Files Modified: Shared `Input`, `Select`, `Textarea`, `DatePicker`, `Combobox`, `MultiSelect`, `PatientPicker`, `StudentPicker`; the field labels on the visit, referral, incident, excuse letter and inventory pages; `LoginPage.test.tsx`; `Design-System.md`; `Frontend-Changelog.md`.
Changes Made: Field labels went from `text-xs` (12px) to `text-sm` (14px). All controls changed together, because changing `Input` alone would leave different label sizes side by side in one form. Calendar headings, status lines and keyboard hints stay at 12px; they are not field labels.
Reason: Labels were smaller than the typed value, and the audience may include older users.
Testing Performed: New LoginPage test failed first, then passed. Typecheck 0, lint 0, Vitest exit 0.
Known Issues: Not viewed in a browser. Form sections with 14px legends now match their field labels in size.
Next Steps: None.
