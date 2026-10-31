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
        UC7(["View First-aid<br/>Checklist"])
        UC8(["Manage Inventory"])
        UC9(["View Clinic<br/>Overview Dashboard"])
        UC10(["Verify Backups"])
        UC11(["Handle Follow-Ups"])
        UC12(["Change Password<br/>(when required)"])
        UC13(["Manage Staff Patients"])
        UC14(["Keep Calendar Events"])
        UC15(["View Audit Log"])
        UC16(["Acknowledge<br/>Incident Report"])
    end

    STAFF --> UC2 & UC3 & UC4 & UC5 & UC7 & UC8 & UC9 & UC10 & UC11 & UC12 & UC13 & UC14 & UC15
    ADMIN --> UC1 & UC5 & UC9 & UC10 & UC12 & UC14 & UC15 & UC16
```

## Detailed Use Cases by Role

### 👤 Staff (Nurse / Clinic Assistant) — Full access across every module

| Use Case | Module |
|---|---|
| Log in / log out | User Management |
| Add/edit/archive student records | Student Records |
| Resolve incomplete-record queue entries | Student Records |
| Add/edit/archive staff patients (ADR-043) | Staff Patients |
| Log a clinic visit, with the first-aid checklist | Clinic Visit Monitoring |
| Generate/approve excuse letters | Clinic Visit Monitoring |
| Log PE/Sports injury referrals | Clinic Visit Monitoring |
| Record an emergency incident (Stage 1: fast-capture) | Emergency Response |
| Complete an incident record (Stage 2) | Emergency Response |
| Log hospital referral details | Emergency Response |
| Log parent notification attempts and outcomes | Emergency Response |
| Prompt and record a Follow-Up (from a visit or incident) | Clinic Visit Monitoring / Emergency Response |
| Resolve a Follow-Up's status | Clinic Visit Monitoring / Emergency Response |
| Generate and print monthly/incident/complaint-summary reports and the inventory sheet | Reports Generation |
| Build and print Sports Reports (ADR-034) | Reports Generation |
| Dispense/restock inventory items | Inventory Tracker |
| Manage inventory item thresholds and expiration dates | Inventory Tracker |
| View Clinic Overview Dashboard, keep calendar events | Clinic Overview Dashboard |
| Check/verify backup status, back up now, manage backup locations (ADR-052) | Backup Verification Assistant |
| View and print the audit log | Audit Log Viewer |

### 👤 Admin/Principal — Reports, Dashboard, accounts and read-only records

| Use Case | Module |
|---|---|
| Log in / log out, change a password when required at sign-in | User Management |
| Manage user accounts (add, edit, disable, enable, reset password; never the last active Admin) | User Management |
| View monthly/complaint-summary reports and the inventory sheet, never print (ADR-038) | Reports Generation |
| Read the Student List and Student Profile (ADR-038) | Student Records |
| Read the Incident Log and Incident Report; Acknowledge an approved report (ADR-038, ADR-048) | Emergency Response |
| View Clinic Overview Dashboard, keep calendar events (ADR-042) | Clinic Overview Dashboard |
| Check/verify backup status, back up now (ADR-037) | Backup Verification Assistant |
| View the audit log, never print (ADR-038) | Audit Log Viewer |

PE/Sports Instructors are not actors: they have no account (ADR-029). An instructor asks the clinician, who decides what to share.

## Notes

- Every use case above, regardless of role, implicitly includes "gets logged to the audit trail" — not listed as a separate use case per row, since it's a cross-cutting requirement applying to all of them uniformly (Modules & Features, "Audit Trail" section).
- Future-development roles (Canteen Staff) are deliberately excluded from this diagram — it reflects current, built scope only. See `08-Logs/Issues-and-TODOs.md` for what that role would add if undeferred.
