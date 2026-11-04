Date/Day/Time: Thursday, November 05, 2026 — 00:32 PHT (system clock, +08:00)
Agent: Claude Code (Opus 5.5)
Task: Balance the Inventory Usage History columns and left-align them; "e.g." in the name placeholders
Status: Completed (not committed)
Prompt/Request: Zean, with a screenshot of the table at the page cap: "balance the width to reduce wrapping, also make all left-aligned". Then: "then also reword Example: in placeholder to e.g. instead, is it best".
Files Modified: `frontend/src/features/inventory/InventoryHistoryPage.tsx`, `InventoryHistoryPage.test.tsx`, `frontend/src/components/forms/NameFields.tsx`, `frontend/src/features/student-records/StudentFormPage.test.tsx`, `.claude/skills/cliniq-table-patterns/SKILL.md`, `08-Logs/{Changelog,Issues-and-TODOs,Issues-Done-Archive}.md`, this log.
Changes Made:
- Measured each column's widest one-line content in Chrome (100 rows): Date and time 186px, Item 191, Movement 215, Change 101, Batch 104, Patient 116, By 116 (1029px in all; the table is 1096px at the page cap).
- Widths: Change 6.5rem, Batch 6.5rem, Patient 7.5rem, By 7.5rem (fixed to their content); Date and time 17.5% and Movement 20% (they grow with the screen); Item takes the rest. The 55rem minimum stays, so no desktop scrolls sideways.
- Change is left-aligned like every other column (it was right-aligned).
- Name placeholders: "e.g. Maria Angela", "e.g. Dela Cruz", "e.g. Santos (leave blank if none)" (was "Example: …"). Answer to "is it best": yes. It is shorter and widely understood, and it leaves the middle-name field more room. Some screen readers say "e g", which matters little because the visible label names the field.
Reason: Zean's two requests above.
Testing Performed: In Chrome: at the page cap (1920) no row wraps; at 1366 and 1280 the card is narrower than the content (975 and 889px), so the date wraps with the time on its own line, and the longest item name and movement wrap; Change, Batch, Patient and By never wrap; no sideways scroll from 1280 up. axe at 375, 768 and 1280 on Inventory Usage History and Add Student: 0 violations. Inventory history, Student Form and Staff tests 33/33; `tsc -b` and `eslint .` clean. The fit test now checks the new widths and that every header is left-aligned.
Known Issues: none new.
Next Steps: none.
