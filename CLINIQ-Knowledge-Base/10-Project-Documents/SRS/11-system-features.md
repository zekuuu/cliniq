## 23. System Features

### 23.1. Functional Requirements

The functional requirements are grouped by module. Data rules referenced here are given in Section 2, and business rules in Section 3.2.5.

#### 3.1.1. Account Access and Recovery

Lets the School Clinician and the Admin/Principal sign in, manage accounts, and recover access. Related data rules: DR-054 to DR-065 and DR-052 to DR-053.

<table>
<tr><th>ID</th><th>Requirement</th></tr>
<tr><td><b>FR-001</b></td><td>The system shall let a user sign in with a username and password and sign out. On invalid credentials it shall show a failure message that does not say which entry was wrong and shall count the attempt. When the failed-attempt limit in DR-058 is reached, it shall lock the account, tell the user the account is locked, and record the lockout in the audit log.</td></tr>
<tr><td><b>FR-002</b></td><td>The system shall require a user with a new or temporary password to change it before routine access. It shall reject a new password that breaks the rules in DR-053 and shall state the reason.</td></tr>
<tr><td><b>FR-003</b></td><td>The Admin shall be able to add, edit, disable, and enable user accounts, assign a role, search the user list, and reset a password to a temporary one. The system shall reject a duplicate username and shall refuse to disable or demote the last active Admin.</td></tr>
<!-- p.71 -->
<tr><td><b>FR-004</b></td><td>Each user shall be able to change their own display name, profile picture, and password from the account menu.</td></tr>
<tr><td><b>FR-005</b></td><td>A user shall be able to set up, replace, and disable an authenticator app, and to save the one-time recovery codes. The system shall reject an incorrect code, and failed attempts shall count toward the lockout in FR-001.</td></tr>
<tr><td><b>FR-006</b></td><td>A user who forgot their password shall be able to enter the username, verify an authenticator or recovery code, and choose a new password, as described in DR-064.</td></tr>
<tr><td><b>FR-007</b></td><td>The system shall end the existing sessions of a disabled account, and shall sign out an idle user according to DR-056, with a warning before the sign-out.</td></tr>
<tr><td><b>FR-008</b></td><td>The School Clinician shall be able to view and change the idle sign-out minutes of each role on the Settings screen, and the Admin shall be able to view them. The system shall refuse a value outside the allowed range.</td></tr>
<tr><td><b>FR-009</b></td><td>The system shall provide an offline console command, run on the clinic workstation, that resets the password of an Admin who has lost both the password and the authenticator.</td></tr>
</table>

#### 3.1.2. Patient Records and School Year

Maintains student and staff patient records, imports, archiving, and the school year. Related data rules: DR-001 to DR-015; DR-016 to DR-020; DR-021 to DR-026.

<table>
<tr><th>ID</th><th>Requirement</th></tr>
<tr><td><b>FR-010</b></td><td>The School Clinician shall be able to add and edit a student record. The system shall refuse to save a record with a missing required field and shall show a message beside each field concerned.</td></tr>
<tr><td><b>FR-011</b></td><td>The system shall refuse an LRN that is not exactly 12 digits or that duplicates another student’s LRN, and shall state which rule failed. An existing LRN shall not be editable in the normal edit form.</td></tr>
<tr><td><b>FR-012</b></td><td>On saving a student with the same name and grade as an existing record, the system shall warn and let the School Clinician confirm or cancel. A name correction shall require a reason.</td></tr>
<tr><td><b>FR-013</b></td><td>When a birthdate is entered, the system shall show the non-blocking note described in DR-013.</td></tr>
<tr><td><b>FR-014</b></td><td>

The School Clinician shall be able to look up a student by LRN or name, using a search that tolerates case, accents, and spacing, and shall be able to view the student list. **$\textcolor{green}{\text{A search field in the top bar shall find an active student or staff patient and open the profile.}}$**

