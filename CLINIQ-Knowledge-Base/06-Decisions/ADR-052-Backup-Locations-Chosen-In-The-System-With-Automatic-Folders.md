# ADR-052: Backup locations are chosen in the system and the folders are created automatically

**Date:** Thursday, October 29, 2026 — 22:18 PHT
**Status:** Accepted (Zean, in chat, Thursday, October 29, 2026 — 22:15 PHT). Amends ADR-039 (the backup stays local; still no cloud and no extra copy). Not built yet.

## Context
The Backup screen assumes one "designated external drive". The open decision "Additional backup layer beyond local + external drive" asked whether to add more. Zean answered: keep the internal and external drives, but let the clinician choose, add and edit which locations are backed up, and have the system create the folders itself in a sensible structure, as most apps do.

## Decision
1. **Backup locations are a list the clinician manages** on the Backup screen: a label (Internal drive, External drive or a name), a path, a status (found, not found, not writable), the last backup time and result, and an enabled switch. Add, edit and disable are audit-logged. A location is never deleted, only disabled. The screen warns when none is enabled.
2. **A backup runs to every enabled location** and shows each result. "Back up now", the nightly backup and the backup at sign-out (ADR-037) all use the same list.
3. **The system creates the folders.** On each location it creates, if missing:
```
<location>\.cliniq\
    cliniq.json                          marker: app, school, structure version, created on
    backups\YYYY\MM\cliniq-YYYY-MM-DD_HHmm.zip
    logs\backup-YYYY-MM.log
```
   Each zip holds the database dump, the uploaded files and a manifest (app version, time, checksum). The oldest backups beyond the latest 60 per location are removed (a starting value in `config`, `backupKeepLast`).
4. **Still local, as in ADR-039:** no cloud, no copy held by the Principal, no extra layer. The locations are the same internal and external drives, now chosen in the system.
5. **A browser cannot write to a drive.** The mock keeps the locations in a PROVISIONAL `backupLocations` list and only draws the screen; the backend lists the drives, creates the folders and writes the files.

## Alternatives Considered
- **A fixed path in code or settings files.** Rejected: the drive letter of an external drive changes.
- **A visible folder named "CLINIQ Backups".** Possible; Zean's example was `.cliniq`. It is hidden by default only on macOS and Linux, so on a Windows clinic computer it stays visible.
- **A cloud or off-site copy.** Rejected earlier (ADR-039) and not reopened.

## Consequences
- The Backup screen gains a locations panel; its text stops saying "the external drive".
- The backend needs a job that creates the folders, writes and checks each backup, and prunes old ones (`LATER` entry).
- The "stale backup" warning reads the newest successful backup across enabled locations.
- Session: [2026-10-29-open-decisions-answered](../08-Logs/Agent-Sessions/2026-10-29-open-decisions-answered.md)
