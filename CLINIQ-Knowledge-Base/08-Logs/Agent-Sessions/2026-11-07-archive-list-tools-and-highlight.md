Date/Day/Time: Saturday, November 07, 2026 — 12:46 PHT (local clock, UTC+8)
Agent: Claude Code (Opus 5.5)
Task: Point the Dashboard reminder to the Archive page and highlight the button there; move the school-year cards up; add list tools to the Archive tables
Status: Completed
Prompt/Request: Zean, in chat: "I think reword in button, Go to Archive then glow the end or start button there", then "shouldn't these be above the table, since the table could scale, so easy to reach", then "also implement basic functions in archive like filter, pagination, etc".

Files Modified: `frontend/src/features/dashboard/components/SchoolYearBanner.tsx`, `frontend/src/features/archive/ArchivePage.tsx` (+ test), `frontend/src/components/ui/Button.tsx` (a typed `ref` prop, React 19), `Screen-Inventory.md`, `Frontend-Changelog.md`.

Changes Made:
- **Banner button:** the reminder's button now reads "Go to Archive" instead of "End school year" or "Start school year". It opens the Archive page with router state `highlightSchoolYearStep`.
- **Highlight:** opened from the banner, the Archive page's End or Start button pulses with a light green outline and takes focus, which scrolls it into view. The pulse stops under reduced motion and once the button is pressed. Opened any other way, nothing is highlighted.
- **Order:** the "Current school year" and "School year dates" cards now sit above the school-year switcher and the tabs, so they don't drop below a long table.
- **Archive tables** (Students and Staff): Search by name, by the last 4 of the LRN, or by Staff No.; a Reason filter (clearable, "All reasons"); sortable columns, newest archived first by default; an "N of M shown" count; Pagination with the shared page-size choice; an empty state when nothing matches. The tools reset when another year is chosen. The Reports tab is at most 12 months and needs no paging. The Audit log tab already has the Audit Log's filters and pages.

Reason: Zean, in chat, Saturday, November 7, 2026.

Testing Performed:
- `ArchivePage.test.tsx`: the banner's "Go to Archive" link; the highlight and focus from the banner and none otherwise; the highlight cleared on press; newest-first order; the reason filter and count; search by name and an empty match; sorting by name; pagination present.
- Typecheck 0 errors, lint 0 errors. Full run: 1134 passed, 3 failed (1137). The 3 failures are the existing calendar and Student Health Record tests from commit `1b50a113`.

Known Issues: none new.

Next Steps: none.
