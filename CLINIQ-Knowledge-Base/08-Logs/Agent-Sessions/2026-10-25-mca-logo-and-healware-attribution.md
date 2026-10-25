Date/Day/Time: Sunday, October 25, 2026 — 22:48 PHT
Agent: Claude Code (Opus 5.5)
Task: MCA logo on login and sidebar; Powered by moved and given the HealWare mark
Status: Completed
Prompt/Request: "Replace the logo in login and in sidebar to MCA logo, then in login white screen footer, swap Powered by and Privacy policy, now on Powered by add the Healware logo on the left." Follow-up: "Then in sidebar, I'm thinking of moving the powered by anywhere else, so the sidebar heads dont look crowded, then making the logo a bit bigger."
Files Modified:
- frontend/src/features/auth/LoginPage.tsx
- frontend/src/layouts/Sidebar.tsx
- frontend/src/features/auth/LoginPage.test.tsx, ForcePasswordChangePage.test.tsx, frontend/src/layouts/AppShell.test.tsx
- .claude/skills/cliniq-sidebar-patterns/SKILL.md
- CLINIQ-Knowledge-Base/03-Design/Design-System.md, 04-Development/Skills-Setup.md, 08-Logs/Changelog.md
Changes Made:
- Login lockup: `/MCA_Logo.png` (56px) replaces the HealWare logo; the -5px offset for the HealWare PNG's padding is gone (the seal has none), gap 12px.
- Login footer: "[HealWare mark 20px] Powered by HealWare™ · Privacy Policy · version" (was "Privacy Policy · Powered by HealWare™ · version").
- Sidebar `BrandLogo`: MCA seal, 44px expanded (was 36px), 36px in the compact top bar; collapsed rail seal 40px (was 36px). The "Powered by HealWare™" third line left the header; it now sits in the sidebar footer above Privacy Policy / Report an Issue / version, with a 16px HealWare mark, expanded only. `showAttribution` prop removed. The Force Password Change page gets the MCA seal through `BrandLogo`.
- Favicon unchanged (still `/Healware_Logo.png`).
- `cliniq-sidebar-patterns` edited (old: HealWare mark matching the favicon, attribution as the header's third line → new: MCA seal, bigger, attribution in the footer; favicon stays HealWare).
Reason: User request; the sidebar header looked crowded.
Testing Performed: `npx tsc -b` clean; `vitest run src/features/auth src/layouts src/routes/AppRoutes.test.tsx` 61/61 pass. `src/routes/BackNavigation.test.tsx` has 2 failures that also fail on clean `main` (unrelated, pre-existing).
Known Issues: None new. No live browser check done.
Next Steps: Eyeball the sidebar and login in a browser; tell the agent if the seal size or footer line placement needs tuning.