</td></tr>
<!-- p.72 -->
<tr><td><b>FR-015</b></td><td>The School Clinician shall be able to record and order emergency contacts, mark each as verified or unverified, and record allergies and conditions. After an unreachable call, the system shall re-flag the contact for verification.</td></tr>
<tr><td><b>FR-016</b></td><td>The system shall list student and staff records that need review in incomplete-records queues, and shall let the School Clinician resolve each item, logging who resolved it and when.</td></tr>
<tr><td><b>FR-017</b></td><td>The School Clinician shall be able to add, edit, list, search, and open staff patient records. The system shall generate each Staff No. and shall refuse to save a staff record without first name, last name, sex, and type.</td></tr>
<tr><td><b>FR-018</b></td><td>The system shall provide one patient picker offering students and staff patients wherever a visit, incident, or dispensing record needs a patient.</td></tr>
<tr><td><b>FR-019</b></td><td>The School Clinician and the Admin shall be able to open a student profile, which shows the visit history read-only; the Admin shall see it without links to visit details. Only the School Clinician shall be able to open a staff profile.</td></tr>
<tr><td><b>FR-020</b></td><td>The School Clinician shall be able to print the Student Health Record.</td></tr>
<tr><td><b>FR-021</b></td><td>

The School Clinician shall be able to archive a student or staff record with a reason. The system shall refuse to archive without a reason and shall exclude archived records from active lists unless they are explicitly included. **$\textcolor{green}{\text{For eight seconds after an archive, the system shall offer an Undo that restores the record.}}$**

</td></tr>
<tr><td><b>FR-022</b></td><td>The Archive shall provide a read-only, school-year-indexed view of Students, Staff (School Clinician only), Reports by month, and the Audit Log.</td></tr>
<tr><td><b>FR-023</b></td><td>The School Clinician shall be able to import the yearly student list by selecting a CSV file, mapping columns, previewing, and applying. Before applying, the system shall show the students missing from the list, and on applying it shall archive them with the import reason.</td></tr>
<tr><td><b>FR-024</b></td><td>The School Clinician shall be able to import a staff list the same way. The system shall flag and skip unknown Staff Nos., ambiguous matches, and repeated rows, and shall audit the applied changes as counts.</td></tr>
<tr><td><b>FR-025</b></td><td>The School Clinician shall be able to edit the expected school-year dates and to end and start a school year. The system shall refuse to start a year while the current one is not ended or before a subsequent day, and shall show school-year reminders on the School Clinician’s Dashboard.</td></tr>
</table>

<!-- p.73 -->

#### 3.1.3. Clinical Care

Records routine visits, first-aid prompts, emergency incidents, letters, referrals, and follow-ups for student and staff patients. Available to the School Clinician, except where stated. Related data rules: DR-027 to DR-041.

