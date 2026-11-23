<!-- Built from the section files in Project-Plan/ by docs-documents-build.mjs. Do not edit. -->

<!-- p.1 -->

# Project Plan

**COSC 75: Software Engineering II**

## CLINIQ: Intelligent Clinic Tracking and Monitoring System

**MENDEZ CHRISTIAN ACADEMY**

**Document Revision No.: 2**

**Date of Issue:**

**November 07, 2026**

**Project Manager/Group Members:**

**Tinapay, Ghenly B.**

**Lugami, Christian John C.**

**Balboa, Zean Kurt G.**

<!-- p.2 -->

<table>
<tr>
<td><u>Ghenly B. Tinapay</u><br>Prepared by: Project Manager, HealWare</td>
<td><u>Christian John C. Lugami</u><br>Prepared by: System Analyst, HealWare</td>
</tr>
<tr>
<td><u>Zean Kurt G. Balboa</u><br>Reviewed by: Tester/Documenter, HealWare</td>
<td></td>
</tr>
</table>

<!-- p.3 -->

## Table of Contents

<table>
<tr><td><b>Document Change Control</b></td><td><b>5</b></td></tr>
<tr><td><b>Disclaimer</b></td><td><b>6</b></td></tr>
<tr><td><b>Abstract</b></td><td><b>7</b></td></tr>
<tr><td><b>1. Problem Domain</b></td><td><b>8</b></td></tr>
<tr><td>1.1 Statement of the Problem</td><td>8</td></tr>
<tr><td>1.2 Background and Rationale</td><td>9</td></tr>
<tr><td>1.3 Objectives</td><td>9</td></tr>
<tr><td>1.4 Significance and Scope of the Project</td><td>10</td></tr>
<tr><td><b>2. Project Organization</b></td><td><b>12</b></td></tr>
<tr><td>2.1 External Interfaces</td><td>12</td></tr>
<tr><td>2.2 Internal Structure</td><td>13</td></tr>
<tr><td>2.3 Roles and Responsibilities</td><td>14</td></tr>
<tr><td>2.4 Deliverables</td><td>15</td></tr>
<tr><td><b>3. Review of Existing Alternatives</b></td><td><b>17</b></td></tr>
<tr><td>3.1 Current Practice</td><td>17</td></tr>
<tr><td>3.2 Related System</td><td>17</td></tr>
<tr><td>3.3 Feature Comparison</td><td>18</td></tr>
<tr><td>3.4 Assessment</td><td>20</td></tr>
<tr><td><b>4. Approach to be taken in this subject</b></td><td><b>21</b></td></tr>
<tr><td>4.1 Theoretical Framework / Methods to be Used</td><td>21</td></tr>
<tr><td>4.2 Rationale for the Framework / Methods</td><td>22</td></tr>
<tr><td>4.3 Technologies you plan to consider or use</td><td>23</td></tr>
<tr><td><b>5. System Design</b></td><td><b>25</b></td></tr>
<tr><td>5.1 Requirements</td><td>25</td></tr>
<tr><td>5.2 Resources</td><td>28</td></tr>
<tr><td>5.3 System Overview</td><td>30</td></tr>
<tr><td>5.3.1 System Architecture</td><td>30</td></tr>
<tr><td>5.3.2 WIreframe/ Prototype</td><td>31</td></tr>
<tr><td><b>6. Project Timeline</b></td><td><b>44</b></td></tr>
<tr><td>6.1 Gantt Chart</td><td>44</td></tr>
<!-- p.4 -->
<tr><td>6.2 Work Breakdown Structure</td><td>44</td></tr>
<tr><td><b>7. Budget Allocation</b></td><td><b>49</b></td></tr>
<tr><td>7.1 Estimated Costs</td><td>49</td></tr>
<tr><td>7.2 Total Projected Budget</td><td>51</td></tr>
<tr><td><b>References</b></td><td><b>52</b></td></tr>
</table>

<!-- p.5 -->

## Document Change Control

This table records the revisions of the project plan. It lists the revision number, the date of issue, the authors, and a brief description of each change

| Revision Number | Date of Issue | Authors | Brief Description of Change |
| --- | --- | --- | --- |
| 1.0 | September 18, 2026 | HealWare | Initial development of the Project Plan, including the proposed project domain, organization, approach, system design, and gantt chart. |
| 2.0 | November 07, 2026 | HealWare | Revised and expanded the Project Plan sections, including the project domain, organization, existing alternatives, development approach, system design, and project timeline, based on the course guidelines. |
| | | | |
| | | | |
| | | | |

<!-- p.6 -->

## Disclaimer

This project plan is submitted to the College of Engineering and Information Technology (CEIT), Cavite State University - Indang, Cavite, in partial fulfillment of the requirements for COSC 75: Software Engineering II. It is the original work of the authors, except where references are explicitly cited.

The content of this document, including but not limited to the report, source code, and related materials, may be used, copied, or distributed for academic and research purposes, provided that proper acknowledgment is given to the authors and Cavite State University. Unauthorized use for commercial purposes without prior consent is strictly prohibited.

<!-- p.7 -->

## Abstract

Mendez Christian Academy operates a school clinic serving more than 900 students with limited staff and a single workstation. The clinic relies on handwritten logbooks and Excel files, resulting in slow and repetitive record keeping, inconsistent data, and limited backup.

This project proposes CLINIQ, a locally hosted clinic tracking and monitoring system designed to improve the recording, retrieval, monitoring, and reporting of clinic information. The system aims to reduce manual workload and errors while providing reliable records within the school’s limited resources and budget.

CLINIQ will be developed through an evolutionary iterative prototyping process, wherein the School Clinician reviews each prototype and provides feedback for subsequent improvements. The project will be assessed through prototype reviews, system testing, and user acceptance testing to determine whether the system meets the clinic’s requirements and intended objectives.

**Keywords:** school clinic, clinic management system, evolutionary prototyping, offline system

<!-- p.8 -->

## 1. Problem Domain

### 1.1. Statement of the Problem

The Mendez Christian Academy clinic serves more than 900 students with one School Clinician, part-time staff, and one accessible digital device. The clinic has no dedicated IT staff. It records visits, incidents, and reports in handwritten logbooks and Excel files that are compiled after the fact. Data entry is not standardized, no backup exists, and student health information cannot be retrieved quickly.

Interviews with the clinic staff and observation of the clinic workflow identified four main problems:

1. Time-consuming manual processes. Visits, incidents, and reports are written by hand, and the same data is encoded again in logbooks, paper forms, and Excel.
2. Insufficient manpower. One School Clinician and part-time staff serve more than 900 students, so record keeping competes with patient care.
3. High risk of human error. Workload and paper-based processes cause re-entry mistakes, inconsistent records, and incomplete information for decisions.
4. Overdependence on a single device. Every digital task depends on one computer. When it fails, the staff return to paper under pressure.

CLINIQ addresses all four together through structured and validated data capture, one searchable record per student and staff patient, a verified daily backup with a guided recovery checklist, automated monthly and incident reports, and role-based access, an audit trail, and a display rule that hides names on shared screens, aligned with Republic Act No. 10173. It does so using only the existing workstation and a limited budget; a system that is digital but slow, error-prone, or dependent on one workstation would not meet the client’s needs.

### 1.2. Background and Rationale

Mendez Christian Academy (MCA) is a private school in Asis III, Mendez, Cavite. Its clinic provides first-aid treatment, emergency response and hospital referral, student health monitoring through a daily visit log, monthly health reports, and medicine and supply dispensing. It also handles parent notification, excuse letters, canteen food-restriction monitoring, and PE/Sports injury referrals. The clinic has no digital system. Paper logbooks and Excel files hold all records.

<!-- p.9 -->

Three factors initiated the project:

- Institutional gaps. Six causes slow the clinic: no tools to measure processing time, heavy reliance on printed forms, one staff member serving more than 900 students without digital training, a cluttered workspace, repetitive manual encoding with slow approvals, and a single device without automation.
- Improvement of the current process. Computer-based incident reports and Excel monthly summaries already exist and give a starting point. However, limited manpower causes slow processing, human error, and incomplete records, and a device failure forces the staff back to paper.
- Request from the client. The School Clinician, who is the client contact and product owner, requested an improved system. The school administration supports digitalization, and school funding may be available. The ICT Head expressed interest in future remote access, which is outside the current scope.

The clinic has one workstation, no budget for new hardware beyond low-cost consumables, and non-technical users. CLINIQ therefore runs on the clinic workstation only and does not depend on the public internet for its core functions. The solution is inexpensive to acquire and operate, assumes no new hardware, and is simple enough for non-technical staff to use without paid support.

### 1.3. Objectives

General Objective:

To design, develop, and deploy CLINIQ, a locally hosted clinic tracking and monitoring system for Mendez Christian Academy that reduces manual workload, minimizes human error, and provides the school administration with reliable data, within the school’s single-workstation and limited-budget environment.

Specific Objectives:

1. Digitize student health record encoding and clinic visit logging so that the average documentation time per visit is at least 50% shorter than the current manual process.
2. Reduce documentation errors through system validation (duplicate detection, mandatory fields, and standardized first-aid checklists) across all visit and incident records.
3. Automate the monthly health summaries and incident reports that the School Clinician now compiles manually in Excel.
<!-- p.10 -->
4. Provide the school administration with a self-service clinic overview that shows visit and incident counts, pending records, recurring complaints, a possible-cluster alert, frequent-visitor warnings, and an activity calendar.
5. Establish an automated, verifiable daily backup to the internal and external drives chosen by the School Clinician, with a visible status indicator and a warning when the last good backup is older than 48 hours.
6. Deliver the working system, staff training, and complete documentation within the first semester of AY 2026–2027 at a total implementation cost of about PHP 10,000 or less.

CLINIQ addresses record keeping, monitoring, reporting, and backup in the school clinic. It does not cover the whole school health program, parent self-service, or school-wide information systems. The objectives are achievable with the resources at hand: free open-source software, the school’s existing computer and printer, one low-cost backup drive, a team of three, and one semester.

### 1.4. Significance and Scope of the Project

**Significance**

CLINIQ benefits the following stakeholders

- School Clinician and clinic staff. The system removes duplicate encoding and end-of-month report compilation, and it retrieves a student’s history and allergies in seconds.
- PE/Sports Department. The School Clinician prints a Sports Report for the students in an activity, so the instructor receives the relevant history without needing an account.
- School administration. Scattered logbook entries become a reliable, queryable record for planning and reporting. The administration reads it on screen at the clinic workstation, and the School Clinician sends the Monthly Report as a PDF saved from the print window.
- Students and parents. Emergency response is faster and better informed, and parent notification attempts are recorded consistently.
- The proponents and the discipline. The project applies the full Software Engineering II lifecycle (design, iterative development, testing, deployment, and training) to a real client with limited resources. Its documentation also allows the school’s IT provider to support the system after turnover.

<!-- p.11 -->

**Scope**

The project covers:

- User management with sign-in and two roles (Staff, and Admin/Principal, who also manages accounts), a settings screen for idle sign-out times, and a Report an issue window on every screen.
- Student records (encoding, medical history, allergies, contact validation, yearly list import, incomplete-record review, and archiving) and staff patients (teachers and school employees, with a staff list import).
- Clinic visit monitoring (daily logging, symptoms, treatment with medicines from inventory, excuse letters, PE/Sports referrals, and follow-ups).
- Emergency response (two-stage incident logging, hospital referral tracking, and parent-notification outcome logging).
- Reports (monthly reports with a weekly breakdown, incident reports, symptom summaries, a monthly inventory sheet, and Sports Reports).
- A first-aid checklist, an inventory tracker, a clinic dashboard with an activity calendar, backup verification, and an audit log viewer.
- Deployment on the clinic’s existing workstation with XAMPP (Apache, PHP, and MariaDB) at http://localhost, with data handling aligned with Republic Act No. 10173, daily backups, staff training, and user acceptance testing at the client site.

The project does not cover;

- Remote or off-campus access and cloud hosting. The architecture is API-driven, so these can be added later through a deployment change, but the client has not agreed to them.
- A parent or guardian portal and automated SMS or push notifications; parents continue to be reached by phone.
- Canteen staff access and accounts for PE/Sports Instructors, who ask the School Clinician.
- QR codes for students and system-generated student numbers. Students are identified by the 12-digit Learner Reference Number (LRN); the QR code on the authenticator setup screen belongs to the authenticator app.
- A cloud or off-site backup copy, immunization tracking, clinic queues, Excel export, RFID, barcode, or biometric hardware, billing or insurance modules, and multi-school hosting.
- Medical certificates. CLINIQ issues clinic excuse letters only.

<!-- p.12 -->

## 2. Project Organization

### 2.1. External Interface

Cavite State University, through the College of Engineering and Information Technology (CEIT), supervises the project as the parent organization, and the clinic of Mendez Christian Academy uses the system as the customer. The team answers to the School Clinician for requirements and acceptance and to the course adviser for academic milestones. Figure 1 and Table 1 show the external parties. Figure 2 shows the Organizational structure of Mendez Christian Academy.

![Figure 1. External Interface](assets/figure-01-external-interface.png)

Figure 1. External Interface

<details><summary>Diagram source (Mermaid)</summary>

<!-- diagram: figure-01-external-interface -->
```mermaid
flowchart TB
  CEIT["<b>CvSU-CEIT</b><br>(parent organization, course adviser)"]
  CLIN["<b>School Clinician (Staff)</b><br>Primary user and product owner"]
  PRIN["<b>School Principal (Admin)</b><br>Signs in at the clinic workstation"]
  REG["<b>Registrar’s Office</b><br>Source of the yearly<br>student list"]
  PE["<b>PE/Sports Department</b><br>Source of injury referrals"]
  PAR["<b>Parents and Guardians</b><br>Contacted by phone,<br>outside the system"]
  IT["<b>Outsourced IT provider</b><br>Maintenance and<br>recovery testing"]
  C(("<b>CLINIQ</b><br><b>(clinic workstation)</b>"))
  CEIT -. milestone review .-> C
  CLIN -- "records,<br>reports" --> C
  PRIN -- "view only;<br>Monthly Report (PDF)" --> C
  REG -. CSV file .-> C
  PE -. referral .-> C
  PAR -- "phone call by<br>clinician" --> C
  IT -- support --> C
  classDef purple fill:#ede7fb,stroke:#7c5cc4
  classDef green fill:#e6f4df,stroke:#5fa04e
  classDef blue fill:#e3edfb,stroke:#3b78d8
  classDef teal fill:#def3f1,stroke:#3aa39a
  classDef orange fill:#fdf0d6,stroke:#e0a537
  classDef violet fill:#f1e6fa,stroke:#9b59c9
  classDef core fill:#e8f6ea,stroke:#1f7a3a,stroke-width:3px
  class CEIT purple
  class CLIN,PE green
  class PRIN blue
  class REG teal
  class PAR orange
  class IT violet
  class C core
```

</details>

**Table 1.** External parties and their roles in the project

<table>
<tr><th>Party</th><th>Role in the Project</th></tr>
<tr><td>Cavite State University, CEIT (Prof. Kryss Coleen Creus, Course Adviser)</td><td>Parent organization. Provides academic oversight, milestone review, and grading.</td></tr>
<tr><td>Ms. Jennesse Baas, School Clinician</td><td>Customer and product owner. Validates requirements, participates in user acceptance testing (UAT), and receives training.</td></tr>
<tr><td>MCA Administration / Principal</td><td>Sponsor of the digitalization effort. The Admin account is used at the clinic workstation, often with the Principal present, to read the dashboard, reports, student profiles, and incident reports on screen and to manage accounts. The Admin account does not print. The Principal receives the Monthly Report as a PDF from the School Clinician.</td></tr>
<tr><td>Registrar’s Office</td><td>Source of authoritative student information, including the yearly list that sets each student’s grade and section. The import waits for the school’s data privacy agreement.</td></tr>
<!-- p.13 -->
<tr><td>PE/Sports Department</td><td>Source of injury referrals that the Staff log. Requests a printed Sports Report. Has no system account.</td></tr>
<tr><td>Outsourced IT provider</td><td>Maintains the clinic workstation and network. Partners in quarterly backup-recovery testing and major hardware issues.</td></tr>
</table>

![Figure 2. Organizational structure of Mendez Christian Academy](assets/figure-02-organizational-structure.png)

Figure 2. Organizational structure of Mendez Christian Academy

### 2.2. Internal Structure

The team has three members: Ghenly B. Tinapay (Project Manager and client liaison), Christian John C. Lugami (System Analyst), and Zean Kurt G. Balboa (Developer/Tester). The structure mirrors the clinic’s own limited manpower and enforces clear roles, no duplicated effort, and standardized handoffs. All members report jointly to the client and to the course adviser, with no separate management layer between the developers and the client.

![Figure 3. Team hierarchy of the CLINIQ project](assets/figure-03-team-hierarchy.png)

Figure 3. Team hierarchy of the CLINIQ project

<!-- p.14 -->

### 2.3. Roles and Responsibilities

Each member leads the activities in Table 2 and helps in the others when needed. For example, all three members join the client interviews and UAT.

**Table 2.** Roles and responsibilities of the team

