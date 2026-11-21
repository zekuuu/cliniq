<?php

declare(strict_types=1);

namespace App\Shared\Database\DemoSchool;

/*
 * The fictional demo and load-test school (08-Logs/Load-Test-Nov16/NOTES.md, "JOB 2 PLAN"), moved here
 * from tools/load/Generator.php on Wednesday, November 18, 2026 so DemoSchoolSeeder and build.php share
 * it. Development only: both refuse production, any database outside their allow list, and a database
 * holding rows they did not make. Every person is invented; every LRN is in the reserved range
 * 999900000001 to 999900999999. The clock is set to each record's time (Carbon::setTestNow, and the
 * database session's `timestamp`, so column defaults such as created_at follow it too).
 *
 * Deterministic and prefix-stable: the school runs from the first school year's June 15 up to `until`
 * (default: Friday, February 26, 2027, the last class day before DemoSchoolSeeder::DEFAULT_UNTIL) and
 * stops at that minute. Each school day draws from its own seed (the fixed seed and the date), and the
 * no-class days before DROP_BEFORE are chosen by a hash of the seed and the date, so a later `until`
 * never changes an earlier day: a later end date gives the same rows, with the same ids, and adds days.
 *
 * Realism (Saturday, November 21, 2026): the rules live in the constant tables below, each with its
 * reason, so they can be read and changed. Vitals use the product's own `vitals_usual_ranges` and
 * `vitals_warning_ranges` (read from reference_settings), not copies. tools/load/checks.php checks
 * the result.
 *
 * Records go in through the owner services (ERD rule M-1), the yearly lists and the school-year steps
 * through the real endpoints, in-process. Two labelled shortcuts: the daily backup rows are inserted
 * directly (running mysqldump 900 times is not the point), and the audit padding of --audit=N writes
 * View events through the same AuditLogger the controllers use.
 */

use App\Modules\ClinicVisits\Services\ExcuseLetterService;
use App\Modules\ClinicVisits\Services\VisitService;
use App\Modules\Dashboard\Services\CalendarService;
use App\Modules\EmergencyResponse\Services\IncidentService;
use App\Modules\InventoryTracker\Services\InventoryService;
use App\Modules\StaffPatients\Services\PersonnelService;
use App\Modules\StudentRecords\Services\StudentService;
use App\Modules\UserManagement\Models\User;
use App\Modules\UserManagement\Services\AuthService;
use App\Modules\UserManagement\Services\UserService;
use App\Shared\AuditLog\AuditAction;
use App\Shared\AuditLog\AuditEvent;
use App\Shared\AuditLog\AuditLogger;
use App\Shared\AuditLog\AuditTarget;
use App\Shared\FollowUps\FollowUpService;
use Carbon\Carbon;
use Carbon\CarbonImmutable;
use Closure;
use Illuminate\Support\Facades\DB;

final class LoadGenerator
{
    /** The background `load.*` accounts' password. The demo accounts use the mock's passwords. */
    public const PASSWORD = 'Load-Test-Only-2026';

    /** The mock's accounts (`frontend/src/lib/mock-db/mock-db.json`, `devAccounts`): one set of sign-ins for both. */
    public const DEMO_USERNAMES = ['demo.principal', 'demo.nurse', 'demo.new'];

    public const LRN_PREFIX = '999900';

    /** From this date on there are no random no-class days, so every weekday outside holidays and breaks has data (Zean, November 21, 2026). */
    public const DROP_BEFORE = '2026-11-19';

    private const GRADES = ['Kinder', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];

    /** "Grade" 13 in the item and age rules: an adult (a staff patient). */
    private const ADULT = 13;

    // ------------------------------------------------------------ the realism tables

    /** Share of the roster per grade: a private school tapers (more in the lower grades, fewer in Senior High, where many leave for other schools). */
    private const GRADE_SHARE = [78, 76, 76, 74, 72, 72, 70, 70, 68, 68, 66, 56, 54];

    /** Enrollment grows this much a year, so the current year has the requested size and earlier years fewer (Zean: "900+ this s.y., another for others"). */
    private const GROWTH_PER_YEAR = 0.025;

    /** Percent who leave when promoted into a grade: Grade 7 (high school) and Grade 11 (Senior High) are where families change schools; 2% elsewhere. */
    private const LEAVE_PCT = [7 => 4, 11 => 18];

    /** Where new enrollees (not Kinder) join: mostly at the entry points Grade 1, 7 and 11. */
    private const NEW_ENROLLEE_GRADE = [1 => 4, 2 => 1, 3 => 1, 4 => 1, 5 => 1, 6 => 1, 7 => 6, 8 => 1, 9 => 1, 10 => 1, 11 => 6];

    /** [label, per-mille, lowest grade, highest grade]: common school-age conditions at believable rates; none of the adult ones. */
    private const CONDITIONS = [['Asthma', 60, 0, 12], ['Allergic rhinitis', 40, 0, 12], ['Eczema', 35, 0, 6], ['Migraine', 25, 5, 12], ['G6PD deficiency', 10, 0, 12], ['Scoliosis', 8, 6, 12], ['Epilepsy', 5, 0, 12], ['Heart murmur', 5, 0, 12]];

    /** [label, per-mille]: allergies a school record carries; the drug ones matter for what the clinic gives. */
    private const ALLERGIES = [['Peanuts', 20], ['Shrimp', 20], ['Dust mites', 15], ['Penicillin', 15], ['Ibuprofen', 6], ['Mefenamic acid', 3], ['Paracetamol', 2], ['Iodine', 2]];

    /** Weights of the primary emergency contact's relationship: mostly a parent. */
    private const GUARDIAN = [['Mother', 55], ['Father', 25], ['Grandmother', 10], ['Aunt', 4], ['Uncle', 2], ['Guardian', 4]];

    /** Philippine mobile prefixes (Globe, Smart, DITO), so numbers look like the Import screen's 09XXXXXXXXX. */
    private const MOBILE_PREFIXES = ['0905', '0906', '0915', '0916', '0917', '0918', '0919', '0920', '0921', '0927', '0928', '0939', '0945', '0947', '0961', '0966', '0977', '0995', '0998', '0999'];

    /** [label, weight] of student visit complaints; the season and day tables below multiply these. */
    private const COMPLAINTS = [['Headache', 18], ['Stomachache', 14], ['Fever', 9], ['Cough and colds', 11], ['Dizziness', 7], ['Minor wound', 10], ['Menstrual cramps', 6], ['Toothache', 3], ['Sprain', 3], ['Allergic reaction', 3], ['Fainting', 1], ['Chills', 2], ['Eye irritation', 2], ['Nosebleed', 2], ['Itchy skin', 2], ['Body ache', 2]];

    /** Complaint multipliers by month: rainy season (June to November) brings coughs, colds and fevers; the hot months (March to May) heat headaches, dizziness and fainting. */
    private const SEASON = [
        6 => ['Cough and colds' => 1.6, 'Fever' => 1.4, 'Chills' => 1.4], 7 => ['Cough and colds' => 1.9, 'Fever' => 1.6, 'Chills' => 1.6], 8 => ['Cough and colds' => 2.0, 'Fever' => 1.7, 'Chills' => 1.6],
        9 => ['Cough and colds' => 1.8, 'Fever' => 1.5, 'Chills' => 1.4], 10 => ['Cough and colds' => 1.5, 'Fever' => 1.3], 11 => ['Cough and colds' => 1.3, 'Fever' => 1.2],
        12 => [], 1 => ['Cough and colds' => 1.2], 2 => [], 3 => ['Headache' => 1.3, 'Dizziness' => 1.6, 'Fainting' => 2.0, 'Nosebleed' => 1.5],
        4 => ['Headache' => 1.4, 'Dizziness' => 1.8, 'Fainting' => 2.2, 'Nosebleed' => 1.6], 5 => ['Headache' => 1.4, 'Dizziness' => 1.8, 'Fainting' => 2.2],
    ];

    /** Visit volume by month: a busy rainy season, a quieter December run-up and an end-of-year April. */
    private const MONTH_VOLUME = [6 => 0.9, 7 => 1.1, 8 => 1.15, 9 => 1.1, 10 => 1.0, 11 => 1.0, 12 => 0.85, 1 => 1.0, 2 => 1.0, 3 => 1.1, 4 => 0.8];

    /** Visit volume by weekday (1 = Monday): Mondays catch the weekend's illnesses, Fridays are lighter. */
    private const WEEKDAY_VOLUME = [1 => 1.15, 2 => 1.0, 3 => 0.95, 4 => 1.0, 5 => 0.9];

    /** Student visits on an ordinary day per 900 students: a one-nurse clinic sees about 12 to 20. */
    private const VISITS_PER_900 = 15;

    /**
     * Half-hour slots from 07:00 and their weights: after the flag ceremony, at recess (09:30), before
     * and after lunch, at the afternoon PE periods and before dismissal; quiet at the edges of the day.
     */
    private const SLOTS = [[420, 2], [450, 4], [480, 7], [510, 6], [540, 5], [570, 9], [600, 8], [630, 5], [660, 5], [690, 6], [720, 4], [750, 7], [780, 9], [810, 6], [840, 5], [870, 6], [900, 6], [930, 5], [960, 2]];

    /** Calendar events and what they do to the day: [volume, complaint multipliers, incident multiplier, event tag for injuries]. */
    private const EVENT_EFFECTS = [
        'First day of classes' => [0.6, [], 1, null],
        'Intramurals' => [1.3, ['Sprain' => 4.0, 'Minor wound' => 2.5, 'Dizziness' => 1.5], 3, 'Intramurals'],
        'Foundation Day' => [1.2, ['Dizziness' => 1.5, 'Minor wound' => 1.5], 1.5, 'Foundation Day'],
        'Deworming day' => [1.2, ['Stomachache' => 2.2, 'Dizziness' => 1.3], 1, null],
        'Dental check-up' => [1.0, ['Toothache' => 3.0], 1, null],
        'Parent-Teacher Conference' => [0.5, [], 0.5, null],
        'Christmas program' => [0.8, ['Dizziness' => 1.3], 1, null],
        'Recognition day' => [0.6, [], 0.5, null],
        'exams' => [1.1, ['Headache' => 1.4, 'Stomachache' => 1.3], 0.7, null],
    ];

    /** Complaints a person with a condition comes in with more often (40% of their visits). */
    private const CONDITION_COMPLAINT = ['Asthma' => 'Cough and colds', 'Migraine' => 'Headache', 'Eczema' => 'Itchy skin', 'Allergic rhinitis' => 'Allergic reaction'];

    /** [returned to class, resting, sent home, referred] per complaint; referral only for fever, fainting and injuries. */
    private const DISPOSITIONS = [
        'Fever' => [25, 25, 48, 2], 'Chills' => [40, 25, 35, 0], 'Fainting' => [30, 45, 20, 5], 'Dizziness' => [45, 40, 15, 0], 'Headache' => [70, 22, 8, 0],
        'Stomachache' => [65, 20, 15, 0], 'Menstrual cramps' => [55, 35, 10, 0], 'Toothache' => [70, 10, 20, 0], 'Sprain' => [60, 25, 12, 3], 'Minor wound' => [90, 5, 4, 1],
        'Allergic reaction' => [70, 15, 13, 2], 'Cough and colds' => [80, 8, 12, 0], 'Nosebleed' => [85, 12, 3, 0], 'Eye irritation' => [90, 5, 5, 0], 'Itchy skin' => [95, 0, 5, 0], 'Body ache' => [70, 20, 10, 0],
    ];

    /** Minutes from arrival to leaving the clinic, by disposition: a quick check, a rest, waiting for a parent, waiting for transport. */
    private const STAY_MINUTES = ['returned_to_class' => [10, 25], 'resting_in_clinic' => [20, 60], 'sent_home' => [30, 120], 'referred_to_hospital' => [20, 45]];

    /** [percent with a temperature taken, kind]: fever is above `feverFromC`, low may be a low-grade fever, normal is under it. */
    private const TEMPERATURE = ['Fever' => [100, 'fever'], 'Chills' => [95, 'low'], 'Cough and colds' => [85, 'low'], 'Body ache' => [70, 'low'], 'Headache' => [75, 'normal'], 'Dizziness' => [60, 'normal'], 'Fainting' => [70, 'normal'], 'Stomachache' => [50, 'normal'], 'Allergic reaction' => [40, 'normal']];