<table>
<tr><th>ID</th><th>Requirement</th></tr>
<tr><td><b>FR-026</b></td><td>The School Clinician shall be able to add, view, search, filter by date, and edit visits. A visit shall record the patient, a main symptom, up to three other symptom tags, treatment, vital readings, and a disposition. The system shall refuse to save a visit with a missing required field and shall list the fields.</td></tr>
<tr><td><b>FR-027</b></td><td>The system shall refuse a visit time in the future, and shall mark a visit entered more than 30 minutes after its visit time as late, with an optional reason.</td></tr>
<tr><td><b>FR-028</b></td><td>The system shall display the first-aid checklist for the selected symptom type, let the School Clinician check items, and save the completion with the visit. The checklist shall not block saving.</td></tr>
<tr><td><b>FR-029</b></td><td>The system shall show vital-sign and allergy messages as information that does not block saving.</td></tr>
<tr><td><b>FR-030</b></td><td>The School Clinician shall be able to record care as notes and as stock-linked item lines. The system shall suggest items by the visit’s symptom, while search still covers all items.</td></tr>
<tr><td><b>FR-031</b></td><td>The system shall offer dispositions including Resting in clinic, shall show a resting patient on the Dashboard until the time out is recorded, and shall use “Returned to work” wording for staff patients.</td></tr>
<tr><td><b>FR-032</b></td><td>The School Clinician shall be able to mark a visit Entered in error. The system shall refuse to do so without a reason, shall keep and lock the record, restore its linked stock, void its excuse letter, and cancel its pending follow-ups.</td></tr>
<tr><td><b>FR-033</b></td><td>The School Clinician shall be able to prepare, review, approve, and print an excuse letter for a student visit that was sent home or referred to hospital. A draft shall carry a watermark and shall not be printable, and the system shall warn when the excused period exceeds the number of days in BR-017.</td></tr>
<tr><td><b>FR-034</b></td><td>The School Clinician shall be able to log a PE/Sports referral received from an instructor, with assessment and disposition, and to escalate it to an incident.</td></tr>
<tr><td><b>FR-035</b></td><td>The School Clinician shall be able to escalate a visit to an incident, or open Incident Stage 1 directly from a New Visit shortcut. The system may show a non-blocking hint when an emergency-type symptom is selected.</td></tr>
<!-- p.74 -->
<tr><td><b>FR-036</b></td><td>The School Clinician shall be able to save Stage 1 of an incident with the patient and main symptom, with the patient’s allergies, conditions, and contacts shown, and to return later to complete Stage 2. Incident lists shall show each incident’s stage.</td></tr>
<tr><td><b>FR-037</b></td><td>The School Clinician shall be able to record a hospital referral and to log each contact attempt, with the person called, number, relationship, time, and outcome, and view the attempt history.</td></tr>
<tr><td><b>FR-038</b></td><td>The School Clinician shall be able to approve a completed incident and print its report for the Principal’s handwritten signature. The system shall refuse approval before Stage 2 is completed and shall warn before approving an empty Stage 2.</td></tr>
<tr><td><b>FR-039</b></td><td>The Admin shall be able to view the student Incident Log and incident reports. The system shall not show staff patient incidents to the Admin.</td></tr>
<tr><td><b>FR-040</b></td><td>The School Clinician shall be able to create a follow-up after a visit or an incident, list follow-ups by status, set a status to Completed, Missed, or Cancelled, and reschedule a missed follow-up. The system shall refuse a Missed or Cancelled status without a reason and shall refuse to reschedule a cancelled follow-up.</td></tr>
<tr><td><b>FR-041</b></td><td>The system shall close a pending follow-up automatically as Missed after the period in DR-032 and shall show it as overdue after the period in BR-019.</td></tr>
</table>

#### 3.1.4. Inventory

Tracks medicine and supply stock in batches and links usage to clinical records. Available to the School Clinician only. Related data rules: DR-042 to DR-047.

<table>
<tr><th>ID</th><th>Requirement</th></tr>
<tr><td><b>FR-042</b></td><td>The School Clinician shall be able to add, edit, archive, search, and filter inventory items, and open an item’s detail.</td></tr>
<tr><td><b>FR-043</b></td><td>The School Clinician shall be able to restock an item by adding a batch. The system shall refuse a quantity that is not positive and a batch with neither an expiration date nor an explicit no-expiry confirmation.</td></tr>
<tr><td><b>FR-044</b></td><td>

The School Clinician shall be able to dispense an item from the Dispense screen or from a visit or incident. The system shall refuse to dispense an item that has only expired stock, and shall ~~$\textcolor{red}{\text{warn when usable batches cannot cover the quantity}}$~~ **$\textcolor{green}{\text{refuse a quantity that its usable batches cannot cover}}$**.

