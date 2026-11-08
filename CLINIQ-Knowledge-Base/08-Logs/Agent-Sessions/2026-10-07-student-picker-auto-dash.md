Date/Day/Time: Wednesday, October 07, 2026 — 20:55 PHT
Agent: Claude Code (Opus 5.5)
Task: Auto-insert the Student Number dash in the New Visit student search
Status: Completed
Prompt/Request: "If the input is number and detected as 4 then automatically add dash, except if name or letters"
Files Modified: frontend/src/components/forms/StudentPicker.tsx, frontend/src/features/clinic-visits/NewVisitEntryPage.test.tsx, .claude/skills/cliniq-combobox-patterns/SKILL.md, 04-Development/Skills-Setup.md, 08-Logs/Frontend-Changelog.md
Changes Made: When the StudentPicker query contains only digits and dashes, it is formatted with the existing `normalizeStudentNumber`. Once 4 digits are typed, a trailing dash is added ("2026" becomes "2026-"), but only while the text is growing: a backspace that deletes the dash leaves "2026", so the dash can still be removed. Pasting "202600001" gives "2026-00001". Input with any letter or space ("gian", "gian 2026") is a name search and is left as typed.
Reason: Faster Student Number entry without breaking name search.
Testing Performed: `npx tsc -b` clean. Visit feature and regression tests 65/65 pass, including a new test (4 digits get the dash, 9 digits are formatted, backspace removes the dash, a name with digits is untouched). Not re-checked live in the browser.
Known Issues: None.
Next Steps: None.