    /**
     * What the nurse gives for a complaint: lines of [percent, items in order of preference]; the
     * first item that suits the patient's age, avoids their allergies and is in stock is given.
     */
    private const TREATMENT = [
        'Headache' => [[40, ['Paracetamol 500mg tablet', 'Paracetamol 250mg/5mL syrup']], [15, ['Camphor-menthol ointment']]],
        'Fever' => [[85, ['Paracetamol 500mg tablet', 'Paracetamol 250mg/5mL syrup']], [30, ['Disposable face masks']]],
        'Chills' => [[50, ['Paracetamol 500mg tablet', 'Paracetamol 250mg/5mL syrup']]],
        'Body ache' => [[35, ['Paracetamol 500mg tablet', 'Paracetamol 250mg/5mL syrup']], [30, ['Methyl salicylate balm']]],
        'Stomachache' => [[35, ['Antacid chewable tablet', 'Simethicone 40mg chewable tablet']], [15, ['Oral rehydration salts']], [15, ['Heat patch']]],
        'Cough and colds' => [[30, ['Carbocisteine 500mg capsule', 'Ambroxol 30mg tablet']], [25, ['Throat lozenges']], [30, ['Disposable face masks']], [20, ['Facial tissue']]],
        'Dizziness' => [[15, ['Oral rehydration salts']], [10, ['Meclizine 25mg tablet']]],
        'Minor wound' => [[80, ['Povidone-iodine 10% solution']], [50, ['Adhesive bandage strips']], [35, ['Sterile gauze pads']], [30, ['Cotton balls']], [25, ['Examination gloves']]],
        'Menstrual cramps' => [[45, ['Mefenamic acid 500mg tablet', 'Mefenamic acid 250mg capsule', 'Hyoscine butylbromide 10mg tablet']], [30, ['Heat patch']], [15, ['Sanitary napkins']]],
        'Toothache' => [[40, ['Mefenamic acid 250mg capsule', 'Paracetamol 500mg tablet', 'Paracetamol 250mg/5mL syrup']], [15, ['Clove oil']]],
        'Sprain' => [[85, ['Instant cold pack']], [45, ['Elastic bandage 3 inch', 'Elastic bandage 4 inch']], [20, ['Methyl salicylate balm']], [15, ['Ibuprofen 200mg tablet']]],
        'Allergic reaction' => [[65, ['Cetirizine 10mg tablet', 'Cetirizine 5mg/5mL syrup']], [15, ['Calamine lotion']]],
        'Fainting' => [[30, ['Oral rehydration salts']], [10, ['Aromatic ammonia inhalant']]],
        'Eye irritation' => [[55, ['Sodium chloride 0.9% eye drops']], [15, ['Eye pad']]],
        'Nosebleed' => [[70, ['Cotton balls']], [40, ['Instant cold pack']], [30, ['Facial tissue']], [30, ['Examination gloves']]],
        'Itchy skin' => [[50, ['Calamine lotion', 'Hydrocortisone 1% cream']], [15, ['Cetirizine 10mg tablet', 'Cetirizine 5mg/5mL syrup']]],
        // Incidents
        'Fall injury' => [[70, ['Povidone-iodine 10% solution']], [60, ['Sterile gauze pads']], [40, ['Instant cold pack']]],
        'Head bump during PE' => [[90, ['Instant cold pack']]],
        'Hit by a ball' => [[80, ['Instant cold pack']]],
        'Ankle sprain during PE' => [[90, ['Instant cold pack']], [60, ['Elastic bandage 3 inch']]],
        'Asthma attack' => [[90, ['Salbutamol 2.5mg/2.5mL nebule']], [20, ['Pediatric oxygen mask']]],
        'Severe allergic reaction' => [[40, ['Epinephrine 1mg/mL ampule']], [80, ['Cetirizine 10mg tablet', 'Cetirizine 5mg/5mL syrup']]],
        'Deep cut' => [[95, ['Sterile gauze pads']], [80, ['Povidone-iodine 10% solution']], [60, ['Elastic bandage 3 inch']], [70, ['Examination gloves']]],
    ];

    /**
     * [label, weight, lowest grade, highest grade (13 = staff too), referral percent, condition the
     * patient usually has]: playground falls for the little ones, PE injuries from Grade 1, fainting
     * from Grade 5, asthma attacks mostly in students with asthma.
     */
    private const INCIDENTS = [
        ['Fall injury', 30, 0, 13, 5, null], ['Head bump during PE', 14, 1, 12, 8, null], ['Hit by a ball', 8, 3, 12, 3, null], ['Ankle sprain during PE', 8, 4, 13, 5, null],
        ['Fainting', 12, 5, 13, 10, null], ['Asthma attack', 14, 0, 13, 15, 'Asthma'], ['Severe allergic reaction', 4, 0, 13, 70, null], ['Deep cut', 6, 2, 13, 50, null], ['Seizure', 2, 0, 13, 60, 'Epilepsy'],
    ];

    /** Injury incidents: three times as likely on Intramurals and Foundation Day. */
    private const INJURIES = ['Fall injury', 'Head bump during PE', 'Hit by a ball', 'Ankle sprain during PE', 'Deep cut'];

    /** Percent of school days with an incident: about 3 to 5 a month. */
    private const INCIDENT_DAY_PCT = 20;

    /** Vitals shift per incident [pulse, systolic, diastolic, SpO2 range or null, temperature]: fainting drops the pressure, asthma the oxygen, pain raises the pulse. */
    private const EVENT_VITALS = [
        'Fainting' => [-8, -18, -12, null, 0.0], 'Asthma attack' => [25, 5, 0, [89, 93], 0.0], 'Severe allergic reaction' => [22, -12, -8, [92, 95], 0.0],
        'Seizure' => [18, 8, 5, [93, 96], 0.4], 'pain' => [8, 4, 2, null, 0.0],
    ];

    /** Destinations and transport for a referral (invented, generic). */
    private const REFERRAL_TO = ['District hospital emergency room', 'Municipal health center', 'Family doctor (parent\'s choice)'];

    private const TRANSPORT = ['School vehicle', 'Ambulance', 'Parent\'s car'];

    /** Percent of a complaint that gets a follow-up, and how many school days later it is due. */
    private const FOLLOW_UP = ['Fever' => [70, 1, 'Check temperature on return to school'], 'Minor wound' => [25, 2, 'Wound check and dressing change'], 'Sprain' => [40, 2, 'Check swelling and walking'], 'Allergic reaction' => [20, 1, 'Check the rash']];

    /** Sent-home complaints that get an excuse letter (and the percent); a referral almost always does. */
    private const LETTER = ['Fever' => 85, 'Chills' => 80, 'Sprain' => 70, 'Fainting' => 80, 'Dizziness' => 60, 'Stomachache' => 60, 'Cough and colds' => 70, 'Toothache' => 50, 'Minor wound' => 60, 'Allergic reaction' => 60];

    /**
     * The clinic's 60 items: [name, category, unit, used for, avoid if allergic to, lowest grade,
     * highest grade, low-stock threshold, delivery quantity, dose min, dose max, slow mover]. Syrups for
     * the younger grades, tablets from Grade 4 or 7, adult strengths for staff only (grade 13).
     */
    private const ITEMS = [
        ['Paracetamol 500mg tablet', 'medicine', 'tablets', ['Headache', 'Fever', 'Body ache', 'Toothache'], ['paracetamol'], 7, 13, 25, 80, 1, 1, false],
        ['Paracetamol 250mg/5mL syrup', 'medicine', 'mL', ['Fever', 'Headache'], ['paracetamol'], 0, 6, 180, 600, 5, 10, false],
        ['Ibuprofen 200mg tablet', 'medicine', 'tablets', ['Headache', 'Toothache', 'Sprain'], ['ibuprofen', 'nsaid'], 7, 13, 5, 20, 1, 1, false],
        ['Mefenamic acid 250mg capsule', 'medicine', 'capsules', ['Menstrual cramps', 'Toothache'], ['mefenamic', 'nsaid'], 7, 13, 4, 15, 1, 1, false],
        ['Mefenamic acid 500mg tablet', 'medicine', 'tablets', ['Menstrual cramps'], ['mefenamic', 'nsaid'], 13, 13, 3, 10, 1, 1, false],
        ['Loperamide 2mg capsule', 'medicine', 'capsules', ['Stomachache'], [], 7, 13, 3, 10, 1, 1, true],
        ['Oral rehydration salts', 'medicine', 'sachets', ['Stomachache', 'Dizziness'], [], 0, 13, 10, 30, 1, 1, false],
        ['Antacid chewable tablet', 'medicine', 'tablets', ['Stomachache'], [], 4, 13, 10, 30, 1, 1, false],
        ['Hyoscine butylbromide 10mg tablet', 'medicine', 'tablets', ['Stomachache', 'Menstrual cramps'], [], 7, 13, 3, 10, 1, 1, false],
        ['Cetirizine 10mg tablet', 'medicine', 'tablets', ['Allergic reaction', 'Itchy skin'], [], 4, 13, 6, 20, 1, 1, false],
        ['Cetirizine 5mg/5mL syrup', 'medicine', 'mL', ['Allergic reaction', 'Itchy skin'], [], 0, 3, 10, 40, 5, 5, false],
        ['Loratadine 10mg tablet', 'medicine', 'tablets', ['Allergic reaction'], [], 4, 13, 3, 10, 1, 1, true],
        ['Diphenhydramine 25mg capsule', 'medicine', 'capsules', ['Allergic reaction'], [], 7, 13, 3, 10, 1, 1, true],
        ['Salbutamol 2.5mg/2.5mL nebule', 'medicine', 'nebules', ['Cough and colds'], [], 0, 13, 5, 20, 1, 1, false],
        ['Carbocisteine 500mg capsule', 'medicine', 'capsules', ['Cough and colds'], [], 7, 13, 8, 30, 1, 1, false],
        ['Ambroxol 30mg tablet', 'medicine', 'tablets', ['Cough and colds'], [], 4, 13, 3, 10, 1, 1, false],
        ['Throat lozenges', 'medicine', 'pieces', ['Cough and colds'], [], 4, 13, 15, 50, 1, 2, false],
        ['Phenylephrine + chlorphenamine + paracetamol tablet', 'medicine', 'tablets', ['Cough and colds', 'Fever'], ['paracetamol'], 7, 13, 3, 10, 1, 1, true],
        ['Ascorbic acid 500mg tablet', 'medicine', 'tablets', ['Cough and colds'], [], 4, 13, 5, 20, 1, 1, true],
        ['Meclizine 25mg tablet', 'medicine', 'tablets', ['Dizziness'], [], 7, 13, 3, 10, 1, 1, false],
        ['Calamine lotion', 'medicine', 'mL', ['Itchy skin', 'Allergic reaction'], [], 0, 13, 30, 120, 5, 5, false],
        ['Hydrocortisone 1% cream', 'medicine', 'g', ['Itchy skin', 'Allergic reaction'], [], 0, 13, 5, 20, 1, 2, false],
        ['Mupirocin 2% ointment', 'medicine', 'g', ['Minor wound'], [], 0, 13, 3, 10, 1, 1, true],
        ['Povidone-iodine 10% solution', 'medicine', 'mL', ['Minor wound'], ['iodine', 'povidone'], 0, 13, 60, 240, 2, 5, false],
        ['Silver sulfadiazine 1% cream', 'medicine', 'g', ['Minor wound'], [], 0, 13, 3, 10, 1, 2, true],
        ['Sodium chloride 0.9% eye drops', 'medicine', 'mL', ['Eye irritation'], [], 0, 13, 4, 15, 1, 1, false],
        ['Lubricating eye drops', 'medicine', 'mL', ['Eye irritation'], [], 4, 13, 3, 10, 1, 1, true],
        ['Clove oil', 'medicine', 'mL', ['Toothache'], [], 4, 13, 3, 10, 1, 1, false],
        ['Camphor-menthol ointment', 'medicine', 'g', ['Headache', 'Body ache', 'Dizziness'], [], 0, 13, 8, 25, 1, 1, false],
        ['Methyl salicylate balm', 'medicine', 'g', ['Sprain', 'Body ache'], [], 4, 13, 3, 10, 1, 2, false],
        ['Aromatic ammonia inhalant', 'medicine', 'ampules', ['Fainting', 'Dizziness'], [], 7, 13, 3, 10, 1, 1, true],
        ['Simethicone 40mg chewable tablet', 'medicine', 'tablets', ['Stomachache'], [], 4, 13, 5, 20, 1, 1, false],
        ['Zinc sulfate 20mg/5mL syrup', 'medicine', 'mL', ['Stomachache'], [], 0, 6, 20, 60, 5, 5, true],
        ['Epinephrine 1mg/mL ampule', 'medicine', 'ampules', ['Allergic reaction'], [], 0, 13, 2, 5, 1, 1, true],
        ['Petroleum jelly', 'medicine', 'g', ['Itchy skin'], [], 0, 13, 10, 40, 1, 2, true],
        ['Cotton balls', 'supply', 'pieces', ['Minor wound', 'Nosebleed'], [], 0, 13, 40, 120, 2, 4, false],
        ['Sterile gauze pads', 'supply', 'pieces', ['Minor wound', 'Nosebleed'], [], 0, 13, 15, 40, 1, 2, false],
        ['Adhesive bandage strips', 'supply', 'pieces', ['Minor wound'], [], 0, 13, 20, 60, 1, 2, false],
        ['Elastic bandage 3 inch', 'supply', 'rolls', ['Sprain'], [], 0, 13, 5, 12, 1, 1, false],
        ['Elastic bandage 4 inch', 'supply', 'rolls', ['Sprain'], [], 7, 13, 3, 10, 1, 1, false],
        ['Micropore tape', 'supply', 'rolls', ['Minor wound'], [], 0, 13, 2, 6, 1, 1, true],
        ['Instant cold pack', 'supply', 'pieces', ['Sprain', 'Nosebleed', 'Headache'], [], 0, 13, 10, 30, 1, 1, false],
        ['Heat patch', 'supply', 'pieces', ['Menstrual cramps', 'Stomachache'], [], 7, 13, 5, 15, 1, 1, false],
        ['Isopropyl alcohol 70%', 'supply', 'mL', ['Minor wound'], [], 0, 13, 100, 500, 5, 10, true],
        ['Hydrogen peroxide 3%', 'supply', 'mL', ['Minor wound'], [], 0, 13, 100, 500, 5, 10, true],
        ['Disposable face masks', 'supply', 'pieces', ['Cough and colds', 'Fever'], [], 0, 13, 25, 100, 1, 1, false],
        ['Examination gloves', 'supply', 'pairs', ['Minor wound', 'Nosebleed'], [], 0, 13, 10, 40, 1, 1, false],
        ['Thermometer probe covers', 'supply', 'pieces', ['Fever', 'Chills'], [], 0, 13, 50, 300, 1, 1, true],
        ['Tongue depressors', 'supply', 'pieces', ['Cough and colds'], [], 0, 13, 20, 100, 1, 1, true],
        ['Sanitary napkins', 'supply', 'pieces', ['Menstrual cramps'], [], 5, 13, 3, 10, 1, 2, false],
        ['Triangular bandage', 'supply', 'pieces', ['Sprain'], [], 0, 13, 2, 6, 1, 1, true],
        ['Finger splint', 'supply', 'pieces', ['Sprain'], [], 0, 13, 2, 5, 1, 1, true],
        ['Eye pad', 'supply', 'pieces', ['Eye irritation'], [], 0, 13, 3, 10, 1, 1, false],
        ['Emesis bag', 'supply', 'pieces', ['Dizziness', 'Stomachache'], [], 0, 13, 5, 20, 1, 1, true],
        ['Facial tissue', 'supply', 'packs', ['Cough and colds', 'Nosebleed'], [], 0, 13, 10, 30, 1, 1, false],
        ['Wet wipes', 'supply', 'packs', ['Minor wound'], [], 0, 13, 3, 10, 1, 1, true],
        ['Sterile water for irrigation', 'supply', 'mL', ['Minor wound', 'Eye irritation'], [], 0, 13, 100, 500, 10, 20, true],
        ['Cotton-tipped applicators', 'supply', 'pieces', ['Minor wound', 'Toothache'], [], 0, 13, 10, 50, 1, 2, true],
        ['Hydrocolloid burn dressing', 'supply', 'pieces', ['Minor wound'], [], 0, 13, 2, 6, 1, 1, true],
        ['Pediatric oxygen mask', 'supply', 'pieces', ['Fainting'], [], 0, 13, 2, 5, 1, 1, true],
    ];

