Date/Day/Time: Tuesday, October 20, 2026 — 15:01 PHT
Agent: Claude (Sonnet 5.5), chat session, not Claude Code; no application code touched
Task: Move the resolved entries out of Issues-and-TODOs into an archive file so the file is shorter, without deleting any entry
Status: Completed
Prompt/Request: Zean wrote that Issues-and-TODOs "will be flooded" and "already have many pending and unchecked, what can we do". I proposed moving the resolved entries to an archive file, saying it needed his approval because it bends the rule that Issues entries are never deleted. He answered: "for the third, yes that's actually good" (the third item of my three questions was: group the open decisions by who must answer, and move the resolved entries to an archive file).
Files Modified:
- CLINIQ-Knowledge-Base/08-Logs/Issues-and-TODOs.md
- CLINIQ-Knowledge-Base/08-Logs/Issues-Done-Archive.md (new)
- CLINIQ-Knowledge-Base/08-Logs/Changelog.md
- CLINIQ-Knowledge-Base/08-Logs/Agent-Sessions/2026-10-20-issues-done-archive.md (new)
- AGENTS.md and CLAUDE.md (one clause in "After you finish", step 4; the two files stay the same except for their title line)
Changes Made:
- All 180 resolved entries (`- [x] **[DONE]**`) were moved, **unchanged**, to `Issues-Done-Archive.md`, under the same section headings and in the same order. The archive's top explains what it is. Nothing was edited or deleted.
- In `Issues-and-TODOs.md` six sections that had only resolved entries (including "Resolved since last update", which held 54) now say "All entries in this section are resolved" with a link to the archive; no heading was removed. The legend's DONE row says the entries are kept in the archive; the summary block reads "Done: 180 (all in `Issues-Done-Archive.md`)".
- Rule change, approved by Zean: "Format for new entries" now says that a resolved entry is moved, unchanged, to the archive under the same section heading (the old rule only said not to delete it); AGENTS.md and CLAUDE.md say the same in their "After you finish" step 4. The principle that entries are never deleted is unchanged: they are moved.
- The file went from about 311 KB to about 185 KB. The rest is open entries, which are very long.
Reason: 180 of the file's 330 entries were resolved and made it hard to see what is still open.
Testing Performed:
- The 180 moved lines are identical to the originals, in the same order (compared as lists); no resolved entry is left in the main file.
- Diff of the main file against the previous commit, ignoring blank lines and the moved entries: only the legend row, the Done count, the six pointer lines and the "Resolving" rule changed. All headings are unchanged and open counts are unchanged (FIX 16, AUDIT 10, DOC 29, DECIDE 82, LATER 17).
- The patch series was applied to a fresh clone of the live branch (`git am`, in order).
Known Issues:
- Open entries that refer to a resolved entry by its title now need a search in the archive; none of the references is a link, so none broke.
- The glance-block script an agent may use counts DONE in the main file only; the Done total must be read from the archive (the block says so).
- A resolved entry's heading in the archive repeats for every place it had resolved entries; this is on purpose, to keep the original context.
Next Steps:
- Agents that resolve entries now move them; check that the next session does.
- Zean can revert this patch alone: it is the last of the three.
