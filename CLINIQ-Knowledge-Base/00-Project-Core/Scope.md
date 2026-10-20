# Scope — Full Detail

Kept in sync with the canonical Project Plan, Section 1.4. If you edit one, edit both.

---

### 1.4 Significance and Scope of the Project

**Significance.** For the School Head Nurse and clinic staff, CLINIQ removes the burden of duplicate manual encoding and end-of-month report compilation. For the PE/Sports Department, it shortens the time between an injury and the clinic having full context on the student. For School Administration, it turns scattered logbook entries into a reliable, queryable record for planning and reporting. For students and parents, it means faster, better-informed emergency response. For the proponents, it is an opportunity to apply the full Software Engineering II lifecycle — design, iterative development, testing, deployment, and training — to a real, resource-constrained client rather than a hypothetical one.

**Scope.**

*In scope:*
- User Management (authentication, role-based access for Staff and Admin/Principal)
- Student Records (encoding, medical history, allergies, contact validation)
- Clinic Visit Monitoring (daily logging, complaints, treatment, excuse letters, PE/Sports referrals)
- Emergency Response (incident logging, hospital referral tracking, parent-notification outcome logging)
- Reports Generation (monthly reports, incident reports, health summaries)
- The team-proposed enhancements described in Section 5.3: Smart Triage quick-reference, Medicine & Supply Inventory Tracker, Clinic Overview Dashboard, and Backup Verification Assistant
- Deployment on the school's existing single workstation via XAMPP over the employee-tier intranet
- RA 10173 (Data Privacy Act of 2012)–aligned data handling, audit logging, and daily backups
- Staff training and a User Acceptance Testing (UAT) phase at the client site

*Out of scope for this implementation, but explicitly planned for as a later phase — consistent with both the ICT Head's expressed interest in future remote access and the "Future Deployment: Remote Server / Cloud" line in the current tech stack:*
- Remote or off-campus access, and hosting the system on a remote server/cloud instance instead of the local LAN. The React + Laravel architecture is deliberately API-driven so this move is a deployment change later, not a rewrite — but it stays out of scope for this semester's rollout, which remains LAN-only on the client's existing workstation.
- A parent/guardian self-service web or mobile portal
- Automated SMS or push-notification gateways (parents continue to be contacted by phone, as scoped in the Technical Documentation)
- Direct external access for canteen staff (checking food allergies before serving) — designed and documented (see the Modules & Features companion document) but deferred to a later phase
- Direct access for PE/Sports Instructors: removed (ADR-029). An instructor asks the clinician, who decides what to share
- A fuller, separately-managed school-events calendar (with its own add/edit interface for academic events, sports, performances, assemblies, and field trips). The current phase keeps this lightweight — a free-text event tag on visit/incident entries — because who would maintain a fuller calendar is a genuine open question: Staff doing it adds workload to the role this project is already trying to lighten, while giving Admin/Principal write access would be their first write permission in the system. Left for a future decision rather than guessed at now
- RFID, barcode, or biometric hardware
- Billing, insurance, or Medicaid-style billing modules
- Multi-school or cloud multi-tenant hosting

---