    /**
     * Nationwide holidays of the earlier school years (June 2022 to December 2025), regular and special
     * non-working days by proclamation, recalled for the demo: approximate, demo data only. 2026 and
     * 2027 come from frontend/src/lib/mock-db/holidays-ph.json.
     */
    private const PAST_HOLIDAYS = [
        ['2022-06-12', 'Independence Day', 'regular'], ['2022-07-09', 'Eid al-Adha', 'regular'], ['2022-08-21', 'Ninoy Aquino Day', 'special-non-working'], ['2022-08-29', 'National Heroes Day', 'regular'],
        ['2022-10-31', 'Additional special day', 'special-non-working'], ['2022-11-01', 'All Saints\' Day', 'special-non-working'], ['2022-11-30', 'Bonifacio Day', 'regular'], ['2022-12-08', 'Feast of the Immaculate Conception of Mary', 'special-non-working'],
        ['2022-12-24', 'Christmas Eve', 'special-non-working'], ['2022-12-25', 'Christmas Day', 'regular'], ['2022-12-26', 'Additional special day', 'special-non-working'], ['2022-12-30', 'Rizal Day', 'regular'], ['2022-12-31', 'Last Day of the Year', 'special-non-working'],
        ['2023-01-01', 'New Year\'s Day', 'regular'], ['2023-01-02', 'Additional special day', 'special-non-working'], ['2023-01-22', 'Chinese New Year', 'special-non-working'], ['2023-02-24', 'EDSA People Power Revolution Anniversary', 'special-non-working'],
        ['2023-04-06', 'Maundy Thursday', 'regular'], ['2023-04-07', 'Good Friday', 'regular'], ['2023-04-08', 'Black Saturday', 'special-non-working'], ['2023-04-10', 'Araw ng Kagitingan', 'regular'], ['2023-04-21', 'Eid\'l Fitr', 'regular'],
        ['2023-05-01', 'Labor Day', 'regular'], ['2023-06-12', 'Independence Day', 'regular'], ['2023-06-28', 'Eid al-Adha', 'regular'], ['2023-08-21', 'Ninoy Aquino Day', 'special-non-working'], ['2023-08-28', 'National Heroes Day', 'regular'],
        ['2023-10-30', 'Barangay and SK Elections', 'special-non-working'], ['2023-11-01', 'All Saints\' Day', 'special-non-working'], ['2023-11-02', 'All Souls\' Day', 'special-non-working'], ['2023-11-27', 'Bonifacio Day', 'regular'],
        ['2023-12-08', 'Feast of the Immaculate Conception of Mary', 'special-non-working'], ['2023-12-24', 'Christmas Eve', 'special-non-working'], ['2023-12-25', 'Christmas Day', 'regular'], ['2023-12-26', 'Additional special day', 'special-non-working'], ['2023-12-30', 'Rizal Day', 'regular'], ['2023-12-31', 'Last Day of the Year', 'special-non-working'],
        ['2024-01-01', 'New Year\'s Day', 'regular'], ['2024-02-09', 'Additional special day', 'special-non-working'], ['2024-02-10', 'Chinese New Year', 'special-non-working'], ['2024-03-28', 'Maundy Thursday', 'regular'], ['2024-03-29', 'Good Friday', 'regular'], ['2024-03-30', 'Black Saturday', 'special-non-working'],
        ['2024-04-09', 'Araw ng Kagitingan', 'regular'], ['2024-04-10', 'Eid\'l Fitr', 'regular'], ['2024-05-01', 'Labor Day', 'regular'], ['2024-06-12', 'Independence Day', 'regular'], ['2024-06-17', 'Eid al-Adha', 'regular'], ['2024-08-21', 'Ninoy Aquino Day', 'special-non-working'], ['2024-08-26', 'National Heroes Day', 'regular'],
        ['2024-11-01', 'All Saints\' Day', 'special-non-working'], ['2024-11-02', 'All Souls\' Day', 'special-non-working'], ['2024-11-30', 'Bonifacio Day', 'regular'], ['2024-12-08', 'Feast of the Immaculate Conception of Mary', 'special-non-working'], ['2024-12-24', 'Christmas Eve', 'special-non-working'], ['2024-12-25', 'Christmas Day', 'regular'], ['2024-12-30', 'Rizal Day', 'regular'], ['2024-12-31', 'Last Day of the Year', 'special-non-working'],
        ['2025-01-01', 'New Year\'s Day', 'regular'], ['2025-01-29', 'Chinese New Year', 'special-non-working'], ['2025-04-01', 'Eid\'l Fitr', 'regular'], ['2025-04-09', 'Araw ng Kagitingan', 'regular'], ['2025-04-17', 'Maundy Thursday', 'regular'], ['2025-04-18', 'Good Friday', 'regular'], ['2025-04-19', 'Black Saturday', 'special-non-working'],
        ['2025-05-01', 'Labor Day', 'regular'], ['2025-05-12', 'National and Local Elections', 'special-non-working'], ['2025-06-06', 'Eid al-Adha', 'regular'], ['2025-06-12', 'Independence Day', 'regular'], ['2025-08-21', 'Ninoy Aquino Day', 'special-non-working'], ['2025-08-25', 'National Heroes Day', 'regular'],
        ['2025-10-31', 'Additional special day', 'special-non-working'], ['2025-11-01', 'All Saints\' Day', 'special-non-working'], ['2025-11-30', 'Bonifacio Day', 'regular'], ['2025-12-08', 'Feast of the Immaculate Conception of Mary', 'special-non-working'], ['2025-12-24', 'Christmas Eve', 'special-non-working'], ['2025-12-25', 'Christmas Day', 'regular'], ['2025-12-30', 'Rizal Day', 'regular'], ['2025-12-31', 'Last Day of the Year', 'special-non-working'],
    ];

    private const SECTIONS = ['Faith', 'Hope', 'Charity', 'Joy', 'Peace', 'Patience', 'Kindness', 'Goodness', 'Gentleness', 'Humility', 'Wisdom', 'Courage', 'Honesty', 'Diligence', 'Mercy', 'Grace', 'Justice', 'Prudence', 'Temperance', 'Fortitude', 'Loyalty', 'Respect', 'Charity II', 'Obedience', 'Simplicity', 'Integrity'];

    private const FIRST_F = ['Maria', 'Ana', 'Sofia', 'Andrea', 'Bea', 'Camille', 'Danica', 'Erika', 'Faith', 'Gabrielle', 'Hannah', 'Isabel', 'Jasmine', 'Kristine', 'Lea', 'Mika', 'Nicole', 'Patricia', 'Rhea', 'Samantha', 'Trisha', 'Venice', 'Ysabel', 'Zia', 'Ma. Teresa', 'Precious', 'Angelica', 'Bianca', 'Clarisse', 'Denise', 'Elaine', 'Frances', 'Joanna', 'Katrina', 'Lorraine', 'Marian', 'Noreen', 'Pia', 'Rochelle', 'Shaira', 'Ximena', 'Yvette', 'Iñez', 'Ángela', 'Julieta', 'Rosario', 'Liza', 'Carmela'];

    private const FIRST_M = ['Juan', 'Jose', 'Miguel', 'Carlo', 'Daniel', 'Enzo', 'Francis', 'Gabriel', 'Harvey', 'Ivan', 'Jericho', 'Kenneth', 'Lance', 'Mark', 'Nathan', 'Oliver', 'Paolo', 'Rafael', 'Sean', 'Tristan', 'Vince', 'Warren', 'Xander', 'Yuri', 'Zachary', 'John Paul', 'Christian', 'Adrian', 'Bryan', 'Cedric', 'Dominic', 'Emmanuel', 'Gian', 'Joshua', 'Kurt', 'Luis', 'Matthew', 'Neil', 'Patrick', 'Renz', 'Simon', 'Timothy', 'Ramón', 'Nicolás', 'Andrés', 'Iñigo', 'Rogelio', 'Efren'];