</td></tr>
<tr><td><b>FR-045</b></td><td>The School Clinician shall be able to adjust stock for a correction or disposal. The system shall refuse an adjustment without a <!-- p.75 --> reason or one that takes a batch below zero, and shall flag a large write-off in the audit log.</td></tr>
<tr><td><b>FR-046</b></td><td>The system shall show usable, expired, and total stock separately, and shall flag low, near-expiry, and expired stock with separate indicators and list filters.</td></tr>
<tr><td><b>FR-047</b></td><td>The system shall provide a stock movement history showing the transaction, actor, time, and clinical link.</td></tr>
</table>

#### 3.1.5. Monitoring and Reporting

Gives operational overviews, a calendar, and printable reports. Available to both roles, except where stated. Related data rules: DR-048 to DR-051.

<table>
<tr><th>ID</th><th>Requirement</th></tr>
<tr><td><b>FR-048</b></td><td>The Dashboard shall offer an Overview and a Trends view, with Today as the default period. The School Clinician’s Overview shall separate urgent-attention items from routine to-do items, show activity totals, and link to the source lists and reports. The Admin’s Overview shall show the activity summary without the clinician action groups and the cluster alert.</td></tr>
<tr><td><b>FR-049</b></td><td>Trends shall show common symptoms, activity over time, and sex and grade views. Demographic filtering shall apply to Trends only.</td></tr>
<tr><td><b>FR-050</b></td><td>The system shall show a possible-cluster alert and a frequent-visitor list as warnings only. The frequent-visitor list may be switched off.</td></tr>
<tr><td><b>FR-051</b></td><td>The Activity Calendar shall offer weekly, monthly, yearly, and table views of visit and incident counts, with school events and Philippine holidays shown alongside. Only the School Clinician shall be able to open the related Visit Log.</td></tr>
<tr><td><b>FR-052</b></td><td>The Admin and the School Clinician shall be able to add, edit, and delete dated school events. Philippine holidays shall be read-only.</td></tr>
<tr><td><b>FR-053</b></td><td>The system shall refresh the holiday list as described in DR-050 and shall show the warnings described there to the School Clinician.</td></tr>
<tr><td><b>FR-054</b></td><td>The system shall provide four monthly report views, the Monthly Report, the Incident register, the Symptom summary, and the Inventory sheet, based on live exact counts.</td></tr>
<tr><td><b>FR-055</b></td><td>The School Clinician shall be able to create, edit, duplicate, and archive Sports Reports, add named students individually or by grade, and choose which encounter entries to include.</td></tr>
<!-- p.76 -->
<tr><td><b>FR-056</b></td><td>The School Clinician shall be able to preview and print permitted records and reports on A4, or save them as PDF. The system shall not offer printing or Save as PDF of clinic documents to the Admin.</td></tr>
<tr><td><b>FR-057</b></td><td>The School Clinician shall be able to print the Monthly Report, or save it as PDF from the browser’s print window with the title “CLINIQ Monthly Report, &lt;Month Year&gt;”, and send it to the Principal.</td></tr>
</table>

#### 3.1.6. System Administration and Accountability

Runs and monitors local backups, records and displays the audit trail, and collects issue reports. Related data rules: DR-073 to DR-077; DR-078 to DR-080; DR-081 to DR-086.

<table>
<tr><th>ID</th><th>Requirement</th></tr>
<tr><td><b>FR-058</b></td><td>The system shall run a daily backup, a backup at sign-out, and a manual backup to every enabled location.</td></tr>
<tr><td><b>FR-059</b></td><td>When a backup fails for a location, the system shall record the failure for that location. The system shall warn of the latest failure, of no successful backup, and of a successful backup older than 48 hours.</td></tr>
<tr><td><b>FR-060</b></td><td>The School Clinician and the Admin shall be able to view backup status and history, run a backup, verify the latest backup, and mark a backup as verified.</td></tr>
<tr><td><b>FR-061</b></td><td>The School Clinician and the Admin shall be able to add backup locations and enable or disable them. The system shall refuse to edit an existing location and shall refuse to disable the last enabled location.</td></tr>
<tr><td><b>FR-062</b></td><td>The system shall show a guided recovery checklist.</td></tr>
<tr><td><b>FR-063</b></td><td>The system shall record the events listed in DR-073 and DR-074, with a record open logged once per record per sign-in session.</td></tr>
<tr><td><b>FR-064</b></td><td>The Audit Log Viewer shall be read-only, shall let both roles filter entries by date, actor, action, and target, and shall let the School Clinician print the filtered entries.</td></tr>
<tr><td><b>FR-065</b></td><td>A user of either role shall be able to report an issue from a “Report an issue” window available on every screen. The system shall record the report as described in DR-051.</td></tr>
</table>

