# Top bar clock, sidebar wordmark and the backup folders card

Date/Day/Time: Saturday, October 31, 2026 — 11:44 PHT
Agent: Claude Code (Opus 5.5)
Task: Enlarge the top-bar date and time, give the sidebar system name a professional stylized font, make the backup folders card readable, and shorten the Sports Report builder description.
Status: Completed
Prompt/Request: Zean: "in topbar time and date, make it larger. Then also in sidebar system name, use different font like stylized font but not cursive"; "but still font should look professional"; "make this more readable" (a screenshot of "Folders created on each location"); "descriptions still too long".
Files Modified: `frontend/src/layouts/AppShell.tsx`, `layouts/Sidebar.tsx`, `index.css`, `package.json`, `package-lock.json`, `features/backup/BackupLocationsPanel.tsx`, `features/reports/SportsReportFormPage.tsx`, `Design-System.md`, `Skills-Setup.md`, `cliniq-sidebar-patterns` skill, Changelog, Issues, Archive
Changes Made: The clock is 16px from `lg` up and stays 14px below it. The sidebar wordmark uses Cinzel through a new `--font-brand` token, bundled with `@fontsource-variable/cinzel` so it works offline on the LAN. Below `lg` the top bar shows the seal only, which resolves the 768px overlap `FIX`. The backup folders preview is now a labelled list of what each item holds and its path, with no sideways scroll. The login page wordmark stays Inter.
Reason: The new dependency is a font Zean asked for, not a change of stack. A local package is used because the deployment has no internet.
Testing Performed: `src/layouts`, `src/features/backup` and `SportsReport.test.tsx` tests, typecheck and build; viewed in Chromium. The full suite was not rerun.
Known Issues: None new.
Next Steps: None.
