Date/Day/Time: Monday, November 02, 2026 — 05:48 PHT
Agent: Claude Opus 5.5 (Claude Code)
Task: Restore the Login backdrop photo
Status: Completed. Not committed.
Prompt/Request: "No do not increase the blur, leave as is".
Files Modified: `LoginBackdrop.tsx` (back to the committed version), `Design-System.md`, `Changelog.md`.
Changes Made: Reverted the 8px blur and the heavier tint from [the earlier change](2026-11-02-login-panel-third-calmer-photo.md). The photo is 3px blur with the 75/35/20% tint again. The one-third panel stays.
Reason: Zean does not want more blur. The tint was reverted too, since it was part of the same change and "leave as is" covers the photo.
Testing Performed: Vitest run on the auth tests.
Known Issues: None.
Next Steps: None.
