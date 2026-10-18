Date/Day/Time: Sunday, October 18, 2026 — 17:26 PHT
Agent: Codex
Task: Professor consultation Part 9B — remove the visible question mark from Shortcuts
Status: Completed
Prompt/Request: Continue to the next part; remove the question mark from the Shortcuts button while retaining the shortcut behavior.
Files Modified: `frontend/src/layouts/AppShell.tsx`; `frontend/src/layouts/AppShell.test.tsx`; logs listed here.
Changes Made: Changed the visible shell action from “Shortcuts ?” to “Shortcuts”. The `?` keyboard handler and the shortcuts dialog were not changed.
Reason: The visible question mark was the part of the shortcut element identified for removal; preserving the keyboard action avoids dropping existing efficiency behavior.
Testing Performed: `npm.cmd test -- src/layouts/AppShell.test.tsx src/components/KeyboardShortcuts.test.tsx --reporter=verbose` — 14 passed. `npm.cmd run typecheck` — passed.
Known Issues: The original consultation wording was ambiguous; this applies Zean's subsequent direction only to the visible button label.
Next Steps: Continue the color-system audit.
