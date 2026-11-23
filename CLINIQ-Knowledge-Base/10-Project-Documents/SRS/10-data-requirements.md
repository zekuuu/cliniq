<!-- p.58 -->

## 22. Data Requirements

This section specifies CLINIQ's data-level requirements: the rules used to validate data as it is entered, the controls that protect data confidentiality and privacy, and the rules governing how long data is kept and how it is backed up.

### 22.1. Data Validation Rules

The following data validation rules are established for CLINIQ, which will be applied at the point of data entry.

**Student records**

<table>
<tr><th>ID</th><th>Requirement</th></tr>
<tr><td><b>DR-001</b></td><td>The system shall identify each student by the Learner Reference Number (LRN). The LRN shall be required, entered as exactly 12 digits with leading zeros preserved, and stored as text; formatting separators shall be removed at entry. The system shall not generate a separate student number.</td></tr>
<tr><td><b>DR-002</b></td><td>The database shall enforce UNIQUE and NOT NULL constraints at the database level, including a unique LRN for each student. A duplicate LRN shall be refused.</td></tr>
<tr><td><b>DR-003</b></td><td>The system shall require the following fields before a new student record can be saved: first name, last name, LRN, grade level, and sex as recorded by the school. Middle name, section, birthdate, emergency contacts, known allergies, and existing medical conditions shall be optional.</td></tr>
<tr><td><b>DR-004</b></td><td>On saving a new student, the system shall check existing records for a full-name and grade-level match. If a potential match exists, the system shall show a warning and require the School Clinician to confirm or cancel before a new entry is created.</td></tr>
<tr><td><b>DR-005</b></td><td>The system shall automatically flag a student record that has no emergency contact as Incomplete, list it in the incomplete-records review queue, and log which School Clinician resolved each flag and when. A missing birthdate, section, allergy, or condition shall not make a record incomplete.</td></tr>
<tr><td><b>DR-006</b></td><td>A record flagged Incomplete shall remain usable in clinic visits and incident records. The system shall keep the record in the review queue until the missing information is supplied, and missing information shall not by itself deny routine care.</td></tr>
<tr><td><b>DR-007</b></td><td>The system shall hold a student’s emergency contacts in order, with the first contact as the primary contact. When a contact is saved, the system shall prompt the School Clinician to verify the contact number before it is used for emergency notification, and shall let the School Clinician mark a contact number as verified or unverified.</td></tr>
<!-- p.59 -->
<tr><td><b>DR-008</b></td><td>If a contact number proves unreachable during an emergency, the system shall re-flag the record and prompt the School Clinician to verify the number with the class adviser or Registrar’s Office; the verification shall be logged.</td></tr>
<tr><td><b>DR-009</b></td><td>The system shall archive or deactivate a student record instead of deleting it. Archived records shall be excluded from default active-student lists, search results, and dropdowns unless the School Clinician explicitly includes them. A manual archive shall require a reason, and an archived record shall keep its archive date, reason, and school year.</td></tr>
<tr><td><b>DR-010</b></td><td>An existing LRN shall be locked against change in the normal edit form. An authorized correction process outside the normal edit form is TBD.</td></tr>
<tr><td><b>DR-011</b></td><td>A student’s name shall be stored as a first name (maximum 50 characters), a last name (maximum 50 characters), and an optional middle name (maximum 40 characters); the display name shall be derived from these parts. A correction to a name shall require a reason.</td></tr>
<tr><td><b>DR-012</b></td><td>Birthdate shall be optional and shall not be in the future. The student’s age shall be calculated from the birthdate and not stored. The system shall hold no personal phone number for the student.</td></tr>
<tr><td><b>DR-013</b></td><td>When a birthdate is entered, the system shall show a non-blocking note if the student’s age is far from the usual age for the grade. The distance is a configurable number of years; the starting value is 3.</td></tr>
<tr><td><b>DR-014</b></td><td>Allergy and condition fields shall be free text. An empty field shall display “None recorded”, and the system shall not infer that a student has no allergies or conditions.</td></tr>
<tr><td><b>DR-015</b></td><td>Student search shall match name words across the name parts, ignoring case and accents and tolerating spacing differences, and shall sort by last, first, and middle name. Typed LRN digits shall match the start of the LRN or, for up to four digits, its last four digits. A search that could contain an LRN shall not place it in a URL.</td></tr>
</table>

