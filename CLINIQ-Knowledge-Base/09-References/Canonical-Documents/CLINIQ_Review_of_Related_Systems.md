# CLINIQ: Review of Related Systems

**A Supporting Document to the CLINIQ Project Plan**

CvSU–CEIT, Software Engineering II (COSC 75) | September 13, 2026

Prepared by: Ghenly B. Tinapay, Christian John C. Lugami, Zean Kurt G. Balboa

---

## Introduction

This document expands on Section 3 of the CLINIQ Project Plan. It presents, in full, the ten existing systems the team reviewed before finalizing CLINIQ's module list: four Philippine school-clinic capstone projects and six commercial or independently reviewed products. For each system this document gives its full researched feature list and its source reference; it then lays out every feature found across all ten systems — plus CLINIQ itself — in a single master comparison table, and closes with the same synthesis carried in the main Project Plan.

A blank research trail was treated as "not present" rather than assumed. Where a system's own materials did not explicitly state a capability, that cell is marked absent (–) rather than guessed at.

---

## 1. Systems Reviewed — Full Profiles

### 1.1 SEAIT SCMS
**Type:** Academic capstone project  
**Origin:** South East Asia Institute of Trade and Technology (SEAIT), Philippines  
**Reference:** South East Asia Institute of Trade and Technology — School Clinic Management System (SCMS), Chapters 1–2. https://www.studocu.com/ph/document/south-east-asia-institute-of-trade-and-technology/accounting-information-system/chapter-1-2-egeg/120290744

**Full feature list:**

- Automated prescription generation for common illnesses
- Electronic Medical Records (EMR) per consultation
- Medical history access (allergies, past illnesses, family history)
- Automated monthly case report generation by illness category
- Medication inventory monitoring with low-stock notifications

---

### 1.2 E-Konsulta
**Type:** Academic capstone project, published research  
**Origin:** Saint Columban College, Philippines — published via WARSE, International Journal of Scientific Advances in Information Technology (IJSAIT)  
**Reference:** E-Konsulta: A Web-Based Clinic Management System, Saint Columban College. *International Journal of Scientific Advances in Information Technology (WARSE/IJSAIT)*. https://www.warse.org/IJSAIT/static/pdf/file/ijsait021422025.pdf

**Full feature list:**

