Date/Day/Time: Saturday, October 03, 2026 — 02:37 PHT
Agent: Claude Code (Opus 5.5)
Task: Remove the hover box from the password-reveal icon, and record a rule that clickable icons stay bare icons.
Status: Completed (conversion of existing boxed icon actions awaits the requester)
Prompt/Request: "Remove the bg box hover for show password icon, it should hover on the icon itself. Put that in skills like when there's clickable icons do not always make it a button, clickable icon is enough"
Files Modified:
- frontend/src/components/ui/Input.tsx
- .claude/skills/cliniq-interactive-states/SKILL.md
- CLINIQ-Knowledge-Base/04-Development/Skills-Setup.md
- CLINIQ-Knowledge-Base/08-Logs/Frontend-Changelog.md
Changes Made:
- Password reveal toggle: dropped `hover:bg-surface`. Hover now turns the icon from `text-secondary` to `brand-green-dark`. It keeps its 32px invisible hit area, pointer cursor, focus ring, `aria-label`, and `aria-pressed`.
- `cliniq-interactive-states` (old → new): the skill had no rule for icon-only actions, so they borrowed the secondary-button `surface` tint and looked like boxed buttons. Now:
  - Clickable icons stay bare: no fill, border, or hover box; the hover is the icon's own color shift.
  - Each is still a real `<button type="button">` with an accessible name, a visible focus ring, and a hit area of at least 32px. "Not a button" means not styled as one, never a clickable `<span>`/`<svg>`.
  - A labelled visible button is reserved for actions that need emphasis, or whose icon alone wouldn't be understood.
- Design-System.md was not edited: it requires a hover color on icon-only actions but specifies no background, so nothing conflicts.
Reason: The requester prefers clickable icons to read as icons, not as small boxed buttons.
Testing Performed: `Input.test.tsx`: 3 tests passed. The change is one hover class; no live re-check was run.
Known Issues: Three existing icon-only actions still use the boxed hover and don't yet follow the new rule:
- the shared Modal's close ✕ (`components/ui/Modal.tsx`)
- the mobile "Open navigation" button (`layouts/AppShell.tsx`)
- the DatePicker's previous/next month arrows (`components/ui/DatePicker.tsx`, `NAV_BUTTON`)

The sidebar collapse/expand control already complies. The requester's wording ("do not always…") left it unclear whether existing uses should change, so they were not converted.
Next Steps: Convert those three if the requester confirms.