**Staff patient records**

<table>
<tr><th>ID</th><th>Requirement</th></tr>
<tr><td><b>DR-016</b></td><td>The system shall generate each Staff No. automatically in the pattern STF-0001. The Staff No. shall not be entered manually and shall not change after creation.</td></tr>
<tr><td><b>DR-017</b></td><td>The system shall require the following fields before a new staff patient record can be saved: first name, last name, sex, and type. Type shall be one of Teacher, Non-teaching staff, Utility worker, or Other. Department or role, contact number, emergency contacts, allergies, and conditions shall be optional.</td></tr>
<!-- p.60 -->
<tr><td><b>DR-018</b></td><td>The system shall flag an older staff patient record that is missing sex or an emergency contact for review. Completing the record shall resolve the review and log who completed it and when.</td></tr>
<tr><td><b>DR-019</b></td><td>The system shall archive a staff patient record instead of deleting it. A manual archive shall require a reason.</td></tr>
<tr><td><b>DR-020</b></td><td>Each visit, incident, follow-up, and medicine dispensing record shall link to exactly one patient, either a student or a staff patient.</td></tr>
</table>

**Imports and school year**

<table>
<tr><th>ID</th><th>Requirement</th></tr>
<tr><td><b>DR-021</b></td><td>The student list import shall let the School Clinician select a CSV file, map its columns, preview the result, and apply it. Rows shall match by LRN: new students shall be added, returning students updated, and archived matches restored.</td></tr>
<tr><td><b>DR-022</b></td><td>Before a student list import is applied, the system shall show which current students are missing from the new list. Students absent from the list shall be archived with the import reason when the import is applied.</td></tr>
<tr><td><b>DR-023</b></td><td>The yearly student list shall drive each student’s grade level and section. Historical visits and incidents shall keep the grade level and section recorded at the time.</td></tr>
<tr><td><b>DR-024</b></td><td>The staff list import shall let the School Clinician map columns, preview, and apply a CSV file. Rows shall match by Staff No. when supplied, otherwise by normalized name and type. Unknown supplied numbers, ambiguous matches, and repeated rows shall be flagged and skipped, and a matching archived record may be restored.</td></tr>
<tr><td><b>DR-025</b></td><td>In a staff list import, empty cells shall preserve existing data, and a contact from the file shall be added only where the record has no contact. Staff absent from the file shall remain unchanged, and the applied changes shall be audited as counts.</td></tr>
<tr><td><b>DR-026</b></td><td>The system shall record each school year with its start date, end date, and the user who started or ended it. The School Clinician shall be able to edit the expected start and end dates and to end and start a school year manually through separate actions. Ending a school year shall set its last class day, and the next year may be started from a subsequent day.</td></tr>
</table>

**Clinic visits, emergencies, and follow-ups**

