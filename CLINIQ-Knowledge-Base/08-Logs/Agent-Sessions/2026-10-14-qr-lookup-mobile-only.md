Date/Day/Time: Wednesday, October 14, 2026 — 22:25
Agent: Claude Code (claude-opus-5-5)
Task: Remove QR lookup from the desktop view
Status: Completed
Prompt/Request: "Also the desktop view shouldn't have the qr lookup since we wont have qr scanner hardware, only for mobile to use camera"
Files Modified: frontend/src/layouts/navigation.ts, frontend/src/layouts/Sidebar.tsx, frontend/src/components/KeyboardShortcuts.tsx, frontend/src/routes/AppRoutes.tsx, frontend/src/routes/paths.ts, frontend/src/App.test.tsx, frontend/src/features/ui-review-regressions.test.tsx, frontend/src/features/qr-digital-health-id/desktop/QrDesktopHubPage.tsx (deleted), frontend/src/features/qr-digital-health-id/README.md, frontend/src/features/qr-digital-health-id/desktop/README.md, 06-Decisions/ADR-023-QR-Lookup-Mobile-Only.md, 06-Decisions/Decisions-Summary.md, 01-Requirements/Features/Module-Overview.md, 04-Development/Frontend-Loop-Engineering.md, 08-Logs/Changelog.md
Changes Made: New `mobileOnly` flag on NavItem; QR Lookup marked mobile-only; desktop Sidebar filters mobile-only items (phone menu still lists it). Alt + Q shortcut removed. `/qr/desktop` route, path, page, and its regression test removed. QR print page kept.
Reason: The workstation has no QR scanner hardware; scanning is a phone-camera flow (ADR-023).
Testing Performed: `npx tsc -b` clean; `npx vitest run` 69 files / 412 tests passed.
Known Issues: Canonical Modules & Features (Module 6) still describes a computer scan path; needs syncing. QR print page has no nav entry (pre-existing).
Next Steps: Team review of ADR-023; sync the canonical document.