**Placeholders and proposals**

<table>
<tr><th>ID</th><th>Requirement</th></tr>
<!-- p.77 -->
<tr><td><b>(TBD)</b></td><td>(Information needed: priority of each system feature and formal acceptance criteria)</td></tr>
<tr><td><b>(TBD)</b></td><td>(Information needed: who may add or edit the checklist content, the scope of checklist content maintenance, and the starter inventory tags)</td></tr>
</table>

### 23.2. Nonfunctional Requirements

#### 3.2.1. Performance Requirements

The clinic has one shared workstation of minimum specification and a single clinician with little time to spare, so the system has to stay responsive on modest hardware.

<table>
<tr><th>ID</th><th>Requirement</th></tr>
<tr><td><b>NFR-001</b></td><td>The system shall allow usable data entry on the clinic’s minimum-spec workstation (Intel Core i3 or equivalent, 4GB RAM) with no perceptible lag.</td></tr>
<tr><td><b>NFR-002</b></td><td>The frontend shall be compiled into static assets and screens shall load on demand, so that the workstation only serves and renders a finished bundle; the heavier build tooling shall run only during development and build.</td></tr>
<tr><td><b>(TBD)</b></td><td>(Information needed: formal latency, throughput, and production-volume targets)</td></tr>
</table>

#### 3.2.2. Safety Requirements

Clinical judgment stays with the clinician, so the system must not act on its own in a way that could harm a patient.

<table>
<tr><th>ID</th><th>Requirement</th></tr>
<tr><td><b>NFR-003</b></td><td>The system shall present allergy wording, vital-sign warnings, flags, and alerts as information for the clinician and shall not block the recording of care.</td></tr>
<tr><td><b>NFR-004</b></td><td>The system shall not make automated dosing or safety decisions.</td></tr>
<tr><td><b>NFR-005</b></td><td>The system shall keep an entered-in-error record rather than delete it.</td></tr>
<tr><td><b>NFR-006</b></td><td>When the workstation is unavailable, the clinic shall capture the event on paper and encode it later.</td></tr>
</table>

#### 3.2.3. Security Requirements

<!-- p.78 -->

The system shall align with Republic Act No. 10173 (Data Privacy Act of 2012). Authentication, role-based access, privacy display, audit, retention, and backup requirements are in Section 2.2 and apply in addition to the following.

<table>
<tr><th>ID</th><th>Requirement</th></tr>
<tr><td><b>NFR-007</b></td><td>The system shall use same-origin delivery in production and shall restrict cross-origin access in development to the configured origin.</td></tr>
<tr><td><b>NFR-008</b></td><td>The system shall protect sessions with Laravel Sanctum cookie and CSRF protection.</td></tr>
<tr><td><b>NFR-009</b></td><td>The server shall enforce role checks and shall shape responses so that a role receives only the data it may see.</td></tr>
<tr><td><b>NFR-010</b></td><td>The system shall redact identifiers, request bodies, and credentials from logs.</td></tr>
<tr><td><b>NFR-011</b></td><td>The system shall throttle repeated requests and shall return a consistent error format with a request identifier.</td></tr>
<tr><td><b>NFR-012</b></td><td>Because the clinic room is shared and unlocked, the clinic workstation shall have a Windows sign-in password and a screen lock that starts after 5 to 10 minutes, and shall use BitLocker where the Windows edition supports it. The hardening steps are in the project’s Environment Setup document.</td></tr>
</table>