<table>
<tr><th>ID</th><th>Requirement</th></tr>
<tr><td><b>DR-027</b></td><td>The system shall enforce mandatory fields on clinic-visit and incident records and shall not save a record until its required fields <!-- p.61 --> are complete, except for the Stage 1 emergency capture in the next requirement. A visit shall require a patient and a main symptom.</td></tr>
<tr><td><b>DR-028</b></td><td>For an emergency incident, Stage 1 shall require only the patient and the main symptom, with vital readings and notes optional, and shall save immediately. The record shall remain marked as an incomplete Stage 1 record until the School Clinician completes Stage 2, and incident lists shall show each incident’s stage. Every Stage 2 field shall be optional, and a completed Stage 2 left empty may still be approved after a no-treatment warning.</td></tr>
<tr><td><b>DR-029</b></td><td>A visit or PE/Sports referral disposition shall be one of: returned to class, resting in clinic, sent home, or referred to hospital. For a staff patient, the first shall read “Returned to work”.</td></tr>
<tr><td><b>DR-030</b></td><td>A hospital referral shall record destination, mode of transport, and departure time.</td></tr>
<tr><td><b>DR-031</b></td><td>Each parent/guardian notification attempt shall be timestamped, tied to its incident record, and recorded with the person called, the number dialed, the relationship, and an outcome of exactly one of: Reached, No answer, Left message or voicemail, or Wrong number. For an incident involving a staff patient, the staff patient’s emergency contact shall be called.</td></tr>
<tr><td><b>DR-032</b></td><td>A follow-up shall record the patient (student or staff), the related visit or incident, the follow-up date, the reason or monitoring instruction, and notes. Its status shall follow the lifecycle Pending → Completed, Missed, or Cancelled. A manual change to Missed or Cancelled shall require a reason. A pending follow-up shall be overdue 3 days after its date, and a scheduled job shall close it automatically as Missed 7 days after its date.</td></tr>
<tr><td><b>DR-033</b></td><td>An excuse letter shall be prepared as a draft from a student visit whose disposition is sent home or referred to hospital, with excused dates and an optional teacher note, and routed for approval by the School Clinician. On approval the system shall store the final wording and recipient as a permanent, printable document in the student’s record. A draft shall carry a draft watermark and shall not be printable. The letter shall be kept distinct from a hospital-issued medical certificate.</td></tr>
<tr><td><b>DR-034</b></td><td>An incident report shall be approved by the School Clinician after Stage 2 is completed. Approval shall record the approver, a reference number, the time, and a snapshot of the approved text. The Principal shall sign the printed report by hand.</td></tr>
<tr><td><b>DR-035</b></td><td>A visit or incident entry may carry a free-text event tag (e.g., “MCA Dance Program”).</td></tr>
<tr><td><b>DR-036</b></td><td>A visit’s date and time shall default to now and may be set to a past time; a future time shall be refused. A visit entered more than <!-- p.62 --> 30 minutes after its visit time shall be marked late, with an optional reason.</td></tr>
<tr><td><b>DR-037</b></td><td>A visit shall record up to three other symptom tags besides the main symptom. It may also record who assisted, a time out, release details for a sent-home or hospital disposition, and an optional event tag. When the relationship of the person receiving the student is Other, the system shall require who it is to be specified.</td></tr>
<tr><td><b>DR-038</b></td><td>Marking a visit Entered in error shall require a reason. The record shall be kept, excluded from ordinary lists and metrics, and locked against editing. Linked stock shall be restored through adjustments, its excuse letter voided, and its pending follow-ups cancelled.</td></tr>
<tr><td><b>DR-039</b></td><td>A visit escalated to an incident shall keep its original medicine record and be shown as Escalated, and the event shall be counted once, as the incident. Medicines recorded on an incident shall be locked when Stage 2 is completed.</td></tr>
<tr><td><b>DR-040</b></td><td>A missed follow-up may be rescheduled into a new pending follow-up that keeps any “Stay home until cleared” instruction. A cancelled follow-up shall not be rescheduled.</td></tr>
<tr><td><b>DR-041</b></td><td>A PE/Sports referral shall record the student, the referring instructor, the activity, an injury summary, the clinical assessment, and the disposition. A PE/Sports referral applies to students only.</td></tr>
</table>

**Inventory**

<table>
<tr><th>ID</th><th>Requirement</th></tr>
<tr><td><b>DR-042</b></td><td>Each inventory item shall carry a name, category, unit, low-stock threshold, and the stock received in batches. Each batch shall carry its quantity, received date, and an expiration date or an explicit no-expiry confirmation. The item’s stock shall be derived from its batches.</td></tr>
<tr><td><b>DR-043</b></td><td>Dispensing shall decrease stock by the entered quantity, using the usable batch with the earliest expiration date first, and log the item, quantity, batch allocation, linked visit or incident (if any), staff member, and timestamp. An item with only expired stock shall not be dispensable. If the usable batches cannot cover the quantity, the system shall refuse the dispense and record nothing.</td></tr>
<tr><td><b>DR-044</b></td><td>Restocking shall be a separate, manually initiated action that records a positive quantity and adds a new batch with its own received date and expiration date. Editing an item shall not overwrite batch dates or stock.</td></tr>
<!-- p.63 -->
<tr><td><b>DR-045</b></td><td>The system shall show usable, expired, and total stock separately. An item shall be flagged low when its usable stock is at or below its low-stock threshold. The near-expiry and expired checks shall run independently, and the flags shall be shown as distinct badges.</td></tr>
<tr><td><b>DR-046</b></td><td>Adjust Stock shall be used for corrections and disposal. It shall require a selected batch, an add, remove, or counted quantity, and a reason; a note shall be optional. A manual adjustment shall not take a batch below zero, and removing at least 25% of an item on hand, or leaving it at zero, shall be flagged in the audit log.</td></tr>
<tr><td><b>DR-047</b></td><td>An item may carry optional allergy keywords and optional symptom tags (“Commonly used for”). Symptom tags shall prioritize suggestions for a visit’s symptom, while search shall still cover all items and the School Clinician chooses the item.</td></tr>
</table>

