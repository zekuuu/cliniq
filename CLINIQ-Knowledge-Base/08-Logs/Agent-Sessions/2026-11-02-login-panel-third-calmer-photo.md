Date/Day/Time: Monday, November 02, 2026 — 05:48 PHT
Agent: Claude Opus 5.5 (Claude Code)
Task: Wider Login panel and a calmer photo
Status: Completed. Not committed.
Prompt/Request: "Then make the white screen like one third of the screen so it wont look small and the picture a bit of distracting".
Files Modified: `LoginPage.tsx`, `LoginBackdrop.tsx`, `Design-System.md`, `Changelog.md`.
Changes Made: From 1024px the white panel is one third of the screen with a 28rem minimum; 768px to 1023px stays 26rem. The inner column went from 20rem to 24rem. The photo went from 3px to 8px blur, and its green tint from 75/35/20% to 85/60/45%.
Reason: The panel looked small and the photo drew the eye away from the form.
Testing Performed: Typecheck 0, lint 0, Vitest exit 0. Layout and colour changes only, so no new test.
Known Issues: Not viewed in a browser. Force Password Change shares the backdrop, so its photo changed too. The building is harder to recognise now.
Next Steps: None.
