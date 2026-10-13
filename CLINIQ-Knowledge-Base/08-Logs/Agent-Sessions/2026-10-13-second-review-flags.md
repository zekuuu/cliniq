Date/Day/Time: Tuesday, October 13, 2026 — 23:08 PHT (system clock; work ran 23:08–23:10 PHT)
Agent: Claude Code (Claude Opus 5.5)
Task: Add a second groupmate's review flags to the existing "Groupmate system review" section of `Issues-and-TODOs.md`
Status: Completed
Prompt/Request: Zean pasted a prompt titled "Add the second review's flags to `Issues-and-TODOs.md`". A second groupmate sent informal review notes: 6 screenshot pages with Taglish comments, titled "grrr". Run it only after the "Groupmate system review" section is merged; otherwise stop. Add 3 FIX and 4 DECIDE entries, as written, under the section's "Fix these" and "Decide these" sub-headings. File already-fixed or already-listed entries as DONE, or skip them. Append " Also raised by a second reviewer on <NOW>." to 7 named existing entries and change nothing else in them. Recompute "Open work at a glance" by script. Prove by script that old lines are preserved, that the new-bullet count is right, and that each of the 7 entries carries the sentence exactly once. Add this log and one Changelog row. Documentation only: no fixes, no decisions, no code, no ADR, no commit or push.

Files Modified:
- `CLINIQ-Knowledge-Base/08-Logs/Issues-and-TODOs.md` (Groupmate system review section; at-a-glance block)
- `CLINIQ-Knowledge-Base/08-Logs/Changelog.md` (one row)
- this file

Changes Made:
- Precondition: after `git fetch --all`, local `main` equals `origin/main` at `c17422c`, which contains the "Groupmate system review" section. No duplicate section was created.
- Added 3 FIX entries at the end of "Fix these":
  - the Dashboard header shows "Showing Jan 1, 1900" on All
  - a failed submit doesn't move focus to the first invalid field
  - the Dashboard print cluster note may overlap the chart labels
- Added 4 DECIDE entries at the end of "Decide these":
  - auto-zeroing expired stock
  - the Dashboard shows too much at once
  - what belongs in the Monthly Report
  - Dashboard print vs Reports print
- Appended " Also raised by a second reviewer on Tuesday, October 13, 2026 — 23:08." to the 7 named entries (Review #1 trend note; Review #2 calendar label; Visit vs Incident rule; Expired stock quantity; No known allergies checkbox; Yearly day list; Help page and text-size/contrast).
- Nothing was filed as DONE or skipped:
  - `DashboardHeader.tsx:48` still prints `Showing ${formatDateRange(range.from, range.to)}`.
  - No source file outside tests moves focus or scrolls to an invalid field. The only `scrollIntoView` calls are the option lists in `Combobox` and `InventoryItemPicker`.
  - None of the 4 decisions is already in the file.
- At-a-glance block, recomputed by script:
  - Open: FIX 11 → 14 and DECIDE 48 → 52.
  - Unchanged: AUDIT 6, DOC 2, LATER 5, NOTE 18, VERIFY 4 and Done 107.
  - The 3 new FIX titles were added to the open-FIX list with "(Groupmate system review)". The section was already in the DECIDE list.

Reason: The second review confirms 7 existing entries and raises 7 new items. Recording them keeps the open work list complete for the separate fix prompt and the team's decisions.

Testing Performed (Python script, comparing the file before and after):
- 9 old lines changed. 7 are the named entries, and each matches its old text plus the appended sentence. The other 2 are the at-a-glance count line and the DECIDE list line. No other old line changed.
- The appended sentence appears on exactly 7 lines, once each.
- There are 7 new entries in the section (3 FIX + 4 DECIDE), as expected.
- `git diff --stat` shows +19/−9. That is 7 new entries, 3 open-FIX list lines and 9 replaced lines.

Known Issues:
- The print-overlap FIX was not reproduced in this session, because the prompt is documentation only. Its own text tells the fixer to reproduce it with Playwright/Chromium and to downgrade it to VERIFY if it doesn't reproduce.

Next Steps: The separate fix prompt; the DECIDE entries go to the nurse, the school and the team.
