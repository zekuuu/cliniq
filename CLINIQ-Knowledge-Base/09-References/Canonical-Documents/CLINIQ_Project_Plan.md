# CLINIQ: Intelligent Clinic Tracking and Monitoring System
## Project Plan

**Issuing Organization:** Mendez Christian Academy — School Clinic / Health Services Department

**Prepared for:** Software Engineering II (COSC 75), College of Engineering and Information Technology (CEIT)

**Prepared by:** Cavite State University – Don Severino delas Alas Campus, Indang, Cavite

| Field | Detail |
|---|---|
| Document Revision No. | 2.9 |
| Date of Issue | October 31, 2026 |
| Project Manager | Ghenly B. Tinapay |
| System Analyst | Christian John C. Lugami |
| Developer / Tester | Zean Kurt G. Balboa |
| Client Contact | Ms. Jennesse Baas, School Head Nurse, Mendez Christian Academy |
| Reviewed by | Prof. Kryss Coleen Creus, Software Engineering II Course Adviser, CvSU–CEIT |

---

### Document Change Control

| Revision No. | Date of Issue | Author(s) | Description of Change |
|---|---|---|---|
| 1.0 | September 13, 2026 | Ghenly B. Tinapay, Christian John C. Lugami, Zean Kurt G. Balboa | Initial Project Plan, developed from the finalized SWOT Analysis and Software Engineering I Technical Documentation for CLINIQ. |
| 1.1 | September 13, 2026 | Ghenly B. Tinapay, Christian John C. Lugami, Zean Kurt G. Balboa | Replaced the vanilla HTML/CSS/JS + PHP stack with React + TypeScript, Laravel, and Tailwind CSS; updated Sections 4.3, 5.1, 5.2, 5.3, and 1.4 (scope) accordingly. |
| 1.2 | September 13, 2026 | Ghenly B. Tinapay, Christian John C. Lugami, Zean Kurt G. Balboa | Corrected the group member roster and role assignments throughout the document. |
| 1.3 | September 13, 2026 | Ghenly B. Tinapay, Christian John C. Lugami, Zean Kurt G. Balboa | Rebuilt Section 3 (Review of Existing Alternatives) with ten researched systems and a merged feature-comparison matrix; updated the Medicine & Supply Inventory Tracker scope (Section 5.3) to add expiration-date tracking; updated References. |
| 1.4 | September 17, 2026 | Ghenly B. Tinapay, Christian John C. Lugami, Zean Kurt G. Balboa | Added a third access role, **QR Viewer**, for the QR Digital Health ID feature: PE instructors and other non-clinic staff now sign in once per shift before scanning, and every emergency-info view is logged against their account. Updated Sections 1.4, 5.1, and 5.3 accordingly. |
| 1.5 | September 17, 2026 | Ghenly B. Tinapay, Christian John C. Lugami, Zean Kurt G. Balboa | Corrected the QR Viewer session length in Section 5.3: sessions last up to 1 week rather than per shift, so an emergency scan is never blocked by a login step. |
| 1.6 | September 17, 2026 | Ghenly B. Tinapay, Christian John C. Lugami, Zean Kurt G. Balboa | Added app-icon installation and Windows auto-launch setup to the deployment and training tasks in Section 6.2, so the nurse opens CLINIQ from a taskbar icon rather than typing a URL. |
| 1.7 | September 18, 2026 | Ghenly B. Tinapay, Christian John C. Lugami, Zean Kurt G. Balboa | Redesigned QR Digital Health ID as a Staff-only quick-action hub (scan or enter Student Number, then Record Visit / Log Emergency / View Profile) running inside the existing Staff login, removing the separate QR Viewer sign-in for this phase. Added the `YYYY-NNNNN` Student Number scheme (Section 5.3). Moved PE/Sports Instructor and Canteen Staff QR access to documented future development (Section 1.4). Updated the risk table (Section 5.4) accordingly. |
| 1.8 | September 19, 2026 | Ghenly B. Tinapay, Christian John C. Lugami, Zean Kurt G. Balboa | Applied revisions from the September 19 team meeting: undeferred PE/Sports Instructor access as a read-only mobile role (full profile + injury/visit history); added a QR mobile path with a dedicated Emergency button alongside the existing computer flow; added a two-stage (fast-capture, complete-later) flow to Emergency Response; expanded Health Trends Dashboard into the Clinic Overview Dashboard (counts, pending records, calendar view); clarified medical certificates as out of scope; expanded audit trail logging to login/scan/submission/approval across all modules; added a screen-context display-privacy rule (Student Number by default on QR-reachable screens, full name only in deliberately-opened staff views); added a UPS recommendation (not costed into budget) and flagged the off-site backup layer and nurse-absence coverage as open items pending team/client decisions. Canteen Staff access remains the only item still deferred to future development. |
| 1.9 | September 20, 2026 | Ghenly B. Tinapay, Christian John C. Lugami, Zean Kurt G. Balboa | Corrected the display-privacy rule: a QR scan result is a deliberate single-student lookup and now shows the full name, same as the profile page, search, and masterlist. The rule instead applies to multi-student list/dashboard views — the Visit Log List, Incident Log List, and the Dashboard's frequent-visitor flags — which now default to Student Number, since those are the screens a bystander could realistically glance at and attach a name to a visit pattern. |
| 2.0 | September 20, 2026 | Ghenly B. Tinapay, Christian John C. Lugami, Zean Kurt G. Balboa | Added Follow-Up Handling to Clinic Visit Monitoring and Emergency Response (Section 5.3): Staff records a return-to-clinic instruction inline after a visit or incident, with a Pending/Completed/Missed/Cancelled status, surfaced as the system's own internal reminder on the Clinic Overview Dashboard rather than through any external SMS/push service. Added lightweight, free-text event tagging to the Dashboard's calendar so clinic activity can be read alongside school events; a fuller, separately-managed school-events calendar remains an open decision (Section 1.4), specifically over who would maintain it. |
| 2.1 | September 20, 2026 | Ghenly B. Tinapay, Christian John C. Lugami, Zean Kurt G. Balboa | Added a formal data retention policy (Section 5.3): student/visit/incident records are kept for up to 5 years after archiving, not indefinitely, aligning with RA 10173's "not longer than necessary" principle while avoiding the impractical extreme of deleting a record the instant a student leaves; the audit trail follows its own shorter retention; the Backup Verification Assistant's tracked file size is the trigger for eventually building purge tooling, not a fixed date. Also documented the previously-unwritten inventory stock flow end-to-end — how dispensing decrements stock and triggers a threshold check, how restocking is a separate action that increments stock and updates the item's single expiration date, and that low-stock and nearing-expiration are independent, separately-badged flags. Full step-by-step detail lives in the Modules & Features companion document. |
| 2.2 | September 25, 2026 | Ghenly B. Tinapay, Christian John C. Lugami, Zean Kurt G. Balboa | Finalized every previously-pending tech stack item (Section 4.3) after researching current maintenance/compatibility status rather than picking the first candidate: Vite as the build tool; Laravel Sanctum for auth; XAMPP standardized across all dev machines; `endroid/qr-code` for backend QR generation (the original `simplesoftwareio/simple-qrcode` candidate has had no real release since 2021); `qr-scanner` (nimiq) for frontend QR scanning, specifically because it falls back to its own decoder on browsers lacking the Barcode Detection API — Safari on iOS has never supported that API, so the more "modern-looking" hooks-based alternative would have silently failed to scan on any iPhone; and Chart.js over Recharts for dashboard charts, for smaller bundle size and Canvas rendering given the 4GB RAM target. Full reasoning: Obsidian vault, `06-Decisions/ADR-007`. |
| 2.3 | September 25, 2026 | Ghenly B. Tinapay, Christian John C. Lugami, Zean Kurt G. Balboa | Consistency fix: Section 5.1's Security & Privacy requirement still named "Laravel's built-in authentication" after Revision 2.2 had already confirmed Laravel Sanctum specifically — updated to match. Caught while expanding the Obsidian knowledge base to full detail. |
| 2.4 | September 26, 2026 | Ghenly B. Tinapay, Christian John C. Lugami, Zean Kurt G. Balboa | Added a Modularity & Scalability non-functional requirement (Section 5.1): each of the 10 modules must be loosely-coupled and independently developable/testable in the actual code, not just at the planning level. Formalizes what the frontend already committed to and extends it to the backend, which previously had no committed code-organization pattern. Full architectural detail in the Obsidian vault (ADR-008, ADR-009). |
| 2.5 | September 28, 2026 | Ghenly B. Tinapay, Christian John C. Lugami, Zean Kurt G. Balboa | Removed the 15-minute idle session timeout. Every role now has one session lifetime: 1 week, until the login token expires — the same session length the retired QR Viewer role had (Revision 1.5), applied to all logins. Updated Section 5.1's Security & Privacy requirement to match, and Module 1 in Modules & Features. Account lockout after repeated failed logins is unchanged. Trade-offs and reasoning are recorded in the Obsidian vault, ADR-015. |
| 2.6 | September 30, 2026 | Ghenly B. Tinapay, Christian John C. Lugami, Zean Kurt G. Balboa | Added Module 11: Audit Log Viewer (Screen #35) — Staff and Admin/Principal can view the audit log the system already writes to, filtered by date range, user, action type, and target/module; previously nothing let anyone actually read it back. Updated the Modularity & Scalability NFR's module count. Full reasoning: Obsidian vault, ADR-016. |
| 2.7 | October 1, 2026 | Ghenly B. Tinapay, Christian John C. Lugami, Zean Kurt G. Balboa | Recorded Prof. Kryss Coleen Creus as the Software Engineering II Course Adviser. |
| 2.8 | October 30, 2026 | Zean Kurt G. Balboa (updated with AI assistance; for the team to review) | Brought the plan in line with the decisions recorded in the team's knowledge base (ADR-001 to ADR-053) since Revision 2.7. **Scope and access:** removed the QR Digital Health ID and the generated Student Number (the LRN identifies each student, ADR-027, ADR-028); no account for PE/Sports Instructors (ADR-029); the system runs on the clinic computer only and the Principal signs in there; the Admin/Principal reads the Dashboard, reports, student profiles and incident reports on screen, manages accounts, acknowledges incident reports, never prints and is signed out after 30 idle minutes (ADR-029, 033, 038, 048); teachers and school employees can be clinic patients (ADR-043). **Features:** school-events calendar and national holidays now in scope (ADR-019, 020, 042); inventory held in received batches (ADR-030); Sports Report (ADR-034); visits and incidents stay separate with Escalate to incident (ADR-036); yearly list import and automatic yearly archive (ADR-047, 051); cluster alert, weekly breakdown and monthly inventory print (ADR-050); backup locations chosen in the system (ADR-052). **Technology and policy:** database named "MariaDB (XAMPP), MySQL-compatible"; backup stays local with no cloud (ADR-039); retention is 5 years from the archive date for student records and 10 years for the audit log (ADR-051); every printout is an A4 document (ADR-026, 044, 045, 046). **Budget:** removed the QR sticker line and recomputed the subtotal (Section 7). The schedule dates are unchanged. |
| 2.9 | October 31, 2026 | Zean Kurt G. Balboa (updated with AI assistance; for the team to review) | Deployment wording: hosted on the clinic computer and served over the LAN (Zean, October 31, 2026; note on ADR-029). Sanctum in SPA cookie mode (ADR-056). |

---

### Disclaimer

This project plan is submitted to the College of Engineering and Information Technology (CEIT), Cavite State University – Indang, Cavite, in partial fulfillment of the requirements for COSC 75: Software Engineering II. It is the original work of the authors, except where references are explicitly cited. The content of this document, including but not limited to the plan, source code, and related materials, may be used, copied, or distributed for academic and research purposes, provided that proper acknowledgment is given to the authors and Cavite State University. Unauthorized use for commercial purposes without prior consent is strictly prohibited.

---

### Abstract

The Mendez Christian Academy School Clinic currently serves over 900 students using a single workstation, a partially digitized Excel-based reporting process, and manual paper logbooks. The Software Engineering I phase of this project — comprising a SWOT analysis, problem stratification, weighted problem prioritization, fishbone analysis, and full technical documentation — identified **time-consuming manual processes**, **insufficient manpower**, and **high risk of human error** as the top three problems to be solved, with **overdependence on a single device** close behind as a structural risk. This Project Plan carries that analysis into Software Engineering II by laying out the objectives, scope, development approach, system design, timeline, and budget for building **CLINIQ**, a locally hosted clinic tracking and monitoring system. Beyond the baseline modules already specified in the Technical Documentation, this plan proposes low-cost, high-impact enhancements — a first-aid checklist quick-reference, an automated medicine inventory tracker, a clinic overview dashboard, and a backup-verification assistant — each mapped directly to a specific SWOT weakness or threat, and each designed to work within the client's existing single-device, limited-budget, non-technical-staff environment rather than around it.

---

### Table of Contents

1. The Problem Domain
   1.1 Statement of the Problem
   1.2 Background and Rationale
   1.3 Objectives
   1.4 Significance and Scope of the Project
2. Project Organization
   2.1 External Interfaces
   2.2 Internal Structure
   2.3 Roles and Responsibilities
   2.4 Deliverables
3. Review of Existing Alternatives
   3.1 Systems Reviewed
   3.2 Feature Comparison — Clinical & Records
   3.3 Feature Comparison — Inventory & Supply Management
   3.4 What This Comparison Means for CLINIQ
4. Approach to Be Taken in This Project
   4.1 Theoretical Framework / Methods to Be Used
   4.2 Rationale for the Framework / Methods
   4.3 Technologies to Be Used
5. System Design
   5.1 Requirements
   5.2 Resources
   5.3 System Overview
   5.4 Risk Assessment and Mitigation (Team Addition)
6. Project Timeline
   6.1 Gantt Chart
   6.2 Work Breakdown Structure
7. Budget Allocation
   7.1 Estimated Costs
   7.2 Total Projected Budget
References

---

## 1. The Problem Domain

### 1.1 Statement of the Problem

The Mendez Christian Academy clinic operates with **one accessible digital device**, no dedicated IT staff, and a single School Head Nurse supported by part-time clinic staff, yet is responsible for the health monitoring, first-aid treatment, emergency response, and record-keeping of **more than 900 students**. Clinic operations today rely on handwritten logbooks and Excel spreadsheets compiled after the fact, with no standardized data entry, no backup system, and no centralized way to retrieve a student's health information quickly.

The SWOT and problem-prioritization exercise conducted in Software Engineering I formally confirmed what the clinic staff already experience daily: manual, repetitive encoding consumes time that should go to patient care; the clinic is understaffed relative to its caseload; and the combination of workload and paper-based process creates a high risk of human error, inconsistent records, and incomplete decision-making at the administrative level. The weighted prioritization matrix ranked these as follows:

| Rank | Problem | Score |
|---|---|---|
| 1 | C — Time-consuming manual processes | 45 |
| 2 | A — Insufficient manpower | 42 |
| 3 | F — High risk of human error | 41 |
| 4 | K — Overdependence on a single device/system | 40 |

CLINIQ exists to resolve these four problems together, not in isolation — a system that is merely "digital" but still slow to use, still dependent on one machine, or still error-prone would not actually solve the client's problem.

### 1.2 Background and Rationale

Mendez Christian Academy is a private school in Asis III, Mendez, Cavite. Its clinic already shows a willingness to modernize — computer-based incident reports and Excel-based monthly summaries exist as a starting point — but the underlying process is still fundamentally manual. The fishbone analysis conducted during Software Engineering I attributed this to six converging causes: no tools to measure processing time (Measurements), heavy reliance on printed forms (Materials), one staff member covering 900+ students without digital training (Manpower), a cluttered physical workspace (Environment), repetitive manual encoding and slow approvals (Methods), and a single device with no automation (Machinery).

At the same time, the SWOT analysis identified real opportunities the project can build on: **administrative support for digitalization**, **available grants and school funding**, and the sheer scale of the student population, which makes even modest efficiency gains valuable. This is the rationale for CLINIQ: the client is ready for digitalization and has institutional backing for it, but any solution must be inexpensive to acquire and run, must not assume hardware the school does not have, and must be simple enough for non-technical staff to operate without ongoing dependence on paid support.

### 1.3 Objectives

**General Objective:** To design, develop, and deploy CLINIQ — a locally hosted clinic tracking and monitoring system for Mendez Christian Academy — that measurably reduces manual workload, minimizes human error, and gives school administration reliable data for decision-making, all within the school's existing single-workstation, limited-budget environment.

**Specific Objectives:**

1. Digitize student health record encoding and clinic visit logging so that average per-visit documentation time is reduced by at least 50% compared to the current manual/Excel process.
2. *(Removed — ADR-027.)* The QR-based student lookup was dropped; Staff identify a student by LRN or name on each form. The number is kept so later objectives keep their numbers.
3. Reduce documentation errors linked to manual re-entry (SWOT Threat: human error) by enforcing system-level validation — duplicate detection, mandatory fields, and standardized first-aid checklists — across all clinic-visit and incident records.
4. Automate the generation of monthly health summaries and incident reports, eliminating the manual Excel compilation currently done by the School Head Nurse.
5. Provide School Administration a self-service clinic overview dashboard — visit/incident counts, pending records, recurring complaints, a possible-cluster alert, frequent-visitor warnings, and an Activity calendar of visit volume, school events and holidays — directly addressing the SWOT threat of "data inconsistency and incomplete decision-making."
6. Establish an automated, verifiable daily backup routine, written to the internal and external drives the clinician chooses in the system, with a nurse-visible backup-status indicator and a warning when the last good backup is more than 48 hours old, mitigating the risks tied to overdependence on a single device.
7. Deliver the working system, staff training, and full documentation within the AY 2026–2027 1st Semester timeline, at a total implementation cost no greater than approximately PHP 10,000 — respecting the client's limited operating budget.

### 1.4 Significance and Scope of the Project

**Significance.** For the School Head Nurse and clinic staff, CLINIQ removes the burden of duplicate manual encoding and end-of-month report compilation. For the PE/Sports Department, the clinician can print a Sports Report for the students in an activity, so the instructor has the relevant history without needing an account. For School Administration, it turns scattered logbook entries into a reliable, queryable record for planning and reporting, read on screen at the clinic computer. For students and parents, it means faster, better-informed emergency response. For the proponents, it is an opportunity to apply the full Software Engineering II lifecycle — design, iterative development, testing, deployment, and training — to a real, resource-constrained client rather than a hypothetical one.

**Scope.**

*A note on words.* In this plan "Staff" is the clinician role (called "School Clinician" in the app). Teachers and other school employees who are seen at the clinic as patients are called "staff patients" or "personnel" (ADR-043).

*In scope:*
- User Management (sign-in, two roles: Staff, and Admin/Principal who manages every account)
- Student Records (encoding, medical history, allergies, contact validation, a yearly list import, archiving) and staff patients (teachers and school employees recorded as patients, ADR-043)
- Clinic Visit Monitoring (daily logging, complaints, treatment with medicines taken from inventory, excuse letters, PE/Sports referrals, follow-ups)
- Emergency Response (two-stage incident logging, hospital referral tracking, parent-notification outcome logging)
- Reports Generation (monthly reports with a weekly breakdown, incident reports, complaint summaries, a monthly inventory print, and Sports Reports for PE instructors)
- The team-proposed enhancements described in Section 5.3: First-aid checklist quick-reference, Medicine & Supply Inventory Tracker, Clinic Overview Dashboard with an Activity calendar (school events and national holidays), and Backup Verification Assistant
- An Audit Log Viewer that lets Staff and the Admin/Principal read back the audit trail
- Deployment on the clinic's existing single computer using XAMPP (Apache, PHP and MariaDB), served over the clinic's local network (LAN); the Admin/Principal signs in at the clinic computer
- RA 10173 (Data Privacy Act of 2012)–aligned data handling, audit logging, and daily backups kept on the clinic computer and an external drive
- Staff training and a User Acceptance Testing (UAT) phase at the client site

*Out of scope for this implementation, but explicitly planned for as a later phase — consistent with both the ICT Head's expressed interest in future remote access and the "Future Deployment: Remote Server / Cloud" line in the current tech stack:*
- Remote or off-campus access, and hosting the system on a remote server/cloud instance instead of the clinic computer. The React + Laravel architecture is deliberately API-driven so this move is a deployment change later, not a rewrite — but it stays out of scope for this semester's rollout, which stays local on the clinic's existing computer. Whether the school will ever go online has not been decided with the client (ADR-029). Password reset by email works only when the computer is online (ADR-048).
- A parent/guardian self-service web or mobile portal
- Automated SMS or push-notification gateways (parents continue to be contacted by phone, as scoped in the Technical Documentation)
- Direct external access for canteen staff (checking food allergies before serving). PE/Sports Instructors have no account (ADR-029); canteen staff access remains designed and documented (see the Modules & Features companion document) but deferred to a later phase
- QR codes and a system-generated Student Number: dropped (ADR-027). Students are identified by the LRN (ADR-028); QR may return as a future idea
- A cloud or off-site backup copy (ADR-039)
- Immunization tracking, clinic passes or queues, Excel export, and similar extras suggested during planning (ADR-049)
- RFID, barcode, or biometric hardware
- Billing, insurance, or Medicaid-style billing modules
- Multi-school or cloud multi-tenant hosting

---

## 2. Project Organization

### 2.1 External Interfaces

| Party | Role in the Project |
|---|---|
| Ms. Jennesse Baas, School Head Nurse | Primary client contact and product owner; validates requirements, participates in UAT, receives training |
| Mendez Christian Academy Administration / Principal | Sponsor of the digitalization effort; signs in at the clinic computer to read the Dashboard, reports, student profiles and incident reports on screen, acknowledge incident reports and manage accounts; does not print (ADR-029, 033, 038, 048) |
| Registrar's Office | Source of authoritative student information used to populate Student Records, including the yearly student list that sets each student's grade and section (ADR-047); the import waits for the data privacy agreement |
| PE/Sports Department | Source of injury referrals, logged by Staff (Section 5.3); asks the clinician for a printed Sports Report (ADR-034); no account (ADR-029) |
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

## 3. Review of Existing Alternatives

Because the client currently relies on Excel and paper logbooks, that manual process is itself the most realistic "alternative zero" the team is competing against. Beyond it, the team reviewed **ten existing systems** — four Philippine school-clinic capstone projects (including the client's own conceptual neighbors) and six commercial or independently reviewed products — to confirm what a custom, locally hosted system should and should not try to copy.

### 3.1 Systems Reviewed

**Philippine academic capstone projects.** These are the closest analogs to CLINIQ: single-institution systems built by IT students for an actual school clinic, under the same staffing and budget pressures Mendez Christian Academy faces.

- **SEAIT SCMS** (South East Asia Institute of Trade and Technology) — a clinic management system emphasizing automated prescription generation, per-consultation EMR, and medication inventory monitoring with low-stock alerts.
- **E-Konsulta** (Saint Columban College, published via WARSE/IJSAIT) — a fuller-featured clinic and dental scheduling system with secure login, a dashboard, data backup, and even online follow-up consultation via Google Meet.
- **ClinicSync** (King's College of the Philippines, Benguet Campus, 2025) — an EMR built with the Extreme Programming methodology, achieving a 97.8% acceptance rate and a "Good" System Usability Scale score (79.7). It integrates patient records, real-time consultation documentation, medicine and equipment inventory tracking, appointment scheduling, emergency referral logging, and role-based accounts behind a real-time analytics dashboard.
- **Web-Based Clinic Management System with Inventory and Data Analytics** (Isabela State University, San Mariano Campus, 2024) — a capstone targeting the same problems as CLINIQ (accuracy, time-consumption, security) through automated prescriptions and certificates, instant patient history retrieval, and medicine expiration tracking with exportable reports.

**Commercial and independently reviewed products.** These show what fully funded, multi-school vendors build when budget is not the constraint — useful for spotting features worth borrowing and features worth deliberately skipping.

- **SurgiCare Software** — a medical supply and inventory-focused platform (barcode scanning, purchase orders, vendor management, multi-location visibility) rather than a full EMR.
- **EduHealth System** — a cloud-based K-12 EHR with immunization compliance tracking, medication/treatment authorization workflows, bulk paper-form scanning, and Azure-backed role-based security.
- **Medical Tracker** — the UK's leading school first-aid and medication platform (used in 3,200+ schools), built around sub-30-second incident logging, medication stock/expiry tracking, and automated parent notifications.
- **LinkHMS** — a modern, general-purpose SaaS clinic EMR with an appointment/visit-queue planner and doctor dashboard, notable for explicitly **lacking** medicine inventory management.
- **CareMonkey** — a parent-facing digital consent-and-medical-form platform, not an EMR, that lets parents self-serve their own child's medical information.
- **iSAMS by IRIS** — a large school-wide management information system (1,600+ schools, 90 countries) with a bolt-on Medical Centre and Wellbeing Manager (including a "Body Map" incident-logging tool) inside a much broader, non-health product.

### 3.2 Feature Comparison — Clinical & Records

Features are merged where two systems described the same capability in different words (for example, "user login" and "secure authentication" are one row). A blank research trail was treated as "No" rather than assumed — several vendor pages simply do not say.

![CLINIQ feature comparison table — Clinical and Records features across all ten reviewed systems and CLINIQ](images/table_3_2_clinical.png)


\* CLINIQ runs locally on the clinic's computer for this implementation; the React + Laravel architecture is API-driven so a move to remote/cloud hosting later is a deployment change, not a redesign (Section 1.4).

### 3.3 Feature Comparison — Inventory & Supply Management

![CLINIQ feature comparison table — Inventory and Supply Management features across all ten reviewed systems and CLINIQ](images/table_3_3_inventory.png)


### 3.4 What This Comparison Means for CLINIQ

No single reviewed system covers both halves of the matrix well: the Philippine capstones and Medical Tracker are strong on clinical records and incident logging but thin on inventory discipline; SurgiCare is the opposite — excellent inventory control with no patient records at all. CLINIQ's four team-proposed enhancements (Section 5.3) were chosen specifically to sit in that gap: the Medicine & Supply Inventory Tracker now also tracks expiration dates (a feature borrowed directly from this review, since four of the ten alternatives had it and CLINIQ's original scope did not), while the first-aid checklist adds the kind of fast, low-friction clinical access that ClinicSync and Medical Tracker validated as genuinely useful, without requiring the licensing costs, multi-school scale, or hardware (barcode scanners, dedicated devices) that make SurgiCare, LinkHMS, EduHealth, and iSAMS impractical for a single-nurse, single-workstation clinic.

Three features that appear across several alternatives were deliberately left out, and that omission is a scope decision rather than an oversight: **billing/invoicing** (LinkHMS) does not apply to a school clinic that does not charge students; **barcode scanning and purchase-order/vendor management** (SurgiCare) assume a procurement workflow and hardware budget the client does not have; and **multi-room/multi-location inventory visibility** (SurgiCare, Medical Tracker) is meant for hospital networks or multi-academy trusts, not a single clinic room. Leaving these out keeps CLINIQ aligned with the client's actual scale instead of building toward a size the school will likely never reach.

---

## 4. Approach to Be Taken in This Project

### 4.1 Theoretical Framework / Methods to Be Used

The team will follow an **iterative-incremental (Agile-inspired) development approach with formal phase gates**, structured as: Planning → Design → Iterative Development (four short sprints, one per module group) → Integration Testing → User Acceptance Testing → Deployment & Training → Maintenance Handoff. Each sprint ends with a short client check-in with Ms. Baas rather than a single big requirements sign-off at the start, since her availability is limited and requirements are best validated against something she can actually see and try.

### 4.2 Rationale for the Framework / Methods

A single, unavailable-most-of-the-day client contact and a three-person team make a heavyweight, document-driven waterfall approach risky: any misunderstanding discovered only at the end would be expensive to fix with so little slack in the schedule. Short, module-sized iterations let the team surface mistakes early, and let the client keep giving feedback without needing to block out large amounts of time. Rolling out modules incrementally — rather than a single hard cutover — also directly mitigates the "overdependence on a single device" risk identified in the SWOT: if a later module needs rework, the clinic is never left with *no* working digital tool, only a partially completed one.

The team also revised the original plain HTML/CSS/JS + PHP stack to **React + TypeScript on the frontend and Laravel on the backend** (Section 4.3). TypeScript's static typing catches a category of mistakes — mismatched fields, wrong data types passed between the UI and the API — at build time instead of after the nurse has already hit "Save," which reinforces the same error-reduction goal behind Objective 3 and the "high risk of human error" problem, only now at the code level rather than the workflow level. Laravel's authentication (Sanctum), migrations, and ORM also reduce the amount of custom backend code the team has to write and maintain by hand, which matters for a three-person team on a fixed semester timeline. The trade-off is added build tooling (Node.js, Composer) during development; Section 5.1 and 5.2 note how that is kept from becoming a burden on the client's actual runtime hardware.

### 4.3 Technologies to Be Used

| Layer | Technology | Cost |
|---|---|---|
| Frontend | React + TypeScript | Free |
| Build tool | **Vite** | Free |
| Styling | Tailwind CSS | Free |
| Backend | Laravel (PHP) | Free |
| Database | **MariaDB (XAMPP), MySQL-compatible** — the database XAMPP installs; Laravel reaches it through its MySQL driver | Free |
| Authentication | **Laravel Sanctum** (SPA cookie mode, ADR-056, built specifically for a React+Laravel pairing) | Free |
| Local development environment | **XAMPP**, standardized across all dev machines (matches the client's production environment exactly) | Free |
| Deployment (current phase) | Hosted on the clinic's existing computer, served over the LAN; no internet-facing hosting | Free |
| Deployment (future phase) | Remote server / cloud — deferred, see Section 1.4 | Deferred, cost TBD if pursued |
| Dashboard charts | **Chart.js** (via `react-chartjs-2`) — chosen over Recharts specifically for the smaller bundle and Canvas rendering, both of which matter more here than Recharts' nicer JSX composability given the 4GB RAM target and the Dashboard's fairly simple chart needs | Free |
| ERD / diagramming | Lucidchart (free tier) | Free |
| Presentation design | Canva (free tier) | Free |
| Version control & team collaboration | Git and GitHub | Free |
| Build tooling (development only) | Node.js/npm (React build via Vite), Composer (Laravel dependencies) | Free |

This stack replaces the original plain HTML/CSS/JS + PHP approach documented in Software Engineering I. Every layer is still free and open-source, so upgrading the stack adds no new software licensing cost to the project — the only change is development-time tooling (Node.js, Composer), not anything the client has to pay for or maintain themselves.

---

## 5. System Design

### 5.1 Requirements

**Functional Requirements** (grouped by module — see Section 5.3 for full module list):
- Role-based login for Staff (full read/write) and Admin/Principal (reads the Dashboard, reports, student profiles and incident reports; acknowledges incident reports; manages accounts; never prints; ADR-033, 038, 048); PE/Sports Instructors have no account (ADR-029)
- Student record encoding with duplicate detection and mandatory-field enforcement; a yearly import of the registrar's list sets grade and section, and a student missing from the new list is archived after a review list is shown (ADR-047, 051); a visit or incident keeps the grade and section the student had when it was saved
- Teachers and school employees recorded as clinic patients with their own screens, identified by a Staff No. (ADR-043)
- Daily clinic visit logging with complaint (one main complaint and up to 3 extra tags), treatment, medicines and supplies taken from inventory, and disposition tracking; a visit recorded by mistake is marked "Entered in error", never deleted; a visit can be escalated to an incident (ADR-036, 053)
- Excuse letter and PE/Sports referral handling; the clinician can approve a letter in one step and gets a warning, never a block, when it covers more than 3 days; medical certificates are explicitly out of scope (hospital-issued, not generated by CLINIQ; ADR-049)
- Two-stage emergency incident logging — essential fields captured fast, remaining detail completed afterward — plus hospital referral tracking and timestamped parent-notification outcome logging
- Follow-up handling for students told to return for monitoring, recorded inline after a visit or incident, with a Pending/Completed/Missed/Cancelled status and no dependency on external SMS or push notifications
- Automated monthly and incident report generation, with a weekly breakdown, a monthly inventory print, exact counts, and Sports Reports for PE instructors (ADR-034, 050); every printout is an A4 document printed by the clinician
- Student lookup by LRN or name from each form's student picker, so recording a visit or logging an emergency starts with the student already identified
- Screen-context display rule: multi-student list/dashboard views (visit logs, incident logs, frequent-visitor flags) show the masked LRN (last four digits), not the student's name, since these are the screens a bystander could glance at; a deliberate single-student lookup — full profile, search — shows the full name and the full LRN, and so do the printouts about one student (ADR-040, 044)
- Rule-based first-aid checklist prompts during visit logging
- Medicine/supply consumption logging from received batches, earliest-expiring batch first, with low-stock and nearing-expiry alerts and explicit disposal of expired stock (ADR-030)
- Clinic-wide operational dashboard with an Overview and a Trends view: visit/incident counts, pending records, health trends, a possible-cluster alert, frequent-visitor warnings and due/upcoming follow-ups; and a separate Activity calendar of visit and incident counts with school events (kept by Staff and the Admin/Principal) and national holidays (ADR-019, 020, 032, 042, 050)
- Daily automated backup to the internal and external drive locations the clinician chooses in the system, with a visible backup-status indicator, "Back up now", and a warning when the last good backup is over 48 hours old (ADR-037, 052)
- Audit logging of every login, submission, approval and print across all modules, a read-only Audit Log Viewer for Staff and the Admin/Principal, and a log entry when the clinician or Admin opens a student profile or incident report (ADR-016, 038, 048)

**Non-Functional Requirements:**
- **Performance:** must run acceptably on the existing minimum-spec workstation (Intel Core i3 or equivalent, 4GB RAM) with no perceptible lag during data entry. The React frontend is compiled into optimized static assets at build time, so the workstation only ever serves and renders a finished bundle — it does not need to run the heavier Node.js build tooling in production, only during development
- **Security & Privacy:** Laravel Sanctum (bcrypt password hashing, session/token handling), a 1-week session lifetime for Staff (the token expires after 7 days; there is no idle timeout, so urgent work is never interrupted, ADR-015), a 30-minute idle sign-out for the Admin/Principal (ADR-048), account lockout for 30 minutes after 5 failed logins, passwords reset by the Admin with a temporary password and, when the computer is online, by an email link (ADR-048), and handling aligned with RA 10173 (legitimate purpose, consent, purpose limitation, and a defined data retention policy — see Section 5.3)
- **Availability:** must function fully offline from the public internet, hosted on the clinic computer and served over the local network (LAN) only (ADR-029). In an emergency the nurse helps the student first, uses paper, and enters the record afterwards
- **Usability:** must be learnable by non-technical clinic staff within a single training session
- **Maintainability:** codebase and database schema documented clearly enough for the school's outsourced IT provider to support after the team's academic involvement ends
- **Modularity & Scalability:** each of the system's modules must be a loosely-coupled, independently developable and testable unit in the actual code, not just at the planning level — reduces cross-module breakage with 3 developers (and AI agents) working concurrently, and lets the system grow without a structural rewrite. Full architectural detail: Obsidian vault, `06-Decisions/ADR-008` (frontend) and `ADR-009` (backend)

### 5.2 Resources

**Human Resources:** the three-person development team (Section 2.3), Ms. Jennesse Baas as primary client validator, the school's outsourced IT provider for network/hardware support, and the CvSU–CEIT adviser for milestone review.

**Hardware Resources (reused, not purchased):** the client's existing Windows 11 workstation, its existing inkjet/laser printer (for reports and excuse letters), and an external drive for backups. CLINIQ runs on that computer and is served over the local network. The only genuinely new hardware items are low-cost consumables (see Section 7). Node.js and Composer, needed to build the React frontend and install Laravel's dependencies, run on the **development team's own machines**, not the client's workstation — the client only ever receives the finished, compiled application.

**Software Resources:** all items listed in Section 4.3 — every one free or already in use by the client.

### 5.3 System Overview

CLINIQ is a three-tier local application: a React + TypeScript single-page frontend styled with Tailwind CSS, a Laravel (PHP) backend exposing a REST API and handling authentication and business logic, and a MariaDB (XAMPP), MySQL-compatible, data layer. The stack runs on XAMPP on every development machine (ADR-007); for production it is deployed on the clinic's single computer and served over the clinic's local network (LAN); the Admin/Principal signs in at the clinic computer (ADR-029). Because the frontend talks to the backend only through an API, moving to a remote server or cloud host later — the "Future Deployment" already noted in the tech stack — is a deployment change, not a redesign, though it stays outside this semester's scope (Section 1.4).

**Baseline modules** (carried forward from the Software Engineering I Technical Documentation): User Management, Student Records, Clinic Visit Monitoring, Emergency Response, and Reports Generation.

**Follow-Up Handling** (added within Clinic Visit Monitoring and Emergency Response, per the September 19 team meeting). When a student is told to return for monitoring or reassessment, Staff can record it inline at the end of a visit or incident entry — student, related record, follow-up date, reason, and a status of Pending / Completed / Missed / Cancelled. Due and upcoming follow-ups surface on the Clinic Overview Dashboard, computed fresh each time the page loads rather than through any background or push mechanism, since the system has no external SMS/push service. A follow-up is overdue 3 days after its date and is closed automatically as Missed with a "No response" note after 7 days (ADR-051).

**Student identifier.** Each student is identified by the LRN (Learner Reference Number) the school already holds (ADR-028): 12 digits, stored as text, unique, entered by Staff and correctable (corrections are audited). CLINIQ no longer generates its own Student Number (ADR-027). Because the LRN links to school and DepEd records, screens and printouts that list several students, and the audit trail, show only its last four digits; a screen or printout about one opened student shows it in full (ADR-040).

**Staff patients (ADR-043).** Teachers, non-teaching staff and utility workers can be patients. They have their own list, profile and form, a Staff No. assigned by CLINIQ (no LRN, grade or sex), and appear on the Visit Log, Incident Log, Follow-Ups and inventory dispensing as a separate kind of patient. They get no excuse letter, PE referral or Sports Report, and the Admin/Principal does not see staff patients or their incidents.

**Sports Report (ADR-034).** The clinician builds a saved, reusable list of students for a PE or sports activity and prints a report of their recent visits and incidents (default 90 days), her own note, and conditions only if she ticks that option. It is the way a PE instructor, who has no account, receives information.

**Yearly list and archiving (ADR-047, 051).** Grade level and section come from one yearly import of the registrar's list, not from a promotion button. A student missing from the new list is archived by the import after the clinician sees the list of who would be archived, and a returning student is restored. The import itself waits for the data privacy agreement.

**Data retention policy.** At an estimated 60–100MB of visit/incident data per 20 years and well under 1GB total even with zero purging, ever, storage space is not the driver for this policy — RA 10173 (IRR Section 19) is: personal data must not be retained "longer than necessary" for the purpose it was collected for. Reading the Technical Documentation's original rule ("retained only for the duration of enrollment") literally would mean deleting a record the instant a student leaves, which is stricter than the law requires and leaves no room for a re-enrollment, a legitimate records request, or a legal claim arising after departure. CLINIQ instead retains a student's records for **5 years from the archive date**, then deletes them — a finite, justified window rather than either extreme (ADR-051). Archiving (hiding a record from active lists, per Section 5.3's Student Records module) happens when the yearly list shows the student has left, or when the clinician archives a record; deletion is a separate, later step at the end of that window. The audit log follows its own, longer retention of **10 years**, the team's decision based on what the Principal said about keeping documents (ADR-037, 051); the school has not yet confirmed it. No automated purge tooling is being built this phase, since current volume estimates don't require it — the trigger for building it is the Backup Verification Assistant's tracked backup file size crossing a defined threshold (Module 10), not a fixed calendar date. This is the team's policy design, not verified legal advice; final sign-off should come from whoever formally handles data privacy compliance for the school, if that role is designated.

**Team-Proposed Enhancements** — each chosen specifically because it is low-cost to build on the existing stack, requires no new major hardware, and directly answers a weakness or threat named in the client's own SWOT analysis:

| Enhancement | What it does | SWOT item it addresses |
|---|---|---|
| **First-aid Checklist Quick-Reference** | When staff selects a common complaint (e.g., fainting, headache, wound) while logging a visit, the system surfaces a standardized first-aid checklist on screen. The nurse owns and signs off the checklist content. | Reduces "high risk of human error" (3rd-ranked problem) and shortens the learning curve for any staff assisting the nurse |
| **Medicine & Supply Inventory Tracker** | Stock is held in received batches, each with a quantity and an expiration date (ADR-030). Usable (not expired) stock, expired stock and the total are worked out from the batches. Dispensing an item — usually as part of a visit or incident — takes stock from the earliest-expiring usable batch first and auto-checks usable stock against a low-stock threshold; restocking adds a new batch and needs an expiration date or an explicit "no expiration date" confirmation (ADR-035). Expired units stay visible until the clinician records their disposal. Low-stock and nearing-expiration are independent, separately-badged flags, both surfaced on the staff dashboard. Full step-by-step flow documented in the Modules & Features companion document. | Prevents last-minute understocking and expired-medicine use (an unaddressed SWOT threat) and reduces manual stock-checking, easing the manpower burden |
| **Clinic Overview Dashboard** *(expanded from Health Trends Dashboard)* | Aggregates clinic activity into one operational view for Staff and Administration, with an Overview and a Trends view: total visit/incident counts, pending or incomplete student records, common complaints per week/month, a possible-cluster alert for the clinician (3 or more students with the same complaint and grade within 3 days; nothing is sent to anyone, ADR-050), frequent-visitor warnings identified by masked LRN rather than name (3 or more visits in 14 days as a starting value for the nurse to confirm; a flag for the nurse to act on, never a diagnosis, and not something a passerby glancing at the screen should be able to attach to a named student), and **due/upcoming follow-ups** (the system's own internal reminder, since there's no external SMS/push service). Counts are exact, with no masking of small groups (ADR-050). A separate **Activity calendar** (ADR-032) shows visit and incident counts by week, month or year, the school events that Staff and the Admin/Principal add, and national holidays; a free-text event tag on a visit or incident also appears on its day. The Dashboard prints as a Clinic Overview Report or a Clinic Trends Report, depending on the open tab (ADR-045). | Directly answers the SWOT threat of "data inconsistency and incomplete decision-making" — and, per the September 19 meeting, a health-complaints-only view was judged too narrow for what Administration actually needs day to day |
| **Backup Verification Assistant** | A simple screen, open to Staff and the Admin/Principal (ADR-037), showing the last backup's date, size, and status, plus a plain-language guided recovery checklist. The clinician chooses the internal and external backup locations on this screen and the system creates a `.cliniq` folder on each (ADR-052); "Back up now" starts a backup, and a Dashboard chip warns when the last good backup is over 48 hours old. The tracked backup size also doubles as the trigger for the data retention policy (Section 5.3): if it crosses a defined threshold, that's the signal to build automated purge tooling — not a fixed calendar date. | Mitigates "overdependence on a single device" by letting a non-technical user self-verify backup health daily, without waiting on the outsourced IT provider for routine checks |

None of these four require new paid infrastructure, additional hardware purchases beyond low-cost consumables, or technical staff the client does not have — each is designed to fit inside the constraints already documented, not to add new ones.

### 5.4 Risk Assessment and Mitigation (Team Addition)

| Risk | Source | Mitigation |
|---|---|---|
| Single workstation fails or is unavailable | SWOT Weakness/Threat: single-device dependency | Incremental module rollout (Section 4.2); daily automated backup with nurse-visible status (Section 5.3); documented recovery procedure shared with the outsourced IT provider |
| Staff resistance to a new system | SWOT Weakness: staff unfamiliarity with digital tools | Hands-on training plus a UAT phase under real clinic conditions before go-live, as already planned in the Technical Documentation |
| Limited client availability for feedback | Client has one head nurse covering 900+ students | Short, module-sized check-ins instead of long requirement sessions (Section 4.1) |
| Scope creep beyond a 3-person team's capacity | Small team, fixed semester timeline | Explicit out-of-scope list (Section 1.4) agreed with the client up front |
| Student health data reaching people outside the clinic | PE/Sports Instructors need injury information but have no account (ADR-029) | The clinician decides what to share and prints it; only Staff and the Admin/Principal sign in, and every action is logged. Canteen Staff access remains deferred |
| Bystander seeing a named student tied to a visit/incident pattern on an open screen | Desktop screens showing multi-student logs or dashboards could be glanced at by passersby | The display-privacy rule addresses this directly: the Visit Log List, Incident Log List, and the Dashboard's frequent-visitor flags show masked LRN, not name. A single deliberate lookup — full profile, search — still shows the full name, since that's a legitimate one-student view, not an ambient pattern |
| No off-site backup layer beyond local workstation + external drive | Power loss identified at the September 19 meeting as the main operational risk — it can take down the router/server, not just interrupt a save | Decided (ADR-039, 052): backups stay on the clinic computer and its external drive, with no cloud copy, because off-site health data needs the parents' consent and a provider agreement and the school has no IT staff. A copy held by the Principal was suggested and withdrawn. Whether an extra layer is needed stays an open question. A UPS is recommended (Section 7) to reduce how often the risk is even triggered |
| No defined coverage when the School Head Nurse is absent | The client currently has exactly one Staff-level account holder | Pending client input — the team has asked Ms. Jennesse Baas and is awaiting a reply on who, if anyone, should be designated a backup Staff account holder. No system change should be made here until the client responds |
| More than one person signing in on the one clinic computer (the Principal and the clinician) | The system is local, so the Principal signs in at the clinic computer (ADR-029) | Individual accounts, a 30-minute idle sign-out for the Admin/Principal, an audit trail of every sign-in, profile view and print, and no printing by the Admin/Principal (ADR-038, 048) |
| System unavailable during an emergency (power cut, computer down) | Local, single-computer deployment | Working rule: help the student first, use paper at the time, and enter the record afterwards; the system is for tracking and incident summaries, not for running an emergency (ADR-029). The team still plans a written outage plan for the Principal |
| React + Laravel stack is less familiar or harder to hand off to the outsourced IT provider than plain PHP | Team decision to upgrade the tech stack (Section 4.3) | Clear code documentation and a written handover guide at deployment (Section 2.4); Laravel and React are both widely documented, actively maintained frameworks with large support communities, which reduces long-term maintenance risk compared to an undocumented custom PHP codebase |

---

## 6. Project Timeline

### 6.1 Gantt Chart

Timeline: **September 15, 2026 – December 19, 2026** (1st Semester, AY 2026–2027), 14 weeks.

| Phase | W1 | W2 | W3 | W4 | W5 | W6 | W7 | W8 | W9 | W10 | W11 | W12 | W13 | W14 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1. Planning & Requirements Validation | ■ | ■ | | | | | | | | | | | | |
| 2. System Design (ERD, DFD, UI) | | ■ | ■ | | | | | | | | | | | |
| 3. Sprint 1 — User Mgmt + Student Records | | | | ■ | ■ | | | | | | | | | |
| 4. Sprint 2 — Visit Monitoring + Follow-Ups | | | | | | ■ | ■ | | | | | | | |
| 5. Sprint 3 — Emergency Response + First-aid Checklist | | | | | | | | ■ | ■ | | | | | |
| 6. Sprint 4 — Reports/Dashboard + Inventory Tracker | | | | | | | | | | ■ | ■ | | | |
| 7. Integration Testing & Bug Fixing | | | | | | | | | | | | ■ | | |
| 8. UAT at Mendez Christian Academy | | | | | | | | | | | | | ■ | |
| 9. Deployment, Training, Documentation | | | | | | | | | | | | | | ■ |
| 10. Final Defense / Presentation | | | | | | | | | | | | | | ■ |

### 6.2 Work Breakdown Structure

1. **Planning & Requirements Validation**
   1.1 Review SWOT, problem-prioritization, and Technical Documentation findings
   1.2 Validate objectives and scope with Ms. Baas
   1.3 Finalize this Project Plan
2. **System Design**
   2.1 Entity-Relationship Diagram and database schema
   2.2 Data-flow diagrams for each module
   2.3 UI wireframes for staff and admin views
3. **Sprint 1 — User Management + Student Records**
   3.1 Authentication, RBAC, password policy
   3.2 Student encoding, duplicate detection, contact validation
4. **Sprint 2 — Clinic Visit Monitoring + Follow-Ups**
   4.1 Visit logging, excuse letters, PE/Sports referral logging, follow-up handling
   4.2 Student lookup by LRN or name on every form, staff patients (ADR-043), and the Sports Report for PE instructors (ADR-034)
5. **Sprint 3 — Emergency Response + First-aid Checklist**
   5.1 Incident logging, hospital referral tracking, notification-outcome logging
   5.2 Standardized first-aid checklist prompts
6. **Sprint 4 — Reports/Dashboard + Medicine Inventory Tracker**
   6.1 Monthly/incident report generation
   6.2 Clinic overview dashboard (Overview and Trends, pending records, due/upcoming follow-ups, cluster alert, display-privacy rule for frequent-visitor flags) and the Activity calendar (school events, national holidays)
   6.3 Supply logging from batches, low-stock and expiry alerts, and monthly inventory print
7. **Integration Testing & Bug Fixing**
   7.1 Cross-module testing
   7.2 Backup Verification Assistant testing, including the backup locations chosen in the system
8. **User Acceptance Testing**
   8.1 Real-condition testing by the School Head Nurse
   8.2 Feedback collection and fixes
9. **Deployment, Training, Documentation**
   9.1 Final install on the client workstation, including pinning CLINIQ as a browser-installed app icon (Chrome/Edge "install site as app," no service worker) and adding it to Windows Startup so it is already open each morning
   9.2 Staff training session, including a walkthrough of the app icon/taskbar shortcut so the nurse never has to type a URL
   9.3 User manual and handover documentation
10. **Final Defense / Presentation**

---

## 7. Budget Allocation

### 7.1 Estimated Costs

| Item | Purpose | Estimated Cost (PHP) |
|---|---|---|
| Software (React, TypeScript, Tailwind CSS, Laravel, MariaDB via XAMPP, Node.js, Composer, Git/GitHub, Lucidchart, Canva) | All open-source/free tiers | 0 |
| Hardware | Existing workstation and printer reused; no new purchase required | 0 |
| External USB backup drive (if not already available on-site) | Local storage for the daily database backups, kept in the locked clinic cabinet | 2,500 |
| Bond paper, ink, printed manuals | Documentation, training handouts, defense materials | 800 |
| Team transportation/allowance | On-site client interviews and UAT sessions | 3,000 |
| Contingency (~10%) | Unforeseen minor expenses | 630 |
| **Subtotal** | | **6,930** |

Labor is contributed in-kind by the student team as part of the academic requirement and carries no monetary cost.

### 7.2 Total Projected Budget

**Total Projected Budget: approximately PHP 6,930 – PHP 10,000** (the QR sticker line of PHP 1,500 was removed with the QR feature, ADR-027; the upper figure is the cap in Objective 7), with the large majority of that figure going to one-time consumables (backup drive, printing supplies, documentation) rather than software licenses or new hardware. This keeps the project well within what a single-nurse, budget-constrained private school clinic can realistically absorb — no recurring subscription fees, no major equipment purchases, and no ongoing cost beyond what the school already pays for its existing internet and workstation.

**Recommendation, not costed into this total:** a UPS (Uninterruptible Power Supply) for the clinic workstation, raised at the September 19, 2026 team meeting after identifying power loss — not just data loss — as the main operational risk to system availability. This is left as a recommendation for the client or a future budget revision rather than added here, since it wasn't part of the original scope this budget was built against.

---

## References

1. SWOT Analysis — CLINIQ: Intelligent Clinic Tracking and Monitoring System, Mendez Christian Academy, May 23, 2026 (internal project document).
2. Software Engineering I Project Technical Documentation — CLINIQ: Intelligent Clinic Tracking and Monitoring System, May 23, 2026 (internal project document).
3. Republic Act No. 10173, Data Privacy Act of 2012, Republic of the Philippines.
4. South East Asia Institute of Trade and Technology (SEAIT) — School Clinic Management System (SCMS), Chapters 1–2. https://www.studocu.com/ph/document/south-east-asia-institute-of-trade-and-technology/accounting-information-system/chapter-1-2-egeg/120290744
5. E-Konsulta: A Web-Based Clinic Management System, Saint Columban College. *International Journal of Scientific Advances in Information Technology (WARSE/IJSAIT)*. https://www.warse.org/IJSAIT/static/pdf/file/ijsait021422025.pdf
6. SurgiCare Software — School Clinic Inventory Management Software. https://surgicaresoftware.com/Provider-Types/school-clinic-inventory-management-software.html
7. Erio, W., Cuyam-an, J. D., Rufino, F., Acoking, H. A., & Luzada, R. J. (2025). ClinicSync: An Electronic Medical Records System for King's College of the Philippines' Clinic – Benguet Campus. *Southeast Asian Journal of Science and Technology*, 10(1), 146–150. https://sajournal.pti.edu.ph/index.php/sajst/article/view/363
8. Pagulayan, J. G., & Vinasoy, A. C. (2024). Web-Based Clinic Management System with Inventory and Data Analytics (BSIT Capstone), Isabela State University – San Mariano Campus. https://www.studocu.com/ph/document/isabela-state-university/information-technology/imr-ad/95849649
9. EduHealth System — Student Health Tracking Software for Schools. https://www.eduhealthsystem.com/for-student-health/
10. Medical Tracker — School First-Aid and Medical Incident Management Software. https://edtechimpact.com/products/medical-tracker/
11. LinkHMS — Clinic Management System and Electronic Medical Records. https://linkhms.com/
12. CareMonkey — Digital Medical and Consent Form Management for Schools. https://edtechimpact.com/products/caremonkey/
13. iSAMS by IRIS — School Management Information System, Medical Centre and Wellbeing Manager modules. https://edtechimpact.com/products/isams/
14. Laravel — The PHP Framework for Web Artisans. https://laravel.com/docs
15. React — The library for web and native user interfaces. https://react.dev/
16. Tailwind CSS — Utility-first CSS framework. https://tailwindcss.com/
