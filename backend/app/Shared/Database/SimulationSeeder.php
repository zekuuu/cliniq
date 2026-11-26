<?php

declare(strict_types=1);

namespace App\Shared\Database;

use App\Modules\ClinicVisits\Services\VisitService;
use App\Modules\Dashboard\Services\CalendarService;
use App\Modules\EmergencyResponse\Services\IncidentService;
use App\Modules\InventoryTracker\Services\InventoryService;
use App\Modules\ReportsGeneration\Services\SportsReportService;
use App\Modules\StaffPatients\Services\PersonnelService;
use App\Modules\StudentRecords\Services\StudentService;
use App\Modules\UserManagement\Models\User;
use App\Shared\FollowUps\FollowUpService;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use RuntimeException;

/** Five linked fictional records in each daily-use list; never reads existing clinic accounts. */
final class SimulationSeeder extends Seeder
{
    /** A small cross-section of the fictional Kinder-to-Grade-12 roster, not five adjacent grades. */
    private const STUDENT_SAMPLES = [
        ['fixture' => 0, 'sex' => 'male'],
        ['fixture' => 3, 'sex' => 'male'],
        ['fixture' => 7, 'sex' => 'female'],
        ['fixture' => 10, 'sex' => 'female'],
        ['fixture' => 12, 'sex' => 'male'],
    ];

    /** Reserved synthetic LRNs and plausible mobile formats; no copied contact number is used. */
    private const CONTACT_NUMBERS = ['0917-555-0101', '0918-555-0102', '0927-555-0103', '0939-555-0104', '0995-555-0105'];

    private const PERSONNEL_NUMBERS = ['0917-555-0201', '0918-555-0202', '0927-555-0203', '0939-555-0204', '0995-555-0205'];

    private const PERSONNEL_CONTACT_NUMBERS = ['0917-555-0301', '0918-555-0302', '0927-555-0303', '0939-555-0304', '0995-555-0305'];

    private const ITEMS = [
        ['name' => 'Paracetamol 500 mg tablets', 'category' => 'medicine', 'unit' => 'tablet', 'stock' => 48, 'threshold' => 12, 'expiresInMonths' => 18, 'usedFor' => ['Headache', 'Fever']],
        ['name' => 'Sterile gauze pads 10 cm x 10 cm', 'category' => 'supply', 'unit' => 'piece', 'stock' => 60, 'threshold' => 15, 'expiresInMonths' => 24, 'usedFor' => ['Minor wound']],
        ['name' => 'Adhesive bandages', 'category' => 'supply', 'unit' => 'piece', 'stock' => 80, 'threshold' => 20, 'expiresInMonths' => 24, 'usedFor' => ['Minor wound']],
        ['name' => 'Disposable nitrile gloves', 'category' => 'supply', 'unit' => 'pair', 'stock' => 100, 'threshold' => 25, 'expiresInMonths' => 24, 'usedFor' => ['Minor wound']],
        ['name' => 'Reusable cold packs', 'category' => 'supply', 'unit' => 'pack', 'stock' => 8, 'threshold' => 2, 'expiresInMonths' => null, 'usedFor' => ['Sprain']],
    ];

    private const EVENTS = [
        'Grade 7 health orientation', 'School dental screening', 'Intramurals first-aid station',
        'Parent-teacher conference', 'Clinic inventory count',
    ];

    /** Five selected sent-home visits, each with its own draft excuse letter and follow-up. */
    private const VISITS = [
        ['complaint' => 'Fever', 'temperature' => 38.1, 'treatment' => 'Rested in clinic and had temperature rechecked before collection.', 'followUp' => 'Check whether fever has resolved.', 'time' => '09:10'],
        ['complaint' => 'Stomachache', 'temperature' => 36.7, 'treatment' => 'Observed after rest; discomfort continued and guardian was contacted.', 'followUp' => 'Check whether stomach discomfort has settled.', 'time' => '10:25'],
        ['complaint' => 'Headache', 'temperature' => 36.6, 'treatment' => 'Rested and drank water; parent collected the student when symptoms persisted.', 'followUp' => 'Check whether the headache has returned.', 'time' => '11:35'],
        ['complaint' => 'Dizziness', 'temperature' => 36.5, 'treatment' => 'Seated and observed in clinic; guardian collected the student.', 'followUp' => 'Check for any further dizziness.', 'time' => '13:15'],
        ['complaint' => 'Cough and colds', 'temperature' => 37.3, 'treatment' => 'Observed in clinic and parent contacted before collection.', 'followUp' => 'Check whether cough and temperature have improved.', 'time' => '08:45'],
    ];