- User login / sign-up (secure authentication)
- Dashboard (today's patients, schedules overview)
- Health check-up record entry
- Dental schedule management
- Patient record management
- Medicine list viewing
- Medicine inventory management
- Data report generation
- Data backup
- Online follow-up consultation via Google Meet

---

### 1.3 SurgiCare Software
**Type:** Commercial vendor (inventory-focused, not a full EMR)  
**Origin:** SurgiCare Software — school clinic product line  
**Reference:** SurgiCare Software — School Clinic Inventory Management Software. https://surgicaresoftware.com/Provider-Types/school-clinic-inventory-management-software.html

**Full feature list:**

- Medical supply and student care inventory tracking
- Medication, assigned item, and treatment material tracking
- Barcode scanning for counts, receiving, and usage
- Purchase order and vendor management
- Stock level monitoring and replenishment support
- Expiration date tracking and usage reporting
- Inventory visibility across rooms, schools, or locations

---

### 1.4 ClinicSync
**Type:** Academic capstone project, published research  
**Origin:** King's College of the Philippines — Benguet Campus, 2025  
**Reference:** Erio, W., Cuyam-an, J. D., Rufino, F., Acoking, H. A., & Luzada, R. J. (2025). ClinicSync: An Electronic Medical Records System for King's College of the Philippines' Clinic – Benguet Campus. *Southeast Asian Journal of Science and Technology*, 10(1), 146–150. https://sajournal.pti.edu.ph/index.php/sajst/article/view/363

**Notable results:** Built using the Extreme Programming (XP) methodology; achieved a 97.8% user-acceptance rate and a System Usability Scale (SUS) score of 79.7, rated "Good."

**Full feature list:**

- Patient record management
- Real-time consultation documentation
- Medicine and equipment inventory tracking
- Appointment scheduling
- Emergency referral logging
- Role-based account management (Firebase Authentication)
- Dashboard with real-time visit summaries, inventory alerts, and clinic activity analytics
- Dental documentation, linked to the student's overall medical history
- BMI and health monitoring / annual check-up management
- Item borrowing/return tracking (equipment)

---

### 1.5 Web-Based Clinic Management System with Inventory and Data Analytics (ISU–San Mariano)
**Type:** Academic capstone project (BSIT)  
**Origin:** Isabela State University — San Mariano Campus, April 2024  
**Reference:** Pagulayan, J. G., & Vinasoy, A. C. (2024). Web-Based Clinic Management System with Inventory and Data Analytics (BSIT Capstone), Isabela State University – San Mariano Campus. https://www.studocu.com/ph/document/isabela-state-university/information-technology/imr-ad/95849649

**Full feature list:**

- Patient data management
- Medicines management (inventory tracking)
- Medicines expiration date tracking
- Automated medical prescription and medical certificate generation
- Instant retrieval of complete patient history
- User authentication for data protection
- Appointment scheduling (named target functionality)
- Auto-generate reports
- Print reports
- Export reports as PDF
- Data analytics

---

### 1.6 EduHealth System
**Type:** Commercial vendor, cloud-based K-12 EHR  
**Origin:** EduHealth Systems  
**Reference:** EduHealth System — Student Health Tracking Software for Schools. https://www.eduhealthsystem.com/for-student-health/

**Full feature list:**

- Comprehensive student health profile with quick lookup (student number/name)
- Medical and health history documentation
- Medication management
- Treatment management
- Health screening management
- Medication reorder management
- Immunization tracking (compliance status, history, mandatory immunizations)
- Treatment/medication authorization workflows (as-needed and scheduled medications)
- Bulk scanner to digitize paper forms directly into student profiles
- Dynamic Forms — customizable data collection linked to a student's profile
- Reporting (immunization compliance reports, health-status reports, medication/treatment detail reports)
- Multi-role access for doctors, nurses, insurance providers, and pharmacies
- Integration with School Information Systems (SIS)
- Cloud-based (Microsoft Azure), accessible from any device/browser
- Role-based access control

---

### 1.7 Medical Tracker
**Type:** Commercial vendor  
**Origin:** United Kingdom; used in 3,200+ schools by 100,000+ staff; #1-ranked in EdTechImpact's Health Management category (4.7/5, 24 reviews)  
**Reference:** Medical Tracker — School First-Aid and Medical Incident Management Software. https://edtechimpact.com/products/medical-tracker/

**Full feature list:**

- Medical incident tracking
- Medication administration recording
- Health record management
- Detailed reporting
- Staff qualification tracking
- Medication stock/expiry tracking
- Statistical dashboards
- Customisable alerts
- Paperless recording
- Health care plan storage (for chronic conditions)
- Parent/teacher communication functionality
- Multi-school overview (inventory/incident visibility across locations)

---

### 1.8 LinkHMS
**Type:** Commercial vendor, general-purpose clinic/hospital EMR (SaaS)  
**Origin:** LinkHMS  
**Reference:** LinkHMS — Clinic Management System and Electronic Medical Records. https://linkhms.com/

**Full feature list:**

- Electronic Medical Records (EMR) and patient history
- Appointment/visit planner with a live patient queue
- Doctor dashboard
- Nurse station workflows
- Lab management
- Clinic administration / HR module
- Automated invoice and billing generation
- Role-based access for different staff types
- Compliance with HIPAA, GDPR, HL7, and FHIR standards
- Multi-location clinic support

**Notable gap:** Explicitly lacks a dedicated pharmacy/medicine inventory management module.

---

### 1.9 CareMonkey
**Type:** Commercial vendor, parent-facing forms platform (not a full EMR)  
**Origin:** CareMonkey  
**Reference:** CareMonkey — Digital Medical and Consent Form Management for Schools. https://edtechimpact.com/products/caremonkey/

**Full feature list:**

- Parent/guardian self-service medical and consent form submission
- Secure storage of submitted medical information
- Automated reminders to parents for form updates and renewals
- Emergency-ready quick access to submitted medical information
- Integration with existing school management systems

---

### 1.10 iSAMS by IRIS
**Type:** Commercial vendor, broad school management information system (MIS) with a bolt-on health module  
**Origin:** IRIS Software Group; used by 1,600+ schools across 90 countries  
**Reference:** iSAMS by IRIS — School Management Information System, Medical Centre and Wellbeing Manager modules. https://edtechimpact.com/products/isams/

**Full feature list:**

- Medical Centre module (patient/incident record management)
- Wellbeing Manager (workflow automation for welfare concerns)
- Body Map — visual, location-based injury/incident logging
- Automated workflow notifications and alerts to staff
- Central analytics and reporting via Power BI
- Broader school-wide MIS underneath the health modules (student records, admissions, timetabling)
- Parent engagement portal (part of the wider MIS)

---

### 1.11 CLINIQ (Proposed System)
**Type:** Custom-built, locally hosted system for Mendez Christian Academy  
**Reference:** SWOT Analysis and Software Engineering I Technical Documentation, CLINIQ: Intelligent Clinic Tracking and Monitoring System, May 23, 2026 (internal project documents); CLINIQ Project Plan, Revision 1.7, September 18, 2026.

**Full feature list — Baseline modules (from the SE1 Technical Documentation):**

- User Management — login authentication, user accounts, password management, role-based access (Staff / Admin-Principal)
- Student Records — student info encoding, medical history, allergy/food-restriction monitoring, contact info management
- Clinic Visit Monitoring — daily visit logging, complaint tracking, treatment recording, excuse letter issuance, PE/Sports injury referral logging
- Emergency Response — parent/guardian notification, incident recording, hospital referral tracking
- Reports Generation — monthly reports, incident reports, health summaries

**Full feature list — Team-proposed enhancements (added during Software Engineering II planning):**

- Smart Triage Quick-Reference — standardized first-aid checklist surfaced automatically for common complaints
- Medicine & Supply Inventory Tracker — logs dispensed items, auto-decrements stock, flags low-stock items and items nearing expiration
- Health Trends Dashboard — aggregated view for Administration: common complaints, symptom clustering, frequent-visitor flags
- Backup Verification Assistant — nurse-facing screen showing backup status plus a guided recovery checklist

---

## 2. Master Feature Comparison Table

All twenty-nine distinct features identified across the ten reviewed systems and CLINIQ, in one table. "`\checkmark`{=latex}" indicates the feature is present and documented for that system; "–" indicates it was not found in that system's own materials.

| Feature | SEAIT | E-Konsulta | SurgiCare | ClinicSync | ISU-SMC | EduHealth | MedTracker | LinkHMS | CareMonkey | iSAMS | **CLINIQ** |
|---|---|---|---|---|---|---|---|---|---|---|---|
| User Login / Secure Authentication | – | ✓ | – | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **✓** |
| Role-Based Access Control (multiple tiers) | – | – | – | ✓ | – | ✓ | – | ✓ | ✓ | ✓ | **✓** |
| Dashboard Overview | – | ✓ | – | ✓ | ✓ | ✓ | ✓ | ✓ | – | ✓ | **✓** |
| Patient Record Management / EMR | ✓ | ✓ | – | ✓ | ✓ | ✓ | ✓ | ✓ | – | ✓ | **✓** |
| Medical History Access (allergies, illnesses, family history) | ✓ | – | – | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **✓** |
| Health Check-up Record Entry | – | ✓ | – | ✓ | – | ✓ | – | – | – | – | **✓** |
| Emergency / First-Aid Incident Logging | – | – | – | ✓ | – | – | ✓ | – | – | ✓ | **✓** |
| Automated Prescription Generation | ✓ | – | – | – | ✓ | – | – | – | – | – | – |
| Dental Schedule Management | – | ✓ | – | ✓ | – | – | – | – | – | – | – |
| Appointment Scheduling | – | ✓ | – | ✓ | ✓ | – | – | ✓ | – | – | – |
| Online Follow-up Consultation (Google Meet) | – | ✓ | – | – | – | – | – | – | – | – | – |
| Immunization Tracking & Compliance | – | – | – | – | – | ✓ | – | – | – | – | – |
| Care Plan Management (chronic conditions) | – | – | – | – | – | ✓ | ✓ | – | – | – | – |
| Staff / First-Aid Qualification Tracking | – | – | – | – | – | – | ✓ | – | – | – | – |
| Parent/Guardian Self-Service Forms & Consent Management | – | – | – | – | – | – | – | – | ✓ | – | – |
| Automated Alerts & Notifications (staff/parent) | – | – | – | ✓ | – | – | ✓ | – | ✓ | ✓ | – |
| Automated Report Generation | ✓ | ✓ | – | ✓ | ✓ | ✓ | ✓ | – | – | ✓ | **✓** |
| Data Backup | – | ✓ | – | – | – | – | – | – | – | – | **✓** |
| Cloud-Based / Multi-Device Accessibility | – | – | – | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **✓\*** |
| Integration with School Information System (Registrar data) | – | – | – | – | – | ✓ | – | – | ✓ | – | **✓** |
| Medication / Medicine Inventory Management | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – | – | – | **✓** |
| Medical Supply & Treatment Material Tracking | – | – | ✓ | ✓ | – | ✓ | – | – | – | – | **✓** |
| Stock Level Monitoring & Low-Stock Notifications | ✓ | – | ✓ | ✓ | – | ✓ | ✓ | – | – | – | **✓** |
| Expiration Date Tracking | – | ✓ | ✓ | – | ✓ | – | ✓ | – | – | – | **✓** |
| Barcode Scanning (counts, receiving, usage) | – | – | ✓ | – | – | – | – | – | – | – | – |
| Purchase Order & Vendor Management | – | – | ✓ | – | – | – | – | – | – | – | – |
| Billing / Invoice Generation | – | – | – | – | – | – | – | ✓ | – | – | – |
| Usage Reporting | – | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – | – | ✓ | **✓** |
| Inventory Visibility Across Rooms / Locations | – | – | ✓ | – | – | – | ✓ | – | – | – | – |

\* CLINIQ runs on the client's local LAN for this implementation; the React + Laravel architecture is API-driven, so a move to remote/cloud hosting later is a deployment change, not a redesign (Project Plan, Section 1.4).

---

## 3. What This Comparison Means for CLINIQ

No single reviewed system covers both halves of the matrix well: the Philippine capstones and Medical Tracker are strong on clinical records and incident logging but thin on inventory discipline; SurgiCare is the opposite — excellent inventory control with no patient records at all. CLINIQ's five team-proposed enhancements were chosen specifically to sit in that gap: the Medicine & Supply Inventory Tracker now also tracks expiration dates (a feature borrowed directly from this review, since four of the ten alternatives had it and CLINIQ's original scope did not), while the Smart Triage checklist adds the kind of fast, low-friction clinical access that ClinicSync and Medical Tracker validated as genuinely useful, without requiring the licensing costs, multi-school scale, or hardware (barcode scanners, dedicated devices) that make SurgiCare, LinkHMS, EduHealth, and iSAMS impractical for a single-nurse, single-workstation clinic.

