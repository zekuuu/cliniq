Date/Day/Time: Wednesday, October 14, 2026 — 23:16
Agent: Claude Code (claude-opus-5-5)
Task: Add Back controls to every screen and situation that needs one
Status: Completed (verification complete; two navigation oddities and three pre-existing defects logged, not fixed)
Prompt/Request: Zean pasted a prompt titled "Add Back buttons to every screen and situation that needs one", written against `origin/main` at `f744499`. It asked for: CLAUDE.md Step 0 (fetch, read every branch, base on `origin/fix/open-fix-and-ui-decide` if unmerged, no merge/delete/commit/push); merge into live progress files; Frontend-Loop-Engineering Phase 0 once; real timestamps; display privacy; no Microsoft Edge (Playwright/Chromium, artifacts outside the repo). Design: one shared Back component in `components/ui/` with tests, reusing `buttonClassName` and the icon set, no new dependency; history back with a required fallback, sharing `useCancelNavigation`'s logic; plain "Back" unless the target is fixed, label in name, no student names; a role-aware fallback with a test for every role and screen; no Back loops after saves (fix with `replace`, test New Visit, Edit Student, Add Student, Add Inventory Item, Stage 1 → Stage 2, Excuse Letter); Back = Cancel on forms including any unsaved-changes question. Placement top-left above the header card, quiet style, 44px on phones, focus/hover per `cliniq-interactive-states`, `print:hidden`, prominent on shell-free screens, shown while loading. Coverage: child/detail/form/flow screens, shell-free non-root screens, dead ends, a drill-through rule for top-level lists, in-page drill-ins; none on Login or top-level sidebar screens; keep and restyle the two existing Back links without changing what they do. Deliverables: coverage table, a route-coverage test with an allowlist, unit/role/no-loop/parity/loading/keyboard tests, verification (typecheck, build, lint, full tests before/after, format check, Chromium screenshots viewed at 375/390/768/1280, scrollWidth, axe, role walks, print preview), a new skill, Design System entry, ADR, Issues-and-TODOs entries with the glance block recomputed by script, this log, and a Changelog row.
Files Modified:
- New: `frontend/src/components/ui/BackButton.tsx`, `frontend/src/components/ui/BackButton.test.tsx`, `frontend/src/hooks/useGoBack.ts`, `frontend/src/routes/BackNavigation.test.tsx`, `frontend/src/features/back-navigation.test.tsx`, `.claude/skills/cliniq-back-navigation-patterns/SKILL.md`, `CLINIQ-Knowledge-Base/06-Decisions/ADR-024-Back-Navigation.md`, this log.
- Shared: `frontend/src/components/index.ts`, `components/ui/TitleLink.tsx`, `components/ui/ListItemLink.tsx`, `hooks/useCancelNavigation.tsx`, `hooks/README.md`, `routes/paths.ts` (`homePathFor` moved here), `routes/AppRoutes.tsx`, `routes/NotFoundPage.tsx`, `routes/README.md`.
- Screens: `student-records/` StudentProfilePage, StudentFormPage, IncompleteRecordsQueuePage, StudentListPage; `clinic-visits/` NewVisitEntryPage, PeSportsReferralPage, VisitDetailPage, ExcuseLetterPage, VisitLogListPage; `emergency-response/` IncidentEntryPage, ParentNotificationPage, IncidentReportPage, EmergencyMobilePage, IncidentLogListPage, FollowUpListPage; `inventory/` InventoryFormPage, InventoryDispensePage, InventoryListPage; `qr-digital-health-id/` desktop/QrPrintPage, mobile/QrMobileHubPage; `user-management/UserFormPage`; `legal/PrivacyPolicyPage`; `auth/ForcePasswordChangePage`; `dashboard/components/DayEventsPanel`.
- Tests updated (render inside a router, or assert Back while loading; nothing removed or weakened): ExcuseLetterLoading, ExcuseLetterPage, VisitDetailLoading, NewVisitEntryLoading, PeSportsReferralLoading, FollowUpListPage, IncidentEntryLoading, IncidentReportPage, ParentNotificationPage, PrivacyPolicyPage, IncompleteRecordsQueueLoading, IncompleteRecordsQueuePage, StudentFormLoading, StudentListLoading, StudentListPage, StudentProfileLoading.
- Docs: `03-Design/Design-System.md` (Navigation), `04-Development/Skills-Setup.md`, `.claude/skills/cliniq-interactive-states/SKILL.md` (one line), `06-Decisions/Decisions-Summary.md`, `08-Logs/Issues-and-TODOs.md`, `08-Logs/Changelog.md`.
Changes Made:
- Base: `fix/open-fix-and-ui-decide` at `9fa2ec5` (the local branch equals `origin/fix/open-fix-and-ui-decide`; 6 commits ahead of `origin/main` `f744499`, not merged). `origin/feature/clinic-overview-dashboard` and `origin/fix/issues-todos-sweep` are already in `main`. Highest ADR on any branch: 023 (this branch), so this is ADR-024.
- `BackButton`: three targets (history with `fallback`; a form's `onBack` = its Cancel; fixed `to` + `label` "Back to …"), `quiet` (text + chevronLeft, `text-secondary` → `brand-green-dark` + underline on hover, 44px below `sm`, 36px above) and `prominent` (neutral outlined button, 44px) styles, `drillThroughOnly`, always `print:hidden`. No aria-label: the visible text is the name. `chevronLeft` reused; no new icon or dependency.
- `useGoBack(fallback)` holds the history-or-fallback logic; `useCancelNavigation` now calls it (behaviour unchanged). `DRILL_THROUGH_STATE` is passed by `TitleLink`, `ListItemLink`, and the calendar's "View visits".
- Loop fix: New Visit's post-save "Review excuse letter" link uses `replace`. Edit Student already navigated with `replace`; the other listed flows stay on their screen after saving, so they had no loop (tests prove all six).
- In loading skeletons Back sits outside the `aria-hidden` placeholders so it stays reachable.
Reason: Users could get stuck on detail pages, forms, dead ends, and shell-free phone screens with only the browser's Back (ADR-024).

Decisions:
- Label rule: plain "Back" for history; "Back to <screen>" only for the two fixed links (kept as they were: "Back to Sign In", "Back to QR lookup").
- Drill-through rule: a top-level list shows Back only when a drill-through link opened it (router state `{ drillThrough: true }` from `TitleLink`, `ListItemLink`, or the calendar's "View visits"); fallback Dashboard. From the sidebar, a shortcut, or a URL it shows none.
- In-page drill-ins: Visit Details in edit mode → Back runs the in-page Cancel (back to the read view). The calendar day panel and its event form are a `Modal` with Close/Cancel; the QR result appears below a scanner that stays on screen; Reports' views are tabs. None of these needed a Back.
- Role-aware fallbacks: Student Profile → Student List (Staff) / QR Lookup (Instructor); Privacy Policy and Not Found → `homePathFor(role)`; QR Lookup → Dashboard (Staff only; the Instructor's home, no Back, Log out stays). The Instructor's profile and privacy page use the prominent style (no menu there).
- "Staff access required" branches (second-layer role checks the route guard makes unreachable) got no Back: any fallback there would be a screen that role cannot open.
- Force Password Change: "Back to Sign In" moved from the button row to the top of the card on the shared component; still a plain navigation to `/login`.

Coverage table (every route in `routes/AppRoutes.tsx` per role, plus dead-end and in-page states):

| Screen / state | Roles | Back? | Target (fallback) | Why not | Test |
|---|---|---|---|---|---|
| `/` Dashboard | staff, admin | no | — | Home screen | BackNavigation `staff /`, `admin /` (allowlist) |
| `/students` Student List | staff | after drill-through | history (Dashboard) | Top-level sidebar screen | BackNavigation allowlist; BackButton "drill-through" |
| `/students/new` Add Student | staff | yes | Cancel (Student List) | — | BackNavigation `staff /students/new`; back-navigation "Add Student" |
| `/students/incomplete` Incomplete Records | staff | yes | history (Student List) | — | BackNavigation |
| `/students/:studentNumber` Student Profile | staff | yes | history (Student List) | — | BackNavigation |
| `/students/:studentNumber` Student Profile | instructor | yes, prominent | history (QR Lookup) | — | BackNavigation `instructor /students/:studentNumber`; "never the Student List" |
| `/students/:studentNumber/edit` Edit Student | staff | yes | Cancel (Student Profile) | — | BackNavigation; back-navigation "Edit Student" |
| `/visits` Visit Log | staff | after drill-through | history (Dashboard) | Top-level sidebar screen | BackNavigation "stat card" test |
| `/visits/new` New Visit | staff | yes | Cancel (Visit Log) | — | BackNavigation; back-navigation "New Visit", parity |
| `/visits/pe-referral` PE/Sports Referral | staff | yes | Cancel (Visit Log) | — | BackNavigation |
| `/visits/:visitId` Visit Details | staff | yes | history (Visit Log); edit mode: in-page Cancel | — | BackNavigation |
| `/visits/:visitId/excuse-letter` Excuse Letter | staff | yes | history (Visit Details) | — | BackNavigation; back-navigation "Excuse Letter" |
| `/incidents` Incident Log | staff | after drill-through | history (Dashboard) | Top-level sidebar screen | BackNavigation allowlist |
| `/incidents/new` Report Incident | staff | yes | Cancel (Incident Log) | — | BackNavigation; back-navigation "Incident" |
| `/incidents/:incidentId/complete` Complete Incident | staff | yes | Cancel (Incident Log) | — | BackNavigation |
| `/incidents/notifications`, `/incidents/:incidentId/notifications` Parent Notification Log | staff | yes | history (Incident Log) | — | BackNavigation (both) |
| `/incidents/report`, `/incidents/:incidentId/report` Incident Report | staff | yes | history (Incident Log) | — | BackNavigation (both) |
| `/inventory` Inventory | staff | after drill-through | history (Dashboard) | Top-level sidebar screen | BackNavigation allowlist |
| `/inventory/new` Add Inventory Item | staff | yes | Cancel (Inventory) | — | BackNavigation; back-navigation "Add Inventory Item", parity |
| `/inventory/dispense` Dispense | staff | yes | Cancel (Inventory) | — | BackNavigation |
| `/follow-ups` Follow-Ups | staff | after drill-through | history (Dashboard) | Top-level sidebar screen | BackNavigation allowlist |
| `/qr/scan` QR Lookup | staff | yes, prominent | history (Dashboard) | — | BackNavigation `staff /qr/scan` |
| `/qr/scan` QR Lookup | instructor | no | — | Instructor home; Log out stays | BackNavigation allowlist |
| `/qr/print` Print QR Health IDs | staff | yes | history (Student List) | — | BackNavigation |
| `/emergency/mobile` Emergency Response | staff | yes, prominent | fixed "Back to QR lookup" | — | BackNavigation |
| `/reports` Reports | staff, admin | no | — | Top-level sidebar screen | BackNavigation allowlist |
| `/audit-log` Audit Log | staff, admin | no | — | Top-level sidebar screen | BackNavigation allowlist |
| `/privacy-policy` Privacy Policy | staff, admin, instructor | yes (prominent for instructor) | history (role home) | — | BackNavigation (three roles) |
| `/users` User Accounts | staff | no | — | Top-level sidebar screen | BackNavigation allowlist |
| `/users/new` Add User | staff | yes | Cancel (User Accounts) | — | BackNavigation; parity "User form" |
| `/users/:userId/edit` Edit User | staff | yes | Cancel (User Accounts) | — | BackNavigation |
| `/backup` Backup | staff | no | — | Top-level sidebar screen | BackNavigation allowlist |
| `/login` Sign In | signed out | no | — | Entry screen | — |
| `/force-password-change` | pending account | yes | fixed "Back to Sign In" | — | Chromium check (screenshot fpc-*) |
| `*` Not Found | all | yes (+ "Go to Home Screen") | history (role home) | — | BackNavigation "an unknown address" (Staff, Instructor) |
| Load error / record not found (every page with `ErrorState` + Retry) | staff (instructor on profile) | yes | page's fallback | — | BackNavigation dead ends: student, visit, incident |
| Empty dead ends: "No incident report is pending sign-off", "No incident selected", "No inventory items available", "No active students" | staff | yes | page's fallback | — | covered by the same page branch (source check) |
| Loading skeleton (every child screen) | as route | yes | page's fallback | — | 8 `*Loading.test.tsx` assert Back |
| "Staff access required" branches | — | no | — | Unreachable (route guard redirects first); any fallback would be a Staff screen | — |
| Visit Details edit mode (in-page) | staff | yes | in-page Cancel | — | form-cancel "Visit Detail" (Cancel), same handler |
| Calendar day panel / event form (in-page) | staff, admin | no | — | `Modal` with Close / Cancel already | — |
| QR result after a scan (in-page) | staff, instructor | no | — | Scanner stays on screen above the result | — |
| Reports views, Health Summary chart/table (in-page) | staff, admin | no | — | Tabs (segmented controls), not drill-ins | — |

Summary: 32 routes (39 route/role pairs). 25 pairs always show Back, 5 Staff lists show it after a drill-through, 9 pairs have none (home screens and top-level sidebar screens), plus Login (none), Force Password Change and Not Found (Back). Every load-error, record-not-found, empty dead-end, and loading state on a child screen has Back.

Testing Performed:
- Before: `npx vitest run` 69 files / 412 passed. After: `npm test` 72 files / 477 passed. No test deleted, skipped, or weakened; no `eslint-disable` or `@ts-ignore`. A deliberate mutation (Instructor profile fallback → `/students`) made the role test fail; removing New Visit's `replace` made the New Visit loop test fail; both restored.
- `npm run typecheck`: clean. `npm run build`: built. `npm run lint`: 0 errors, 2 warnings (pre-existing `react-refresh/only-export-components` in FollowUpPrompt.tsx and ReportIssueModal.tsx).
- `prettier --check` on the five new files: clean. The edited existing files were already failing `format:check` before this work (198 files in `src` differ from Prettier), so they were not reformatted.
- Chromium (Playwright 1.60 with the cached Chromium 1228 headless shell, local Vite on port 5199, scripts and screenshots in the session scratchpad, not the repo): 29 screen/role pairs × 375/390/768/1280. `scrollWidth` equal to the viewport width on every one (no overflow). Back 44px tall at 375/390 everywhere, 36px (quiet) or 44px (prominent) at 768/1280, before the `h1` in DOM order, not rendered under print media. axe (wcag2a/aa, wcag21aa, best-practice): none, except Add Inventory Item `color-contrast` (DatePicker placeholder, pre-existing) and `/students/1999-99999` `page-has-heading-one` (error states have no h1, pre-existing); both logged as FIX.
- Looked at: form (Add Student 375/1280), detail (Student Profile 768), flow step (Complete Incident 1280), shell-free (QR Lookup 390, Emergency 375, Instructor profile 390), Not Found 1280, long title (Parent Notification Log 375), Force Password Change 390. The quiet Back sits flush with the card's left edge, 16px above it, lighter than the h1 and the green primary buttons; it reads as navigation, not an action. On QR Lookup, Emergency, and the Instructor's profile the outlined Back is the obvious way out without competing with the orange Emergency button. Consistent position on every screen.
- Role walks in Chromium: Staff sidebar → Students → profile → Edit → Save Changes → Back stayed on the profile once (see Known Issues) and never reopened the edit form; direct `/visits/visit-0157` → Back → `/visits`; Dashboard "Clinic visits" → Visit Log → Back → Dashboard. Staff phone: QR demo scan → Record Visit / Dispense Medicine / View Full Profile / PE/Sports Referral / Log Emergency / Emergency → Back → `/qr/scan` each time; Emergency "Back to QR lookup" → `/qr/scan`. Admin: Privacy (sidebar) → Back → `/`; direct Privacy and Not Found → `/`; no Staff screen visited. Instructor: direct profile → Back → `/qr/scan`; QR Lookup has no Back and has Log out; direct Privacy and Not Found → `/qr/scan`; no Staff screen visited.
- Print: Student Profile and Excuse Letter under print media: Back not rendered (screenshots viewed; the PDF viewer was unavailable, so print-media screenshots were used instead of PDFs).
Known Issues:
- After Edit Student saves, the first Back shows the same profile again (duplicate history entry); not a loop to the form. Logged FIX.
- "Back to QR lookup" pushes a history entry, so QR Lookup's history Back returns to Emergency Response. Not changed (the request said to keep what the existing links do). Logged DECIDE.
- "Back to Sign In" leaves the pending password-change marker set (pre-existing auth/session oddity). Logged FIX, not changed.
- The route-level lazy-chunk skeleton has no Back. Logged LATER.
- `components/README.md` lists no components, so it got no entry.
Next Steps: Team review of ADR-024; sync the Frontend Design Reference (DOC entry); Phase 2 audit of the screens in the new AUDIT entry.
