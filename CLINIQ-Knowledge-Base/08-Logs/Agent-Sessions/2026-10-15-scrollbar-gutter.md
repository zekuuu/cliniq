Date/Day/Time: Thursday, October 15, 2026 — 19:18 PHT
Agent: Claude Code (Opus 5.5)
Task: Stop the UI from shifting when a page becomes scrollable
Status: Completed
Prompt/Request: "Is it possible to integrate the scrollbar in the actual UI on the right, not outside the UI, because when the page turns to scrollable the whole UI moves a bit and it's a bit annoying"
Files Modified: frontend/src/index.css
Changes Made: Added `scrollbar-gutter: stable;` to the base `html` rule. The browser always reserves the scrollbar lane, so layout width no longer changes when the scrollbar appears.
Reason: The window is the scroll container (AppShell is `min-h-screen`). Before this change, the scrollbar appearing narrowed the viewport by about 15px and shifted every element.
Testing Performed: CSS only. Frontend test suite: 74 files, 494 tests passed.
Known Issues: Short pages now show an empty lane, about 15px wide, on the right. An overlay or custom-styled scrollbar was not added.
Next Steps: None, unless the team wants the scrollbar lane styled.
