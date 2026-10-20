# Team, Roles, and Project Organization — Full Detail

Kept in sync with the canonical Project Plan, Section 2. If you edit one, edit both.

---

## 2. Project Organization

### 2.1 External Interfaces

| Party | Role in the Project |
|---|---|
| Ms. Jennesse Baas, School Head Nurse | Primary client contact and product owner; validates requirements, participates in UAT, receives training |
| Mendez Christian Academy Administration / Principal | Sponsor of the digitalization effort; consumer of health summary reports |
| Registrar's Office | Source of authoritative student information used to populate Student Records |
| PE/Sports Department | Source of injury referrals, logged by Staff (Section 5.3) |
| School's Outsourced IT Provider | Maintains the existing workstation and network; partner for quarterly backup-recovery testing and major hardware issues |
| Prof. Kryss Coleen Creus, CvSU–CEIT Course Adviser | Academic oversight, milestone review, and grading |

### 2.2 Internal Structure

The development team is intentionally small — a structure that mirrors the client's own "insufficient manpower" reality and forces the same discipline the system is meant to bring to the clinic: clear roles, no duplicated effort, and standardized handoffs. All three members report jointly to the client (for requirements and acceptance) and to the course adviser (for academic milestones); there is no separate management layer between developers and the client.

```
        Prof. Kryss Coleen Creus
        CvSU–CEIT Course Adviser
                  │
        Ghenly B. Tinapay (Project Manager)
                  │
   ┌──────────────┴──────────────┐
Christian John C. Lugami   Zean Kurt G. Balboa
(System Analyst)           (Developer / Tester)
                  │
      Client: Mendez Christian Academy
      (Ms. Jennesse Baas, School Head Nurse)
```

### 2.3 Roles and Responsibilities

| Member | Primary Responsibilities |
|---|---|
| Ghenly B. Tinapay — Project Manager | Overall coordination and scheduling; client liaison; consolidates documentation and deliverables; manages scope and risk register; leads status reporting to the adviser |
| Christian John C. Lugami — System Analyst | Requirements validation with the client; ERD/DFD and UI design; maps SWOT findings to functional requirements; coordinates UAT scenarios and test cases |
| Zean Kurt G. Balboa — Developer / Tester | Front-end and back-end implementation; database schema and queries; unit and integration testing; deployment on the client workstation; leads staff training sessions |

Because the team has only three members, all three are expected to contribute across boundaries where needed (e.g., all participate in client interviews and in UAT); the table above reflects primary, not exclusive, ownership.

### 2.4 Deliverables

| Deliverable | Target Milestone |
|---|---|
| SWOT Analysis, Problem Identification, Stratification, Prioritization, Fishbone Analysis | Completed (Software Engineering I, May 2026) |
| Software Engineering I Technical Documentation | Completed (May 23, 2026) |
| Project Plan (this document) | Week 1 |
| System Design Artifacts (ERD, DFD, wireframes) | Week 3 |
| Working Prototype (core modules) | Week 7 |
| Working Prototype (enhancement modules) | Week 11 |
| Test Plan and Test Results | Week 12 |
| Deployed System at Mendez Christian Academy | Week 14 |
| User Manual and Training Materials | Week 14 |
| Source Code Repository (handover copy) | Week 14 |
| Final Defense / Presentation | Week 14 |

---
