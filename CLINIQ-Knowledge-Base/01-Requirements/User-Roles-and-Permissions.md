# User Roles and Permissions

| Role | Access |
|---|---|
| **Staff** (nurse/clinic assistant) | Full read/write — students, visits, incidents, inventory, reports, accounts |
| **Admin/Principal** | Read-only — reports, Clinic Overview Dashboard. No edit access anywhere |
| **PE/Sports Instructor** | No account and no access (ADR-029). An instructor asks the clinician, who decides what to share |

**Deferred role (designed, not built):** Canteen Staff — a scoped sign-in with a narrow data scope (food allergies only). See `08-Logs/Issues-and-TODOs.md`.

## Display-Privacy Rule
A screen showing **multiple students at once** (Visit Log List, Incident Log List, the Dashboard's frequent-visitor section) shows the **Student Number**, not the name — these are the screens a bystander could glance at. A screen showing **one deliberately-identified student** (full profile, search results, the masterlist) shows the **full name** normally. See `06-Decisions/` for the correction history on this rule — it was originally scoped backwards and fixed once.

Full detail: Frontend Context Brief, Section 3.
