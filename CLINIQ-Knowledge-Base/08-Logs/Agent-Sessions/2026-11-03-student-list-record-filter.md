Date/Day/Time: Tuesday, November 03, 2026 — 18:42 PHT
Agent: Claude Code (Opus 5.5)
Task: Make incomplete records findable from the Student List, not only from the Dashboard
Status: Completed
Prompt/Request: Review feedback "Lagyan din ng way para makita ung incomplete records para hindi lang sa dashboard ung way para madirect don." Zean: "meaning adding another filter, not just another page. so meaning in dashboard it will use the url parameter instead of redirecting to students/incomplete."
Files Modified:
- frontend/src/features/student-records/StudentListPage.tsx
- frontend/src/features/student-records/api/studentListApi.ts
- frontend/src/lib/mock-db/api.ts
- frontend/src/routes/paths.ts
- frontend/src/features/dashboard/components/AttentionChips.tsx
- frontend/src/features/student-records/StudentListPage.test.tsx
- frontend/src/features/dashboard/DashboardPage.test.tsx
- URL-Parameters.md
Changes Made:
- Student List: new "Record status" select (All records / Complete / Incomplete) beside Grade level, on the shared Select. Filtering is done in `listStudents` (`recordStatus`), so it applies before the 80-row limit.
- New URL parameter `?record=complete|incomplete`, read only on arrival (same pattern as the Visit Log's `?letter=pending`). `paths.studentsIncomplete` builds it.
- Dashboard incomplete-records chip now links to `/students?record=incomplete` instead of `/students/incomplete`. The count matches: both are active (non-archived) students with missing required fields.
Reason: Incomplete records were only reachable through the Dashboard chip.
Testing Performed: Full Vitest suite 965/965 pass; `tsc -b` and ESLint clean. New test opens the list at `?record=incomplete` and checks only Incomplete rows show.
Known Issues: The Incomplete Records queue (`/students/incomplete`, Screen #9) is kept and still routed, but nothing in the app links to it now. Decide whether to remove it or link it from the Student List.
Next Steps: Confirm the queue's fate with Zean.