    private const LAST = ['Abalos', 'Bautista', 'Cabral', 'Dimaculangan', 'Escaño', 'Fajardo', 'Galvez', 'Hernandez', 'Ilagan', 'Javier', 'Katigbak', 'Lacson', 'Magbanua', 'Natividad', 'Ocampo', 'Pangilinan', 'Quiambao', 'Robles', 'Salonga', 'Tuazon', 'Umali', 'Villareal', 'Wenceslao', 'Yap', 'Zamora', 'Dela Cruz', 'De Guzman', 'Del Rosario', 'San Juan', 'Santa Maria', 'Peñaflor', 'Muñoz', 'Ibáñez', 'Nuñez', "D'Angelo", "O'Brien", 'Reyes-Ocampo', 'Lim-Tan', 'Macaraeg', 'Buenaventura', 'Concepcion', 'Evangelista', 'Fernandez', 'Gatchalian', 'Hidalgo', 'Lualhati', 'Malabanan', 'Pacheco', 'Sarmiento', 'Valenzuela', 'Agbayani', 'Belmonte', 'Calderon', 'Dumalagan', 'Estrella', 'Florentino', 'Guevarra', 'Lagman', 'Mendiola', 'Panganiban'];

    /** Mothers' maiden names, which a Filipino child carries as the middle name. */
    private const MIDDLE = ['Santos', 'Reyes', 'Cruz', 'Garcia', 'Mendoza', 'Torres', 'Flores', 'Ramos', 'Aquino', 'Castro', 'Rivera', 'Navarro', 'Soriano', 'Domingo', 'Mercado', 'Aguilar', 'Salazar', 'Pascual', 'Manalo', 'Ilustre'];

    /** @var array<string, mixed> */
    private array $o;

    /** @var Closure(string): void */
    private Closure $say;

    private LoadHttp $http;

    private User $nurse;

    private User $admin;

    /** @var list<User> the nurse and the three covering Staff */
    private array $staffUsers = [];

    /** @var array<string, array<string, mixed>> students by LRN */
    private array $roster = [];

    /** @var list<array<string, mixed>> families: surname, maiden name, primary contact, phone, member LRNs */
    private array $families = [];

    /** @var array<string, true> */
    private array $phones = [];

    /** @var array<string, true> first|last of every student, so names repeat only on purpose */
    private array $names = [];

    /** @var array<int, array{female: bool, contact: array<string, string>}> active staff patients */
    private array $staff = [];

    /** @var array<string, int> item ids by name */
    private array $itemIds = [];

    /** @var array<int, array{name: string, words: list<string>, min: int, max: int, threshold: int, delivery: int, dose: array{int, int}, slow: bool, medicine: bool}> */
    private array $items = [];

    /** @var array<string, int> complaint type ids by label */
    private array $types = [];

    /** @var array<string, true> class-day exclusions: holidays (not special working days) */
    private array $holidays = [];

    /** @var array<string, string> date => calendar event title */
    private array $events = [];

    /** @var array<string, mixed> vitals_usual_ranges */
    private array $usual = [];

    private float $feverFrom = 37.0;

    private float $tempMin = 36.0;

    /** @var list<array{id: int, due: string}> */
    private array $openFollowUps = [];

    /** @var list<array{visit: int, from: string, until: string}> */
    private array $lettersToApprove = [];

    /** @var list<array{id: int, due: string}> */
    private array $incidentsToApprove = [];

    /** @var list<array{id: int, input: array<string, mixed>, treat: array{string, int, list<string>}}> incidents finished the next school day */
    private array $stageTwoTomorrow = [];

    private string $deliveredMonth = '';

    /** @var array<int, true> patients seen today */
    private array $seenToday = [];

    private int $lrnSeq = 0;

    /** @var array<string, int> */
    public array $counts = [];

    private CarbonImmutable $until;

    /** @param array{students: int, staff: int, years: int, audit: int, seed: int, until: CarbonImmutable} $o */
    public function __construct(array $o, Closure $say)
    {
        $this->o = $o;
        $this->until = $o['until'];
        $this->say = $say;
        $this->http = new LoadHttp(app());
    }

    public function run(): void
    {
        // The clock is frozen at each record's time, so anything cached would carry a demo-dated expiry into the
        // shared file cache (a rate-limit timer stamped February 2027 locked demo.nurse out of the dev API with a
        // 94-day Retry-After; Zean, November 21, 2026). The run caches in memory only.
        app('cache')->setDefaultDriver('array');
        mt_srand($this->o['seed']);
        $end = $this->until;
        $currentStart = $end->month >= 6 && ! ($end->month === 6 && $end->day < 15) ? $end->year : $end->year - 1;
        $years = range($currentStart - $this->o['years'] + 1, $currentStart);
        $this->types = DB::table('complaint_types')->pluck('id', 'label')->map(fn ($v) => (int) $v)->all();
        $this->settings();

        try {
            $this->phase('accounts', fn () => $this->accounts(CarbonImmutable::create($years[0], 6, 1, 7, 0, 0, 'Asia/Manila')));
            $this->phase('holidays', fn () => $this->holidays());
            $this->phase('inventory', fn () => $this->inventory(CarbonImmutable::create($years[0], 6, 10, 8, 0, 0, 'Asia/Manila')));
            try {
                foreach ($years as $i => $y) {
                    $this->phase("year {$y}–".($y + 1), fn () => $this->year($y, $i, count($years)));
                }
            } catch (ReachedEnd) {
                // The clock reached `until`: the school stops at that minute.
            }
            if ($this->o['audit'] > 0) {
                $this->phase('audit padding', fn () => $this->padAudit($this->o['audit'], $end));
            }
        } finally {
            Carbon::setTestNow();
            DB::statement('SET timestamp = DEFAULT');
        }
    }

    private function phase(string $name, Closure $work): void
    {
        $t = microtime(true);
        try {
            $work();
        } finally {
            ($this->say)(sprintf('%-22s %7.1f s  %6.0f MB peak', $name, microtime(true) - $t, memory_get_peak_usage(true) / 1048576));
        }
    }

    /** Sets the clock (PHP and the database session) to the next record's time; nothing is written after `until`. */
    private function at(CarbonImmutable $t): void
    {
        if ($t->greaterThan($this->until)) {
            throw new ReachedEnd;
        }
        Carbon::setTestNow($t);
        DB::statement('SET timestamp = '.$t->getTimestamp());
    }

    /** A fresh random stream for one day or one year-start, so a later `until` never changes it. */
    private function reseed(string $key): void
    {
        mt_srand(crc32($this->o['seed'].'|'.$key));
    }

    /** The product's own vitals settings (reference_settings), not copies. */
    private function settings(): void
    {
        $read = fn (string $key): array => (array) json_decode((string) DB::table('reference_settings')->where('setting_key', $key)->value('setting_value'), true);
        $this->usual = $read('vitals_usual_ranges');
        $warn = $read('vitals_warning_ranges');
        $this->feverFrom = (float) ($warn['feverFromC'] ?? 37);
        $this->tempMin = (float) ($this->usual['temperatureMinC'] ?? 36);
    }

    // ---------------------------------------------------------------- small helpers

    /** @param array<array-key, int|float> $weights label => weight */
    private function weighted(array $weights): string|int
    {
        $total = 0;
        foreach ($weights as $w) {
            $total += (int) round($w * 100);
        }
        $r = mt_rand(1, max(1, $total));
        foreach ($weights as $k => $w) {
            if (($r -= (int) round($w * 100)) <= 0) {
                return $k;
            }
        }

        return array_key_first($weights);
    }

    /** @param list<array{0: string, 1: int|float}> $pairs */
    private function pick(array $pairs): string
    {
        return (string) $this->weighted(array_column($pairs, 1, 0));
    }

    /** @param list<string> $list */
    private function any(array $list): string
    {
        return $list[mt_rand(0, count($list) - 1)];
    }

    private function phone(): string
    {
        do {
            $p = $this->any(self::MOBILE_PREFIXES).str_pad((string) mt_rand(0, 9999999), 7, '0', STR_PAD_LEFT);
        } while (isset($this->phones[$p]));
        $this->phones[$p] = true;

        return $p;
    }

    /** A weekday outside the Christmas break (December 18 to January 4) that is not a holiday; special working days have class. */
    private function isClassDay(CarbonImmutable $d): bool
    {
        $md = (int) $d->format('md');

        return ! $d->isWeekend() && $md < 1218 && $md > 104 && ! isset($this->holidays[$d->format('Y-m-d')]);
    }

    private function nextClassDay(CarbonImmutable $d, int $n = 1): CarbonImmutable
    {
        for ($i = 0; $i < $n; $i++) {
            do {
                $d = $d->addDay();
            } while (! $this->isClassDay($d));
        }

        return $d;
    }

    private function onClassDay(CarbonImmutable $d, bool $back = false): CarbonImmutable
    {
        while (! $this->isClassDay($d)) {
            $d = $back ? $d->subDay() : $d->addDay();
        }

        return $d;
    }

    private function ageGroup(int $grade): string
    {
        return match (true) {
            $grade === 0 => 'kinder', $grade <= 6 => 'grades1to6', $grade <= 12 => 'grades7to12', default => 'adult',
        };
    }

    private function age(array $s, CarbonImmutable $on): int
    {
        return $s['birthDate'] !== '' ? (int) floor(abs(CarbonImmutable::parse($s['birthDate'], 'Asia/Manila')->diffInYears($on))) : 5 + $s['grade'];
    }

    // ---------------------------------------------------------------- accounts, holidays

    private function accounts(CarbonImmutable $at): void
    {
        $this->at($at);
        $users = app(UserService::class);
        $auth = app(AuthService::class);
        $make = function (string $name, string $username, string $role, int $actor, string $password = self::PASSWORD) use ($users, $auth): User {
            $saved = $users->save(['name' => $name, 'username' => $username, 'role' => $role, 'temporaryPassword' => 'Temporary-'.$username], null, $actor);
            $user = User::query()->findOrFail((int) $saved['id']);
            $auth->setPassword($user, $password, 'Load test password set');

            return $user->refresh();
        };
        // The mock's three accounts and passwords (Zean, November 17, 2026); the load.* ones are background.
        // Display names as set by hand in cliniq_testing for the screenshots (Zean, November 18, 2026).
        $this->admin = $make('Gilan Avelida', 'demo.principal', 'admin', 0, 'demo-admin');
        $this->nurse = $make('Jennesse Baas', 'demo.nurse', 'staff', $this->admin->id, 'demo-nurse');
        // As in the mock: a temporary password, changed at the first sign-in.
        $users->save(['name' => 'Grace Tolentino', 'username' => 'demo.new', 'role' => 'staff', 'temporaryPassword' => 'demo-change'], null, $this->admin->id);
        $this->staffUsers = [$this->nurse];
        foreach ([1, 2, 3] as $n) {
            $this->staffUsers[] = $make("Covering Staff {$n}", "load.cover{$n}", 'staff', $this->admin->id);
        }
        $former = $make('Former Staff Load Test', 'load.former', 'staff', $this->admin->id);
        $users->setActive($former->id, false, $this->admin->id);
        foreach (range(1, 20) as $n) {
            $make(sprintf('Bench Staff %02d', $n), sprintf('load.bench%02d', $n), 'staff', $this->admin->id);
        }
        // The bench accounts sign in through the real login later; the history's sign-ins are the nurse's.
    }

    /** The real 2026 and 2027 list plus the earlier years' holidays, through the app's own sync. */
    private function holidays(): void
    {
        $file = (array) json_decode((string) file_get_contents(base_path('../frontend/src/lib/mock-db/holidays-ph.json')), true);
        $list = array_map(fn (array $h): array => ['date' => $h[0], 'name' => $h[1], 'kind' => $h[2], 'confirmed' => true], self::PAST_HOLIDAYS);
        $path = storage_path('load/holidays-demo.json');
        @mkdir(dirname($path), 0777, true);
        file_put_contents($path, (string) json_encode(['meta' => ['source' => 'Demo school holiday list'], 'holidays' => array_merge($list, (array) ($file['holidays'] ?? []))]));
        app(CalendarService::class)->sync(true, $path);
        foreach (DB::table('holidays')->where('kind', '<>', 'special-working')->pluck('holiday_date') as $d) {
            $this->holidays[(string) $d] = true;
        }
    }

    // ---------------------------------------------------------------- inventory

