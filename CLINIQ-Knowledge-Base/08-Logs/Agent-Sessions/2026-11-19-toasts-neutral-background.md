Date/Day/Time: Thursday, November 19, 2026 — 23:26 PHT (clock read with PowerShell `Get-Date`)
Agent: Claude Code (Opus 5.5)
Task: One neutral toast background; only the countdown line is coloured (ADR-083 note)
Status: Completed

## Prompt/Request

Zean, Thursday, November 19, 2026: "make the toast bg color, only the progress bar changes". Read as: every toast has the same plain background, and only the shrinking line along its bottom changes colour by kind.

## Files Modified

`frontend/src/components/ui/Toaster.tsx` (`richColors` removed), `frontend/src/index.css` ("Toasts" block), ADR-083 (dated note at the top), `03-Design/Design-System.md` ("Look"), `.claude/skills/cliniq-toast-patterns/SKILL.md`, `08-Logs/Frontend-Changelog.md`.

## Changes Made

- Without `richColors`, every toast is Sonner's white card with dark text and a light grey border. The icons are dark too; their shapes (tick, cross, warning, info) tell the kinds apart.
- The line along the bottom takes its accent straight from the tokens: `--color-success`, `--color-error`, `--color-warning` and `--color-info` (ADR-062). Its selector no longer needs `data-rich-colors`. The block that recoloured Sonner's rich-colour variables is gone.

## Reason

Zean's request above.

## Testing Performed

- `notify.test.tsx` and `consultation-part-2.test.tsx`: 23 of 23 pass.
- Prettier is clean on both changed files.
- Chromium (Playwright from `screenshots/_capture/node_modules`, mock mode): an error toast reads background `rgb(255, 255, 255)`, text `rgb(23, 23, 23)`, and a line in `rgb(211, 47, 47)` (`--color-error`). Checked against a screenshot.
- No database touched; nothing committed.

## Known Issues

None new. The pager question from the earlier follow-up is still open.

## Next Steps

Zean reviews, commits and pushes.
