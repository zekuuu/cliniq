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