**Reference data, settings, and issue reports**

<table>
<tr><th>ID</th><th>Requirement</th></tr>
<tr><td><b>DR-048</b></td><td>Selection lists shall be read from stored reference settings: complaint types, vital-sign ranges, the number of days after which a medical-certificate warning appears, the unusual-age distance, the large write-off percent, grade levels, staff types, and staff departments.</td></tr>
<tr><td><b>DR-049</b></td><td>Starting values (frequent visitor, cluster alert, follow-up windows, near-expiry window, top symptoms, vital-sign ranges, and similar) shall be stored as settings. Only the idle sign-out minutes have a Settings screen; the other values are changed in the database by the developer or the IT provider.</td></tr>
<tr><td><b>DR-050</b></td><td>The holiday list shall be refreshed monthly by a scheduled job that needs internet access. If a refresh fails, the system shall keep the last good list. The system shall warn when the last good refresh is older than 45 days, or when next year’s list is missing in December.</td></tr>
<tr><td><b>DR-051</b></td><td>An issue report shall record its description, the screen it was reported from, and the role of the person who reported it.</td></tr>
</table>

**User accounts**

<table>
<tr><th>ID</th><th>Requirement</th></tr>
<tr><td><b>DR-052</b></td><td>Each user account shall have a unique username and exactly one role: School Clinician or Admin/Principal. Each account shall belong to one person; accounts shall not be shared, and each person who covers the clinic shall have their own account.</td></tr>
<tr><td><b>DR-053</b></td><td>Passwords shall be at least 8 characters, shall be changed on first login and after a temporary password reset, and shall not repeat any of the user’s last 5 passwords.</td></tr>
</table>

<!-- p.64 -->

**Placeholders and proposals**

<table>
<tr><th>ID</th><th>Requirement</th></tr>
<tr><td><b>(TBD)</b></td><td>(Information needed: field-level formats — contact-number format, grade-level and section values, date/time formats)</td></tr>
<tr><td><b>(TBD)</b></td><td>(Information needed: whether the disposition is mandatory when a visit is saved)</td></tr>
<tr><td><b>(TBD)</b></td><td>(Information needed: clinician confirmation of the starting symptom labels, vital-sign ranges, medical tags, and thresholds)</td></tr>
<tr><td><b>(TBD)</b></td><td>(Information needed: wording of the PE/Sports referral)</td></tr>
<tr><td><b>(TBD)</b></td><td>(Information needed: the real registrar file layout, access, and the data agreement)</td></tr>
<tr><td><b>(TBD)</b></td><td>(Information needed: whether the trend-bucket cluster calculation in the dashboard (settings cluster_min_count 8 and cluster_ratio 2) is a requirement or is retired)</td></tr>
<tr><td><b>Proposed</b></td><td>Proposed: Once the contact-number format is defined, the system shall reject contact numbers that do not match it. (General data-integrity practice; not stated in the sources.)</td></tr>
</table>

### 22.2. Data Security and Privacy Requirements

CLINIQ handles student health information and these requirements protect it in line with RA 10173 (Data Privacy Act of 2012). The sources do not include a legal review; this SRS is not legal advice.

**Authentication, sessions, and role-based access**

