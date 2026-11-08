Date/Day/Time: Monday, November 02, 2026 — 06:22 PHT
Agent: Claude Opus 5.5 (Claude Code)
Task: Colour on the card, and whole-card hover
Status: Completed. Not committed.
Prompt/Request: "We want the color on the card not hyperlinked text", then "then audit the icon and underlined texts, because it seems like only the texts is the clickable".
Files Modified: `StatCard.tsx`, `StatCardRow.tsx`, `TitleLink.tsx` (comment), `DashboardPage.test.tsx`, `review-round-2.test.tsx`, ADR-062 (note), `Design-System.md`, `Frontend-Changelog.md`.
Changes Made: Replaced the white strip with separate cards on the meaning's fill. Label and figure are `text-primary`. StatCard uses a plain `Link` instead of `TitleLink`, so the link icon is gone. Audit: the whole card was already clickable, but the icon and underline marked only the words. Removed the underline; hover now lifts the shadow and darkens the card by 5%.
Reason: Coloured labels looked like hyperlinks, and text-only cues hid that the card is the target.
Testing Performed: Tests updated first and failed, then passed. Typecheck 0, lint 0, Vitest exit 0 on the final run, build 0. Not viewed in a browser. Three tests failed once in an earlier full run (staff-counts, PeSportsReferralPage) and passed alone.
Known Issues: Touch screens have no hover, so nothing marks a card as a link there. List card titles keep their link icon on purpose: only the title is the link.
Next Steps: None.