#### 3.2.4. Software Quality Attributes

<table>
<tr><th>ID</th><th>Requirement</th></tr>
<tr><td><b>NFR-013</b></td><td>Usability: clinic staff shall be able to learn the system in one training session.</td></tr>
<tr><td><b>NFR-014</b></td><td>Usability: the interface shall be desktop-first with visible loading, empty, and error states with retry, keyboard focus, deliberate confirmation for destructive actions, and a warning on navigation with unsaved input.</td></tr>
<tr><td><b>NFR-015</b></td><td>Usability: the interface shall use a minimum text size of 12 px, one consistent color for each meaning, and labels in addition to color.</td></tr>
<tr><td><b>NFR-016</b></td><td>Availability: core work shall be available on the clinic workstation without public internet. The only function that needs internet is the monthly holiday-list refresh.</td></tr>
<tr><td><b>NFR-017</b></td><td>Reliability: a write and its audit entry shall be saved together as one transaction.</td></tr>
<!-- p.79 -->
<tr><td><b>NFR-018</b></td><td>Maintainability: the code shall be modular, the database schema documented, and handover instructions provided for the school’s outsourced IT.</td></tr>
<tr><td><b>NFR-019</b></td><td>Correctness of time: the server shall use Asia/Manila time to determine now and today.</td></tr>
<tr><td><b>NFR-020</b></td><td>Testability: stock decrements, the two-stage incident workflow, and follow-up status changes shall be covered by automated tests.</td></tr>
<tr><td><b>(TBD)</b></td><td>(Information needed: relative priority among quality attributes (for example, ease of use over ease of learning) and measurable targets)</td></tr>
</table>

#### 3.2.5. Business Rules

**Roles and permissions**

<table>
<tr><th>ID</th><th>Requirement</th></tr>
<tr><td><b>BR-001</b></td><td>Only the Admin creates, edits, disables, and enables user accounts, assigns roles, and resets temporary passwords. The last active Admin cannot be disabled or demoted.</td></tr>
<tr><td><b>BR-002</b></td><td>Only the School Clinician performs clinical work, manages staff patient records, creates Sports Reports, manages inventory, approves and prints clinic documents, changes the idle sign-out minutes, and prints the filtered Audit Log.</td></tr>
<tr><td><b>BR-003</b></td><td>The Admin reads student records and student incidents, the four monthly report views, the Archive (without the Staff tab), and the Audit Log, and cannot print clinic documents.</td></tr>
<tr><td><b>BR-004</b></td><td>Both roles can add, edit, and delete school events, run and verify backups, manage backup locations, and change their own password and authenticator settings.</td></tr>
<tr><td><b>BR-005</b></td><td>Each person who uses CLINIQ has their own account; accounts are not shared.</td></tr>
<tr><td><b>BR-006</b></td><td>Parents and guardians, PE/Sports Instructors, and Canteen Staff do not sign in.</td></tr>
</table>

**Patients and records**

<table>
<tr><th>ID</th><th>Requirement</th></tr>
<tr><td><b>BR-007</b></td><td>Every clinical link (visit, incident, follow-up, dispensing) has exactly one patient, a student or a staff patient.</td></tr>
<tr><td><b>BR-008</b></td><td>A student’s grade level and section on a visit or incident are those at the time of the event.</td></tr>
<!-- p.80 -->
<tr><td><b>BR-009</b></td><td>The yearly student list drives grades and sections; there is no bulk promotion.</td></tr>
<tr><td><b>BR-010</b></td><td>Records are archived, not deleted. Student and staff patient records are retained for five years from the archive date, and audit records for ten years.</td></tr>
</table>

