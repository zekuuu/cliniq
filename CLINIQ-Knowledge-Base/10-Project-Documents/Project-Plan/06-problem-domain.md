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
