Date/Day/Time: Sunday, October 11, 2026 — 11:55 PHT (system clock)
Agent: Claude Code (Claude Opus 5.5)
Task: Restructure `Issues-and-TODOs.md` into a tagged, sorted checklist (formatting and classification only)
Status: Completed
Prompt/Request: "Turn `Issues-and-TODOs.md` into a sorted checklist." Zean asked for every bullet to get exactly one tag (`FIX`, `AUDIT`, `DOC`, `DECIDE`, `LATER` with `- [ ]`; `NOTE`, `VERIFY` with no checkbox; `DONE` with `- [x]`), a legend and an "Open work at a glance" block under the title, rewritten standing rules under "Format for new entries", and six script-run preservation checks. Constraints: do not fix, resolve, re-open, reword, move, or delete anything; keep every section and its order; no ADR; do not commit or push; do not use Microsoft Edge; append one sentence to step 4 of "After you finish" in `CLAUDE.md` and `AGENTS.md`.

Files Modified:
- `CLINIQ-Knowledge-Base/08-Logs/Issues-and-TODOs.md`
- `CLINIQ-Knowledge-Base/08-Logs/Changelog.md`
- `CLAUDE.md` ("After you finish" step 4 only)
- `AGENTS.md` ("After you finish" step 4 only)
- `CLINIQ-Knowledge-Base/08-Logs/Agent-Sessions/2026-10-11-issues-todos-tagged-checklist.md` (this file)

Changes Made:
- Ran `git fetch --all` and checked both branches. The live `Issues-and-TODOs.md` was last changed in `7d6a2a5`, which is already in local `main`. `feature/clinic-overview-dashboard` last touched it on October 1, so it is older. Local `main` is two commits behind `origin/main`, but those commits change only `setup-step.md` and `package.json`.
- Tagged all 165 list items (bullets, plus the seven numbered open questions under "Open design questions", which use `1. [ ] **[DECIDE]**`). A script applied the tags from a map of original line numbers.
- Added the legend table and the "Open work at a glance" block under the title. The block has script-computed counts, the 22 open `FIX` items with their sections, and one line for each other open tag. A `---` rule ends the block.
- Kept the existing "Format for new entries" sentence and added the Adding / Resolving / Always rules after it.
- Appended the requested sentence to "After you finish" step 4 in `CLAUDE.md` and `AGENTS.md`.

Counts: FIX 22 · AUDIT 5 · DOC 6 · DECIDE 36 · LATER 6 | NOTE 13 · VERIFY 2 | DONE 75 (total 165).

Ambiguous classifications (tagged `DECIDE`; Zean may overrule):
- "Typing a full Student Number and clicking Save without picking": this may be an intended behaviour change or a regression.
- "Student search isn't audit-logged": the bullet presents this as consistent with Student List, but it may be an audit-trail gap.
- "Database-design draft exists, but is not final or approved": this is pending team approval, not a defect.
- "Official school photo for the Login backdrop": this waits on an official photo and asks whether the spare image should be deleted.
- "Holiday source for the backend sync job": the decision is deferred to Phase B9, so it could also be `LATER`.

Possible stale status (tags not changed, by instruction):
- Open items that later "Resolved" entries in the same file appear to cover:
  - QR dash auto-insert, Cancel actions, "View profile" links, and parent contact near Parent Notifications: the September 30 17:29 resolved entry.
  - Masterlist layout shift: the October 1 07:33 fixed-layout entry.
  - No navigation below `lg`, the uncarded Dashboard header, Incident Archive oldest-first sorting, the QR idle skeleton, Input/select visual mismatch, 32px vs 40px filter heights, and the Dispense long option label: the October 1 00:04 entry.
  - The top bar at 390px may also be covered by that entry's compact header change.
- "Make dashboard alerts redirect to their respective module pages": `AlertLists.tsx` already renders `ListItemLink`s to the profile and inventory pages.
- Checked and still open in code: the `Modal` overlay has no overflow handling; `Sidebar.tsx:29` still uses `text-[11px]` for the subtitle; no Incident Stage 1 General Notes field exists.

Reason: Real defects, notes, provisional schema fields, re-audit reminders, outside-party decisions, and resolved items all looked the same, so nobody could see what to work on next.

Testing Performed: The original file was saved to the scratchpad before editing. These are the six scripted checks (`check.py`) run on the final file:
```
--- original
+++ new-stripped
@@ -288,0 +289,6 @@
+**Adding:** ... (the three new rule paragraphs under "Format for new entries")
[PASS] 1 content (removed 0, added 6; all added lines are under "Format for new entries")
[PASS] 2 count (before 165, after 165, tagged 165, not exactly one tag 0)
[PASS] 3 strikethrough (~~ bullets before 34, DONE-with-~~ after 34)
[PASS] 4 dates (157 date/time matches in original, missing {})
[PASS] 5 markdown (bad checkbox lines 0)
[PASS] 6 index (fresh {'FIX': 22, 'DECIDE': 36, 'DONE': 75, 'LATER': 6, 'VERIFY': 2, 'NOTE': 13, 'DOC': 6, 'AUDIT': 5}; index matches; FIX list 22 vs body 22, one-for-one True)
ALL PASS
```

Known Issues: The tags record each item's state as written. Items listed under "Possible stale status" need a person to confirm and re-tag them.

Next Steps: Zean reviews the ambiguous and possibly stale items. A separate task adds the new bugs from the groupmate review.