<table>
<tr><th>Activity</th><th>Nature</th><th>Supporting processes</th><th>Responsible</th></tr>
<tr><td>Project management</td><td>Planning, coordination, scope and risk control, and communication with the client and adviser</td><td>Weekly planning; risk register; scope decision log; status reports to the adviser; document consolidation</td><td>Ghenly B. Tinapay, Project Manager</td></tr>
<tr><td>Requirements and analysis</td><td>Understanding clinic work and converting needs into requirements</td><td>Interviews with the School Clinician and the ICT Head; functional and non-functional requirements; traceability table; UAT scenarios and test cases</td><td>Christian John C. Lugami, System Analyst (all members join interviews)</td></tr>
<tr><td>System design</td><td>Architecture, database, and interface design</td><td>ERD and data dictionary; context, use-case, state, and sequence diagrams; design system; screen inventory; wireframes</td><td>Christian John C. Lugami, System Analyst</td></tr>
<tr><td>Frontend development</td><td>Screens built first on sample data</td><td>React and TypeScript; shared components; role-guarded routes; keyboard shortcuts; accessibility review</td><td>Zean Kurt G. Balboa, Developer/Tester</td></tr>
<!-- p.15 -->
<tr><td>Backend development</td><td>API, database, sign-in, audit, and backup</td><td>Laravel modules; migrations from the approved ERD; Sanctum sign-in; task scheduler; Pest tests</td><td>Zean Kurt G. Balboa, Developer/Tester</td></tr>
<tr><td>Testing</td><td>Verifying that the system meets the requirements</td><td>Vitest and React Testing Library; Pest; database constraint tests; UAT with the School Clinician</td><td>Zean Kurt G. Balboa, Developer/Tester (all members join testing)</td></tr>
<tr><td>Deployment and training</td><td>Installation on the clinic workstation and staff training</td><td>XAMPP installation and hardening; Windows Task Scheduler for backups; hands-on training session; user manual</td><td>Zean Kurt G. Balboa (lead); Ghenly B. Tinapay</td></tr>
<tr><td>Documentation and defense</td><td>Project documents and the final presentation</td><td>Project plan; software requirements specification; decision log; manuals; source repository handover; defense materials</td><td>Ghenly B. Tinapay, Project Manager (all members)</td></tr>
</table>

### 2.4. Deliverables

The team delivers CLINIQ, a web application hosted on the clinic workstation. It brings together user management, student records, staff patients, clinic visits, emergency response, a first-aid checklist, an inventory tracker, a dashboard, report generation, backup verification, and an audit log viewer. Table 3 lists the outputs that the team hands over, from the project plan to the working system and the training that lets the clinic run it without outside help.

<!-- p.16 -->

**Table 3.** Project deliverables and target weeks

| Deliverable | Target |
| --- | --- |
| System design artifacts (SRS draft and analysis models) | September 18, 2026 |
| Working prototype (frontend on sample data) | November 13, 2026 |
| Project plan | November 19, 2026 |
| Backend (API and database) | November 20, 2026 |
| Test plan and test results | To be scheduled |
| Deployed system at Mendez Christian Academy | To be scheduled |
| User manual and training materials | To be scheduled |
| Source code repository (handover copy) | To be scheduled |
| Final defense and presentation | To be scheduled |

<!-- p.17 -->

## 3. Review of Existing Alternatives

### 3.1. Current Practice

The clinic currently copes with the problem through handwritten logbooks, paper forms, and Excel spreadsheets. The School Clinician writes each visit in the logbook, encodes the same data in Excel, and compiles the monthly summaries by hand. The staff call parents manually and record the outcome in a handwritten log. One shared computer supports all digital work, and no backup exists. This process is slow, prone to error, and difficult to search.

### 3.2. Related System

The team reviewed five existing systems: two academic systems built for Philippine school clinics and three commercial platforms.

- E-Konsulta (Cadingilan et al., 2025) is a web-based clinic medical record system for Saint Columban College in Pagadian City. It provides a login-secured dashboard, patient records, dental schedule management, data backup, reports generated from logged visits, and remote follow-up consultations through Google Meet.
- ClinicSync (Erio et al., 2025) is an electronic medical records system for the clinic of King’s College of the Philippines, Benguet Campus, developed with Extreme Programming. It provides patient records, real-time consultation documentation, role-based accounts, and a dashboard with inventory alerts. Its authors report a 97.8% user-acceptance rate and a System Usability Scale score of 79.7.
- SurgiCare Medical Inventory (SurgiCare, n.d.)  is a commercial inventory platform for medical facilities. It does not store clinical records. It covers barcode tracking, purchase orders, vendors, expiration monitoring, and stock visibility across several rooms or sites.
- EduHealth System (EduHealth System, 2023) is a cloud-based electronic health record platform for K-12 schools. It provides searchable student health profiles, immunization compliance tracking, medication authorization, a bulk scanner for paper forms, multi-role access, and integration with a school’s information system.
- Medical Tracker (Medical Tracker, n.d.) is a United Kingdom platform for school first-aid and medical incident management. It provides fast incident logging (about 30 seconds per incident),
<!-- p.18 -->
medication administration with expiry tracking, first-aid qualification records, care plans, parent notifications, and reports.

### 3.3. Feature Comparison

Table 4 compares the five systems with CLINIQ. A check mark (✓) means the feature is available, and a dash (–) means it is not available.

**Table 4.** Feature comparison of the related systems and CLINIQ

<table>
<tr><th>Feature</th><th>SEAIT</th><th>E-Konsulta</th><th>SurgiCare</th><th>ClinicSync</th><th>EduHealth</th><th>CLINIQ</th></tr>
<tr><td>User login / secure authentication</td><td align="center">✓</td><td align="center">✓</td><td align="center">–</td><td align="center">✓</td><td align="center">✓</td><td align="center">✓</td></tr>
<tr><td>Role-based access control</td><td align="center">–</td><td align="center">✓</td><td align="center">–</td><td align="center">✓</td><td align="center">–</td><td align="center">✓</td></tr>
<tr><td>Dashboard overview</td><td align="center">✓</td><td align="center">✓</td><td align="center">–</td><td align="center">✓</td><td align="center">✓</td><td align="center">✓</td></tr>
<tr><td>Patient record management / EMR</td><td align="center">✓</td><td align="center">✓</td><td align="center">–</td><td align="center">✓</td><td align="center">✓</td><td align="center">✓</td></tr>
<tr><td>Medical history access (allergies, illnesses)</td><td align="center">–</td><td align="center">✓</td><td align="center">–</td><td align="center">✓</td><td align="center">✓</td><td align="center">✓</td></tr>
<tr><td>Health check-up record entry</td><td align="center">✓</td><td align="center">✓</td><td align="center">–</td><td align="center">✓</td><td align="center">–</td><td align="center">✓</td></tr>
<tr><td>Emergency / first-aid incident logging</td><td align="center">–</td><td align="center">✓</td><td align="center">–</td><td align="center">–</td><td align="center">✓</td><td align="center">✓</td></tr>
<tr><td>Appointment scheduling</td><td align="center">✓</td><td align="center">✓</td><td align="center">–</td><td align="center">–</td><td align="center">–</td><td align="center">–</td></tr>
<tr><td>Online follow-up consultation</td><td align="center">✓</td><td align="center">–</td><td align="center">–</td><td align="center">–</td><td align="center">–</td><td align="center">–</td></tr>
<tr><td>Immunization tracking and compliance</td><td align="center">–</td><td align="center">–</td><td align="center">–</td><td align="center">✓</td><td align="center">–</td><td align="center">–</td></tr>
<tr><td>Care plan management (chronic conditions)</td><td align="center">–</td><td align="center">–</td><td align="center">–</td><td align="center">✓</td><td align="center">✓</td><td align="center">–</td></tr>
<tr><td>Staff / first-aid qualification tracking</td><td align="center">–</td><td align="center">–</td><td align="center">–</td><td align="center">–</td><td align="center">✓</td><td align="center">–</td></tr>
<!-- p.19 -->
<tr><td>Automated alerts and notifications</td><td align="center">–</td><td align="center">✓</td><td align="center">–</td><td align="center">–</td><td align="center">✓</td><td align="center">–</td></tr>
<tr><td>Automated report generation</td><td align="center">✓</td><td align="center">✓</td><td align="center">–</td><td align="center">✓</td><td align="center">✓</td><td align="center">✓</td></tr>
<tr><td>Data backup</td><td align="center">✓</td><td align="center">–</td><td align="center">–</td><td align="center">–</td><td align="center">–</td><td align="center">✓</td></tr>
<tr><td>Cloud-based / multi-device access</td><td align="center">–</td><td align="center">✓</td><td align="center">✓</td><td align="center">✓</td><td align="center">✓</td><td align="center">–</td></tr>
<tr><td>Integration with the school information system</td><td align="center">–</td><td align="center">–</td><td align="center">–</td><td align="center">✓</td><td align="center">✓</td><td align="center">–</td></tr>
<tr><td>Medicine inventory management</td><td align="center">✓</td><td align="center">✓</td><td align="center">✓</td><td align="center">✓</td><td align="center">✓</td><td align="center">✓</td></tr>
<tr><td>Medical supply and treatment material tracking</td><td align="center">–</td><td align="center">✓</td><td align="center">✓</td><td align="center">✓</td><td align="center">–</td><td align="center">✓</td></tr>
<tr><td>Stock-level monitoring and low-stock alerts</td><td align="center">–</td><td align="center">✓</td><td align="center">✓</td><td align="center">✓</td><td align="center">✓</td><td align="center">✓</td></tr>
<tr><td>Expiration date tracking</td><td align="center">✓</td><td align="center">–</td><td align="center">✓</td><td align="center">–</td><td align="center">✓</td><td align="center">✓</td></tr>
<tr><td>Barcode scanning</td><td align="center">–</td><td align="center">–</td><td align="center">✓</td><td align="center">–</td><td align="center">–</td><td align="center">–</td></tr>
<tr><td>Purchase order and vendor management</td><td align="center">–</td><td align="center">–</td><td align="center">✓</td><td align="center">–</td><td align="center">–</td><td align="center">–</td></tr>
<tr><td>Usage reporting</td><td align="center">✓</td><td align="center">✓</td><td align="center">✓</td><td align="center">✓</td><td align="center">✓</td><td align="center">✓</td></tr>
<tr><td>Inventory visibility across rooms or locations</td><td align="center">–</td><td align="center">–</td><td align="center">✓</td><td align="center">–</td><td align="center">✓</td><td align="center">–</td></tr>
<tr><td>User login / secure authentication</td><td align="center">✓</td><td align="center">✓</td><td align="center">–</td><td align="center">✓</td><td align="center">✓</td><td align="center">✓</td></tr>
<tr><td>Role-based access control</td><td align="center">–</td><td align="center">✓</td><td align="center">–</td><td align="center">✓</td><td align="center">–</td><td align="center">✓</td></tr>
<tr><td>Dashboard overview</td><td align="center">✓</td><td align="center">✓</td><td align="center">–</td><td align="center">✓</td><td align="center">✓</td><td align="center">✓</td></tr>
<!-- p.20 -->
<tr><td>Patient record management / EMR</td><td align="center">✓</td><td align="center">✓</td><td align="center">–</td><td align="center">✓</td><td align="center">✓</td><td align="center">✓</td></tr>
</table>