Three features that appear across several alternatives were deliberately left out, and that omission is a scope decision rather than an oversight: **billing/invoicing** (LinkHMS) does not apply to a school clinic that does not charge students; **barcode scanning and purchase-order/vendor management** (SurgiCare) assume a procurement workflow and hardware budget the client does not have; and **multi-room/multi-location inventory visibility** (SurgiCare, Medical Tracker) is meant for hospital networks or multi-academy trusts, not a single clinic room. Leaving these out keeps CLINIQ aligned with the client's actual scale instead of building toward a size the school will likely never reach.

---

## 4. System Descriptions (Narrative Summaries)

Sections 1 and 2 give the feature-by-feature detail in list and table form. This section gives the same ten systems and CLINIQ in sentence form — what each system is and what it does — for use directly in narrative write-ups.

**SEAIT SCMS.** SEAIT SCMS is a clinic management system developed as an academic capstone project at the South East Asia Institute of Trade and Technology in the Philippines. It functions primarily as a per-consultation electronic medical record for a school clinic, letting staff pull up a student's allergy history, past illnesses, and family medical background during a visit. Its standout capability is automated prescription generation for common illnesses, paired with medication inventory monitoring that flags low stock, and it closes the loop by auto-compiling monthly case reports grouped by illness category.

**E-Konsulta.** E-Konsulta is a web-based clinic management system built for Saint Columban College and published as academic research through WARSE's International Journal of Scientific Advances in Information Technology. It is the most full-featured of the three original Philippine capstones reviewed, combining a login-secured dashboard, patient record management, and dental schedule management with a genuinely unusual feature for a school clinic system: the ability to hold a follow-up consultation with a student remotely over Google Meet. It also handles its own data backup and generates clinic reports directly from logged visits.

