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
<tr><td>FR-07</td><td><b>Inventory.</b> Deduct medicines and supplies from received batches, earliest-expiring first, with low-stock and near-expiry alerts and explicit disposal of expired stock. Warn, but do not block, a dispense that would take stock below zero; lock the medicines of a completed incident; add a new batch on restock; and require a written note for a large write-off. Suggest items tagged for the selected symptom first, without blocking other items.</td></tr>
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
- The backend has eleven modules, shared services, and three scheduled jobs (backup, holiday sync, and follow-up closing). It is built and tested but not yet connected to the frontend.
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