    private function inventory(CarbonImmutable $at): void
    {
        $this->at($at);
        $service = app(InventoryService::class);
        $fallback = (string) array_values($this->types)[0];
        foreach (self::ITEMS as [$name, $category, $unit, $tags, $words, $min, $max, $threshold, $delivery, $doseMin, $doseMax, $slow]) {
            $tagIds = array_values(array_filter(array_map(fn (string $l): ?int => $this->types[$l] ?? null, $tags)));
            $medicine = $category === 'medicine';
            $saved = $service->save([
                'name' => $name, 'category' => $category, 'unit' => $unit, 'lowStockThreshold' => $threshold, 'brand' => null,
                'avoidIfAllergicTo' => $words, 'usedFor' => $tagIds !== [] ? array_map('strval', $tagIds) : [$fallback],
                'expirationDate' => $medicine ? $this->expiry($at, $slow) : null, 'noExpirationConfirmed' => ! $medicine,
                'currentStock' => $delivery,
            ], null, $this->nurse->id);
            $id = (int) ($saved['id'] ?? $saved['item']['id']);
            $this->itemIds[$name] = $id;
            $this->items[$id] = ['name' => $name, 'words' => $words, 'min' => $min, 'max' => $max, 'threshold' => $threshold, 'delivery' => $delivery, 'dose' => [$doseMin, $doseMax], 'slow' => $slow, 'medicine' => $medicine];
        }
    }

    /** Medicine lots last 12 to 36 months from receipt; a slow mover's lot is short-dated, so some expire on the shelf. */
    private function expiry(CarbonImmutable $received, bool $slow): string
    {
        return $received->addMonths($slow ? mt_rand(12, 15) : mt_rand(12, 36))->format('Y-m-d');
    }

    /**
     * The monthly delivery on the first class day of a month: items under twice their threshold are
     * reordered (about two months' use), and lots expired more than 30 days are disposed of. On other
     * Mondays only an item without a dose left is bought in a hurry, so stock runs low between deliveries.
     */
    private function stock(CarbonImmutable $day, User $nurse, bool $delivery): void
    {
        $this->at($day->setTime(7, 40));
        $inventory = app(InventoryService::class);
        $today = $day->format('Y-m-d');
        foreach ($this->items as $id => $item) {
            $usable = (int) DB::table('inventory_batches')->where('item_id', $id)->where(fn ($q) => $q->whereNull('expiration_date')->orWhere('expiration_date', '>=', $today))->sum('quantity');
            if ($delivery ? $usable < 2 * $item['threshold'] : ($usable < $item['dose'][1] && ! $item['slow'])) {
                $qty = $delivery ? $item['delivery'] : max(1, intdiv($item['delivery'], 2));
                $inventory->restock($id, ['quantity' => $qty, 'expirationDate' => $item['medicine'] ? $this->expiry($day, $item['slow']) : null, 'noExpirationConfirmed' => ! $item['medicine']], $nurse->id);
            }
            if ($delivery) {
                foreach (DB::table('inventory_batches')->where('item_id', $id)->where('quantity', '>', 0)->where('expiration_date', '<', $day->subDays(30)->format('Y-m-d'))->get(['id', 'quantity']) as $b) {
                    $inventory->adjust($id, ['reason' => 'expired_disposed', 'batchId' => (string) $b->id, 'change' => -(int) $b->quantity, 'note' => null], $nurse->id);
                }
            }
        }
    }

    /** Usable (unexpired) stock now; ADR-084 refuses to give more than this. */
    private function usable(int $item): int
    {
        $today = CarbonImmutable::now()->format('Y-m-d');

        return (int) DB::table('inventory_batches')->where('item_id', $item)->where('quantity', '>', 0)
            ->where(fn ($q) => $q->whereNull('expiration_date')->orWhere('expiration_date', '>=', $today))->sum('quantity');
    }

    /**
     * The item lines for a complaint and a patient: an item only when it suits the patient's grade (13
     * for staff), matches none of their allergies (the item's own allergy words, as the app's picker
     * checks them) and is in stock.
     *
     * @param  list<string>  $allergies
     * @return list<array{itemId: string, quantity: int, instructions: null}>
     */
    private function treatment(string $complaint, int $grade, array $allergies): array
    {
        $lines = [];
        $allergies = array_map('mb_strtolower', $allergies);
        foreach (self::TREATMENT[$complaint] ?? [] as [$pct, $options]) {
            if (mt_rand(1, 100) > $pct) {
                continue;
            }
            foreach ($options as $name) {
                $id = $this->itemIds[$name];
                $item = $this->items[$id];
                if ($grade < $item['min'] || $grade > $item['max'] || $this->allergic($item['words'], $allergies)) {
                    continue;
                }
                $qty = mt_rand($item['dose'][0], $item['dose'][1]);
                if ($qty > $this->usable($id)) {
                    continue; // not enough left for a dose: the next choice, or nothing until the delivery
                }
                $lines[] = ['itemId' => (string) $id, 'quantity' => $qty, 'instructions' => null];
                break;
            }
        }

        return $lines;
    }

    /**
     * @param  list<string>  $words
     * @param  list<string>  $allergies  lower case
     */
    private function allergic(array $words, array $allergies): bool
    {
        foreach ($words as $w) {
            foreach ($allergies as $a) {
                if (str_contains($a, $w) || str_contains($w, $a)) {
                    return true;
                }
            }
        }

        return false;
    }

    // ---------------------------------------------------------------- a school year

    private function year(int $y, int $index, int $count): void
    {
        $start = CarbonImmutable::create($y, 6, 15, 7, 0, 0, 'Asia/Manila');
        $lastClass = CarbonImmutable::create($y + 1, 4, 14, 16, 0, 0, 'Asia/Manila');
        $this->at($start);
        $this->reseed("year-{$y}");
        $this->http->as($this->nurse)->ok('POST', '/api/school-years/start');
        if ($index === 0) {
            $this->staffImport($this->o['staff']);
        }
        // The current year has the requested size plus 1%, so transfers during the year keep it at or above
        // the size (Zean: "900+ this s.y."); each earlier year is GROWTH_PER_YEAR smaller.
        $target = (int) ceil($this->o['students'] * (1.01 - self::GROWTH_PER_YEAR * ($count - 1 - $index)));
        $this->studentImport($y, $index === 0, $target);
        $this->calendar($y);

        // The whole year's days, as for a finished year; at() stops the loop at `until`.
        $days = $this->schoolDays($start, $lastClass);
        foreach ($days as $dayNo => $day) {
            $this->reseed($day->format('Y-m-d'));
            $this->day($day, $dayNo, count($days));
        }
        $this->at($lastClass->setTime(16, 30));
        $this->http->as($this->nurse)->ok('POST', '/api/school-years/end');
    }

    /** The school's own events for the year, on class days, entered by the nurse on the first day. */
    private function calendar(int $y): void
    {
        $nth = fn (int $year, int $month, int $n, int $weekday): CarbonImmutable => CarbonImmutable::create($year, $month, 1, 0, 0, 0, 'Asia/Manila')->nthOfMonth($n, $weekday) ?: CarbonImmutable::create($year, $month, 1, 0, 0, 0, 'Asia/Manila');
        $plan = [
            ['First day of classes', CarbonImmutable::create($y, 6, 15, 0, 0, 0, 'Asia/Manila'), 1],
            ['Deworming day', $nth($y, 7, 2, Carbon::WEDNESDAY), 1],
            ['Dental check-up', $nth($y, 8, 1, Carbon::TUESDAY), 2],
            ['First quarter exams', $nth($y, 8, 3, Carbon::THURSDAY), 2],
            ['Parent-Teacher Conference', $nth($y, 8, 4, Carbon::FRIDAY), 1],
            ['Intramurals', $nth($y, 9, 3, Carbon::WEDNESDAY), 3],
            ['Second quarter exams', $nth($y, 10, 3, Carbon::THURSDAY), 2],
            ['Christmas program', CarbonImmutable::create($y, 12, 17, 0, 0, 0, 'Asia/Manila'), -1],
            ['Deworming day', $nth($y + 1, 1, 2, Carbon::WEDNESDAY), 1],
            ['Third quarter exams', $nth($y + 1, 1, 4, Carbon::THURSDAY), 2],
            ['Foundation Day', $nth($y + 1, 2, 2, Carbon::FRIDAY), 1],
            ['Fourth quarter exams', $nth($y + 1, 3, 3, Carbon::THURSDAY), 2],
            ['Recognition day', CarbonImmutable::create($y + 1, 4, 14, 0, 0, 0, 'Asia/Manila'), -1],
        ];
        $this->at(CarbonImmutable::create($y, 6, 15, 15, 0, 0, 'Asia/Manila'));
        $service = app(CalendarService::class);
        foreach ($plan as [$title, $date, $days]) {
            $first = $this->onClassDay($date, $days < 0);
            $last = $first;
            $this->events[$first->format('Y-m-d')] = $title;
            for ($i = 1; $i < abs($days); $i++) {
                $last = $this->nextClassDay($last);
                $this->events[$last->format('Y-m-d')] = $title;
            }
            $service->save(['title' => $title, 'startDate' => $first->format('Y-m-d'), 'endDate' => $last->equalTo($first) ? null : $last->format('Y-m-d')], null, $this->nurse->id, 'staff');
        }
    }

    /** @return list<CarbonImmutable> */
    private function schoolDays(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $out = [];
        for ($d = $from->startOfDay(); $d->lessThanOrEqualTo($to); $d = $d->addDay()) {
            if (! $this->isClassDay($d)) {
                continue;
            }
            // Before DROP_BEFORE, about one day in ten has no clinic data (a suspension, a field trip), chosen
            // by a hash of the seed and the date, never the first day or a calendar event; from it on, none.
            $date = $d->format('Y-m-d');
            if ($out !== [] && $date < self::DROP_BEFORE && ! isset($this->events[$date]) && crc32($this->o['seed'].'|drop|'.$date) % 10 === 0) {
                continue;
            }
            $out[] = $d;
        }

        return $out;
    }

    // ---------------------------------------------------------------- students and staff

    /**
     * A student whose birth date fits the grade by the August 31 cut-off: a Grade g student in the
     * school year starting in June of Y was born September 1 of Y-6-g to August 31 of Y-5-g.
     *
     * @return array<string, mixed>
     */
    private function newStudent(int $grade, int $startYear, ?int $family = null, ?string $birthDate = null): array
    {
        $female = mt_rand(0, 1) === 1;
        if ($family === null && $this->families !== [] && mt_rand(1, 100) <= 20) {
            $family = $this->siblingFamily($grade);
        }
        if ($family === null) {
            $family = $this->newFamily();
        }
        $last = $this->families[$family]['last'];
        $first = '';
        for ($try = 0; $try < 30 && ($first === '' || isset($this->names[$first.'|'.$last])); $try++) {
            $list = $female ? self::FIRST_F : self::FIRST_M;
            $first = $this->any($list).(mt_rand(1, 100) <= 8 ? ' '.$this->any($list) : '');
        }
        $this->names[$first.'|'.$last] = true;
        if ($birthDate === null) {
            $from = CarbonImmutable::create($startYear - 6 - $grade, 9, 1, 0, 0, 0, 'Asia/Manila');
            $birthDate = $from->addDays(mt_rand(0, (int) $from->diffInDays($from->addYear()) - 1))->format('Y-m-d');
        }
        $conditions = [];
        foreach (self::CONDITIONS as [$label, $perMille, $lo, $hi]) {
            if ($grade >= $lo && $grade <= $hi && mt_rand(1, 1000) <= $perMille && count($conditions) < 2) {
                $conditions[] = $label;
            }
        }
        $allergies = [];
        foreach (self::ALLERGIES as [$label, $perMille]) {
            if (mt_rand(1, 1000) <= $perMille && count($allergies) < 2) {
                $allergies[] = $label;
            }
        }
        $r = mt_rand(1, 100);
        $this->lrnSeq++;
        $lrn = self::LRN_PREFIX.str_pad((string) $this->lrnSeq, 6, '0', STR_PAD_LEFT);
        $this->families[$family]['lrns'][] = $lrn;

        return [
            'lrn' => $lrn, 'firstName' => $first, 'lastName' => $last, 'middleName' => $this->families[$family]['middle'],
            'sex' => $female ? 'female' : 'male', 'noSex' => mt_rand(1, 1000) <= 30, 'birthDate' => mt_rand(1, 100) <= 3 ? '' : $birthDate, 'realBirth' => $birthDate,
            'grade' => $grade, 'section' => '', 'id' => null, 'active' => true, 'family' => $family,
            // Visit weights: most students visit now and then, 30% rarely, 4% often (and anyone with asthma or migraine more).
            'weight' => $r <= 4 ? 15 : ($r <= 34 ? 1 : (array_intersect($conditions, ['Asthma', 'Migraine']) !== [] ? 6 : 3)),
            'stayIncomplete' => mt_rand(1, 1000) <= 15, 'allergies' => $allergies, 'conditions' => $conditions,
        ];
    }

