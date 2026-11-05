Date/Day/Time: Thursday, November 05, 2026 — 20:25 PHT
Agent: Claude Code (Opus 5.5)
Task: Shortcut tips, dropdown opening animation, yearly calendar event colour and month sort; finishes the compact account menu
Status: Completed
Prompt/Request (mid-task messages, in order):
- "No i mean add shortcut tip for those we already have" / "also shortcut tip everywhere applicable like the dashboard in sidebar"
- "add smooth subtle short animation for dropdown"
- "ung sa yearly na calendar di parin ayos — kasi sa monthly ang event ng school ay solid yellow pag dating sa yearly di na kita yellow like naka lining lang siya na beige color yun so medj same same ng shade sa holiday" (on the yearly calendar a school event shows only as a thin outline over beige, almost the same as a holiday, while the monthly view shows it solid yellow) — "fix this"
- "Then for yearly table, make the sorting of Month to ascending"
Files Modified:
- frontend/src/components/ui/ShortcutHint.tsx (new), frontend/src/components/index.ts, frontend/src/lib/shortcuts.ts
- frontend/src/layouts/navigation.ts, frontend/src/layouts/Sidebar.tsx, frontend/src/layouts/AccountMenu.tsx
- frontend/src/features/dashboard/components/StaffShortcuts.tsx, frontend/src/features/clinic-visits/VisitLogListPage.tsx, frontend/src/features/emergency-response/IncidentLogListPage.tsx
- frontend/src/components/ui/dropdownClassName.ts
- frontend/src/features/dashboard/components/VisitCalendar.tsx
- Tests: frontend/src/layouts/AccountMenu.test.tsx, frontend/src/layouts/AppShell.test.tsx, frontend/src/features/review-round-2.test.tsx
- .claude/skills/cliniq-dropdown-patterns/SKILL.md, CLINIQ-Knowledge-Base/04-Development/Skills-Setup.md
Changes Made:
- Shortcut tips: new `ShortcutHint` (a small `kbd`, from md only, hidden from assistive tech; the control carries `aria-keyshortcuts`). `SHORTCUT_KEYS` in lib/shortcuts.ts lists the existing keys. Tips on: sidebar Dashboard (Alt+D) and Students (Alt+K, opens Students with search focused), hidden when the sidebar is collapsed; New Visit on the Dashboard and Visit Log (Alt+N); New Incident on the Incident Log (Alt+I); the account menu's Keyboard shortcuts (?). Shift+Alt+N (save visit and prepare another) has no matching button, so no tip.
- This reverses the earlier "plain Keyboard shortcuts item, no ?" test from ADR-066's account menu by user request; tests updated.
- Dropdown animation: the account menu and every shared dropdown panel (`DROPDOWN_PANEL`: Select, DateRangePicker, MultiSelect) fade in and slide 4px down over 150ms, reusing the existing `animate-expand-down`; off under prefers-reduced-motion. cliniq-dropdown-patterns updated (old: no opening animation; new: this one).
- Account menu rows test expectation: min-h-9 (compact rows from the previous session).
- Yearly calendar: a day with a school event is now solid brand yellow with the dark-yellow edge, as on the monthly chips; it no longer shows the tan holiday fill or no-class stripes under it. Today keeps its green ring. The caption says "Yellow squares mark days with an event". An event day's case-count shade gives way to yellow; the counts stay in the tooltip and the Table view.
- Yearly table: Month sorts ascending (January first) by default; day views stay newest first.
Reason: User requests.
Testing Performed: tsc clean; ESLint clean on changed files; full `npx vitest run src`: 123 files, 1061 tests passed. Not checked in a browser by the agent.
Corrections to [the compact account menu session](2026-11-05-compact-account-menu.md): its "full vitest passed" was written before the run finished; one test (review-round-2 R6, `min-h-11`) failed and is fixed here. Its "no keyboard-shortcut hints" was a misreading; the user wanted tips for existing shortcuts (above).
Known Issues: An event day in the yearly grid no longer shows its case-count shade.
Next Steps: Check the tips on the green buttons and the yellow squares in a browser.