<table>
<tr><th>ID</th><th>Requirement</th></tr>
<tr><td><b>DR-054</b></td><td>Every user shall authenticate with a unique username and password. The system shall not allow anonymous access.</td></tr>
<tr><td><b>DR-055</b></td><td>The system shall store passwords only in hashed form (bcrypt, 12 rounds), never in plaintext.</td></tr>
<tr><td><b>DR-056</b></td><td>A session shall last seven days from sign-in for both roles. The system shall also sign a user out after a period of inactivity set for each role: 60 minutes for the School Clinician and 30 minutes for the Admin as starting values, each configurable from 10 to 240 minutes. The system shall warn the user two minutes before an idle sign-out. Disabling an account shall end access from its existing sessions.</td></tr>
<!-- p.65 -->
<tr><td><b>DR-057</b></td><td>The School Clinician shall be able to change the idle sign-out minutes of each role on the Settings screen, and the Admin shall be able to read them.</td></tr>
<tr><td><b>DR-058</b></td><td>The system shall lock an account for 5 minutes after 5 consecutive failed sign-in attempts and record the lockout in the audit log.</td></tr>
<tr><td><b>DR-059</b></td><td>The system shall enforce the role-based access levels in Table 1: the School Clinician performs the clinical work; the Admin/Principal manages accounts and has limited, read-oriented access to clinic data; and server-side checks shall enforce both.</td></tr>
<tr><td><b>DR-060</b></td><td>Only the Admin/Principal shall create, edit, disable, and enable user accounts, assign roles, and reset temporary passwords. Disabled accounts shall be kept for history, and the last active Admin shall not be disabled or demoted.</td></tr>
<tr><td><b>DR-061</b></td><td>The system shall present the standardized first-aid checklist prompts by symptom type. Who may add or edit the checklist content is TBD.</td></tr>
<tr><td><b>DR-062</b></td><td>Parents and guardians shall have no access to the system. PE/Sports Instructors shall not sign in; they receive Sports Reports prepared by the School Clinician. Canteen Staff shall have no access in this phase.</td></tr>
<tr><td><b>DR-063</b></td><td>A user shall be able to enroll an authenticator app by a setup QR code or a manual key, confirm a six-digit code, and then save eight one-time recovery codes. Replacing or disabling the authenticator shall require a current code or a recovery code.</td></tr>
<tr><td><b>DR-064</b></td><td>A user who forgot a password shall enter the username, which the system checks first; the check may tell the user that the username is unknown, disabled, or has no authenticator. The user shall then verify an authenticator or recovery code and choose a new password. Recovery failures shall count toward the same lockout rules. Routine sign-in shall remain username and password, and the Admin’s temporary password reset shall remain a fallback for the School Clinician. If an Admin has lost both the password and the authenticator, an offline administrator reset command run on the clinic workstation shall be the last resort.</td></tr>
<tr><td><b>DR-065</b></td><td>The authenticator secret shall be stored encrypted and recovery codes hashed with a slow hash, and a reused authenticator code step shall be rejected. A copy of the application key shall be kept in a password-protected file, with the password kept apart alongside the handover documents.</td></tr>
</table>

**Table 1. Role-based access**

<table>
<tr><th>Area</th><th>School Clinician</th><th>Admin/Principal</th></tr>
<!-- p.66 -->
<tr><td><b>Clinical work</b></td><td>Student and staff records, visits, incidents, follow-ups, triage, inventory, and referrals.</td><td>Reads the Student List and Profile and the student Incident Log and Report. Visit history on a student profile is read-only without visit-detail links. Staff-patient details and routine visit screens are restricted.</td></tr>
<tr><td><b>Reports</b></td><td>Previews and prints permitted A4 documents, including the Monthly Report as a PDF for the Principal. Creates Sports Reports.</td><td>Reads the four Reports views. No Sports Reports, printing, or Save as PDF of clinic documents.</td></tr>
<tr><td><b>Dashboard and calendar</b></td><td>Clinical Overview actions and alerts, Trends, calendar, and school-event management.</td><td>Overview activity summary, Trends, and calendar; can manage school events. Clinical action queues are School Clinician-only. Admin incident totals and the log omit staff incidents.</td></tr>
<tr><td><b>Archive and audit</b></td><td>Reads the Archive including the Staff tab, and the Audit Log, with authorized audit printing.</td><td>Reads the Archive without the Staff tab, and the Audit Log. Staff-record audit entries show the Staff No. and offer no record link.</td></tr>
<tr><td><b>Backup</b></td><td>Status, history, run, verify, and manage locations.</td><td>Status, history, run, verify, and manage locations.</td></tr>
<tr><td><b>Settings</b></td><td>Reads and changes the idle sign-out minutes of each role.</td><td>Reads the idle sign-out minutes.</td></tr>
<tr><td><b>Accounts</b></td><td>Own display name, profile picture, password, and authenticator settings.</td><td>Same own-account functions. Also manages users, roles, disable/enable, and temporary password resets.</td></tr>
</table>