    private function newFamily(): int
    {
        $last = mt_rand(1, 400) === 1 ? 'Villanueva-Buenaventura y Concepcion-Dimaculangan' : $this->any(self::LAST); // a long one, under 50 characters
        $middle = mt_rand(1, 100) <= 92 ? $this->any(self::MIDDLE) : '';
        $relationship = $this->pick(self::GUARDIAN);
        $name = match ($relationship) {
            'Mother' => $this->any(self::FIRST_F).' '.$last,
            'Father' => $this->any(self::FIRST_M).' '.$last,
            'Grandmother' => $this->any(self::FIRST_F).' '.($middle !== '' ? $middle : $last),
            'Aunt' => $this->any(self::FIRST_F).' '.$last,
            'Uncle' => $this->any(self::FIRST_M).' '.$last,
            default => $this->any(self::FIRST_F).' '.$this->any(self::LAST),
        };
        $this->families[] = ['last' => $last, 'middle' => $middle, 'relationship' => $relationship, 'name' => $name, 'phone' => $this->phone(), 'lrns' => []];

        return count($this->families) - 1;
    }

    /** An existing family whose children are all at least two grades away (so at least a year apart). */
    private function siblingFamily(int $grade): ?int
    {
        for ($try = 0; $try < 5; $try++) {
            $f = mt_rand(0, count($this->families) - 1);
            $ok = $this->families[$f]['lrns'] !== [];
            foreach ($this->families[$f]['lrns'] as $lrn) {
                $ok = $ok && abs(($this->roster[$lrn]['grade'] ?? 99) - $grade) >= 2;
            }
            if ($ok) {
                return $f;
            }
        }

        return null;
    }

    /** @return list<int> how many students per grade for a roster of $total (largest remainders, at least one a grade) */
    private function gradeSizes(int $total): array
    {
        $sum = array_sum(self::GRADE_SHARE);
        $exact = array_map(fn (int $w): float => $total * $w / $sum, self::GRADE_SHARE);
        $sizes = array_map(fn (float $x): int => (int) floor($x), $exact);
        $order = array_keys($exact);
        usort($order, fn (int $a, int $b): int => ($exact[$b] - floor($exact[$b])) <=> ($exact[$a] - floor($exact[$a])) ?: $a <=> $b);
        for ($i = 0, $left = $total - array_sum($sizes); $i < $left; $i++) {
            $sizes[$order[$i % 13]]++;
        }

        return $total >= 13 ? array_map(fn (int $n): int => max(1, $n), $sizes) : $sizes;
    }

    private function studentImport(int $y, bool $first, int $target): void
    {
        if ($first) {
            foreach ($this->gradeSizes($target) as $g => $n) {
                for ($k = 0; $k < $n; $k++) {
                    $s = $this->newStudent($g, $y);
                    $this->roster[$s['lrn']] = $s;
                }
            }
            $this->twinsAndNamesakes($y);
        } else {
            // Promotion: some leave, mostly at the entry to Grade 7 and Grade 11; Grade 12 graduates.
            foreach ($this->roster as $lrn => $s) {
                if ($s['active']) {
                    $g = $s['grade'] + 1;
                    $this->roster[$lrn]['grade'] = $g;
                    if ($g <= 12 && mt_rand(1, 100) <= (self::LEAVE_PCT[$g] ?? 2)) {
                        $this->roster[$lrn]['active'] = false; // left the school, archived by the import
                    }
                }
            }
            $active = count(array_filter($this->roster, fn (array $s): bool => $s['active'] && $s['grade'] <= 12));
            $kinder = $this->gradeSizes($target)[0];
            for ($k = 0; $k < $kinder; $k++) {
                $s = $this->newStudent(0, $y);
                $this->roster[$s['lrn']] = $s;
            }
            for ($k = $active + $kinder; $k < $target; $k++) {
                $s = $this->newStudent((int) $this->weighted(self::NEW_ENROLLEE_GRADE), $y);
                $this->roster[$s['lrn']] = $s;
            }
        }
        // Sections: two a grade, students split by name order.
        $byGrade = [];
        foreach ($this->roster as $lrn => $s) {
            if ($s['active'] && $s['grade'] <= 12) {
                $byGrade[$s['grade']][] = $lrn;
            }
        }
        foreach ($byGrade as $g => $lrns) {
            sort($lrns);
            foreach ($lrns as $k => $lrn) {
                $this->roster[$lrn]['section'] = self::SECTIONS[($g * 2 + ($k % 2)) % count(self::SECTIONS)];
            }
        }
        $rows = [];
        foreach ($this->roster as $s) {
            if ($s['active'] && $s['grade'] <= 12) {
                $rows[] = ['lrn' => $s['lrn'], 'firstName' => $s['firstName'], 'lastName' => $s['lastName'], 'middleName' => $s['middleName'],
                    'gradeLevel' => self::GRADES[$s['grade']], 'section' => $s['section'], 'sex' => $s['noSex'] ? '' : ucfirst($s['sex']), 'birthDate' => $s['birthDate']];
            }
        }
        $this->writeCsv(storage_path("load/students-{$y}.csv"), ['LRN', 'Last name', 'First name', 'Middle name', 'Sex', 'Birth date', 'Grade', 'Section'],
            array_map(fn (array $r): array => [$r['lrn'], $r['lastName'], $r['firstName'], $r['middleName'], $r['sex'], $r['birthDate'], $r['gradeLevel'], $r['section']], $rows));

        $http = $this->http->as($this->nurse);
        $preview = $http->ok('POST', '/api/students/import/preview', ['rows' => $rows]);
        $archive = array_map(fn (array $m): int => (int) $m['id'], $preview['missing'] ?? []);
        $result = $http->ok('POST', '/api/students/import', ['rows' => $rows, 'fileName' => "students-{$y}.csv", 'archiveIds' => $archive]);
        $this->counts["import {$y} created"] = (int) $result['created'];
        $this->counts["import {$y} archived"] = (int) $result['archived'];
        $this->counts["import {$y} flagged"] = (int) $result['flagged'];

        $ids = DB::table('students')->pluck('id', 'lrn');
        foreach ($this->roster as $lrn => $s) {
            if ($s['grade'] > 12 && $s['active']) {
                $this->roster[$lrn]['active'] = false; // graduated, archived by the import
            }
            $this->roster[$lrn]['id'] = isset($ids[$lrn]) ? (int) $ids[$lrn] : null;
        }
        $this->draw = null;
        // The flagged rows (no sex on the list): the nurse enters or updates them by hand.
        $students = app(StudentService::class);
        $this->at(CarbonImmutable::now()->addMinutes(20));
        foreach ($this->roster as $lrn => $s) {
            if (! $s['active'] || ! $s['noSex']) {
                continue;
            }
            $saved = $students->save($this->studentInput($s, true), $s['id'], true, null, $this->nurse->id, 'staff');
            $this->roster[$lrn]['id'] = (int) $saved['student']['id'];
        }
        $this->draw = null;
    }

    /** Three pairs of twins (one family, one grade, one birthday) and three intended same-name pairs (same surname, different grades). */
    private function twinsAndNamesakes(int $y): void
    {
        $lrns = array_keys($this->roster);
        for ($i = 0; $i < 3 && count($lrns) > 1; $i++) {
            $a = $this->roster[$lrns[mt_rand(0, count($lrns) - 1)]];
            $twin = $this->newStudent($a['grade'], $y, $a['family'], $a['realBirth']);
            $twin['birthDate'] = $a['birthDate'] === '' ? '' : $a['realBirth'];
            $this->roster[$twin['lrn']] = $twin;
        }
        for ($i = 0, $try = 0; $i < 3 && $try < 200; $try++) {
            $a = $this->roster[$lrns[mt_rand(0, count($lrns) - 1)]];
            $b = $this->roster[$lrns[mt_rand(0, count($lrns) - 1)]];
            if ($a['lastName'] === $b['lastName'] && $a['sex'] === $b['sex'] && $a['grade'] !== $b['grade'] && $a['family'] !== $b['family'] && $a['firstName'] !== $b['firstName']) {
                $this->roster[$b['lrn']]['firstName'] = $a['firstName'];
                $i++;
            }
        }
    }

    /** @return array<string, mixed> a `StudentInput`; contacts only once the nurse has them */
    private function studentInput(array $s, bool $withContacts): array
    {
        $f = $this->families[$s['family']];

        return [
            'lrn' => $s['lrn'], 'firstName' => $s['firstName'], 'lastName' => $s['lastName'], 'middleName' => $s['middleName'] ?: null,
            'gradeLevel' => self::GRADES[min(12, $s['grade'])], 'section' => $s['section'] ?: null, 'sex' => $s['noSex'] ? null : $s['sex'],
            'birthDate' => $s['birthDate'] ?: null, 'allergies' => $s['allergies'], 'medicalConditions' => $s['conditions'],
            'emergencyContacts' => $withContacts && ! $s['stayIncomplete'] ? [['name' => $f['name'], 'relationship' => $f['relationship'], 'phone' => $f['phone'], 'verified' => false]] : [],
        ];
    }

    private function staffImport(int $n): void
    {
        $rows = [];
        $used = [];
        foreach (range(1, $n + 5) as $i) {
            $type = (string) $this->weighted(['Teacher' => 65, 'Non-teaching staff' => 20, 'Utility worker' => 15]);
            $female = mt_rand(1, 100) <= ['Teacher' => 75, 'Non-teaching staff' => 60, 'Utility worker' => 30][$type];
            do {
                $first = $this->any($female ? self::FIRST_F : self::FIRST_M);
                $last = $this->any(self::LAST);
            } while (isset($used[$first.'|'.$last]));
            $used[$first.'|'.$last] = true;
            $department = match ($type) {
                'Teacher' => $this->any(['Kinder', 'Grades 1–3', 'Grades 4–6', 'Junior High School', 'Senior High School', 'MAPEH']),
                'Non-teaching staff' => $this->any(['Registrar', 'Accounting', 'Library', 'Guidance', 'Admissions']),
                default => $this->any(['Maintenance', 'Security', 'Housekeeping']),
            };
            $rel = (string) $this->weighted(['Spouse' => 55, 'Mother' => 15, 'Father' => 5, 'Sibling' => 20, 'Child' => 5]);
            $contact = match ($rel) {
                'Spouse' => $this->any($female ? self::FIRST_M : self::FIRST_F).' '.$last,
                'Mother', 'Child' => $this->any(self::FIRST_F).' '.$last,
                'Father' => $this->any(self::FIRST_M).' '.$last,
                default => $this->any(mt_rand(0, 1) === 1 ? self::FIRST_F : self::FIRST_M).' '.$last,
            };
            $rows[] = [
                'staffNumber' => '', 'firstName' => $first, 'lastName' => $last, 'middleName' => $this->any(self::MIDDLE), 'sex' => $female ? 'Female' : 'Male', 'type' => $type,
                'department' => $department, 'contactInfo' => $this->phone(), 'contactName' => $contact, 'contactRelationship' => $rel, 'contactPhone' => $this->phone(),
            ];
        }
        $this->writeCsv(storage_path("load/staff-{$n}.csv"), ['Staff No.', 'Last name', 'First name', 'Middle name', 'Sex', 'Type', 'Department', 'Contact No.', 'Emergency contact name', 'Relationship', 'Emergency phone'],
            array_map(fn (array $r): array => [$r['staffNumber'], $r['lastName'], $r['firstName'], $r['middleName'], $r['sex'], $r['type'], $r['department'], $r['contactInfo'], $r['contactName'], $r['contactRelationship'], $r['contactPhone']], $rows));
        $http = $this->http->as($this->nurse);
        $http->ok('POST', '/api/personnel/import/preview', ['rows' => $rows]);
        $r = $http->ok('POST', '/api/personnel/import', ['rows' => $rows, 'fileName' => "staff-{$n}.csv"]);
        $this->counts['staff import created'] = (int) $r['created'];
        $ids = DB::table('personnel')->orderBy('id')->pluck('id')->map(fn ($v) => (int) $v)->all();
        $service = app(PersonnelService::class);
        foreach (array_slice($ids, -5) as $id) {
            $service->archive($id, 'Resigned', $this->nurse->id);
        }
        foreach (array_slice($ids, 0, -5) as $k => $id) {
            $row = $rows[$k];
            $this->staff[$id] = ['female' => $row['sex'] === 'Female', 'contact' => ['name' => $row['contactName'], 'relationship' => $row['contactRelationship'], 'phone' => $row['contactPhone'], 'source' => 'emergency_contact']];
        }
    }