    private const INCIDENTS = [
        ['complaint' => 'Fall injury', 'notes' => 'Slipped during playground activity; teacher brought the student to clinic.', 'treatment' => 'Superficial abrasion cleaned and dressed.', 'bodyPart' => 'Left knee', 'outcome' => 'reached', 'time' => '10:20'],
        ['complaint' => 'Head bump during PE', 'notes' => 'Collision during PE; student remained alert and was observed.', 'treatment' => 'Observed in clinic and guardian informed of the incident.', 'bodyPart' => 'Forehead', 'outcome' => 'reached', 'time' => '11:20'],
        ['complaint' => 'Fainting', 'notes' => 'Felt faint during morning assembly; referred for further assessment.', 'treatment' => 'Observed while awaiting transport to hospital.', 'bodyPart' => null, 'outcome' => 'reached', 'time' => '07:50'],
        ['complaint' => 'Fall injury', 'notes' => 'Stumbled on the stairs and reported wrist discomfort.', 'treatment' => 'Wrist supported while guardian was contacted.', 'bodyPart' => 'Right wrist', 'outcome' => 'left_message_or_voicemail', 'time' => '13:20'],
        ['complaint' => 'Sprain', 'notes' => 'Twisted ankle during practice; awaiting Stage 2 review.', 'treatment' => null, 'bodyPart' => 'Left ankle', 'outcome' => 'no_answer', 'time' => '14:20'],
    ];

    private const REPORTS = [
        ['title' => 'Grade 7 intramurals health summary', 'activity' => 'Intramurals', 'students' => [2]],
        ['title' => 'Junior high basketball health summary', 'activity' => 'Basketball', 'students' => [2, 3]],
        ['title' => 'High school volleyball health summary', 'activity' => 'Volleyball', 'students' => [3, 4]],
        ['title' => 'Track and field tryout health summary', 'activity' => 'Track and field', 'students' => [2, 3, 4]],
        ['title' => 'Inter-school games health summary', 'activity' => 'School games', 'students' => [3, 4]],
    ];

    private const FEEDBACK = [
        ['description' => 'Please keep the selected grade when I return to the Student List from a profile.', 'route' => '/students', 'page' => 'Students', 'role' => 'staff'],
        ['description' => 'Could the calendar show the full event title when I point to a long entry?', 'route' => '/calendar', 'page' => 'Calendar', 'role' => 'admin'],
        ['description' => 'Please show the unit beside each count in the monthly stock review.', 'route' => '/inventory', 'page' => 'Inventory', 'role' => 'staff'],
        ['description' => 'Could the Visit Log remember its date range after I open and close a visit?', 'route' => '/visits', 'page' => 'Visit Log', 'role' => 'staff'],
        ['description' => 'Please make it easier to see which follow-ups are due this week.', 'route' => '/follow-ups', 'page' => 'Follow-Ups', 'role' => 'staff'],
    ];

