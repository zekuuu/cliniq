Date/Day/Time: Tuesday, November 03, 2026 — 17:52 PHT
Agent: Claude Code (Opus 5.5)
Task: Theme every checkbox in the CLINIQ design system
Status: Completed
Prompt/Request: "refactor all checkboxes, currently they look generic unstyled checkbox, it should use the system's color or theme ui"
Files Modified:
- frontend/src/index.css
- CLINIQ-Knowledge-Base/03-Design/Design-System.md
- CLINIQ-Knowledge-Base/08-Logs/Changelog.md
Changes Made:
- Added one `@layer base` rule for `input[type='checkbox']` in `index.css`: `appearance: none`, white box with a 1.5px `text-secondary` border and 4px radius, `brand-green` border on hover, `brand-green-dark` fill with a white SVG tick when checked (white dash when indeterminate), brighter on hover when set, `surface`/`border` when disabled and `text-muted` fill when disabled and set. Transitions off under reduced motion; colours kept when printing; `appearance: auto` under `forced-colors` so Windows High Contrast still shows the box.
- Every existing checkbox (forms, list bulk-select, MultiSelect, Sports Report, Incident Entry, etc.) picks this up with no call-site change. Their `accent-brand-green-dark` class is now inert but harmless and was left in place to keep the diff small.
- Design-System.md "Buttons, Controls & Shape Language" documents the rule.
Reason: Native checkboxes only took an `accent-color` tint and otherwise looked like OS chrome, the same problem the design system already fixed for selects and date pickers.
Testing Performed: `npx vite build` succeeds. `npx vitest run`: 954 passed, 10 failed in 7 files (back-navigation, staff-counts, FollowUpListPage, LogbookFields, PeSportsReferralPage, VisitLogListPage, among others). The tests do not load `index.css`, so these failures are unrelated to this change and come from the existing uncommitted work on `main`.
Known Issues: No live browser check was run. Radios (`SexRadios`) still use the native control with `accent-brand-green-dark`; not part of this request.
Next Steps: Optionally drop the inert `accent-brand-green-dark` classes from checkboxes; theme radios the same way if wanted; look into the 10 failing tests.