    // ---------------------------------------------------------------- one school day

    private function day(CarbonImmutable $day, int $dayNo, int $dayCount): void
    {
        $nurse = $this->staffUsers[$dayNo % 23 === 7 ? 1 + ($dayNo % 3) : 0]; // a covering Staff some days
        $logger = app(AuditLogger::class);
        $date = $day->format('Y-m-d');
        $this->seenToday = [];
        $this->at($day->setTime(0, 15));
        app(FollowUpService::class)->closeMissed();
        $this->at($day->setTime(7, 25));
        $logger->record(new AuditEvent(actorId: (string) $nurse->id, actorRole: 'staff', action: AuditAction::Login, targetType: AuditTarget::User, targetId: (string) $nurse->id, targetLabel: null, at: CarbonImmutable::now(), summary: 'Signed in'));

        $this->morning($day, $nurse, $dayNo);

        // The day's shape: the calendar event, the month, the weekday, the first and the last days of a term.
        $event = $this->events[$date] ?? null;
        $effect = $event === null ? null : (self::EVENT_EFFECTS[$event] ?? (str_ends_with($event, 'exams') ? self::EVENT_EFFECTS['exams'] : null));
        $month = (int) $day->format('n');
        $md = (int) $day->format('md');
        $volume = (self::MONTH_VOLUME[$month] ?? 1.0) * (self::WEEKDAY_VOLUME[$day->dayOfWeekIso] ?? 1.0) * ($effect[0] ?? 1.0)
            * ($dayNo < 5 ? 0.6 : 1.0) * ($md >= 1211 && $md <= 1217 ? 0.85 : 1.0) * ($dayNo >= $dayCount - 5 ? 0.7 : 1.0);
        $weights = [];
        foreach (self::COMPLAINTS as [$label, $w]) {
            $weights[$label] = $w * (self::SEASON[$month][$label] ?? 1.0) * ($effect[1][$label] ?? 1.0);
        }
        $n = max(2, (int) round(self::VISITS_PER_900 * $this->o['students'] / 900 * $volume * (0.8 + mt_rand(0, 40) / 100)));

        $events = [];
        for ($i = 0; $i < $n; $i++) {
            $events[] = [$this->slot(), 'visit'];
        }
        for ($i = 0, $s = (int) round($n / 10) + mt_rand(0, 1); $i < $s; $i++) {
            $events[] = [$this->slot(), 'staffVisit'];
        }
        if (mt_rand(1, 100) <= (int) round(self::INCIDENT_DAY_PCT * ($effect[2] ?? 1))) {
            $events[] = [$this->slot(), 'incident'];
        }
        for ($i = 0, $v = mt_rand(10, 20); $i < $v; $i++) {
            $events[] = [mt_rand(450, 1000), 'view'];
        }
        if (mt_rand(1, 3) === 1) {
            $events[] = [mt_rand(600, 1000), 'print'];
        }
        if (mt_rand(1, 36) === 1) {
            $events[] = [mt_rand(600, 1000), 'issue'];
        }
        if (mt_rand(1, 33) === 1) {
            $events[] = [mt_rand(480, 900), 'transferOut'];
        }
        if (mt_rand(1, 33) === 1) {
            $events[] = [mt_rand(480, 900), 'transferIn'];
        }
        usort($events, fn (array $a, array $b): int => $a[0] <=> $b[0]);
        foreach ($events as [$minute, $kind]) {
            $this->at($day->setTime(intdiv($minute, 60), $minute % 60, mt_rand(0, 59)));
            match ($kind) {
                'visit' => $this->visit($nurse, true, $weights, $effect[3] ?? null),
                'staffVisit' => $this->visit($nurse, false, $weights, null),
                'incident' => $this->incident($nurse, $effect !== null && ($effect[2] ?? 1) > 1),
                'view', 'print' => $this->viewOrPrint($logger, $nurse, $kind),
                'issue' => $this->http->as($nurse)->ok('POST', '/api/issue-reports', ['description' => 'The page was slow to load during the morning rush.', 'route' => '/visits', 'pageName' => 'Visit Log']),
                'transferOut' => $this->transferOut($nurse),
                'transferIn' => $this->transferIn($nurse, $day),
            };
        }
        $this->at($day->setTime(17, 5));
        $logger->record(new AuditEvent(actorId: (string) $nurse->id, actorRole: 'staff', action: AuditAction::Logout, targetType: AuditTarget::User, targetId: (string) $nurse->id, targetLabel: null, at: CarbonImmutable::now(), summary: 'Signed out'));
        // The scheduled backup at 18:00 (direct insert, labelled: see the header).
        $this->at($day->setTime(18, 0));
        DB::table('backup_logs')->insert(['run_key' => 'load-'.$day->format('Ymd'), 'ran_at' => CarbonImmutable::now(), 'file_name' => 'cliniq-'.$date.'-1800.zip', 'file_size_bytes' => 400000 + $dayNo * 900, 'sha256' => hash('sha256', $day->format('Ymd')), 'status' => 'ok', 'created_at' => CarbonImmutable::now()]);
    }

    /** A minute of the school day, by the half-hour SLOTS weights. */
    private function slot(): int
    {
        return (int) $this->weighted(array_column(self::SLOTS, 1, 0)) + mt_rand(0, 29);
    }

    /** Approvals of earlier work, follow-up outcomes, the first weeks' contact entry, the stock. */
    private function morning(CarbonImmutable $day, User $nurse, int $dayNo): void
    {
        $today = $day->format('Y-m-d');
        $this->at($day->setTime(7, 35));
        $letters = app(ExcuseLetterService::class);
        foreach ($this->lettersToApprove as $l) {
            if (mt_rand(1, 10) <= 9) {
                $letters->approve($l['visit'], ['excusedFrom' => $l['from'], 'excusedUntil' => $l['until'], 'note' => null, 'recipient' => null, 'body' => null, 'stayHomeUntilCleared' => false, 'stayHomeNote' => null], $nurse->id);
            }
        }
        $this->lettersToApprove = [];
        // The month's delivery on its first school day; on other Mondays only what ran out.
        if ($this->deliveredMonth !== $day->format('Y-m')) {
            $this->deliveredMonth = $day->format('Y-m');
            $this->stock($day, $nurse, true);
        } elseif ($day->isMonday()) {
            $this->stock($day, $nurse, false);
        }
        $this->at($day->setTime(8, 5));
        $follow = app(FollowUpService::class);
        $keep = [];
        foreach ($this->openFollowUps as $f) {
            if ($f['due'] > $today) {
                $keep[] = $f;

                continue;
            }
            $r = mt_rand(1, 100);
            if ($r <= 85) {
                $follow->setStatus($f['id'], 'completed', null, $nurse->id);
            } elseif ($r <= 90) {
                $follow->setStatus($f['id'], 'cancelled', 'Parent took the student to their own doctor', $nurse->id);
            } // else left open: the nightly job marks it missed
        }
        $this->openFollowUps = $keep;
        $this->at($day->setTime(8, 15));
        $incidents = app(IncidentService::class);
        foreach ($this->stageTwoTomorrow as $s) {
            $s['input']['itemsGiven'] = $this->treatment(...$s['treat']);
            $incidents->stageTwo($s['id'], $s['input'], $nurse->id);
            $this->incidentsToApprove[] = ['id' => $s['id'], 'due' => $this->nextClassDay($day, mt_rand(1, 3))->format('Y-m-d')];
        }
        $this->stageTwoTomorrow = [];
        // The principal approves incident reports within one to three school days.
        $this->at($day->setTime(9, 10));
        $keep = [];
        foreach ($this->incidentsToApprove as $a) {
            if ($a['due'] <= $today) {
                $incidents->approve($a['id'], $this->admin->id);
            } else {
                $keep[] = $a;
            }
        }
        $this->incidentsToApprove = $keep;
        // The nurse completes the new records' emergency contacts in the first two weeks of the year.
        if ($dayNo < 10) {
            $students = app(StudentService::class);
            $this->at($day->setTime(15, 30));
            $todo = array_filter($this->roster, fn (array $s): bool => $s['active'] && $s['id'] !== null && ! $s['stayIncomplete'] && ! ($s['contactsDone'] ?? false) && crc32($s['lrn']) % 10 === $dayNo);
            foreach ($todo as $lrn => $s) {
                $students->save($this->studentInput($s, true), $s['id'], true, null, $nurse->id, 'staff');
                $this->roster[$lrn]['contactsDone'] = true;
            }
        }
    }

    /** @var list<array{0: int, 1: string}>|null cumulative weights of the active students, rebuilt after a change */
    private ?array $draw = null;

    private int $drawTotal = 0;

    /** @return array<string, mixed>|null a weighted active student */
    private function someStudent(): ?array
    {
        if ($this->draw === null) {
            $this->draw = [];
            $this->drawTotal = 0;
            foreach ($this->roster as $lrn => $s) {
                if ($s['active'] && $s['id'] !== null) {
                    $this->drawTotal += $s['weight'];
                    $this->draw[] = [$this->drawTotal, $lrn];
                }
            }
        }
        if ($this->draw === []) {
            return null;
        }
        $r = mt_rand(1, $this->drawTotal);
        [$lo, $hi] = [0, count($this->draw) - 1];
        while ($lo < $hi) {
            $mid = intdiv($lo + $hi, 2);
            $this->draw[$mid][0] >= $r ? $hi = $mid : $lo = $mid + 1;
        }

        return $this->roster[$this->draw[$lo][1]];
    }

    /** A student for this minute: Kinder only in the morning (half-day classes), and rarely twice a day. */
    private function studentNow(): ?array
    {
        $afternoon = CarbonImmutable::now()->hour >= 12;
        $s = null;
        for ($try = 0; $try < 5; $try++) {
            $s = $this->someStudent();
            if ($s === null || (! ($afternoon && $s['grade'] === 0) && ! isset($this->seenToday[$s['id']]))) {
                break;
            }
        }

        return $s;
    }

    /** Can this person have this complaint? Menstrual cramps: female students aged 10 and up, and female staff. */
    private function possible(string $complaint, ?array $student, ?int $staffId): bool
    {
        if ($complaint !== 'Menstrual cramps') {
            return true;
        }
        if ($student === null) {
            return $this->staff[$staffId]['female'] ?? false;
        }

        return ! $student['noSex'] && $student['sex'] === 'female' && $this->age($student, CarbonImmutable::now()) >= 10;
    }

