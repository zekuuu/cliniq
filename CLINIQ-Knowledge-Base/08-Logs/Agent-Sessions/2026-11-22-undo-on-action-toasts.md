Date/Day/Time: Sunday, November 22, 2026 — 01:02 to 01:40 PHT (PowerShell `Get-Date`)
Agent: Claude Code (Opus 5.5)
Task: Undo on the toasts of reversible actions, and restore of archived student and staff records (ADR-085)
Status: Completed (not committed)
Prompt/Request: Zean: "Then for action buttons, add undo for everything applicable, e.g. for archive, etc. they have seconds until they can undo until the toast gone". Plan approved; pop-up answers: Undo calls the reverse request; add student and staff restore; follow-up Undo restores the old status and reason; 8 seconds.
Files Modified:
- Frontend: `src/lib/notify.ts` (+ test), `src/hooks/useSaveFeedback.ts`, `src/components/EmergencyContactList.tsx`, `features/user-management/UserListPage.tsx`, `features/backup/BackupLocationsPanel.tsx`, `features/reports/SportsReportListPage.tsx`, `features/student-records/StudentProfilePage.tsx` and `api/studentProfileApi.ts`, `features/staff-records/StaffProfilePage.tsx` and `api/staffApi.ts`, `features/emergency-response/FollowUpListPage.tsx`, `lib/mock-db/api.ts` (+ `auditCoverage.test.ts`), `lib/api/http/records.ts` (+ test), `lib/data/index.ts`.
- Backend: `routes/api.php`, `StudentRecords/Services/StudentService.php`, `StudentRecords/Controllers/StudentController.php`, `StaffPatients/Services/PersonnelService.php`, `StaffPatients/Controllers/PersonnelController.php`, `Shared/FollowUps/FollowUpService.php`; tests `StudentRecordsTest`, `StaffPatientsTest`, `FollowUpsTest`, `HealthAndRoutesTest`.
- Docs: new ADR-085, `Decisions-Summary.md`, `ADR-Index.md` (generated), `.claude/skills/cliniq-toast-patterns/SKILL.md`, `Skills-Setup.md`, `API-Contract.md`, `Module-Overview.md`, `Facts-Sheet.md` (generated), route and ADR counts in the READMEs, Start Here and `Backend-Readiness-Checklist.md`, both changelogs, `Frontend-Issues-and-TODOs.md`.
Changes Made:
- `notify.undoable(message, reverse, { undone, onUndone })`: a success toast with an Undo button for `ACTION_MS` (8 s); Undo shows "Undoing…", sends the reverse, then "Undone: …" or the error, and reloads. `useSaveFeedback().run` takes an `undo` option.
- Undo on: account enable/disable, backup location enable/disable, Sports Report archive/restore, emergency contact Mark verified/unverified (which now shows a toast at all), follow-up status (previous status and reason; closes the "set a new date" offer), student archive, staff archive.
- New `POST /api/students/{id}/restore` and `POST /api/personnel/{id}/restore` (Staff only): clear the four archive columns, 409 `not_archived` when not archived, audit `update` "Restored from the archive". Mock `restoreStudent`/`restorePersonnel`, HTTP and data-layer routing.
- A follow-up set to Pending or Completed now clears its reason (backend and mock).
Skill change (cliniq-toast-patterns): old: no Undo; new: reversible actions use `notify.undoable` or `useSaveFeedback`'s `undo`, one-way actions never get Undo.
Reason: a mistaken click could not be taken back, and the restore promised by ADR-047/051/069 had no route.
Testing Performed:
- Backend (`DB_DATABASE=cliniq_check_pest`, XAMPP PHP): Pest 257 passed (1,671 assertions); Pint passes; Larastan only the pre-existing `BackupService.php:171` error.
- Frontend (from `D:\`): `tsc -b` clean; `npm run lint` 0 errors (the 1 existing warning); full Vitest 1275 of 1282 with 7 timeouts in untouched screens under load, all 73 tests of those 6 files pass when run alone (the known VERIFY "full suite fails more under CPU load").
- `npm run docs:adrs` (85), `docs:facts` (133 routes), `docs:check` all pass.
Known Issues: no Restore button on the Archive screen yet (LATER). Canonical documents not edited (DOC). During this run another process ran `git stash` on `main` and popped it again; the picker edits (`InventoryItemPicker`, `PatientPicker`, `StudentPicker`, `hooks/useDebouncedValue.ts`) in the tree are not from this session and were left alone.
Next Steps: Zean reviews and commits; a live browser check of the Undo on a scratch API database if wanted.
