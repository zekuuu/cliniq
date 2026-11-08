Date/Day/Time: Monday, November 02, 2026 — 15:32 PHT
Agent: Claude Opus 5.5 (Claude Code)
Task: Use the sidebar logo as the browser favicon
Status: Completed. Not committed.
Prompt/Request: Zean: "apply the same logo to favicon"
Files Modified: `frontend/index.html`, `.claude/skills/cliniq-sidebar-patterns/SKILL.md`, `04-Development/Skills-Setup.md`, `08-Logs/Frontend-Changelog.md`.
Changes Made: The favicon link points to `/MCA_Logo.png`, the seal the sidebar shows, instead of `/Healware_Logo.png`. The skill's Brand lockup rule said the favicon stays the HealWare mark; it now says the favicon is the MCA seal too (old: `/Healware_Logo.png`, new: `/MCA_Logo.png`). The skill's row in `Skills-Setup.md` was also stale (it still named the HealWare system mark) and now names the MCA seal and favicon.
Reason: Zean asked for the tab icon to match the logo. The HealWare mark stays in the sidebar attribution, the login page and the footer.
Testing Performed: Checked the edited `index.html` line. No test references the favicon. `public/favicon.svg` exists but is not linked anywhere; it was left alone.
Known Issues: Browsers cache favicons, so the old icon may show until a hard refresh.
Next Steps: None.
