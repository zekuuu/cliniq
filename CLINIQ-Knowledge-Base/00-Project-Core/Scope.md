# Scope — Full Detail

Kept in sync with the canonical Project Plan, Section 1.4. If you edit one, edit both.

---

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
- Deployment on the clinic's existing single computer using XAMPP (Apache, PHP and MariaDB), served over the LAN; the Admin/Principal signs in at the clinic computer
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

