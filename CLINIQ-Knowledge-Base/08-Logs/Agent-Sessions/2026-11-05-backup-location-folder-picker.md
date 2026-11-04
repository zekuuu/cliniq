Date/Day/Time: Thursday, November 05, 2026 — 03:08 PHT
Agent: Claude Code (Opus 5.5)
Task: Choose a backup location's drive or folder instead of typing a path
Status: Completed
Prompt/Request: "Folder or drive path. should be actually choosing a drive, or folder"
Files Modified:
- frontend/src/lib/mock-db/api.ts (`BackupDrive`, `listBackupFolders`, provisional drive and folder lists)
- frontend/src/features/backup/api/backupApi.ts (`fetchBackupFolders`)
- frontend/src/features/backup/BackupLocationsPanel.tsx (`FolderPicker` replaces the "Folder or drive path" text field)
- frontend/src/components/icons/Icon.tsx (`folder` icon, Lucide outline)
- frontend/src/features/StaffComplaintsBackupDecisions.test.tsx (one new test)
Changes Made:
- The Add and Edit backup location dialog no longer has a typed path. Under "Drive or folder", each drive is a card (name, letter, Internal or Removable, free space); choosing one opens it.
  - Its folders are listed below a breadcrumb. Opening a folder makes it the location, and the breadcrumb goes back up.
  - A line reads "Backups will be saved in E:\Backups\.cliniq" (the `.cliniq` folder of ADR-052).
  - Nothing is typed. "Choose a drive or folder." shows when none is chosen.
- This follows ADR-052 item 5: a browser can't see the clinic computer's drives, so the backend lists them. The mock's `listBackupFolders(path)` returns a PROVISIONAL fixed set (C: Local Disk, D: Data, E: USB Drive and a few folders) and writes nothing.
- The data layer's `saveBackupLocation` is unchanged (it still takes `label` and `path`).
Reason: A typed path invites typos and wrong drive letters; picking from what the computer has is safer and easier.
Testing Performed:
- tsc and eslint are clean. The full vitest suite passes (121 files, 1037 tests before the new one).
- New test (StaffComplaintsBackupDecisions): no path textbox; choosing USB Drive (E:) and Backups shows E:\Backups\.cliniq and saves path E:\Backups. That file passes 10 of 10.
- Checked on screen with Playwright and Chromium at 1366px (the dialog with E: and Backups chosen).
Known Issues: The drive and folder list is provisional mock data until the backend lists the real drives (Issues-and-TODOs LATER).
Next Steps: Backend: an endpoint that lists the clinic computer's drives and the folders inside a path, Staff only, read-only, limited to drive roots and their subfolders.
