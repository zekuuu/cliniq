# Data Flow Diagram

**Status: first draft, built from already-documented requirements.** External entities come directly from the Project Plan's External Interfaces table (§2.1); processes map directly to the modules already fully specified in Modules & Features (Module 6 was removed, ADR-027). Not waiting on an external SRS — this is that artifact's first draft.

## Level 0 — Context Diagram

The whole system as one process, showing everything that crosses its boundary.

```mermaid
flowchart TD
    STAFF["👤 Staff<br/>(Nurse/Clinic Assistant)"]
    ADMIN["👤 Admin/Principal"]
    REGISTRAR["🏫 Registrar's Office"]
    PARENT["👨‍👩‍👧 Parent/Guardian"]
    IT["🛠️ Outsourced IT Provider"]

    CLINIQ(("CLINIQ<br/>System"))

    REGISTRAR -->|student roster data| CLINIQ
    STAFF -->|visit/incident/inventory records| CLINIQ
    CLINIQ -->|student records, dashboards, reports| STAFF
    ADMIN -->|report requests| CLINIQ
    CLINIQ -->|reports, dashboard summary| ADMIN
    STAFF -->|phone call, outside the system| PARENT
    STAFF -->|logs notification outcome| CLINIQ
    CLINIQ -->|backup status| IT
    IT -->|network/hardware maintenance, outside the system| CLINIQ
```

Note the two flows drawn as "outside the system": the actual parent phone call and the physical hardware maintenance both happen outside CLINIQ by design (Project Plan §1.4 — no parent portal, no automated notifications) — only their *outcomes* (a logged notification attempt, a backup status Staff can see) cross back into the system.

## Level 1 — Major Processes

Breaking the single CLINIQ process into its constituent modules and data stores.

```mermaid
flowchart TD
    STAFF["👤 Staff"]
    ADMIN["👤 Admin/Principal"]
    REGISTRAR["🏫 Registrar's Office"]

    P1(("1.0<br/>User<br/>Management"))
    P2(("2.0<br/>Student<br/>Records"))
    P3(("3.0<br/>Clinic Visit<br/>Monitoring"))
    P4(("4.0<br/>Emergency<br/>Response"))
    P5(("5.0<br/>Reports<br/>Generation"))
    P7(("7.0<br/>Smart<br/>Triage"))
    P8(("8.0<br/>Inventory<br/>Tracker"))
    P9(("9.0<br/>Clinic Overview<br/>Dashboard"))
    P10(("10.0<br/>Backup<br/>Verification"))

    DS1[("D1: Users")]
    DS2[("D2: Students")]
    DS3[("D3: Visits")]
    DS4[("D4: Incidents")]
    DS5[("D5: Follow-Ups")]
    DS6[("D6: Inventory")]
    DS7[("D7: Audit Log")]
    DS8[("D8: Backup Log")]

    STAFF -->|login| P1
    P1 <-->|account data| DS1

    REGISTRAR -->|roster import| P2
    STAFF -->|encode/edit student| P2
    P2 <-->|student data| DS2

    STAFF -->|log visit| P3
    P3 <-->|visit records| DS3
    P3 -->|triggers| P7
    DS5 <-.->|follow-up prompt| P3

    STAFF -->|log incident, stage 1/2| P4
    P4 <-->|incident records| DS4
    DS5 <-.->|follow-up prompt| P4

    STAFF -->|dispense/restock| P8
    P8 <-->|stock levels| DS6

    STAFF -->|generate| P5
    ADMIN -->|view| P5
    P5 -->|reads| DS3
    P5 -->|reads| DS4
    P5 -->|reads| DS6

    STAFF -->|view| P9
    ADMIN -->|view| P9
    P9 -->|reads| DS3
    P9 -->|reads| DS4
    P9 -->|reads| DS5
    P9 -->|reads| DS6

    STAFF -->|check status| P10
    P10 <-->|backup records| DS8

    P1 -.->|logs every action| DS7
    P2 -.->|logs every action| DS7
    P3 -.->|logs every action| DS7
    P4 -.->|logs every action| DS7
```

Dotted lines into `D7: Audit Log` represent the cross-cutting requirement that every module writes to it — not a data flow specific to any one process (Modules & Features, "Audit Trail" section; `.claude/skills/cliniq-audit-trail/`).

## Notes

- First-aid checklist (7.0) has no data store of its own — it's a stateless lookup (complaint type → checklist content) surfaced inside Visit Monitoring, not a persisted record, matching how it's described in Modules & Features ("not a standalone page — a checklist panel embedded in New Visit Entry").
- Follow-Up (D5) is drawn as shared between Visit Monitoring and Emergency Response, since a follow-up can originate from either — matches the "same feature, two entry points" note already established.
