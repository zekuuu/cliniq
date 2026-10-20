# Use-Case Diagram

**Status: first draft, built from already-documented requirements.** Actors and access levels come directly from the Access Summary table already established in Modules & Features — nothing here grants or denies access differently than what's already decided. Represented as both a visual overview (Mermaid) and a detailed table (Mermaid's UML use-case notation support is too limited for a system this size to be genuinely readable as a diagram — a table communicates the same facts more clearly for ~50+ individual use cases across 2 roles).

## Visual Overview

```mermaid
flowchart LR
    STAFF(["👤 Staff"])
    ADMIN(["👤 Admin/Principal"])

    subgraph System["CLINIQ"]
        UC1(["Manage User Accounts"])
        UC2(["Manage Student Records"])
        UC3(["Log Clinic Visits"])
        UC4(["Log Emergencies<br/>(two-stage)"])
        UC5(["Generate Reports"])
        UC7(["View Smart Triage<br/>Checklist"])
        UC8(["Manage Inventory"])
        UC9(["View Clinic<br/>Overview Dashboard"])
        UC10(["Verify Backups"])
        UC11(["Handle Follow-Ups"])
        UC12(["View Own Profile,<br/>Change Password"])
    end

    STAFF --> UC2 & UC3 & UC4 & UC5 & UC7 & UC8 & UC9 & UC10 & UC11
    ADMIN --> UC1 & UC5 & UC9 & UC12
```

## Detailed Use Cases by Role

### 👤 Staff (Nurse / Clinic Assistant) — Full access across every module

| Use Case | Module |
|---|---|
| Log in / log out | User Management |
| Add/edit/archive student records | Student Records |
| Resolve incomplete-record queue entries | Student Records |
| Log a clinic visit, with Smart Triage checklist | Clinic Visit Monitoring |
| Generate/approve excuse letters | Clinic Visit Monitoring |
| Log PE/Sports injury referrals | Clinic Visit Monitoring |
| Record an emergency incident (Stage 1: fast-capture) | Emergency Response |
| Complete an incident record (Stage 2) | Emergency Response |
| Log hospital referral details | Emergency Response |
| Log parent notification attempts and outcomes | Emergency Response |
| Prompt and record a Follow-Up (from a visit or incident) | Clinic Visit Monitoring / Emergency Response |
| Resolve a Follow-Up's status | Clinic Visit Monitoring / Emergency Response |
| Generate monthly/incident/health-summary reports | Reports Generation |
| Dispense/restock inventory items | Inventory Tracker |
| Manage inventory item thresholds and expiration dates | Inventory Tracker |
| View Clinic Overview Dashboard | Clinic Overview Dashboard |
| Check/verify backup status | Backup Verification Assistant |

### 👤 Admin/Principal — Reports, Dashboard and accounts

| Use Case | Module |
|---|---|
| Log in / log out, change own password | User Management |
| Manage user accounts (add, edit, disable, enable, reset password; never the last active Admin) | User Management |
| View and print monthly/incident/health-summary reports | Reports Generation |
| View Clinic Overview Dashboard | Clinic Overview Dashboard |

PE/Sports Instructors are not actors: they have no account (ADR-029). An instructor asks the clinician, who decides what to share.

## Notes

- Every use case above, regardless of role, implicitly includes "gets logged to the audit trail" — not listed as a separate use case per row, since it's a cross-cutting requirement applying to all of them uniformly (Modules & Features, "Audit Trail" section).
- Future-development roles (Canteen Staff) are deliberately excluded from this diagram — it reflects current, built scope only. See `08-Logs/Issues-and-TODOs.md` for what that role would add if undeferred.
