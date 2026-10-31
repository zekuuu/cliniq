# Rows per page options and the widget link underline

Date/Day/Time: Saturday, October 31, 2026 — 11:30 PHT
Agent: Claude Code (Opus 5.5)
Task: Add more rows-per-page choices, and carry the Dashboard widget link's hover underline under its icon.
Status: Completed
Prompt/Request: Zean: "add more appropriate, then also in dashboard widget hyperlink, when hovering the icons should also have underline".
Files Modified: `frontend/src/hooks/usePageSize.ts`, `hooks/README.md`, `components/ui/Pagination.tsx`, `components/ui/TitleLink.tsx`, `features/inventory/BrandAndPaging.test.tsx`, `Module-Overview.md`, `Screen-Inventory.md`, `Skills-Setup.md`, `cliniq-pagination-patterns` skill, `cliniq-interactive-states` skill, Changelog
Changes Made: Rows per page is now 10, 20, 50 or 100; the default stays 10. In `TitleLink`, the underline now continues beneath the open-link icon, because a no-break space in the icon wrapper's `::after` carries it (CSS, so the link text stays exact). `ListItemLink` is unchanged: its underline is at rest and its chevron sits outside it.
Reason: Sir Rey's original request named 10 and 20. Zean asked for more options. An SVG takes no text underline, so the icon looked left out on hover.
Testing Performed: Hover state viewed in Chromium at 3x on the Dashboard: the underline runs under the icon. `BrandAndPaging.test.tsx`, `src/components` and `src/features/dashboard` pass, typecheck clean, build passes.
Known Issues: `CLINIQ_Modules_and_Features.md` line 331 and `CLINIQ_Frontend_Context_Brief.md` lines 64 and 71 still say 10 or 20. Canonical documents were not edited.
Next Steps: Update those canonical lines.
