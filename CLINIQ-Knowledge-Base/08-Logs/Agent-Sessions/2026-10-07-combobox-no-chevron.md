Date/Day/Time: Wednesday, October 07, 2026 — 20:37 PHT
Agent: Claude Code (Opus 5.5)
Task: Remove the dropdown chevron from the shared Combobox
Status: Completed
Prompt/Request: "What's the purpose of the drop down icon" — answered that it was decorative only (added to match `Select`, not requested) and misleading on the Student field, which lists nothing on focus. Then: "remove it".
Files Modified: frontend/src/components/ui/Combobox.tsx, .claude/skills/cliniq-combobox-patterns/SKILL.md, 04-Development/Skills-Setup.md, 08-Logs/Frontend-Changelog.md
Changes Made: Removed the chevron icon from `Combobox` (both New Visit uses: Complaint and Student). The field's right padding is now `pr-3`, since no chevron space is needed. Skill rule changed from "text cursor and the brand chevron" to "text cursor and no chevron".
Reason: The chevron promised a dropdown. The Student field shows nothing until 2+ characters are typed.
Testing Performed: `npx tsc -b` clean. Combobox and New Visit tests 13/13 pass. Not re-checked live in the browser.
Known Issues: None.
Next Steps: None.
