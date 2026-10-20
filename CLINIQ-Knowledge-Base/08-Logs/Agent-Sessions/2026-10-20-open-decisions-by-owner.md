Date/Day/Time: Tuesday, October 20, 2026 — 15:00 PHT
Agent: Claude (Sonnet 5.5), chat session, not Claude Code; no application code touched
Task: Group the open DECIDE entries in Issues-and-TODOs by who has to answer, so the file reads as a set of questions to ask and decisions to make
Status: Completed
Prompt/Request: Zean wrote that Issues-and-TODOs "will be flooded" and "already have many pending and unchecked, what can we do". I proposed, among other steps, grouping the open decisions by who must answer, and asked whether to do it. He answered: "for the third, yes that's actually good" (the third item of my three questions was: group the open decisions by who must answer, and move the resolved entries to an archive file).
Files Modified:
- CLINIQ-Knowledge-Base/08-Logs/Issues-and-TODOs.md
- CLINIQ-Knowledge-Base/08-Logs/Changelog.md
- CLINIQ-Knowledge-Base/08-Logs/Agent-Sessions/2026-10-20-open-decisions-by-owner.md (new)
Changes Made:
- New section "Open decisions by who must answer", placed above "Open decisions, waiting on someone outside the dev team". It lists the title of each of the 82 open DECIDE entries once, under one of six groups: waiting on the clinician (21), waiting on the school (14), yearly student list and school-year rollover (7), database design before any migration (3), depends on the QR, Instructor and LRN decisions on HOLD (5), ours to decide (32). A note at the top of the section says how the grouping was made and that Zean can move a line.
- The grouping follows what each entry's own text says; an entry that needs two people sits under the one the main answer comes from. It is a reading of the text, not a decision, so it may have misplaced some entries.
- "Format for new entries" gained one sentence: a new DECIDE gets a line in this section under the group that must answer, and the line is removed when the entry is resolved (the entry itself stays).
- No entry was changed, moved or deleted. The "Open work at a glance" block was rebuilt: only the NOTE count changed (the new note), 43 to 44.
Reason: 82 of the 150 open items are DECIDE entries, and most are questions for someone outside the team. Grouping them shows what to ask the clinician, what to ask the school and what the team can decide alone, without changing any entry.
Testing Performed:
- The script asserts that exactly 82 open DECIDE entries exist and that every one is assigned to exactly one group.
- Before-and-after comparison: no existing line changed except the "Format for new entries" line and the glance block's NOTE count.
- The patch was applied to a fresh clone after the earlier patch (`git am`, in order).
Known Issues:
- The index repeats titles, so it needs one line added or removed whenever a DECIDE is added or resolved. The rule in "Format for new entries" says so, but an agent can forget; the glance block does not check it.
- Only DECIDE entries are grouped; FIX, AUDIT, DOC and LATER entries are not.
Next Steps:
- Zean to move any entry that sits in the wrong group.
- Use the clinician and school groups as the source for the regenerated question files (the open DOC "Regenerate the question files for the school and the clinic").