### 3.4. Assessment

The comparison shows that no single reviewed system fits the clinic’s needs and constraints. The commercial platforms offer broad features but depend on cloud hosting and subscriptions. SurgiCare covers inventory only. E-Konsulta and ClinicSync are the closest to a school clinic, but E-Konsulta relies on Google Meet for its distinguishing feature, and ClinicSync relies on a hosted authentication service. None of the five targets a clinic that has one workstation, no internet dependency, and no budget for subscriptions.

CLINIQ adopts the following current best practices:

- Role-based access control (ClinicSync and EduHealth).
- Fast incident capture that is completed later, which follows the speed-oriented design of Medical Tracker.
- Inventory with expiry and low-stock alerting (SurgiCare, EduHealth, and Medical Tracker).
- Aggregated dashboards and automated reports (E-Konsulta and ClinicSync).
- Structured user acceptance evaluation, which follows the published usability testing of ClinicSync.

CLINIQ differs in its deployment. It runs on the clinic’s existing workstation at http://localhost without internet access, subscription, or new hardware, because this is the constraint under which the client operates.

## 4. Approach to be Taken in this Subject

### 4.1. Theoretical Framework / Methods to be Used

<!-- p.21 -->

CLINIQ is developed through evolutionary iterative prototyping (Pressman & Maxim, 2020; Sommerville, 2016). The team builds a working prototype from the best-understood requirements, the client uses it, and the team refines it after each round of feedback. The prototype is never restarted: each version builds on the previous one, and the accepted prototype becomes the final system, unlike throwaway prototyping, in which each prototype is discarded after use. This variant suits projects whose requirements are unclear at the start and change as users see the system.

Each iteration plans the modules from the best-understood or most important requirements, quick-designs their screens, data, and rules, builds or refines them on the previous version with unit and regression tests, demonstrates the result to the School Clinician and staff with sample data, classifies the feedback as fix now, next iteration, or later, and refines the version and requirements. The cycle repeats until the clinic staff accept the prototype (Figure 4).

![Figure 4. Evolutionary iterative prototyping process used for CLINIQ](assets/figure-04-evolutionary-iterative-prototyping.png)

Figure 4. Evolutionary iterative prototyping process used for CLINIQ

<details><summary>Diagram source (Mermaid)</summary>

<!-- diagram: figure-04-evolutionary-iterative-prototyping -->
```mermaid
flowchart LR
  S1["1. Start with the<br>best-understood<br>requirements"] --> S2["2. Quick design<br>of the next<br>screens"] --> S3["3. Build or refine<br>the prototype on<br>sample data"] --> S4["4. Client review<br>with the<br>School Clinician"] --> S5["5. Feedback log:<br>fix now, next<br>iteration, or later"]
  S6["6. Connect one module<br>at a time to the<br>backend"] --> S7["7. Test: unit, regression,<br>and database<br>constraint tests"] --> S8["8. User acceptance<br>testing at the clinic"] --> S9["9. Deploy on the clinic<br>workstation, train<br>staff, and hand over"]
  S5 -- "refine the prototype and requirements, then repeat the cycle" --> S2
  S5 -- "once the School Clinician accepts the screens, they are connected to the backend" --> S6
  classDef green fill:#e3f4e6,stroke:#2e8b3a
  classDef yellow fill:#fdf8c8,stroke:#a8a020
  class S1,S2,S3,S4,S5 green
  class S6,S7,S8,S9 yellow
  linkStyle 7,8 stroke:#2e8b3a
```

</details>

Supporting concepts:

- Privacy by design (Republic Act No. 10173, 2012). Least-privilege roles, a display rule that hides names on shared screens, an append-only audit trail, and defined retention.
- Usability engineering (Nielsen, 2026). Efficiency for the expert user, clear system status, and error prevention for busy clinic staff.
- Modularity. The frontend and backend are organized by module, so each module can be developed, tested, and handed off on its own.

Design principles, methods, and models:

- Process models. Context diagram, data-flow diagram, use-case diagram, activity diagrams for the visit and emergency workflows, state diagrams (school year, incident, and follow-up), and sequence
<!-- p.22 -->
  diagrams (sign-in, idle sign-out, password recovery, and visit recording).