**Privacy and display**

<table>
<tr><th>ID</th><th>Requirement</th></tr>
<tr><td><b>BR-011</b></td><td>Rolling multi-patient screens show a masked LRN or the Staff No.; deliberately opened student records and relevant individual printouts show the full LRN.</td></tr>
<tr><td><b>BR-012</b></td><td>The Admin does not receive staff patient detail; staff audit entries identify the subject by Staff No.</td></tr>
<tr><td><b>BR-013</b></td><td>A Sports Report excludes LRNs, contacts, vitals, medicines, and private notes.</td></tr>
</table>

**Clinical states**

<table>
<tr><th>ID</th><th>Requirement</th></tr>
<tr><td><b>BR-014</b></td><td>A visit entered more than 30 minutes after its visit time is marked late, and a future time is refused.</td></tr>
<tr><td><b>BR-015</b></td><td>A visit escalated to an incident is counted once, as the incident.</td></tr>
<tr><td><b>BR-016</b></td><td>An entered-in-error visit is excluded from ordinary lists and metrics and cannot be edited; its stock is restored, its letter voided, and its pending follow-ups cancelled.</td></tr>
<tr><td><b>BR-017</b></td><td>A draft excuse letter cannot be printed. An approved letter keeps its approved wording and recipient. An excused period over three inclusive days shows a certificate warning, and the hospital issues any medical certificate.</td></tr>
<tr><td><b>BR-018</b></td><td>Incident medicines lock when Stage 2 is completed. A completed empty Stage 2 may be approved after a no-treatment warning. The Principal signs the printed incident report by hand.</td></tr>
<tr><td><b>BR-019</b></td><td>A pending follow-up is shown as Upcoming within seven days before its date, Due today on its date, and Overdue from three days after its date. It closes automatically as Missed seven days after its date. A missed follow-up may be rescheduled and a cancelled one may not.</td></tr>
<tr><td><b>BR-020</b></td><td>Starting values are: frequent visitor at three visits in 14 days, an upcoming window of seven days, the top five symptoms, a near-expiry window of 30 days, and a possible-cluster alert at <!-- p.81 --> three students with the same main symptom and grade within three days. They are stored as settings, are changed in the database by the developer or the IT provider, and await clinician confirmation.</td></tr>
<tr><td><b>BR-021</b></td><td>Vital-sign ranges depend on age on the event date where birthdate is known, fall back to grade, and use an adult group for staff patients. They are stored as settings and are non-blocking.</td></tr>
</table>

**Inventory**

<table>
<tr><th>ID</th><th>Requirement</th></tr>
<tr><td><b>BR-022</b></td><td>The earliest-expiry usable batch is consumed first; returns go back to the original batch allocations.</td></tr>
<tr><td><b>BR-023</b></td><td>An item is low when its usable stock is at or below its threshold.</td></tr>
<tr><td><b>BR-024</b></td><td>An item with only expired stock cannot be dispensed; expired stock leaves only by explicit disposal.</td></tr>
<tr><td><b>BR-025</b></td><td>A write-off of at least 25% of an item on hand, or one that leaves it at zero, is flagged in the audit log.</td></tr>
</table>

**Reports, calendar, and backup**

<table>
<tr><th>ID</th><th>Requirement</th></tr>
<tr><td><b>BR-026</b></td><td>Monthly weeks run from Sunday to Saturday, clipped at the month boundaries, and report counts are live and exact with no Finalize action.</td></tr>
<tr><td><b>BR-027</b></td><td>At least one backup location remains enabled, and an existing location is not edited.</td></tr>
<tr><td><b>BR-028</b></td><td>Backups rotate to the latest 60 copies per enabled location.</td></tr>
<tr><td><b>BR-029</b></td><td>The Principal receives the Monthly Report as a PDF that the School Clinician sends; the Admin does not print or save clinic documents from CLINIQ.</td></tr>
</table>