**SurgiCare Software.** SurgiCare Software is a commercial inventory management platform marketed specifically to school clinics as one of several vertical markets it serves. Unlike the other systems reviewed, it makes no attempt to be an electronic medical record — it does not store patient histories or consultation notes at all. Instead, it is built entirely around the logistics of running a clinic's supply room: tracking medical supplies and treatment materials, scanning barcodes on receipt and use, managing purchase orders and vendors, monitoring stock levels for replenishment, tracking expiration dates, and giving administrators visibility into inventory across multiple rooms or even multiple school sites.

**ClinicSync.** ClinicSync is a peer-reviewed electronic medical records system built for the clinic at King's College of the Philippines' Benguet Campus and published in the *Southeast Asian Journal of Science and Technology*. Developed using the Extreme Programming methodology, it integrates patient records, real-time consultation documentation, and role-based accounts secured through Firebase Authentication behind a live dashboard that surfaces inventory alerts and clinic activity analytics. Beyond routine visit logging, it manages emergency referrals, dental documentation linked to a student's broader medical history, annual check-ups and BMI monitoring, and even the borrowing and return of clinic equipment. In its own usability testing it achieved a 97.8% user-acceptance rate and a System Usability Scale score of 79.7, rated "Good."

**Web-Based Clinic Management System with Inventory and Data Analytics (ISU–San Mariano).** This system is a BSIT capstone project from Isabela State University's San Mariano Campus, built to solve the same accuracy, speed, and security problems that motivate CLINIQ. Its core is patient data management paired with instant retrieval of a student's complete visit history, protected behind user authentication. It automates two of the clinic's more tedious paper-based tasks — generating medical prescriptions and medical certificates — and tracks medicine inventory down to expiration dates, then surfaces all of that activity through auto-generated, printable, PDF-exportable reports and a data-analytics view.