- Data models. Entity-relationship diagram, data dictionary, and a reference schema whose CHECK, UNIQUE, and foreign-key rules are verified by constraint tests.
- Interface models. A design system based on the school’s brand colors (green #039935 and gold #EAEA09), a screen inventory, a screen-flow map, and reference screens that all other screens follow.
- Architecture. A three-tier, API-first design with business rules on the server and a single local origin.

Testing methods and assessment scheme:

Every iteration includes unit tests of new logic, regression tests of earlier modules, and functional checks before the review session. The frontend uses Vitest and React Testing Library, the backend uses Pest, and database constraint tests verify the schema rules. Integration testing, usability testing, and UAT follow after the modules are connected. The project is assessed through four measures:

- Review sessions with the School Clinician after each iteration.
- Automated test results for the frontend, the backend, and the database constraints.
- UAT at the clinic, using a questionnaire based on the product quality characteristics of ISO/IEC 25010 (International Organization for Standardization & International Electrotechnical Commission [ISO/IEC], 2023).
- The measurable targets in the specific objectives, namely documentation time, error reduction, report automation, backup status, and implementation cost. For the first objective, the team measures the current manual documentation time as a baseline during UAT preparation and compares it with the time in the system.

### 4.2. Rationale for the Framework / Methods

This approach fits the project for three reasons:

- The clinic workflow (first-aid treatment, emergency referral, visit logging, and medicine dispensing) is difficult to specify on paper alone. A working prototype lets the School Clinician react to something tangible and exposes gaps that interviews and documents miss.
<!-- p.23 -->
- The team has three members. Building, testing, and refining one version at a time keeps the workload manageable without parallel workstreams.
- The client has one workstation and limited time away from clinic duties. An early usable version allows the staff to validate and adjust the system while changes are still inexpensive, instead of discovering mismatches at turnover.

Compared with a sequential approach, which fixes the requirements before the client sees any software, evolutionary prototyping reduces the risk of building the wrong system. Compared with throwaway prototyping, it avoids rebuilding accepted screens, which saves effort for a small team. The use of iterative development with user feedback in ClinicSync (Erio et al., 2025) also shows that this style fits school clinic projects. The course adviser/professors checks each iteration, and the team revises it with client feedback before the next round. The cycle ends with formal UAT and turnover once the system is functional and ready for operation.

### 4.3. Technologies you plan to consider or use

The table below lists the technology stack CLINIQ will use.

**Table 5.** Technology stack of CLINIQ

<table>
<tr><th>Category</th><th>Technology</th><th>Reason</th></tr>
<tr><td>Frontend</td><td>React 19, TypeScript 6, Vite 8, and Tailwind CSS 4</td><td>Builds a fast single-page application that compiles to static files, so the clinic workstation needs no Node.js at run time.</td></tr>
<tr><td>Routing and data</td><td>React Router 7 and a promise-based data hook with feature-level API files</td><td>Provides path-based screens with one role-guarded route table. The same hook later switches from sample data to the real API.</td></tr>
<tr><td>Charts</td><td>Chart.js 4 with react-chartjs-2</td><td>Is lighter than the alternative considered, which matters on a 4 GB workstation. Each chart has a table fallback.</td></tr>
<tr><td>Backend</td><td>Laravel 13 (PHP 8.3 or newer) with Laravel Sanctum 4 in SPA cookie mode</td><td>Is a mature framework with built-in validation, scheduling, and testing. Sanctum suits a React and Laravel pairing and avoids storing tokens in the browser (Laravel, n.d.).</td></tr>
<!-- p.24 -->
<tr><td>Database</td><td>MariaDB 10.11 (from XAMPP)</td><td>Is free, MySQL-compatible, and enforces schema rules through CHECK, UNIQUE, and foreign-key constraints.</td></tr>
<tr><td>Local server</td><td>XAMPP (Apache 2.4 and PHP 8.5)</td><td>Gives the same environment on every development machine and on the clinic workstation, and serves the frontend and API from one origin.</td></tr>
<tr><td>Testing and quality</td><td>Vitest, React Testing Library, Pest, Laravel Pint, and Larastan</td><td>Provide automated checks for both sides, code style, and static analysis.</td></tr>
<tr><td>Scheduling</td><td>Laravel scheduler run by Windows Task Scheduler</td><td>Runs the daily backup without extra software.</td></tr>
<tr><td>Version control</td><td>Git and GitHub</td><td>Records the change history, supports review, and provides the handover copy of the source.</td></tr>
</table>

The closest existing product in scope is Medical Tracker. Compared with it, the chosen stack lets CLINIQ run on the clinic computer without internet or subscription. It also supports features specific to the MCA clinic: a two-stage incident form for emergencies, an excuse-letter approval workflow, Sports Reports for PE instructors, batch-level stock tracking with disposal of expired items, archiving by school year with a retention rule, a display-privacy rule for shared screens, and self-checking backups. All tools are free and open source.

## 5. System Design

### 5.1. Requirements

<!-- p.25 -->

Each requirement states one behavior that the team can verify through testing. Table 6 covers what the system does, and Table 7 covers its performance, security, privacy, reliability, and operating conditions.

**Table 6.** Functional Requirements

<table>
<tr><th>ID</th><th>The system shall…</th></tr>
<tr><td>FR-01</td><td><b>Accounts and roles.</b> Provide role-based sign-in, account management, self-service profiles, and a Report an issue window on every screen for both roles. Staff have full read and write access. The Admin/Principal reads the dashboard, reports, student profiles, incident records, and the audit log, maintains calendar events and accounts, has full Backup Verification, and never prints. PE/Sports Instructors have no account.</td></tr>
<tr><td>FR-02</td><td><b>Student and staff records.</b> Support student record encoding with duplicate detection and mandatory fields; lock the LRN once it is used and require a reason to correct a name. Record teachers and school employees as clinic patients identified by a Staff No. Import the registrar’s yearly student list (which sets grade and section) and the staff list through a preview, keep incomplete records in a review queue, and archive students missing from the new list after a review. The registrar’s file format and the school’s privacy agreement are still pending.</td></tr>
<tr><td>FR-03</td><td><b>School year.</b> Let Staff start each new school year by hand after a Dashboard reminder. The system archives records by reviewed rules, and archived records stay read-only.</td></tr>
<tr><td>FR-04</td><td><b>Visits, excuse letters, and referrals.</b> Log daily clinic visits with the complaint, treatment, medicines and supplies taken from inventory, and the disposition. Start each form with the patient identified through a lookup by LRN or name, and present rule-based first-aid checklist prompts. Mark an erroneous entry as an error instead of deleting it, and escalate a visit to an incident when needed. Handle excuse letters with one-step approval and a warning above three days, and log PE/Sports referrals. Medical certificates are out of scope.</td></tr>
<tr><td>FR-05</td><td><b>Emergency incidents.</b> Support two-stage incident logging, with the essential fields captured first and the details completed afterward. Track hospital referrals, and log each parent-notification attempt with a timestamp and an outcome.</td></tr>
<!-- p.26 -->
<tr><td>FR-06</td><td><b>Follow-ups.</b> Manage follow-ups with Pending, Completed, Missed, and Cancelled status, without SMS or push services. Mark a follow-up overdue after three days and close it automatically after seven; these starting values are settings that the School Clinician confirms.</td></tr>
<tr><td>FR-07</td><td><b>Inventory.</b> Deduct medicines and supplies from received batches, earliest-expiring first, with low-stock and near-expiry alerts and explicit disposal of expired stock. Refuse a dispense beyond the usable stock; lock the medicines of a completed incident; add a new batch on restock; and flag a large write-off. Suggest items tagged for the selected symptom first, without blocking other items.</td></tr>
<tr><td>FR-08</td><td><b>Reports.</b> Generate monthly reports with a weekly breakdown, incident reports, symptom summaries, a monthly inventory sheet, and Sports Reports, each as an A4 printout. The School Clinician prints a report or saves it as a PDF from the print window and sends the Monthly Report to the Principal. The Admin/Principal sees a view-only month list of reports, without printing.</td></tr>
<tr><td>FR-09</td><td><b>Privacy display.</b> Show only the masked LRN (last four digits), never a name, on multi-student lists and dashboards. Show full identifiers on single-student screens and printouts, and allow full-LRN printouts for Staff only.</td></tr>
<tr><td>FR-10</td><td><b>Dashboard and calendar.</b> Provide a clinic dashboard with Overview and Trends views (counts, pending records, health trends, a possible-cluster alert, frequent-visitor warnings, and due follow-ups) and a separate activity calendar with school events added by Staff and Admin and national holidays. A monthly holiday sync keeps the holidays current and warns when it is stale. The starting alert values are a frequent visitor at three visits in 14 days and a possible cluster of three students with the same complaint and grade within three days; the School Clinician confirms these values.</td></tr>
<tr><td>FR-11</td><td><b>Backup.</b> Run daily automated backups to the internal and external locations chosen by the School Clinician, and run a backup at sign-out. Show a status indicator, offer Back up now and Verify latest backup actions, and warn when the last good backup is older than 48 hours. The School Clinician can add and disable backup locations but never delete them, and the system creates the backup folders in each location automatically.</td></tr>
<!-- p.27 -->
<tr><td>FR-12</td><td><b>Audit log.</b> Record every sign-in, submission, approval, print, and opened profile in an append-only audit log that both roles can view read-only. Log summaries name the fields and never the values.</td></tr>
<tr><td>FR-13</td><td><b>Sign-in security and recovery.</b> Apply sign-in lockout and 7-day sessions. Support authenticator-based password recovery, with authenticator setup, disabling, and recovery codes in the account menu. Sign out idle users per role after a warning; the idle times are settings that Staff change (default 60 minutes for Staff and 30 minutes for Admin, each between 10 and 240 minutes).</td></tr>
</table>

**Table 7.** Non-Functional Requirements

<table>
<tr><th>ID</th><th>The system shall…</th></tr>
<tr><td>NFR-01</td><td><b>Performance.</b> Run on the existing Intel Core i3, 4 GB RAM workstation without perceptible lag during data entry. The frontend is prebuilt into static files.</td></tr>
<tr><td>NFR-02</td><td><b>Security and privacy.</b> Protect data with bcrypt-hashed passwords, 7-day sessions, per-role idle sign-out with a warning, authenticator-based recovery, an offline password reset for the Admin account, and data handling in line with Republic Act No. 10173. Lock an account for five minutes after five failed sign-ins and record the lockout in the audit log without recording password values.</td></tr>
<tr><td>NFR-03</td><td><b>Audit and retention.</b> Retain the audit log for ten years; the application’s database account cannot update or delete audit log rows. Retain student and staff-patient records for five years from archive. The retention policy is defined, and the tool that purges old records is planned.</td></tr>
<tr><td>NFR-04</td><td><b>Offline operation and deployment.</b> Function fully offline, hosted on the clinic workstation and used only there at http://localhost, with Windows Firewall blocking inbound connections. Apply physical controls because the clinic room is shared and unlocked: a Windows sign-in password, a screen lock after 5 to 10 minutes, and BitLocker if the workstation runs Windows Pro.</td></tr>
<tr><td>NFR-05</td><td><b>Backup and recovery.</b> Keep the latest 60 daily backups per location, warn after 48 hours without a good backup, provide a guided recovery checklist, and require at least <!-- p.28 --> one location on a drive kept away from the clinic room. The system makes no cloud copy.</td></tr>
<tr><td>NFR-06</td><td><b>Usability.</b> Be learnable by non-technical clinic staff within a single training session.</td></tr>
<tr><td>NFR-07</td><td><b>Maintainability.</b> Remain maintainable by the school’s outsourced IT provider after the team’s academic involvement ends, with every module a loosely coupled unit that can be developed and tested independently.</td></tr>
<tr><td>NFR-08</td><td><b>Data integrity.</b> Enforce integrity rules in the database through CHECK, UNIQUE, and foreign-key constraints, verified by constraint tests.</td></tr>
</table>

### 5.2. Resources

Table 8 groups the hardware, software, people, and data that the project needs.

**Table 8**. Project Resources

<table>
<tr><th>Type</th><th>Resource</th><th>Notes</th></tr>
<tr><td rowspan="4">Hardware</td><td>Clinic workstation (existing, Windows 11)</td><td>Acts as both the application server and the database server. The planned minimum is an Intel Core i3 or equivalent, 4 GB RAM, and 100 GB storage. The ICT Head could not recall the exact specifications, so the team checked them at deployment.</td></tr>
<tr><td>Clinic printer (existing)</td><td>Prints reports, excuse letters, and incident reports.</td></tr>
<tr><td>External USB hard drive and USB flash drive (to be purchased)</td><td>The hard drive is the backup location kept away from the clinic room. The flash drive carries the installer and the handover copy. Possible client expense.</td></tr>
<tr><td>Development computers of the team</td><td>Each runs the same XAMPP setup as the clinic workstation.</td></tr>
<!-- p.29 -->
<tr><td>Servers</td><td>Apache and MariaDB on the clinic workstation</td><td>No external server, virtual desktop, or cloud resource is used. Apache listens on 127.0.0.1 only.</td></tr>
<tr><td>Network</td><td>School LAN and Wi-Fi (PLDT Fiber)</td><td>Exists but is not used by CLINIQ. The Internet is optional and used only for the holiday list synchronization.</td></tr>
<tr><td rowspan="2">Software</td><td>XAMPP (Apache, PHP, and MariaDB), Composer, and Node.js 22 or later (development only)</td><td>Versions are pinned from the development machine and matched to the clinic workstation at deployment.</td></tr>
<tr><td>Laravel, Sanctum, React, TypeScript, Vite, Tailwind CSS, Chart.js, Vitest, Pest, and Git</td><td>All are free and open source, so no license fees apply. Windows 11 is already licensed on the clinic workstation.</td></tr>
<tr><td>People</td><td>The three proponents, Ms. Jennesse Baas, the school’s ICT Head, and the outsourced IT provider</td><td>The School Clinician reviews each prototype and takes part in UAT. The IT provider handles recovery testing and major hardware issues.</td></tr>
<tr><td>Room security</td><td>Windows sign-in password, screen lock after 5 to 10 minutes, and BitLocker if the workstation runs Windows Pro</td><td>Required because the clinic room is shared and unlocked.</td></tr>
<tr><td>Data</td><td>Sample data now and real seed data later</td><td>Still to be collected: grade levels, complaint types (approved by the School Clinician), the medicine and supply list with starting stock and expiry dates, initial accounts, and the registrar’s file format.</td></tr>
</table>

### 5.3. System Overview

<!-- p.30 -->

The design of CLINIQ is described through its architecture and wireframe. Figure 1 shows how the system relates to the people and offices around it.

#### 5.3.1. System Architecture

The architecture has three tiers: a React and TypeScript single-page application, a Laravel REST API that holds the business rules and sign-in, and a MariaDB database. In development, the frontend runs on the Vite server. In production, the built frontend is copied into the Laravel public folder, and Apache serves everything from one origin, http://localhost. Because the frontend reaches the backend only through the API, moving the backend to a remote host later is a deployment change and not a rewrite.

![Figure 5. System Architecture of the CLINIQ](assets/figure-05-system-architecture.png)

Figure 5. System Architecture of the CLINIQ

<details><summary>Diagram source (Mermaid)</summary>

<!-- diagram: figure-05-system-architecture -->
```mermaid
---
config:
  layout: elk
---
flowchart LR
  USER["Clinic<br>staff /<br>Admin"]
  subgraph PC["<b>Clinic PC (Windows 11, XAMPP) - reached only at http://localhost</b><br>Windows Firewall blocks inbound connections; MariaDB listens on 127.0.0.1 only"]
    PRES["PRESENTATION<br>Browser<br>React + TypeScript<br>Tailwind, Chart.js"]
    subgraph APACHE["<b>Apache (APPLICATION)</b>"]
      FE["Built React frontend<br>(static files)"]
      API["Laravel API<br>Sanctum SPA cookie<br>rules, audit, reports"]
    end
    DATA["DATA<br>MariaDB<br>48 tables<br>127.0.0.1:3306"]
    TS["Task Scheduler<br>(schedule:run each minute)"]
  end
  PRIN["Principal<br>Monthly Report<br>(print or Save as PDF)"]
  BACK["Backup drive<br>(USB or second drive,<br>kept away from<br>the clinic room)"]
  USER --> PRES
  PRES <--> FE
  PRES <--> API
  API <--> DATA
  TS --> API
  PRES -.-> PRIN
  API -- "daily backup (zip)" --> BACK
  classDef box fill:#e8f2e8,stroke:#2f6b3a
  classDef out fill:#fdfbd3,stroke:#7a7a2a
  classDef plain fill:none,stroke:none
  class PRES,FE,API,DATA box
  class TS,PRIN,BACK out
  class USER plain
  style PC fill:#f3f8f2,stroke:#2f6b3a,stroke-dasharray:6 4
  style APACHE fill:#ffffff,stroke:#2f6b3a
  style TS fill:#ffffff,stroke:#2f6b3a
```

</details>

- Business rules (allergy checks, stock deduction, and approvals) live on the server, so they cannot be bypassed from the browser. Sign-in uses Laravel Sanctum in SPA cookie mode, so the browser stores no API token.
- Windows Task Scheduler runs the Laravel scheduler every minute, and the daily backup writes a zip file to the locations chosen in the system. MariaDB uses a limited application account that can only insert and read the audit log.
- The backend has eleven modules, shared services, and three scheduled jobs (backup, holiday sync, and follow-up closing). It is built and tested, and the frontend connects to it through a mock/API switch (ADR-080); everything is on main (ADR-081).
- If the clinic workstation ever joins the school network, a new decision on hostname, firewall rule, and HTTPS is required; no code change is expected.

#### 5.3.2. Wireframe/Prototype

<!-- p.31 -->

The figures below are screenshots of the working prototype, built on sample data and reviewed with the client. The interface follows a design system built from the school’s brand colors, a green (#039935) paired with a gold (#EAEA09). Figures 5 to 32 show the Staff screens and Figures 33 to 38 show the Admin/Principal screens. The two longest screens (Incomplete Records and Student Profile) are cropped to their top portion.

![Figure 6. Login screen](assets/figure-06-login-screen.png)

Figure 6. Login screen

![Figure 7. Staff dashboard: Overview](assets/figure-07-staff-dashboard-overview.png)

Figure 7. Staff dashboard: Overview

<!-- p.32 -->

![Figure 8. Staff dashboard: Trends](assets/figure-08-staff-dashboard-trends.png)

Figure 8. Staff dashboard: Trends

![Figure 9. Activity calendar](assets/figure-09-activity-calendar.png)

Figure 9. Activity calendar

![Figure 10. Student list](assets/figure-10-student-list.png)

Figure 10. Student list

<!-- p.33 -->

![Figure 11. Add student](assets/figure-11-add-student.png)

Figure 11. Add student

![Figure 12. Student profile (top portion)](assets/figure-12-student-profile.png)

Figure 12. Student profile (top portion)

<!-- p.34 -->

![Figure 13. Incomplete student records (top portion)](assets/figure-13-incomplete-student-records.png)

Figure 13. Incomplete student records (top portion)

![Figure 14. Import student list](assets/figure-14-import-student-list.png)

Figure 14. Import student list

![Figure 15. Staff list](assets/figure-15-staff-list.png)

Figure 15. Staff list

<!-- p.35 -->

![Figure 16. Staff profile](assets/figure-16-staff-profile.png)

Figure 16. Staff profile

![Figure 17. Visit log](assets/figure-17-visit-log.png)

Figure 17. Visit log

<!-- p.36 -->

![Figure 18. New visit](assets/figure-18-new-visit.png)

Figure 18. New visit

![Figure 19. Visit details](assets/figure-19-visit-details.png)

Figure 19. Visit details

<!-- p.37 -->

![Figure 20. Excuse letter](assets/figure-20-excuse-letter.png)

Figure 20. Excuse letter

![Figure 21. PE/Sports injury referral](assets/figure-21-pe-sports-injury-referral.png)

Figure 21. PE/Sports injury referral

<!-- p.38 -->

![Figure 22. Follow-ups](assets/figure-22-follow-ups.png)

Figure 22. Follow-ups

![Figure 23. Incident log](assets/figure-23-incident-log.png)

Figure 23. Incident log

![Figure 24. Report incident: Stage 1](assets/figure-24-report-incident-stage-1.png)

Figure 24. Report incident: Stage 1

<!-- p.39 -->

![Figure 25. Complete incident record: Stage 2](assets/figure-25-complete-incident-record-stage-2.png)

Figure 25. Complete incident record: Stage 2

![Figure 26. Incident report](assets/figure-26-incident-report.png)

Figure 26. Incident report

![Figure 27. Inventory list](assets/figure-27-inventory-list.png)

Figure 27. Inventory list

<!-- p.40 -->

![Figure 28. Dispense log (usage history)](assets/figure-28-dispense-log.png)

Figure 28. Dispense log (usage history)

![Figure 29. Monthly report](assets/figure-29-monthly-report.png)

Figure 29. Monthly report

![Figure 30. Sports reports](assets/figure-30-sports-reports.png)

Figure 30. Sports reports

<!-- p.41 -->

![Figure 31. Backup verification](assets/figure-31-backup-verification.png)

Figure 31. Backup verification

![Figure 32. Audit log](assets/figure-32-audit-log.png)

Figure 32. Audit log

![Figure 33. Settings](assets/figure-33-settings.png)

Figure 33. Settings

<!-- p.42 -->

![Figure 34. Admin dashboard](assets/figure-34-admin-dashboard.png)

Figure 34. Admin dashboard

![Figure 35. Admin: Student list (read-only)](assets/figure-35-admin-student-list.png)

Figure 35. Admin: Student list (read-only)

![Figure 36. Admin: Reports](assets/figure-36-admin-reports.png)

Figure 36. Admin: Reports

<!-- p.43 -->

![Figure 37. Admin: User accounts (top portion)](assets/figure-37-admin-user-accounts.png)

Figure 37. Admin: User accounts (top portion)

![Figure 38. Admin: Add user](assets/figure-38-admin-add-user.png)

Figure 38. Admin: Add user

![Figure 38. Admin: Archive](assets/figure-38-admin-archive.png)

Figure 38. Admin: Archive

<!-- p.44 -->

## 6. Project Timeline

### 6.1. Gantt Chart

Figures 39 and 40 show the Gantt chart of the project for Software Engineering I and Software Engineering II.

![Figure 39. Gantt chart: Software Engineering I](assets/figure-39-gantt-chart-software-engineering-i.png)

Figure 39. Gantt chart: Software Engineering I

![Figure 40. Gantt chart: Software Engineering II](assets/figure-40-gantt-chart-software-engineering-ii.png)

Figure 40. Gantt chart: Software Engineering II

### 6.2. Work Breakdown Structure

Table 9 divides each phase of the Gantt chart into tasks and uses the same numbers, owners, and dates. The owners are PM (Project Manager, Ghenly B. Tinapay), SA (System Analyst, Christian John C. Lugami), QA (Developer/Tester, Zean Kurt G. Balboa), and ALL (all members). The statuses are as of November 15, 2026.

**Table 9.** Work Breakdown Structure

<table>
<tr><th>WBS ID</th><th>Task</th><th>Owner</th><th>Start</th><th>End</th><th>Status</th></tr>
<tr><td colspan="6"><b>1. Team Formation and Project Setup</b></td></tr>
<tr><td>1.1</td><td>Set up team collaboration tools <!-- p.45 --> (Trello, group chat, Google Drive)</td><td>PM</td><td>Feb 14, 2026</td><td>Feb 16, 2026</td><td>Completed</td></tr>
<tr><td>1.2</td><td>Establish team identity (group name and logo)</td><td>PM, SA</td><td>Feb 15, 2026</td><td>Feb 17, 2026</td><td>Completed</td></tr>
<tr><td>1.3</td><td>Create Meeting of the Minutes Template</td><td>QA</td><td>Feb 18, 2026</td><td>Feb 19, 2026</td><td>Completed</td></tr>
<tr><td>1.4</td><td>Finalize the MoM template</td><td>QA</td><td>Feb 19, 2026</td><td>Feb 22, 2026</td><td>Completed</td></tr>
<tr><td>1.5</td><td>Conduct first online team meeting</td><td>ALL</td><td>Feb 23, 2026</td><td>Feb 23, 2026</td><td>Completed</td></tr>
<tr><td colspan="6"><b>2. Client and System Identification</b></td></tr>
<tr><td>2.1</td><td>Research prospective clients and candidate system concepts</td><td>ALL</td><td>Mar 8, 2026</td><td>Mar 14, 2026</td><td>Completed</td></tr>
<tr><td>2.2</td><td>Compile shortlist of prospective clients</td><td>ALL</td><td>Mar 22, 2026</td><td>Mar 28, 2026</td><td>Completed</td></tr>
<tr><td>2.3</td><td>Finalize top client candidates</td><td>ALL</td><td>Mar 30, 2026</td><td>Apr 4, 2026</td><td>Completed</td></tr>
<tr><td colspan="6"><b>3. First Client Engagement and Requirements Gathering</b></td></tr>
<tr><td>3.1</td><td>Prepare and issue Letter of Intent (LOI)</td><td>PM</td><td>Apr 4, 2026</td><td>Apr 4, 2026</td><td>Completed</td></tr>
<tr><td>3.2</td><td>Conduct client outreach and initial meetings</td><td>PM</td><td>Apr 6, 2026</td><td>Apr 6, 2026</td><td>Completed</td></tr>
<tr><td>3.3</td><td>Revise Letter of Intent based on client feedback</td><td>PM</td><td>Apr 7, 2026</td><td>Apr 7, 2026</td><td>Completed</td></tr>
<tr><td>3.4</td><td>Conduct follow-up client visits and consultations</td><td>PM</td><td>Apr 5, 2026</td><td>Apr 18, 2026</td><td>Completed</td></tr>
<tr><td colspan="6"><b>4. Final Client Engagement and Requirements Gathering</b></td></tr>
<tr><td>4.1</td><td>Prepare and issue Letter of Intent (LOI)</td><td>PM</td><td>Apr 26, 2026</td><td>Apr 29, 2026</td><td>Completed</td></tr>
<tr><td>4.2</td><td>Finalize client interview and secure signed LOI with principal</td><td>ALL</td><td>Apr 30, 2026</td><td>Apr 30, 2026</td><td>Completed</td></tr>
<tr><td colspan="6"><b>5. SWOT Analysis</b></td></tr>
<!-- p.46 -->
<tr><td>5.1</td><td>Conduct SWOT analysis</td><td>ALL</td><td>Apr 30, 2026</td><td>May 2, 2026</td><td>Completed</td></tr>
<tr><td>5.2</td><td>Finalize SWOT document</td><td>PM</td><td>May 3, 2026</td><td>May 9, 2026</td><td>Completed</td></tr>
<tr><td colspan="6"><b>6. Project Technical Documentation (PTD)</b></td></tr>
<tr><td>6.1</td><td>Draft Project Technical Documentation</td><td>ALL</td><td>May 5, 2026</td><td>May 10, 2026</td><td>Completed</td></tr>
<tr><td>6.2</td><td>Revise and finalize PTD</td><td>PM</td><td>May 10, 2026</td><td>May 16, 2026</td><td>Completed</td></tr>
<tr><td colspan="6"><b>7. Project Title Proposal</b></td></tr>
<tr><td>7.1</td><td>Draft proposed project titles</td><td>ALL</td><td>May 13, 2026</td><td>May 16, 2026</td><td>Completed</td></tr>
<tr><td>7.2</td><td>Finalize and submit project title proposal</td><td>PM</td><td>May 17, 2026</td><td>May 23, 2026</td><td>Completed</td></tr>
<tr><td colspan="6"><b>8. Letter of Agreement</b></td></tr>
<tr><td>8.1</td><td>Prepare Letter of Agreement (LOA)</td><td>PM</td><td>Aug 29, 2026</td><td>Sep 4, 2026</td><td>Completed</td></tr>
<tr><td>8.2</td><td>First Revision</td><td>PM</td><td>Sep 3, 2026</td><td>Sep 6, 2026</td><td>Completed</td></tr>
<tr><td>8.3</td><td>Second Revision (Approved)</td><td>PM</td><td>Sep 7, 2026</td><td>Sep 9, 2026</td><td>Completed</td></tr>
<tr><td>8.4</td><td>Meeting and Signed with Client (LOA)</td><td>ALL</td><td>Sep 9, 2026</td><td>Sep 9, 2026</td><td>Completed</td></tr>
<tr><td>8.5</td><td>MoM with the Client</td><td>QA</td><td>Sep 9, 2026</td><td>Sep 10, 2026</td><td>Completed</td></tr>
<tr><td colspan="6"><b>9. Project Plan and SRS Draft</b></td></tr>
<tr><td>9.1</td><td>Project Plan Draft</td><td>PM, QA</td><td>Sep 11, 2026</td><td>Sep 17, 2026</td><td>Completed</td></tr>
<tr><td>9.2</td><td>SRS Template Draft and Finalized the SRS</td><td>SA</td><td>Sep 11, 2026</td><td>Sep 18, 2026</td><td>Completed</td></tr>
<tr><td colspan="6"><b>10.Project Plan Document - Draft</b></td></tr>
<tr><td>10.1</td><td>The Problem Domain</td><td>ALL</td><td>Sep 18, 2026</td><td>Sep 25, 2026</td><td>Completed</td></tr>
<tr><td>10.2</td><td>Approach and System Design</td><td>ALL</td><td>Sep 18, 2026</td><td>Sep 26, 2026</td><td>Completed</td></tr>
<tr><td colspan="6"><b>11.Software Requirements Specification - Draft</b></td></tr>
<!-- p.47 -->
<tr><td>11.1</td><td>Introduction and Overall Description</td><td>SA</td><td>Sep 26, 2026</td><td>Sep 27, 2026</td><td>Completed</td></tr>
<tr><td colspan="6"><b>12.System Development - Frontend</b></td></tr>
<tr><td>12.1</td><td>Frontend Development (screens built on sample data in three prototypes; reference screens reviewed with the client; the demo-ready check is still open)</td><td>QA</td><td>Oct 2, 2026</td><td>Nov 13, 2026</td><td>Completed</td></tr>
<tr><td colspan="6"><b>13.Project Plan V.2</b></td></tr>
<tr><td>13.1</td><td>Finalize most of the paper</td><td>ALL</td><td>Nov 6, 2026</td><td>Nov 19, 2026</td><td>In Progress</td></tr>
<tr><td colspan="6"><b>14.System Development - Backend</b></td></tr>
<tr><td>14.1</td><td>Backend Development (API, database migrations on MariaDB, sign-in and audit, module endpoints, reports, and backup; connected to the frontend through a mock/API switch, ADR-080)</td><td>QA</td><td>Nov 9, 2026</td><td>Nov 20, 2026</td><td>Completed</td></tr>
<tr><td colspan="6"><b>15.User Acceptance Testing (UAT)</b></td></tr>
<tr><td>15.1</td><td>Test Preparation and Scenarios (including a baseline measurement of the current documentation time)</td><td>QA</td><td></td><td></td><td>Not started</td></tr>
<tr><td>15.2</td><td>UAT Execution (the School Clinician tests all modules under real clinic conditions and answers the ISO/IEC 25010 questionnaire)</td><td>QA</td><td></td><td></td><td>Not started</td></tr>
<tr><td>15.3</td><td>Bug Fixing and Adjustments</td><td>QA</td><td></td><td></td><td>Not started</td></tr>
<tr><td>15.4</td><td>Final Sign-off</td><td>QA</td><td></td><td></td><td>Not started</td></tr>
<!-- p.48 -->
<tr><td colspan="6"><b>16.Project Turnover and User Guide</b></td></tr>
<tr><td>16.1</td><td>Draft User Guide</td><td>QA</td><td></td><td></td><td>Not started</td></tr>
<tr><td>16.2</td><td>Finalize User Guide</td><td>ALL</td><td></td><td></td><td>Not started</td></tr>
<tr><td>16.3</td><td>Turnover to Client (workstation installation and hardening, backup and recovery setup, seed data, and staff training)</td><td>ALL</td><td></td><td></td><td>Not started</td></tr>
<tr><td>16.4</td><td>End Date Target (final manuscript, source repository handover, and defense)</td><td>ALL</td><td></td><td></td><td>Not started</td></tr>
</table>

<!-- p.49 -->

## 7. Budget Allocation

### 7.1. Estimated Costs

No expense has been incurred so far. Development has used free open-source software, the proponents’ own computers, and the school’s existing computer and printer, so the amount actually spent on the system is PHP 0.00. Table 10 lists possible expenses, estimated in Philippine pesos (PHP), that the client, Mendez Christian Academy, may need to shoulder when CLINIQ is deployed. They are not yet purchased and are to be replaced with actual quotations. The proponents shoulder their course-related costs (internet, travel for consultations, and printing of the manuscript), which are not charged to the client.

**Table 10.** Possible one-time, recurring, and conditional expenses

<table>
<tr><th>Category</th><th>Item</th><th>Basis</th><th>Shouldered by</th><th>Total (PHP)</th></tr>
<tr><td colspan="5" align="center"><b>Possible one-time expenses</b></td></tr>
<tr><td rowspan="2">Manpower</td><td>Development work of the three proponents during the Software Engineering II term</td><td>Project term</td><td>Proponents (in-kind)</td><td>0</td></tr>
<tr><td>Review sessions, backup checks, and recovery tests by the School Clinician and the school’s IT provider</td><td>As needed</td><td>School (existing staff, in-kind)</td><td>0</td></tr>
<tr><td rowspan="2">Equipment</td><td>External USB hard drive (1 TB), the backup location kept away from the clinic room</td><td>1 × 2,500</td><td>Client</td><td>2,500</td></tr>
<tr><td>USB flash drive (64 GB) for the installer and a second backup copy</td><td>1 × 400</td><td>Client</td><td>400</td></tr>
<tr><td>Software licenses</td><td>XAMPP, PHP, MariaDB, Laravel, React, and all libraries are open source; Windows 11 is already licensed</td><td>None</td><td>None</td><td>0</td></tr>
<tr><td rowspan="2">Materials</td><td>Printed user manual and quick guide for clinic staff</td><td>3 × 150</td><td>Client</td><td>450</td></tr>
<tr><td>Printed training handouts and UAT forms</td><td>1 lot × 300</td><td>Client</td><td>300</td></tr>
<!-- p.50 -->
<tr><td>Utilities</td><td>Electricity and internet for the clinic workstation, already paid by the school</td><td>Existing</td><td>Client (existing)</td><td>0</td></tr>
<tr><td>Travel</td><td>Consultations and deployment visits</td><td>During the project</td><td>Proponents</td><td>0</td></tr>
<tr><td colspan="5" align="center"><b>Possible recurring expenses after deployment</b></td></tr>
<tr><td>Supplies</td><td>Printer paper and ink or toner for reports, letters, and incident reports (assumption to be checked with the clinic)</td><td>About 300 per month</td><td>Client</td><td>About 3,000 per 10-month school year</td></tr>
<tr><td>Equipment</td><td>Replacement of the backup drive when it fails or is full</td><td>Once every few years</td><td>Client</td><td>About 2,500</td></tr>
<tr><td>Services</td><td>Outsourced IT provider (maintenance, quarterly recovery testing, and hardware support); the system has no subscription or license fee</td><td>Under the school’s existing arrangement</td><td>Client</td><td>To be confirmed</td></tr>
<tr><td colspan="5" align="center"><b>Conditional expenses (only if needed)</b></td></tr>
<tr><td>Equipment</td><td>Repair or replacement of the clinic workstation, only if the hardware check at deployment shows it cannot meet the minimum (Intel Core i3, 4 GB RAM)</td><td>Quotation needed</td><td>Client</td><td>Not estimated</td></tr>
<tr><td>Software</td><td>Windows Pro upgrade for BitLocker disk encryption, only if the workstation runs Windows Home and the school wants disk encryption</td><td>Quotation needed</td><td>Client</td><td>Not estimated</td></tr>
</table>

<!-- p.51 -->

**Contribution to the project’s success.** The backup drive makes the daily backup objective possible, because a backup kept only on the workstation’s own disk is lost together with the workstation. The flash drive carries the installer and a second backup copy. Printed manuals, handouts, and forms support the training and the UAT, and paper and ink let the School Clinician print the reports, excuse letters, and incident reports the system produces. The IT provider keeps the workstation running and tests that backups can be restored.

### 7.2. Total Projected Budget

**Table 11.** Total Projected Budget

| Item | Amount (PHP) |
| --- | --- |
| Equipment (2,500 + 400) | 2,900 |
| Materials (450 + 300) | 750 |
| Utilities (existing electricity and internet; no new cost) | 0 |
| Travel (shouldered by the proponents; not charged) | 0 |
| Manpower and software licenses (in-kind; no cash) | 0 |
| **Subtotal of possible one-time expenses** | **3,650** |
| Contingency fund (10% of the subtotal) | 365 |
| **Total projected one-time budget** | **4,015** |
| Estimated recurring cost per school year (paper and ink, about) | 3,000 |

The projected one-time budget of PHP 4,015 is within the target of about PHP 10,000 in the sixth specific objective and leaves about PHP 5,985 of headroom. The 10% contingency fund covers unforeseen expenses such as an extra drive or reprinting. The recurring paper and ink cost is an operating cost and is not part of the implementation total. The conditional expenses are excluded because they depend on the hardware check at deployment. The budget remains realistic because it requires no new computer and no paid software. The funding source is to be confirmed with the school administration.

## References

<!-- p.52 -->

Cadingilan, O. B. A., Batersal, R. M., Gulbe, R., Encarnacion, P., & Ebol, J. (2025). E-Konsulta: Clinic Medical Record Management System with Online Follow-Up Through Google Meet. *Buana Information Technology and Computer Sciences (BIT and CS)*, *6*(2), 100–107. https://doi.org/10.36805/bitcs.v6i2.9136

EduHealth System. (2023, November 9). *Student Health Tracking software for Schools | Best EHR Solutions*. https://www.eduhealthsystem.com/for-student-health/

Erio, W., Cuyam-An, J. D., Rufino, F., Acoking, H. A., & Luzada, R. J. (2025, December 15). *ClinicSync: an electronic medical records system for King’s College of the Philippines’ Clinic - Benguet campus*. https://sajournal.pti.edu.ph/index.php/sajst/article/view/363

*International Organization for Standardization & International Electrotechnical Commission [ISO/IEC], 2023. ISO/IEC 25010:2023(EN) Systems and Software Engineering — Systems and Software Quality Requirements and Evaluation (SQUARE) — Product Quality Model*. (2023). Online Browsing Platform. https://www.iso.org/obp/ui/en/#iso:std:iso-iec:25010:ed-2:v1:en

*Laravel Sanctum | Laravel 13.x - The clean stack for Artisans and agents*. (n.d.). Laravel. https://laravel.com/framework/docs/13.x/sanctum#spa-authentication

*Medical Tracker*. (n.d.). https://medicaltracker.co.uk/features

Nielsen, J. (2026, August 20). *10 Usability heuristics for user interface design*. Nielsen Norman Group. https://www.nngroup.com/articles/ten-usability-heuristics/

Pressman, R. S., & Maxim, B. R. (2020). Software Engineering: A Practitioner’s Approach 9 th Edition. (2020). *Research Gate*. https://www.researchgate.net/publication/365946272_Software_Engineering_A_Practitioner's_Approach_9_th_Edition

<!-- p.53 -->

*REPUBLIC ACT 10173 DATA PRIVACY ACT OF 2012*. (2012, August 15). National Privacy Commission. https://privacy.gov.ph/data-privacy-act/

*School clinic inventory Management Software | SurgiCare*. (n.d.). SurgiCare Software. https://surgicaresoftware.com/Provider-Types/school-clinic-inventory-management-software.html

Software Engineering, 10th GLOBAL Edition. (2016). *archive.org*. https://dn790001.ca.archive.org/0/items/bme-vik-konyvek/Software%20Engineering%20-%20Ian%20Sommerville.pdf
