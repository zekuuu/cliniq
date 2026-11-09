Date/Day/Time: Monday, November 09, 2026 — 18:08 PHT (PowerShell `Get-Date`; Git Bash's `TZ=Asia/Manila date` prints UTC here)
Agent: Claude Code (Opus 5.5)
Task: Part 2 of `Prompt-Frontend-Staff-Idle-Signout-And-Clinic-Only-Nov8.md`: record "clinic PC only" (ADR-079), remove the LAN assumptions, check the Monthly Report PDF. Then close the open items left by the November 8 sessions.
Status: Completed
Prompt/Request: Zean, Monday, November 9, 2026: "finish the Part 2, and fix opens". Part 2 comes from Zean's decisions of Sunday, November 8, 2026 (chat, about 18:03 to 18:10 PHT): "Deployment is the clinic PC only … no LAN access for other PCs, no fixed address or hostname, and no HTTPS on the LAN. The system is reached at `http://localhost` on that PC … The Principal receives a monthly PDF." "Opens" means the open items listed at the end of the November 8 sessions.
Files Modified:
- Code: `frontend/src/components/print/Print.tsx` (`PrintDocument` `fileName`), `frontend/src/features/reports/components/ReportsPrint.tsx` (a file name per report), `frontend/src/features/reports/ReportsPage.tsx` (help line), `frontend/src/features/legal/PrivacyPolicyPage.tsx` (deployment, session and idle lines), comments in `frontend/src/components/icons/Icon.tsx`, `frontend/src/index.css`, `frontend/src/lib/mock-db/devToggles.ts`
- New test: `frontend/src/features/reports/MonthlyReportPdf.test.tsx`
- Decisions: `06-Decisions/ADR-079-Clinic-PC-Only-Principal-Gets-Monthly-PDF.md` (new), a dated note in `ADR-029`, `Decisions-Summary.md`
- Documents: `CLAUDE.md`, `AGENTS.md`, `README.md`, `00-Project-Core/Overview.md`, `00-Project-Core/Scope.md`, `01-Requirements/Non-Functional-Requirements.md`, `01-Requirements/User-Roles-and-Permissions.md`, `02-Architecture/Tech-Stack.md`, `02-Architecture/Tech-Stack-Summary.md`, `02-Architecture/System-Architecture.md`, `03-Design/Screen-Inventory.md`, `04-Development/Skills-Setup.md`, `09-References/Privacy-Policy.md`, `.claude/skills/cliniq-print-patterns/SKILL.md`
- Canonical: `09-References/Canonical-Documents/CLINIQ_Project_Plan.md` (revision 3.0), `CLINIQ_Modules_and_Features.md`, `CLINIQ_Frontend_Context_Brief.md`, `CLINIQ_Review_of_Related_Systems.md`
- Logs: `08-Logs/Frontend-Changelog.md`, `08-Logs/Frontend-Issues-and-TODOs.md`, `08-Logs/Issues-Done-Archive.md`
- `backend` worktree (`D:\zeank\Desktop\Projects\cliniq-backend`): a dated note at the top of `06-Decisions/ADR-057-…` and a row in `08-Logs/Backend-Changelog.md`
Changes Made:

**Set-up.** Branch `main` at `bc33132`, with uncommitted work from this and earlier sessions (101 entries). Three sessions ran on main after the November 8 Part 1 log: lockout, report-sheet fixes and button feedback. This session built on their files as they stood and changed only its own lines. Baseline: typecheck 0, lint 0 errors and 1 warning, tests 1183 of 1183 (134 files). The next ADR number was 079 (main has 077 and 078; `backend` has 076).

**P2.1: ADR-079.** The decision:
- **Address:** `http://localhost` on the clinic PC; no LAN access, fixed IP, hostname, router entry or certificate.
- **Network:** Windows Firewall blocks inbound connections. No HTTPS is needed, because the traffic never leaves the machine and browsers treat `localhost` as secure.
- **The Principal:** gets the Monthly Report as a PDF. Incident reports are already printed and signed (ADR-053, ADR-060). The Admin account is used on the clinic PC, and the Admin does not print (ADR-038, ADR-077).
- **Shared, unlocked room:** a Windows password and a 5 to 10 minute screen lock, BitLocker on Windows Pro, backups kept away from the room (the PC's own disk is not enough), and one Staff account per person.
- **What would reopen it:** joining the school network, which is a new decision; only environment values would change.
- **Alternatives:** LAN access, online hosting, and a synchronised second copy.

ADR-029 gets a dated note saying ADR-079 replaces its October 31 "LAN too" note. Its decision text is unchanged.

**P2.2: LAN wording, grep of the whole main tree** (case-insensitive: `LAN`, `intranet`, `local network`, `school network`, `Wi-Fi`/`wifi`, `another computer`, `other computers`, `remote Principal`, `reaches the system`, `HTTPS on the LAN`, `fixed address`, `hostname`, `cliniq.local`, `cliniq.lan`; session logs, `node_modules` and the build output excluded). **50 hits: 22 reworded, 1 open entry updated, 26 left, 1 handed to backend.**

| File | Line | What it said | What I did |
|---|---|---|---|
| `CLAUDE.md`, `AGENTS.md` | 3 | "hosted on the clinic computer, LAN-only deployment" | Reworded: used only there at `http://localhost`, no LAN access (ADR-079) |
| `frontend/src/features/legal/PrivacyPolicyPage.tsx` | 223 | "runs on the school's local network; it is not exposed to the public internet" | Reworded: "runs only on the clinic's computer; other computers and the internet cannot reach it" |
| `09-References/Privacy-Policy.md` | 53 | the same | Reworded the same way |
| `02-Architecture/Tech-Stack.md` | 18 | "served over the LAN" | Reworded |
| `02-Architecture/Tech-Stack-Summary.md` | 3, 23 | "served over the local network (LAN)", "move from the local network to a remote host" | Reworded |
| `02-Architecture/System-Architecture.md` | 7 | "LAN → Cloud path" | Reworded: "Clinic PC → network or cloud path (a new decision)" |
| `01-Requirements/Non-Functional-Requirements.md` | 12 | "served over the local network (LAN) only" | Reworded |
| `00-Project-Core/Scope.md` | 23 | "served over the LAN" | Reworded; added that the Principal receives the Monthly Report as a PDF |
| `00-Project-Core/Overview.md` | 5 | "LAN-only deployment" | Reworded |
| `README.md` | 23 | "served over the clinic's local network (LAN)" | Reworded |
| `frontend/src/components/icons/Icon.tsx`, `frontend/src/index.css`, `frontend/src/lib/mock-db/devToggles.ts` | 5, 2, 67 | code comments "LAN-only", "offline on the LAN", "a LAN request" | Reworded |
| Canonical `CLINIQ_Frontend_Context_Brief.md` | 278 | "(LAN-only deployment)" | Reworded |
| Canonical `CLINIQ_Review_of_Related_Systems.md` | 274 | "runs on the client's local LAN" | Reworded |
| Canonical `CLINIQ_Project_Plan.md` | 150, 294, 330, 339, 345 | "served over the (clinic's) local network (LAN)" ×5 | Reworded; revision 3.0 added |
| `08-Logs/Frontend-Issues-and-TODOs.md` | 181 | open DOC: deployment diagram with "school LAN" | Dated *Update* line in place (ADR-079) |
| `06-Decisions/ADR-029` | 4, 7, 10, 20, 21, 27 | the decision's context, notes and alternatives | Left: decision text; a dated note added |
| `ADR-007` 20, `ADR-012` 25, `ADR-013` 16, `ADR-020` 68, `ADR-073` 9, `Decisions-Summary.md` 123 | | incidental "LAN" in recorded decisions | Left: decision text |
| `08-Logs/Frontend-Changelog.md` | 154, 155, 302 | dated rows | Left: log |
| `08-Logs/Frontend-Issues-and-TODOs.md` | 330, 468 | NOTE entries | Left: log |
| `08-Logs/Issues-Done-Archive.md` | 272, 341, 449, 450, 566, 633 | resolved entries | Left: log |
| Canonical `CLINIQ_Project_Plan.md` | 45 | revision 2.9 row ("served over the LAN") | Left: revision history |
| `README_ORIGINAL.md` | 33, 93 | the original README, kept as it was | Left: archived copy |
| `04-Development/Backend-Readiness-Checklist.md` | 64 | "HTTPS on the LAN" | Handed to backend; the November 8 backend run already closed it on `backend` |

**Privacy Policy** (page and document). It did not say where records are stored, so the optional sentence was not added. Two lines were stale and were fixed while there:
- **Sessions:** now "signed out after a period without activity (60 minutes for clinic staff and 30 for the Admin, by default) and at the latest one week after signing in" (ADR-078).
- **Lockout:** the document said 30 minutes. It now says 5, matching the page and the November 8 lockout change.

**P2.3: the Monthly Report PDF.**
- **Reports screen:** Staff now see "To send this to the Principal, print it or choose Save as PDF in the print window."
- **File name:** `PrintDocument` takes a `fileName`. While printing it is the tab title, which Chrome offers as the file name, and the screen's title comes back after. The four Reports printouts use "CLINIQ Monthly Report, <Month Year>", "CLINIQ Incident register, …", "CLINIQ Symptom summary, …" and "CLINIQ Inventory sheet, …", the same names as the Admin's sheet titles.
- **Chrome check:** the tab title while printing was "CLINIQ Monthly Report, November 2026", and back to "CLINIQ — Reports" after. The PDF is A4 (`@page`, 15 mm sides, 20 mm bottom), 0 clipped tables or sections, 2 pages. The PDF was not inspected by eye: there was no PDF renderer in this environment.
- **The app adds no header** (no top margin, ADR-046). Chrome's own footer is a print-dialog setting, so the send checklist went into `cliniq-print-patterns`: Save as PDF, A4, margins Default, "Headers and footers" off.
- **Not done as the prompt said:** "the Admin and Staff both can open and print it" conflicts with ADR-038 and ADR-077. The Admin opens it on screen (view only) and does not print; that is unchanged.

**Skill edit (old → new):** `cliniq-print-patterns` had no rule for the saved PDF's name or the print-dialog settings. It now says that a report sent as a PDF passes `fileName`, and gives the send checklist. A `Skills-Setup.md` row was added.

**"Fix opens" (the open items of November 8):**
1. **Canonical documents for ADR-077 and ADR-078 (two open DOC entries): closed.** The Project Plan (security line, risk table, revision 3.0), Modules & Features (session line, Reports access) and the Frontend Context Brief (auth model, Login, Monthly Report) now carry both decisions and ADR-079. Two stale facts in the edited Project Plan sentence were fixed too: the lockout is 5 minutes, and recovery is by authenticator app (ADR-073), not email.
2. **ADR-057's dated note:** written in the `backend` worktree. ADR-078 adds a per-role idle limit inside the 7-day session, and ADR-079 settles the deferred HTTPS item. Logged in `Backend-Changelog.md`.
3. **Recheck after merge:** the November 8 backend documents were compared with ADR-078 and ADR-079 as written. Names, defaults, range, `session_idle`, "Signed out (idle)" and the keep-alive match. The "on main, pending merge" markers stay until the merge.
4. **Not fixable here:** the likely `Decisions-Summary.md` merge conflict (both branches append) needs the merge itself. The backend code's old Admin-only idle check is backend build work, already open in `Backend-Issues-and-TODOs.md`.

Reason: ADR-079 (Zean, November 8, 2026), and Zean's "fix opens".
Testing Performed:
- Before: typecheck 0; lint 0 errors, 1 warning (`ErrorSummary.tsx`, existing); tests 1183 of 1183 (134 files).
- After: typecheck 0; lint the same; tests **1185 of 1185 three times** (135 files); build passes.
- Test-first: `MonthlyReportPdf.test.tsx` failed before the change. Its two tests: "tells Staff how to send the report to the Principal", and "names the saved file 'CLINIQ Monthly Report, <Month Year>' while printing, then restores the tab title".
- Browser (system Chrome via playwright-core and axe-core outside the repo; no Edge): axe on Staff's Reports at 375, 768 and 1280 found no violations and no horizontal scroll. The PDF check is described above. Files in `C:\Users\zeank\AppData\Local\Temp\claude\215c8086454e59e6\98563800-c113-4947-b879-478a3a9097c3\scratchpad\shots\`: `staff-reports-help-375.png`, `staff-reports-help-768.png`, `staff-reports-help-1280.png` and `monthly-report.pdf`.
- `Issues` counts recomputed: DOC 33 → 31; Done 491, counted from the archive. The previous total said 489 but the archive held 488; this was an existing off-by-one, now corrected.
Known Issues:
- In this session Python could not write files under `frontend/src` ("Errno 22"), and once a log file failed the same way. The edits were made with the editor tool, or retried; nothing was lost.
- The PDF was checked by measurement, not by eye.
Next Steps: Zean merges `main` into `backend` and resolves `Decisions-Summary.md`; then the backend's "pending merge" markers can go.

## For the backend branch

- **Done on `backend` already** (November 8 backend-docs run, rechecked today against ADR-078 and ADR-079):
  - **Readiness checklist:** "HTTPS on the LAN" closed.
  - **`Environment-Setup.md`:** reworded to `http://localhost`, no hostname, IP, router or certificate, Windows Firewall inbound block, and the shared-room requirements.
  - **CORS and Sanctum:** CORS origin `http://localhost`, `SANCTUM_STATEFUL_DOMAINS=localhost`, `SESSION_DOMAIN` empty.
  - **Session cookie:** `SESSION_SECURE_COOKIE=false` on plain localhost, `true` once HTTPS exists.
  - **Idle settings:** `idle_signout_minutes_staff` 60 and `idle_signout_minutes_admin` 30, each 10 to 240, Staff edit, audited by field name.
  - **Keep-alive:** `POST /api/session/keepalive`, 200 `{ "data": { "idleSecondsLeft": n } }`, at most once a minute.
- **Done today on `backend`:** ADR-057's dated note.
- **Still to do after the merge:** drop the "on main, pending merge" markers in `Data-Dictionary.md`, `ERD.md` and `API-Contract.md`. Bring the backend code in line with the documents: per-role idle middleware, `session_expired` for the 7-day limit, the keep-alive route, and the `admin_idle_minutes` key renamed.
- **The keep-alive need:** the client counts keyboard, pointer, scroll and touch as activity, and typing a long incident form may send no request for many minutes. So the client calls the keep-alive while the person is active, at most once a minute, and at once on "Stay signed in". The server counts it as activity and returns the idle seconds left, so the two-minute warning follows the server's clock. While the warning is open, ordinary activity does not count; only "Stay signed in" does.
