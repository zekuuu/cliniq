# User Roles and Permissions

| Role | Access |
|---|---|
| **Staff** (nurse/clinic assistant) | Full read/write — students, staff patients (ADR-043), visits, incidents, inventory, reports, backup; own account only |
| **Admin/Principal** | No Staff patient screens, and staff patients' incidents are left out of the Incident Log (ADR-043). Read-only — reports, Clinic Overview Dashboard, audit log, and the Student List, Student Profile, Incident Log and Incident Report (ADR-038; opening a profile or report is audit-logged once per session). No printing or Save as PDF anywhere (ADR-038). Manages every account (ADR-033). Backup with the same abilities as Staff: status, history, Back up now, mark verified (ADR-037); no other edit access |
| **PE/Sports Instructor** | No account and no access (ADR-029). An instructor asks the clinician, who decides what to share |

**Deferred role (designed, not built):** Canteen Staff — a scoped sign-in with a narrow data scope (food allergies only). See `08-Logs/Issues-and-TODOs.md`.

## Display-Privacy Rule
A screen showing **multiple students at once** (Visit Log List, Incident Log List, the Dashboard's frequent-visitor section) shows the **masked LRN**, not the name — these are the screens a bystander could glance at. A screen showing **one deliberately-identified student** (full profile, search results, the masterlist) shows the **full name** normally. See `06-Decisions/` for the correction history on this rule — it was originally scoped backwards and fixed once. The Sports Report (Staff only) is a decided exception: it lists students by full name for the PE/Sports Instructor who receives it (ADR-034).

Full detail: Frontend Context Brief, Section 3.

**Staff patients (ADR-043):** lists show a staff member's **Staff No.** (`STF-0001`) where a student's masked LRN would be, never the name; the Staff Profile, Visit Details and Incident Report show the name.
