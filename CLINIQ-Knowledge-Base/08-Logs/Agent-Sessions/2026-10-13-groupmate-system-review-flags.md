Date/Day/Time: Tuesday, October 13, 2026 — 23:00 PHT (system clock; work ran 22:58–23:00 PHT)
Agent: Claude Code (Claude Opus 5.5)
Task: File the groupmate's CLINIQ System Review flags in `Issues-and-TODOs.md` as one dated section
Status: Completed
Prompt/Request: Zean pasted a prompt titled "Add the groupmate system-review flags to `Issues-and-TODOs.md`": a groupmate (Team Healware, COSC 75) reviewed CLINIQ from screen recordings (`CLINIQ_System_Review.pdf`, sections 1–4 and 6; flags 1–17, redundancies R1–R9, additions A1–A13). Add the supplied entries, exactly as written, as one new dated section above "Format for new entries"; replace `<NOW>` with the real timestamp; drop entries the live repo already lists, or file already-fixed ones as DONE with evidence; update the "Open work at a glance" block by script; prove by script that every old line is preserved; add this log and a Changelog row. Documentation only: no fixes, no decisions, no code, no ADR, no commit or push.

Files Modified:
- `CLINIQ-Knowledge-Base/08-Logs/Issues-and-TODOs.md` (new section "Groupmate system review — Tuesday, October 13, 2026 — 22:59 PHT"; at-a-glance block)
- `CLINIQ-Knowledge-Base/08-Logs/Changelog.md` (one row)
- this file

Changes Made:
- Added 29 bullets: FIX 10, DECIDE 12, DOC 1, NOTE 4, VERIFY 2. Wording and tags as supplied; only `<NOW>` was replaced.
- Dropped 1 supplied entry, "[DECIDE] Unsaved-changes warning on forms" (Review #6), because the live file already lists the same decision: "Cancel with unsaved changes leaves without asking" in the "Issues-and-TODOs fix sweep" section. The kept "Edit Student stays on the form after Save" FIX still says "(see below)" for that decision; the decision is in the earlier section instead.
- No supplied entry was already fixed in the code, so none was filed as DONE.
- At-a-glance block, recomputed by script from the file: Open FIX 1 → 11, DOC 1 → 2, DECIDE 36 → 48; NOTE 14 → 18, VERIFY 2 → 4; AUDIT 6, LATER 5 and Done 107 unchanged. The 10 new FIX titles were added to the open-FIX list with "(Groupmate system review)"; the section was added to the DECIDE and DOC lists. No new LATER entry, so the LATER list is unchanged.

Reason: Zean and the requester checked each review flag against the code and ADRs; filing them keeps the fixable ones visible in "Open work at a glance" and records the rest as decisions or notes. The fixes are a separate prompt.

Testing Performed:
- `git fetch --all`: `main` equals `origin/main` (67bf119); `fix/issues-todos-sweep` and `feature/clinic-overview-dashboard` are already merged into `main`.
- Spot-checked the code claims before filing: `trendFor` has no All case and the All range starts at `1900-01-01` (`lib/dateRange.ts:39`); `VisitCalendar.tsx` prints `{total} Visits` at two spots under a "Visits + incidents per day" legend; `StudentFormPage.tsx` only sets a success message after Save and only checks contact fields for emptiness; `validateStageOne` only checks vitals are present; the dashboard card label is "Incomplete"; `IncidentLogListPage.tsx` keeps old rows at `opacity-60` while refetching.
- Script (Python `difflib`) comparing the file before and after: the only old lines changed are the three at-a-glance lines (counts, DOC list, DECIDE list); no other old line is missing. New bullets counted: 29 = 30 supplied − 1 dropped.

Known Issues:
- The Visit-vitals DECIDE says the visit/incident symmetry is "already tracked in the ERD notes", but `ERD.md` only tracks incident vitals (D-17, `incident_vital_readings`); nothing there discusses visit vitals. Kept as written, reported to the requester.
- The "No known allergies" DECIDE overlaps ERD decision D-03 (allergy/condition completeness), already listed under Known gaps. Kept as written, since it adds the UI side.

Next Steps: The separate fix prompt works through the 10 FIX entries; the DECIDE entries need the team, the nurse or the adviser.