**Privacy and data exposure**

<table>
<tr><th>ID</th><th>Requirement</th></tr>
<tr><td><b>DR-066</b></td><td>The system shall operate on the clinic workstation only, at http://localhost. It shall not be reachable from the school network and shall not be exposed to the public internet. Windows Firewall shall block inbound connections, and Apache and MariaDB shall accept connections from the workstation itself only (127.0.0.1). The only use of the network is the optional internet call that refreshes the holiday list.</td></tr>
<tr><td><b>DR-067</b></td><td>Rolling multi-patient screens (such as the Visit Log, Incident Log, and the Dashboard’s frequent-visitor section) shall identify a <!-- p.67 --> student by a masked LRN showing only the last four digits, and a staff patient by Staff No. Search results and rosters may show names for selection.</td></tr>
<tr><td><b>DR-068</b></td><td>Screens for a single deliberate lookup — an opened student record, the full profile, and relevant individual printouts — shall show the full LRN. The masterlist shall not show medical or confidential fields (allergies, conditions, contact details, visit reasons) inline; these require opening the individual profile. A Sports Report shall show full names, grade, and selected encounter summaries only, and shall omit LRNs, contacts, vitals, medicines, and private notes.</td></tr>
<tr><td><b>DR-069</b></td><td>Student and staff health data shall be used only within the clinic context, and data shall be collected and used only for clinic operations.</td></tr>
<tr><td><b>DR-070</b></td><td>Parent/guardian notification records shall be retained as acknowledgment of data use for emergency purposes.</td></tr>
<tr><td><b>DR-071</b></td><td>The Admin/Principal shall not receive staff patient details. Aggregates and approved-report references may include staff activity, but no staff patient record, name, or clinical detail.</td></tr>
<tr><td><b>DR-072</b></td><td>Print disclosure shall follow document-specific rules. Printouts that show a full LRN shall be available to the School Clinician only. Dashboard and Trends views shall have no direct print.</td></tr>
</table>

**Audit trail**

<table>
<tr><th>ID</th><th>Requirement</th></tr>
<tr><td><b>DR-073</b></td><td>The system shall log, with the acting user, role, and a timestamp: every sign-in, sign-out, and lockout; every form submission and record write; every approval (excuse letter and incident report); every archive, calendar change, stock movement, and backup action; and every authorized print.</td></tr>
<tr><td><b>DR-074</b></td><td>Opening a student or staff profile or an incident report shall be logged once per record per sign-in session, where the user’s role can open it, so every record opened is attributable to a user account and timestamped. Lists, searches, and audit reads shall not create view entries.</td></tr>
<tr><td><b>DR-075</b></td><td>Each audit entry shall hold the actor, the role at the time, the action, the timestamp, the target, and a compact summary. The summary shall name changed fields rather than health values or credentials. A name correction shall carry its reason and no old or new name.</td></tr>
<tr><td><b>DR-076</b></td><td>The Audit Log Viewer shall be read-only for both roles, shall show entries in pages with action labels that do not reveal health details, <!-- p.68 --> and shall provide date, actor, action, and target filters. The School Clinician may print the filtered matching set.</td></tr>
<tr><td><b>DR-077</b></td><td>The application’s database account shall have SELECT and INSERT permission on the audit log table and no UPDATE or DELETE permission.</td></tr>
</table>

**Placeholders and proposals**

<table>
<tr><th>ID</th><th>Requirement</th></tr>
<tr><td><b>(TBD)</b></td><td>(Information needed: who keeps the copy of the application key at the school, and production recovery operations)</td></tr>
<tr><td><b>(TBD)</b></td><td>(Information needed: whether backup files are encrypted)</td></tr>
<tr><td><b>(TBD)</b></td><td>(Information needed: procedure for requests to access, correct, or delete personal data under RA 10173)</td></tr>
<tr><td><b>(TBD)</b></td><td>(Information needed: school-approved privacy procedures)</td></tr>
<tr><td><b>(TBD)</b></td><td>(Information needed: production rule for reporting on very small groups)</td></tr>
</table>

### 22.3. Data Retention and Backup Requirements

**Data retention**