    /** @param array<string, float> $weights */
    private function visit(User $nurse, bool $isStudent, array $weights, ?string $eventTag): void
    {
        $patient = $isStudent ? $this->studentNow() : null;
        if ($isStudent && $patient === null) {
            return;
        }
        $staffId = $isStudent ? null : array_keys($this->staff)[mt_rand(0, count($this->staff) - 1)];
        $complaint = null;
        foreach ($patient['conditions'] ?? [] as $c) {
            if (isset(self::CONDITION_COMPLAINT[$c]) && mt_rand(1, 100) <= 40) {
                $complaint = self::CONDITION_COMPLAINT[$c];
            }
        }
        for ($try = 0; $complaint === null || ! $this->possible($complaint, $patient, $staffId); $try++) {
            $complaint = $try < 6 ? (string) $this->weighted($weights) : 'Headache';
        }
        $grade = $isStudent ? $patient['grade'] : self::ADULT;
        $disposition = ['returned_to_class', 'resting_in_clinic', 'sent_home', 'referred_to_hospital'][(int) $this->weighted(self::DISPOSITIONS[$complaint] ?? [75, 15, 9, 1])];
        $now = CarbonImmutable::now();
        $stay = self::STAY_MINUTES[$disposition];
        $out = $now->addMinutes(mt_rand($stay[0], $stay[1]));
        $out = $out->format('Y-m-d') !== $now->format('Y-m-d') || $out->hour >= 17 ? $now->setTime(17, 0) : $out;
        [$tPct, $tKind] = self::TEMPERATURE[$complaint] ?? [15, 'normal'];
        $letterPct = $disposition === 'referred_to_hospital' ? 95 : ($disposition === 'sent_home' ? (self::LETTER[$complaint] ?? 40) : 0);
        $letter = $isStudent && mt_rand(1, 100) <= $letterPct;
        $letterUntil = $complaint === 'Fever' ? $this->nextClassDay($now)->format('Y-m-d') : $now->format('Y-m-d');
        $follow = self::FOLLOW_UP[$complaint] ?? null;
        $follow = $follow !== null && mt_rand(1, 100) <= $follow[0] && ($complaint !== 'Fever' || $disposition === 'sent_home') ? $follow : null;
        $saved = app(VisitService::class)->record([
            'studentId' => $isStudent ? (string) $patient['id'] : null, 'personnelId' => $isStudent ? null : (string) $staffId,
            'complaint' => $complaint, 'extraComplaints' => [],
            'treatment' => 'Assessed and given first aid.', 'disposition' => $disposition,
            'eventTag' => in_array($complaint, ['Sprain', 'Minor wound'], true) ? $eventTag : null,
            'referredTo' => $disposition === 'referred_to_hospital' ? $this->any(self::REFERRAL_TO) : null,
            'temperatureC' => mt_rand(1, 100) <= $tPct ? $this->temperature($tKind) : null,
            'timeOut' => $out->format('H:i'), 'assistedBy' => null, 'parentGuardian' => null, 'remarks' => null,
            'itemsGiven' => $this->treatment($complaint, $grade, $patient['allergies'] ?? []),
            'followUp' => $follow !== null ? ['followUpDate' => $this->nextClassDay($now, $follow[1])->format('Y-m-d'), 'reason' => $follow[2], 'notes' => null, 'stayHomeUntilCleared' => false, 'stayHomeNote' => null] : null,
            'excuseLetterDraft' => $letter ? ['excusedFrom' => $now->format('Y-m-d'), 'excusedUntil' => $letterUntil, 'note' => null] : null,
        ], $nurse->id);
        if ($isStudent) {
            $this->seenToday[$patient['id']] = true;
        }
        $id = (int) $saved['visit']['id'];
        if ($saved['followUp'] !== null) {
            $this->openFollowUps[] = ['id' => (int) $saved['followUp']['id'], 'due' => (string) $saved['followUp']['followUpDate']];
        }
        if ($letter) {
            $this->lettersToApprove[] = ['visit' => $id, 'from' => $now->format('Y-m-d'), 'until' => $letterUntil];
        }
        if (mt_rand(1, 200) === 1) {
            $this->at($now->addMinutes(5));
            app(VisitService::class)->markEnteredInError($id, 'Wrong student selected', $nurse->id);
            $this->lettersToApprove = array_values(array_filter($this->lettersToApprove, fn (array $l): bool => $l['visit'] !== $id));
            $this->openFollowUps = array_values(array_filter($this->openFollowUps, fn (array $f): bool => $f['id'] !== (int) ($saved['followUp']['id'] ?? 0)));
        }
    }

    /** A temperature reading from the product's own fever line (`feverFromC`) and usual minimum. */
    private function temperature(string $kind): float
    {
        $tenths = fn (float $lo, float $hi): float => mt_rand((int) round($lo * 10), (int) round($hi * 10)) / 10;
        $normal = fn (): float => $tenths($this->tempMin + 0.3, $this->feverFrom - 0.2);

        return match ($kind) {
            'fever' => $tenths($this->feverFrom + 0.6, $this->feverFrom + 2.0),
            'low' => mt_rand(1, 2) === 1 ? $tenths($this->feverFrom, $this->feverFrom + 0.7) : $normal(),
            default => $normal(),
        };
    }

    /**
     * Vitals inside the age group's usual range (`vitals_usual_ranges`), shifted by the event.
     *
     * @return array<string, mixed>
     */
    private function vitals(string $complaint, int $grade, float $scale): array
    {
        $r = (array) ($this->usual['byAgeGroup'][$this->ageGroup($grade)] ?? []);
        $in = fn (string $k, int $lo, int $hi): int => mt_rand((int) ($r[$k]['min'] ?? $lo), (int) ($r[$k]['max'] ?? $hi));
        [$dp, $ds, $dd, $spo2, $dt] = self::EVENT_VITALS[$complaint] ?? (in_array($complaint, self::INJURIES, true) ? self::EVENT_VITALS['pain'] : [0, 0, 0, null, 0.0]);
        $spoMin = (int) ($this->usual['oxygenSaturationMinPct'] ?? 95);
        $oxygen = $spo2 === null ? mt_rand($spoMin + 1, 99) : min(99, mt_rand($spo2[0], $spo2[1]) + (int) round((1 - $scale) * 6));

        return [
            'temperatureC' => round(mt_rand((int) round(($this->tempMin + 0.3) * 10), (int) round(($this->feverFrom - 0.2) * 10)) / 10 + $dt * $scale, 1),
            'pulseBpm' => $in('pulseBpm', 60, 100) + (int) round($dp * $scale),
            'bloodPressure' => ($in('systolic', 100, 120) + (int) round($ds * $scale)).'/'.($in('diastolic', 60, 80) + (int) round($dd * $scale)),
            'oxygenSaturationPct' => $oxygen,
        ];
    }

    private function incident(User $nurse, bool $injuryDay): void
    {
        $student = mt_rand(1, 100) <= 92;
        $weights = [];
        foreach (self::INCIDENTS as $k => [$label, $w, $lo, $hi]) {
            $weights[$k] = $w * ($injuryDay && in_array($label, self::INJURIES, true) ? 3 : 1);
        }
        [$complaint, , $lo, $hi, $referralPct, $condition] = self::INCIDENTS[(int) $this->weighted($weights)];
        $patient = null;
        $staffId = null;
        if ($student) {
            // Most asthma attacks and seizures happen to the students who have the condition; otherwise any student of a fitting grade.
            $pool = array_filter($this->roster, fn (array $s): bool => $s['active'] && $s['id'] !== null && $s['grade'] >= $lo && $s['grade'] <= min(12, $hi)
                && ($condition === null || mt_rand(1, 100) > 85 || in_array($condition, $s['conditions'], true)) && ! (CarbonImmutable::now()->hour >= 12 && $s['grade'] === 0));
            if ($pool === []) {
                return;
            }
            $patient = $pool[array_keys($pool)[mt_rand(0, count($pool) - 1)]];
        } else {
            if ($hi < self::ADULT || $this->staff === []) {
                return;
            }
            $staffId = array_keys($this->staff)[mt_rand(0, count($this->staff) - 1)];
        }
        $grade = $patient['grade'] ?? self::ADULT;
        $service = app(IncidentService::class);
        $who = ['studentId' => $patient !== null ? (string) $patient['id'] : null, 'personnelId' => $staffId !== null ? (string) $staffId : null];
        $saved = $service->stageOne($who + ['complaint' => $complaint, 'eventTag' => null, 'vitals' => $this->vitals($complaint, $grade, 1.0)], $nurse->id);
        $id = (int) $saved['id'];
        $start = CarbonImmutable::now();
        // Calls to the parent (or the staff member's contact), 3 to 15 minutes apart, until someone answers.
        $contact = $patient !== null
            ? ($patient['stayIncomplete'] || ! ($patient['contactsDone'] ?? $patient['noSex']) ? null : ['name' => $this->families[$patient['family']]['name'], 'relationship' => $this->families[$patient['family']]['relationship'], 'phone' => $this->families[$patient['family']]['phone'], 'source' => 'emergency_contact'])
            : $this->staff[$staffId]['contact'];
        $t = $start;
        for ($call = 0; $call < 3; $call++) {
            $t = $t->addMinutes(mt_rand(3, 15));
            $this->at($t);
            $outcome = $call === 2 ? 'left_message_or_voicemail' : $this->pick([['reached', 60], ['no_answer', 28], ['left_message_or_voicemail', 10], ['wrong_number', 2]]);
            $service->addNotification($id, ['outcome' => $outcome, 'calledContact' => $contact], $nurse->id);
            if ($outcome === 'reached') {
                break;
            }
        }
        $referral = mt_rand(1, 100) <= $referralPct;
        $finish = $t->addMinutes(mt_rand(10, 40));
        $input = [
            'complaint' => $complaint, 'vitals' => $this->vitals($complaint, $grade, 0.5), 'itemsGiven' => [], 'followUp' => null, 'newParentNotifications' => [],
            'hospitalReferral' => $referral ? ['destination' => $this->any(self::REFERRAL_TO), 'transportMode' => $this->any(self::TRANSPORT), 'departureTime' => $finish->addMinutes(mt_rand(5, 15))->toIso8601String()] : null,
        ];
        // One in twenty is completed the next school day (a long afternoon); the rest the same day.
        if (mt_rand(1, 20) === 1 || $finish->hour >= 17) {
            $input['hospitalReferral'] = null;
            $this->stageTwoTomorrow[] = ['id' => $id, 'input' => $input, 'treat' => [$complaint, $grade, $patient['allergies'] ?? []]];

            return;
        }
        $this->at($finish);
        $input['itemsGiven'] = $this->treatment($complaint, $grade, $patient['allergies'] ?? []);
        $service->stageTwo($id, $input, $nurse->id);
        $this->incidentsToApprove[] = ['id' => $id, 'due' => $this->nextClassDay($finish, mt_rand(1, 3))->format('Y-m-d')];
    }

    private function viewOrPrint(AuditLogger $logger, User $nurse, string $kind): void
    {
        $s = $this->someStudent();
        if ($s === null) {
            return;
        }
        $logger->record(new AuditEvent(
            actorId: (string) $nurse->id, actorRole: 'staff', action: $kind === 'view' ? AuditAction::View : AuditAction::Print,
            targetType: $kind === 'view' ? AuditTarget::Student : AuditTarget::PrintDocument, targetId: $kind === 'view' ? (string) $s['id'] : 'student-health-record',
            targetLabel: null, at: CarbonImmutable::now(), subjectStudentId: (string) $s['id'],
        ));
    }

    private function transferOut(User $nurse): void
    {
        $s = $this->someStudent();
        if ($s === null) {
            return;
        }
        app(StudentService::class)->archive($s['id'], 'Transferred', $nurse->id, 'staff');
        $this->roster[$s['lrn']]['active'] = false;
        $this->draw = null;
    }

    private function transferIn(User $nurse, CarbonImmutable $day): void
    {
        $s = $this->newStudent((int) $this->weighted(self::NEW_ENROLLEE_GRADE), (int) $day->format('n') >= 6 ? $day->year : $day->year - 1);
        $s['section'] = self::SECTIONS[($s['grade'] * 2) % count(self::SECTIONS)];
        $this->roster[$s['lrn']] = $s;
        $saved = app(StudentService::class)->save($this->studentInput($s, true), null, true, null, $nurse->id, 'staff');
        $this->roster[$s['lrn']]['id'] = (int) $saved['student']['id'];
        $this->roster[$s['lrn']]['contactsDone'] = true;
        $this->draw = null;
    }

    private function padAudit(int $target, CarbonImmutable $today): void
    {
        $logger = app(AuditLogger::class);
        $have = DB::table('audit_logs')->count();
        $ids = array_values(array_filter(array_column($this->roster, 'id')));
        $first = CarbonImmutable::parse((string) DB::table('audit_logs')->min('occurred_at'), 'Asia/Manila');
        $span = max(1, $today->diffInMinutes($first));
        for ($i = $have; $i < $target; $i++) {
            $at = $first->addMinutes(intdiv($span * ($i - $have), max(1, $target - $have)));
            $this->at($at);
            $sid = (string) $ids[$i % count($ids)];
            $logger->record(new AuditEvent(actorId: (string) $this->nurse->id, actorRole: 'staff', action: AuditAction::View, targetType: AuditTarget::Student, targetId: $sid, targetLabel: null, at: $at, subjectStudentId: $sid));
        }
    }

    /** @param list<list<string>> $rows */
    private function writeCsv(string $path, array $header, array $rows): void
    {
        @mkdir(dirname($path), 0777, true);
        $f = fopen($path, 'w');
        fputcsv($f, $header, ',', '"', '');
        foreach ($rows as $r) {
            fputcsv($f, $r, ',', '"', '');
        }
        fclose($f);
    }
}