    public function run(): void
    {
        $database = DB::getDatabaseName();
        if (app()->isProduction() || getenv('APP_ENV') === 'production' ||
            ! (in_array($database, ['cliniq_testing', 'cliniq_load'], true) || str_starts_with($database, 'cliniq_check_'))) {
            throw new RuntimeException('Simulation may run only on a CLINIQ local test or scratch database.');
        }
        if (DB::table('students')->exists() || DB::table('personnel')->exists() || DB::table('users')->exists()) {
            // A repeat must not copy, replace, or delete any existing record.
            $this->command?->info('Simulation skipped: this database already contains records.');

            return;
        }

        $fixture = json_decode((string) file_get_contents(base_path('../frontend/src/lib/mock-db/mock-db.json')), true, flags: JSON_THROW_ON_ERROR);
        if (! is_array($fixture)) {
            throw new RuntimeException('The fictional development fixture is unavailable.');
        }
        DB::beginTransaction();
        try {
            $accounts = collect($fixture['frontendOnly']['devAccounts'] ?? [])->keyBy('userId');
            $users = [];
            foreach ($fixture['users'] as $record) {
                $account = $accounts->get($record['id']);
                if (! is_array($account) || ! is_string($account['password'] ?? null) || $account['password'] === '') {
                    throw new RuntimeException('A fictional development account is missing its fixture credentials.');
                }
                $users[$record['id']] = (int) User::query()->forceCreate([
                    'name' => $record['name'], 'username' => $record['username'], 'role' => $record['role'],
                    'password_hash' => Hash::make($account['password']),
                    'must_change_password' => (bool) ($account['mustChangePassword'] ?? false),
                ])->id;
            }
            $nurse = $users['user-staff-01'];
            $students = [];
            $personnel = [];
            $contacts = [];
            foreach (self::STUDENT_SAMPLES as $i => $sample) {
                $s = $fixture['students'][$sample['fixture']];
                $s['lrn'] = '999900'.str_pad((string) ($i + 1), 6, '0', STR_PAD_LEFT);
                $s['emergencyContacts'][0]['phone'] = self::CONTACT_NUMBERS[$i];
                if ($i === 2) {
                    $s['emergencyContacts'][0]['relationship'] = 'Uncle';
                } elseif ($i === 3) {
                    $s['emergencyContacts'][0]['relationship'] = 'Grandfather';
                }
                $contacts[$i] = $s['emergencyContacts'][0];
                $saved = app(StudentService::class)->save(array_intersect_key($s, array_flip([
                    'lrn', 'firstName', 'lastName', 'middleName', 'gradeLevel', 'birthDate', 'allergies', 'medicalConditions', 'emergencyContacts',
                ])) + ['section' => null, 'sex' => $sample['sex']], null, true, null, $nurse, 'staff');
                $students[] = (int) $saved['student']['id'];

                $p = $fixture['personnel'][$i];
                $p['contactInfo'] = self::PERSONNEL_NUMBERS[$i];
                if ($p['emergencyContacts'] !== []) {
                    $p['emergencyContacts'][0]['phone'] = self::PERSONNEL_CONTACT_NUMBERS[$i];
                }
                $saved = app(PersonnelService::class)->save(array_intersect_key($p, array_flip([
                    'firstName', 'lastName', 'middleName', 'sex', 'type', 'department', 'contactInfo', 'allergies', 'medicalConditions', 'emergencyContacts',
                ])), null, $nurse);
                $personnel[] = (int) $saved['personnel']['id'];
            }

            $now = CarbonImmutable::now('Asia/Manila');
            $symptoms = DB::table('complaint_types')->pluck('id', 'label');
            $inventory = [];
            foreach (self::ITEMS as $i => $item) {
                $usedFor = array_map(fn (string $label): int => (int) ($symptoms->get($label) ?? throw new RuntimeException("Missing complaint type: {$label}")), $item['usedFor']);
                $saved = app(InventoryService::class)->save([
                    'name' => $item['name'], 'category' => $item['category'], 'unit' => $item['unit'],
                    'lowStockThreshold' => $item['threshold'], 'currentStock' => $item['stock'],
                    'expirationDate' => $item['expiresInMonths'] === null ? null : $now->addMonthsNoOverflow($item['expiresInMonths'])->format('Y-m-d'),
                    'noExpirationConfirmed' => $item['expiresInMonths'] === null,
                    'usedFor' => $usedFor, 'avoidIfAllergicTo' => $i === 0 ? ['Paracetamol'] : [],
                    'brand' => $i === 0 ? 'generic' : null,
                ], null, $nurse);
                $inventory[$i] = (int) $saved['id'];
                $day = $now->addWeekdays($i + 1)->format('Y-m-d');
                app(CalendarService::class)->save(['title' => self::EVENTS[$i], 'startDate' => $day, 'endDate' => $day], null, $nurse, 'staff');
            }

            foreach (self::VISITS as $i => $case) {
                $studentId = $students[$i];
                $visitAt = $now->subWeekdays(9 - $i * 2)->setTimeFromTimeString($case['time']);
                $visitDate = $visitAt->format('Y-m-d');
                $contact = $contacts[$i];
                $collectedAt = $visitAt->addMinutes(65)->format('H:i');
                $visit = app(VisitService::class)->record([
                    'studentId' => (string) $studentId, 'personnelId' => null, 'dateTime' => $visitAt->format('Y-m-d\TH:i'),
                    'lateEntryReason' => 'Entered from the clinic paper logbook',
                    'complaint' => $case['complaint'], 'temperatureC' => $case['temperature'],
                    'treatment' => $case['treatment'], 'disposition' => 'sent_home', 'itemsGiven' => [],
                    'collectedBy' => ['name' => $contact['name'], 'relationship' => $contact['relationship'], 'time' => $collectedAt],
                    'timeOut' => $collectedAt, 'parentGuardian' => $contact['name'],
                    'excuseLetterDraft' => ['excusedFrom' => $visitDate, 'excusedUntil' => $visitDate, 'note' => 'Excused from class after a clinic visit.'],
                ], $nurse);
                $visitId = (int) $visit['visit']['id'];
                app(FollowUpService::class)->create(['studentId' => $studentId, 'personnelId' => null], 'visit', $visitId, [
                    'followUpDate' => $now->addWeekdays($i + 1)->format('Y-m-d'),
                    'reason' => $case['followUp'], 'notes' => 'Confirm the student is ready to return to class.',
                    'stayHomeUntilCleared' => false, 'stayHomeNote' => null,
                ], $nurse, $now);
            }

            foreach (self::INCIDENTS as $i => $case) {
                $studentId = $students[$i];
                $occurredAt = $now->subWeekdays(14 - $i * 3)->setTimeFromTimeString($case['time']);
                $incident = app(IncidentService::class)->stageOne([
                    'studentId' => (string) $studentId, 'personnelId' => null,
                    'time' => $occurredAt->toIso8601String(), 'complaint' => $case['complaint'],
                    'generalNotes' => $case['notes'], 'vitals' => [],
                ], $nurse);
                if ($case['treatment'] !== null) {
                    $stageTwo = [
                        'complaint' => $case['complaint'], 'bodyPart' => $case['bodyPart'],
                        'vitals' => ['treatmentNotes' => $case['treatment']],
                    ];
                    if ($i === 0) {
                        $stageTwo['itemsGiven'] = [['itemId' => $inventory[1], 'quantity' => 1, 'instructions' => 'Applied as a dressing']];
                    }
                    if ($i === 2) {
                        $stageTwo['hospitalReferral'] = [
                            'destination' => 'Riverside District Hospital', 'transportMode' => 'Private vehicle',
                            'departureTime' => $occurredAt->addMinutes(45)->toIso8601String(),
                        ];
                    }
                    app(IncidentService::class)->stageTwo((int) $incident['id'], $stageTwo, $nurse);
                }
                $contact = $contacts[$i];
                app(IncidentService::class)->addNotification((int) $incident['id'], [
                    'outcome' => $case['outcome'],
                    'calledContact' => [
                        'name' => $contact['name'], 'relationship' => $contact['relationship'],
                        'phone' => $contact['phone'], 'source' => 'emergency_contact',
                    ],
                ], $nurse);
            }

            foreach (self::REPORTS as $i => $report) {
                app(SportsReportService::class)->save([
                    'title' => $report['title'], 'activity' => $report['activity'],
                    'requestedBy' => 'Ramil Ocampo', 'window' => 30,
                    'includeConditions' => false,
                    'students' => array_map(fn (int $index): array => ['studentId' => (string) $students[$index]], $report['students']),
                ], null, $nurse);
            }

            foreach (self::FEEDBACK as $feedback) {
                $reporter = $feedback['role'] === 'admin' ? $users['user-admin-01'] : $nurse;
                DB::table('issue_reports')->insert([
                    'description' => $feedback['description'], 'route' => $feedback['route'], 'page_name' => $feedback['page'],
                    'reporter_role' => $feedback['role'], 'reported_by_user_id' => $reporter, 'created_at' => $now,
                ]);
            }
            DB::commit();
        } catch (\Throwable $error) {
            DB::rollBack();
            throw $error;
        }
        $this->command?->info('Simulation seeded: 3 fictional accounts; five students, staff patients, supplies, calendar events, visits, excuse-letter drafts, follow-ups, incidents with contact attempts, sports reports, and issue reports.');
    }
}