<table>
<tr><th>ID</th><th>Requirement</th></tr>
<tr><td><b>DR-078</b></td><td>Archived student and staff patient records shall be kept in the system for historical and audit continuity and shall not be deleted by the archive action. Archiving shall keep the record and its clinical history.</td></tr>
<tr><td><b>DR-079</b></td><td>Backups shall be rotated to the latest 60 copies per enabled backup location; older copies shall be rotated out automatically.</td></tr>
<tr><td><b>DR-080</b></td><td>Student and staff patient records shall be retained for five years from the archive date, and audit records for ten years. The retention periods shall be stored as settings. A purge action is not part of the current system and is future work; the system shall not delete the audit log.</td></tr>
</table>

**Backup and verification**

<table>
<tr><th>ID</th><th>Requirement</th></tr>
<tr><td><b>DR-081</b></td><td>The system shall run an automated backup once daily, and shall also back up at sign-out and on a manual “Back up now” action. <!-- p.69 --> Each backup shall be a zip file containing the database dump, the uploaded files, and a checksum manifest, written to every enabled local location in date-organized folders.</td></tr>
<tr><td><b>DR-082</b></td><td>If the scheduled backup does not run, a user shall be able to start a backup manually.</td></tr>
<tr><td><b>DR-083</b></td><td>Backup locations shall be drives chosen in the application: the clinic workstation’s drive and a second or USB drive that is kept away from the clinic room. A backup only on the clinic workstation’s own disk shall not be sufficient. Either role shall be able to choose a folder with a drive/folder picker, add locations, and enable or disable them. An existing location shall not be edited; to replace it, a new location shall be added and the old one disabled, and at least one location shall remain enabled.</td></tr>
<tr><td><b>DR-084</b></td><td>The Backup Verification Assistant shall show the last backup date, file size, and result for each location, and the backup history. It shall warn of the latest failure, of no successful backup, and of a successful backup older than 48 hours. It shall let either role run and verify a backup and mark a backup as verified.</td></tr>
<tr><td><b>DR-085</b></td><td>The School Clinician shall verify that the backup file is accessible and intact before ending the workday, and a backup log shall record each backup’s date, file size, checksum, and verification status. Marking a backup as verified is an attestation by the person who marks it.</td></tr>
<tr><td><b>DR-086</b></td><td>The system shall provide a guided recovery checklist.</td></tr>
</table>

**Operating procedures (outside the system)**

The following are procedures for the clinic and the IT provider. The system supports them only through the guided recovery checklist.

<table>
<tr><th>ID</th><th>Requirement</th></tr>
<tr><td><b>DR-087</b></td><td>Printed monthly health reports shall be retained as a supplementary physical backup of critical summary data.</td></tr>
<tr><td><b>DR-088</b></td><td>Recovery shall follow this procedure: contact the outsourced IT provider; reinstall XAMPP on the replacement workstation; retrieve the most recent backup; and restore the database from the backup file. Restoration is estimated at about 30 minutes once the IT provider begins, excluding response and travel time.</td></tr>
<tr><td><b>DR-089</b></td><td>The outsourced IT provider shall test backup integrity and restoration readiness quarterly.</td></tr>
<tr><td><b>DR-090</b></td><td>Responsibility shall be split as follows. The School Clinician monitors backups, checks that the scheduled backup ran, and keeps the backup log. The outsourced IT provider handles major restoration, hardware replacement, and recovery testing.</td></tr>
</table>

<!-- p.70 -->

**Placeholders and proposals**

<table>
<tr><th>ID</th><th>Requirement</th></tr>
<tr><td><b>(TBD)</b></td><td>(Information needed: retention period for inventory records, and confirmation of the five-year and ten-year retention periods against school policy)</td></tr>
<tr><td><b>(TBD)</b></td><td>(Information needed: paper storage and custody details for printed reports; the file-size trigger for purge tooling)</td></tr>
<tr><td><b>(TBD)</b></td><td>(Information needed: Recovery Time Objective and Recovery Point Objective; restore ownership; confirmation of the school and outsourced IT recovery roles and target times)</td></tr>
<tr><td><b>(TBD)</b></td><td>(Information needed: whether a UPS is procured; power loss was identified as the main operational risk but a UPS is not costed into the current scope)</td></tr>
</table>
