Date/Day/Time: Thursday, November 05, 2026 — 01:55 PHT
Agent: Claude Code (Opus 5.5)
Task: List the Other option first in the Department or role field
Status: Completed
Prompt/Request: "in department or role, move Other option to top always"
Files Modified:
- frontend/src/components/forms/ComboboxWithOther.tsx
- frontend/src/features/review-round-2-parts-2-3.test.tsx
- .claude/skills/cliniq-combobox-patterns/SKILL.md
- CLINIQ-Knowledge-Base/04-Development/Skills-Setup.md
Changes Made:
- `ComboboxWithOther` now lists the Other action first, whatever is typed, with the matching values below it. It used to list Other last.
- The request did not say "only here", so CLAUDE.md's component rule applies and the change is made in the shared component. That also changes the emergency contact **Relationship** field on the Student and Staff forms ("Other" is now first there too). It matches `SelectWithOther` (the Complaint field), where Other is already the first option.
- Skill `cliniq-combobox-patterns` changed. Old: "lists the known values ... plus an Other action". New: "with an Other action always first in the list, whatever is typed".
- Keyboard: `ComboboxWithOther` does not use `autoHighlight`, so Enter after typing still picks nothing until an option is arrowed to. Other being first cannot be picked by mistake.
Reason: Zean wanted Other always visible at the top of the list.
Testing Performed: The full vitest suite passes: 121 files, 1034 tests. The department test now expects ['Other (specify)', 'Grade 4 adviser', 'Grade 9 adviser', 'Grounds']. eslint is clean.
Known Issues: None. Not checked in a browser.
Next Steps: If Other should come first only in Department or role, and Relationship should keep it last, say so and it becomes a prop.