**EduHealth System.** EduHealth System is a commercial, cloud-based electronic health record platform built specifically for K-12 schools and hosted on Microsoft Azure. It centers on a comprehensive, quickly searchable student health profile that pulls together medical history, medications, treatments, and health screenings, and layers on immunization compliance tracking, medication authorization workflows, and a bulk scanner that can digitize a school's existing paper health forms straight into student profiles. It is designed for multi-role use — doctors, nurses, insurance providers, and pharmacies can all be given access — and integrates with a school's existing Student Information System, generating compliance and treatment reports along the way.

**Medical Tracker.** Medical Tracker is the United Kingdom's leading school first-aid and medical incident management platform, used daily by more than 100,000 staff across 3,200-plus schools and ranked first in EdTechImpact's Health Management category. It is built around speed: logging a medical incident is designed to take well under thirty seconds, backed by health record management, medication administration and stock/expiry tracking, staff qualification records, and customizable alerts. It also stores long-term care plans for students with chronic conditions and automatically keeps parents and teachers in the loop, with statistical dashboards giving administrators an overview across every school in a multi-school trust.

**LinkHMS.** LinkHMS is a general-purpose, SaaS-based clinic and hospital electronic medical records system, not built for schools specifically but reviewed here as a benchmark for what a modern, professionally engineered clinic system looks like. It combines patient records and history with an appointment and visit-queue planner, a doctor dashboard, nurse-station workflows, lab management, and even clinic administration and HR tools, all wrapped in HIPAA, GDPR, HL7, and FHIR compliance and support for multiple clinic locations. Notably, and by the vendor's own admission, it has no dedicated pharmacy or medicine inventory management module — a gap CLINIQ deliberately does not share.

**CareMonkey.** CareMonkey is not an electronic medical record system at all, but a digital consent-and-medical-form platform that puts the data-entry work back in parents' hands. Parents log in themselves to submit and update their child's medical information and to sign consent forms, which the platform stores securely and makes available for quick lookup in an emergency. It sends automated reminders when a form needs renewing and can integrate with a school's existing management system, making it a narrow but genuinely useful tool for the one part of clinic administration — the initial data-collection burden — that most other systems, CLINIQ included, still leave to manual intake.

