# Frontend and backend logs: renamed and split

Date/Day/Time: Sunday, November 08, 2026 — 17:44 PHT
Agent: Claude Code (Opus 5.5)
Task: Rename the main Issues and Changelog files to Frontend-*, fix every link, and move each entry to the side it belongs to.
Status: Completed
Prompt/Request: "rename Issues and todo to Frontend-Issues.... and fix all linked link, this is to easily determine where to input issues, and changelongs, also the Changelog"; then "Then now clean both files and move any backend works from the frontend files to backend-issues.... and vice versa"; then "I mean only entries in issues and todos and changelogs".
Files Modified:
- `main`: `08-Logs/Issues-and-TODOs.md` renamed to `08-Logs/Frontend-Issues-and-TODOs.md`, and `08-Logs/Changelog.md` renamed to `08-Logs/Frontend-Changelog.md` (`git mv`). Links and mentions were updated in 451 files: `CLAUDE.md`, `AGENTS.md`, the READMEs, the KB documents, the ADRs, six code comments and notes in `frontend/src`, and 413 `Agent-Sessions/` logs. Only the file names changed in the session logs, at Zean's request to fix every link, although that folder is otherwise append-only.
- `backend` (worktree `../cliniq-backend-wt`): `Backend-Issues-and-TODOs.md`, `Backend-Changelog.md`, and the old names in `Backend-Counter-Check-Nov7.md` and two backend session logs. These files exist only on `backend`, so the rename on `main` does not reach them.
Changes Made:
- Moved from `Frontend-Issues-and-TODOs.md` to `Backend-Issues-and-TODOs.md` (a new section, "Moved from Frontend-Issues-and-TODOs"): 20 entries, all about the API, the database, Laravel or backend documents. These are the API-contract and `Reference-Schema.sql` `DOC`, the ERD-approval `DECIDE` and its line under "Open decisions by who must answer", the backend-work `LATER`, server-side auth, the four "Provisional fields for the ERD" `NOTE`s, the item-name snapshot, profile-picture storage, the five "Backend:" `LATER`s, the backup-location contract note, `personnel.sex` on MariaDB, the backend folder listing and the backend docs for ADR-065.
- Moved from `Backend-Issues-and-TODOs.md` to `Frontend-Issues-and-TODOs.md` (a new section, "Moved from Backend-Issues-and-TODOs"): the four "Frontend fix:" `LATER`s, the two `FIX-FRONTEND` entries (tagged `FIX`, the tag this file uses), the Screen Inventory and Admin Audit Log `DOC`s, and the "frontend checks are not green" `NOTE`.
- Entries that touch both sides stayed in the frontend file, as its rule says: the reference number, the canonical-document `DOC`s and retention.
- Moved from `Frontend-Changelog.md` to `Backend-Changelog.md`: the rows for ADR-056 (October 31, 18:30), the database-design draft and the backend readiness checklist (October 9), and "ERD reverted to TBA" (September 25). No backend row was frontend work.
- Recounted both "Open work at a glance" blocks. Frontend: FIX 4, DOC 31, DECIDE 1, LATER 13, NOTE 77, VERIFY 30. Backend: FIX 2, DOC 5, DECIDE 3, LATER 22, FIX-FRONTEND 0, NOTE 9. The frontend's per-tag section lists now name only the sections that still have open entries.
- Nothing was resolved or reworded. Entries now in the wrong state (for example, ERD "not approved", which ADR-057 approved) stay as they were.
Reason: To make it obvious which file an issue or change goes in.
Testing Performed: No references to the old names remain on `main` (`git grep`). The tag counts before the move matched both files' glance blocks, and the counts after it add up.
Known Issues: The `backend` worktree changes are not committed. Commit them on `backend` and merge `main` into `backend`.
Next Steps: Commit `main`; commit in `../cliniq-backend-wt` (branch `backend`), then `git worktree remove ../cliniq-backend-wt`.

## Follow-up — Sunday, November 08, 2026 — 17:46 PHT

Prompt/Request: "did you add the backend issues and changelog for instructions, like similar for frontend issues and changelog"
Changes Made: `CLAUDE.md` and `AGENTS.md`, Before you start, steps 6 and 7, and After you finish, steps 3 and 4: each now names the Frontend file for frontend work and the Backend file for backend work. Step 4 also says that an entry touching both sides goes in the frontend file, and that only the frontend file archives resolved entries to `Issues-Done-Archive.md` (the backend file keeps them in its own "Done" section). Before you start, step 4 already routed backend work to the Backend files.
