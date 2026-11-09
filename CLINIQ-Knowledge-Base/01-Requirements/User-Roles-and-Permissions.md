# User Roles and Permissions

| Role | Access |
|---|---|
| **Staff** (School Clinician in the app; nurse/clinic assistant) | Full read/write — students, staff patients (ADR-043), visits, incidents, inventory, reports, backup; own account only. Session: signed out after `idleSignoutMinutesStaff` idle minutes (default 60, ADR-078), and at the latest 7 days after signing in; edits both idle settings on the Settings page. Each covering person has their own Staff account (ADR-078) |
| **Admin/Principal** | No Staff patient screens, and staff patients' incidents are left out of the Incident Log (ADR-043). Read-only — reports (since ADR-077: a Report month drop-down and the four monthly reports, each opened as a view-only on-screen sheet with masked LRNs; no Sports Report, tabs, charts or print), Clinic Overview Dashboard, audit log, and the Student List, Student Profile, Incident Log and Incident Report (ADR-038; opening a profile or report is audit-logged once per session, for Staff too, ADR-048). Can manage calendar events (ADR-042). Signs in on the clinic PC only (ADR-079); the Principal also receives the Monthly Report as a PDF from the clinician. Session: signed out after `idleSignoutMinutesAdmin` idle minutes (default 30, ADR-048 and ADR-078), and at the latest 7 days after signing in; reads the Settings page. No printing or Save as PDF anywhere (ADR-038). Manages every account (ADR-033). Backup with the same abilities as Staff: status, history, Back up now, mark verified (ADR-037); no other edit access |
| **PE/Sports Instructor** | No account and no access (ADR-029). An instructor asks the clinician, who decides what to share |

**Own account (ADR-066):** every role changes its own display name, profile picture and password from the account menu in the header; the username and role stay with the Admin.

**Deferred role (designed, not built):** Canteen Staff — a scoped sign-in with a narrow data scope (food allergies only). See `08-Logs/Frontend-Issues-and-TODOs.md`.

## Display-Privacy Rule
A screen showing **multiple students at once** (Visit Log List, Incident Log List, the Dashboard's frequent-visitor section) shows the **masked LRN**, not the name — these are the screens a bystander could glance at. A screen showing **one deliberately-identified student** (full profile, search results, the masterlist) shows the **full name** normally. See `06-Decisions/` for the correction history on this rule — it was originally scoped backwards and fixed once. The Sports Report (Staff only) is a decided exception: it lists students by full name for the PE/Sports Instructor who receives it (ADR-034). The Monthly Report printouts print the full LRN, still with no names; the screens stay masked (ADR-044). A printout about one student shows the full LRN (ADR-040).

Full detail: Frontend Context Brief, Section 3.

**Staff patients (ADR-043):** lists show a staff member's **Staff No.** (`STF-0001`) where a student's masked LRN would be, never the name; the Staff Profile, Visit Details and Incident Report show the name.

**Audit Log and staff records (ADR-038, ADR-043; added Saturday, November 07, 2026 — 16:23 PHT, backend counter-check C-8):** the Admin's Audit Log lists entries about staff records by **Staff No. only**, never the name, and the Admin cannot open the record from there.

**Consultation build (Saturday, November 07, 2026 — 06:37 PHT; ADR-072, ADR-073):** every role (Staff and Admin) can set up an authenticator app from the account menu and use it on Login's "Forgot password?"; the Admin's reset of a Staff password stays the fallback, and the Admin should set one up because nobody else can reset the Admin. The **Archive** page is open to Staff and the Admin, read-only for both; the Admin gets no Staff tab (ADR-043). Only Staff change the school year's dates and end or start a school year (ADR-075; the Admin reads the card and gets no button or Dashboard reminder). There is no Clinic Overview printout any more (ADR-074).