**iSAMS by IRIS.** iSAMS is a large, general-purpose school management information system used by more than 1,600 schools in 90 countries, with a health-focused Medical Centre and Wellbeing Manager bolted onto a platform that otherwise covers admissions, timetabling, and student records school-wide. Its Medical Centre handles patient and incident records, while the Wellbeing Manager automates welfare-concern workflows and includes a distinctive "Body Map" tool for logging the visual, location-based details of an injury. Alerts and workflow notifications reach staff automatically, and Power BI powers central analytics and reporting — but because health is only one module inside a much larger MIS, iSAMS has no dedicated medicine inventory or stock-tracking capability at all.

**CLINIQ.** CLINIQ is the system this document exists to justify: a custom-built, locally hosted clinic tracking and monitoring platform designed specifically for Mendez Christian Academy's single-nurse, single-workstation clinic. Its five baseline modules — inherited from the Software Engineering I technical documentation — cover user management, student records, clinic visit monitoring, emergency response, and reports generation, giving it the same core record-keeping and incident-logging backbone as the strongest capstones reviewed here. On top of that baseline, the team added enhancements chosen directly from the gaps this review exposed: a Smart Triage quick-reference checklist; a Medicine & Supply Inventory Tracker that now includes expiration-date tracking; a Health Trends Dashboard for administrative decision-making; and a Backup Verification Assistant that lets a non-technical nurse confirm her own data is safe. The result deliberately sits in the space no single reviewed system occupies alone — clinically capable like ClinicSync and Medical Tracker, inventory-aware like SurgiCare and EduHealth, but scaled to, and only to, what a small school clinic actually needs.

---

## References

1. South East Asia Institute of Trade and Technology (SEAIT) — School Clinic Management System (SCMS), Chapters 1–2. https://www.studocu.com/ph/document/south-east-asia-institute-of-trade-and-technology/accounting-information-system/chapter-1-2-egeg/120290744
2. E-Konsulta: A Web-Based Clinic Management System, Saint Columban College. *International Journal of Scientific Advances in Information Technology (WARSE/IJSAIT)*. https://www.warse.org/IJSAIT/static/pdf/file/ijsait021422025.pdf
3. SurgiCare Software — School Clinic Inventory Management Software. https://surgicaresoftware.com/Provider-Types/school-clinic-inventory-management-software.html
4. Erio, W., Cuyam-an, J. D., Rufino, F., Acoking, H. A., & Luzada, R. J. (2025). ClinicSync: An Electronic Medical Records System for King's College of the Philippines' Clinic – Benguet Campus. *Southeast Asian Journal of Science and Technology*, 10(1), 146–150. https://sajournal.pti.edu.ph/index.php/sajst/article/view/363
5. Pagulayan, J. G., & Vinasoy, A. C. (2024). Web-Based Clinic Management System with Inventory and Data Analytics (BSIT Capstone), Isabela State University – San Mariano Campus. https://www.studocu.com/ph/document/isabela-state-university/information-technology/imr-ad/95849649
6. EduHealth System — Student Health Tracking Software for Schools. https://www.eduhealthsystem.com/for-student-health/
7. Medical Tracker — School First-Aid and Medical Incident Management Software. https://edtechimpact.com/products/medical-tracker/
8. LinkHMS — Clinic Management System and Electronic Medical Records. https://linkhms.com/
9. CareMonkey — Digital Medical and Consent Form Management for Schools. https://edtechimpact.com/products/caremonkey/
10. iSAMS by IRIS — School Management Information System, Medical Centre and Wellbeing Manager modules. https://edtechimpact.com/products/isams/
11. SWOT Analysis — CLINIQ: Intelligent Clinic Tracking and Monitoring System, Mendez Christian Academy, May 23, 2026 (internal project document).
12. Software Engineering I Project Technical Documentation — CLINIQ: Intelligent Clinic Tracking and Monitoring System, May 23, 2026 (internal project document).
13. CLINIQ Project Plan, Revision 1.7, September 18, 2026 (companion document).
