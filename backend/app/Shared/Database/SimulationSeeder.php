<?php

declare(strict_types=1);

namespace App\Shared\Database;

use App\Modules\ClinicVisits\Services\ExcuseLetterService;
use App\Modules\ClinicVisits\Services\VisitService;
use App\Modules\Dashboard\Services\CalendarService;
use App\Modules\EmergencyResponse\Services\IncidentService;
use App\Modules\InventoryTracker\Services\InventoryService;
use App\Modules\ReportsGeneration\Services\SportsReportService;
use App\Modules\StaffPatients\Services\PersonnelService;
use App\Modules\StudentRecords\Services\StudentService;
use App\Modules\UserManagement\Models\User;
use App\Shared\FollowUps\FollowUpService;
use App\Shared\Support\Row;
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
        ['name' => 'Paracetamol 500 mg tablets', 'category' => 'medicine', 'unit' => 'tablet', 'stock' => 48, 'threshold' => 12, 'expiresInDays' => 540, 'usedFor' => ['Headache', 'Fever']],
        ['name' => 'Sterile gauze pads 10 cm x 10 cm', 'category' => 'supply', 'unit' => 'piece', 'stock' => 9, 'threshold' => 15, 'expiresInDays' => 365, 'usedFor' => ['Minor wound']],
        ['name' => 'Adhesive bandages', 'category' => 'supply', 'unit' => 'piece', 'stock' => 80, 'threshold' => 20, 'expiresInDays' => 14, 'usedFor' => ['Minor wound']],
        ['name' => 'Disposable nitrile gloves', 'category' => 'supply', 'unit' => 'pair', 'stock' => 24, 'threshold' => 12, 'expiresInDays' => 1, 'expired' => true, 'usedFor' => ['Minor wound']],
        ['name' => 'Reusable cold packs', 'category' => 'supply', 'unit' => 'pack', 'stock' => 8, 'threshold' => 2, 'expiresInDays' => null, 'usedFor' => ['Sprain']],
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

        $fixture = self::record(json_decode((string) file_get_contents(base_path('../frontend/src/lib/mock-db/mock-db.json')), true, flags: JSON_THROW_ON_ERROR));
        $fixtureUsers = self::records($fixture['users'] ?? null);
        $fixtureStudents = self::records($fixture['students'] ?? null);
        $fixturePersonnel = self::records($fixture['personnel'] ?? null);
        $frontendOnly = self::record($fixture['frontendOnly'] ?? null);
        DB::beginTransaction();
        try {
            $accounts = [];
            foreach (self::records($frontendOnly['devAccounts'] ?? null) as $account) {
                $accounts[self::requiredString($account, 'userId')] = $account;
            }
            $users = [];
            foreach ($fixtureUsers as $record) {
                $userId = self::requiredString($record, 'id');
                $account = $accounts[$userId] ?? null;
                if (! is_array($account) || ! is_string($account['password'] ?? null) || $account['password'] === '') {
                    throw new RuntimeException('A fictional development account is missing its fixture credentials.');
                }
                $users[$userId] = (int) User::query()->forceCreate([
                    'name' => self::requiredString($record, 'name'),
                    'username' => self::requiredString($record, 'username'),
                    'role' => self::requiredString($record, 'role'),
                    'password_hash' => Hash::make($account['password']),
                    'must_change_password' => (bool) ($account['mustChangePassword'] ?? false),
                ])->id;
            }
            $nurse = $users['user-staff-01'] ?? throw new RuntimeException('The fictional clinician account is missing.');
            $students = [];
            $personnel = [];
            $contacts = [];
            foreach (self::STUDENT_SAMPLES as $i => $sample) {
                $s = self::record($fixtureStudents[$sample['fixture']] ?? null);
                $studentContacts = self::records($s['emergencyContacts'] ?? null);
                if ($studentContacts === []) {
                    throw new RuntimeException('A fictional student has no emergency contact.');
                }
                $s['lrn'] = '999900'.str_pad((string) ($i + 1), 6, '0', STR_PAD_LEFT);
                $studentContacts[0]['phone'] = self::CONTACT_NUMBERS[$i];
                if ($i === 1) {
                    $s['allergies'] = ['Penicillin'];
                }
                if ($i === 2) {
                    // A registrar record can be saved before the birthdate is supplied.
                    $s['birthDate'] = '';
                    $studentContacts[0]['relationship'] = 'Uncle';
                } elseif ($i === 3) {
                    $s['medicalConditions'] = ['Asthma'];
                    $studentContacts[0]['relationship'] = 'Grandfather';
                }
                $s['emergencyContacts'] = $studentContacts;
                $contacts[$i] = $studentContacts[0];
                $saved = app(StudentService::class)->save(array_intersect_key($s, array_flip([
                    'lrn', 'firstName', 'lastName', 'middleName', 'gradeLevel', 'birthDate', 'allergies', 'medicalConditions', 'emergencyContacts',
                ])) + ['section' => null, 'sex' => $sample['sex']], null, true, null, $nurse, 'staff');
                $students[] = self::savedId($saved, 'student');

                $p = self::record($fixturePersonnel[$i] ?? null);
                $p['type'] = ['Teacher', 'Non-teaching staff', 'Utility worker', 'Other', 'Teacher'][$i];
                $p['contactInfo'] = self::PERSONNEL_NUMBERS[$i];
                $personnelContacts = self::records($p['emergencyContacts'] ?? null);
                if ($personnelContacts !== []) {
                    $personnelContacts[0]['phone'] = self::PERSONNEL_CONTACT_NUMBERS[$i];
                }
                $p['emergencyContacts'] = $personnelContacts;
                $saved = app(PersonnelService::class)->save(array_intersect_key($p, array_flip([
                    'firstName', 'lastName', 'middleName', 'sex', 'type', 'department', 'contactInfo', 'allergies', 'medicalConditions', 'emergencyContacts',
                ])), null, $nurse);
                $personnel[] = self::savedId($saved, 'personnel');
            }

            $now = CarbonImmutable::now('Asia/Manila');
            $symptoms = DB::table('complaint_types')->pluck('id', 'label');
            $inventory = [];
            foreach (self::ITEMS as $i => $item) {
                $usedFor = array_map(fn (string $label): int => Row::toInt($symptoms->get($label)) ?? throw new RuntimeException("Missing complaint type: {$label}"), $item['usedFor']);
                $saved = app(InventoryService::class)->save([
                    'name' => $item['name'], 'category' => $item['category'], 'unit' => $item['unit'],
                    'lowStockThreshold' => $item['threshold'], 'currentStock' => $item['stock'],
                    'expirationDate' => $item['expiresInDays'] === null ? null : $now->addDays($item['expiresInDays'])->format('Y-m-d'),
                    'noExpirationConfirmed' => $item['expiresInDays'] === null,
                    'usedFor' => $usedFor, 'avoidIfAllergicTo' => $i === 0 ? ['Paracetamol'] : [],
                    'brand' => $i === 0 ? 'generic' : null,
                ], null, $nurse);
                $inventory[$i] = self::savedId($saved);
                if (($item['expired'] ?? false) === true) {
                    // Opening stock is valid when received; move only this fictional batch's date into the past.
                    DB::table('inventory_batches')->where('item_id', $inventory[$i])
                        ->update([
                            'received_date' => $now->subDays(90)->format('Y-m-d'),
                            'expiration_date' => $now->subDays(3)->format('Y-m-d'),
                        ]);
                }
                $day = $now->addWeekdays([-8, -2, 1, 4, 8][$i]);
                app(CalendarService::class)->save([
                    'title' => self::EVENTS[$i], 'startDate' => $day->format('Y-m-d'),
                    'endDate' => $i === 2 ? $day->addDay()->format('Y-m-d') : $day->format('Y-m-d'),
                ], null, $nurse, 'staff');
            }

            $holidayFile = base_path('../frontend/src/lib/mock-db/holidays-ph.json');
            if (app(CalendarService::class)->sync(true, $holidayFile)['status'] !== 'ok') {
                throw new RuntimeException('The bundled Philippine holiday list could not be seeded.');
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
                    'treatment' => $case['treatment'], 'disposition' => 'sent_home',
                    'itemsGiven' => in_array($i, [0, 2], true)
                        ? [['itemId' => $inventory[0], 'quantity' => 1, 'instructions' => 'Given during the clinic visit']]
                        : [],
                    'collectedBy' => ['name' => $contact['name'], 'relationship' => $contact['relationship'], 'time' => $collectedAt],
                    'timeOut' => $collectedAt, 'parentGuardian' => $contact['name'],
                    'excuseLetterDraft' => ['excusedFrom' => $visitDate, 'excusedUntil' => $visitDate, 'note' => 'Excused from class after a clinic visit.'],
                ], $nurse);
                $visitId = self::savedId($visit, 'visit');
                $followUp = app(FollowUpService::class)->create(['studentId' => $studentId, 'personnelId' => null], 'visit', $visitId, [
                    'followUpDate' => in_array($i, [1, 2], true)
                        ? $now->subWeekdays($i === 1 ? 3 : 2)->format('Y-m-d')
                        : $now->addWeekdays($i + 1)->format('Y-m-d'),
                    'reason' => $case['followUp'], 'notes' => 'Confirm the student is ready to return to class.',
                    'stayHomeUntilCleared' => false, 'stayHomeNote' => null,
                ], $nurse, $now);
                $followUpId = self::savedId($followUp);
                if ($i === 1) {
                    app(FollowUpService::class)->setStatus($followUpId, 'completed', null, $nurse);
                } elseif ($i === 2) {
                    app(FollowUpService::class)->setStatus($followUpId, 'missed', 'Student was absent on the follow-up day.', $nurse);
                } elseif ($i === 3) {
                    app(FollowUpService::class)->setStatus($followUpId, 'cancelled', 'Guardian confirmed the symptoms had resolved.', $nurse);
                }
                if ($i === 0 || $i === 2) {
                    app(ExcuseLetterService::class)->approve($visitId, [
                        'excusedFrom' => $visitDate, 'excusedUntil' => $visitDate,
                        'body' => '', 'note' => '', 'stayHomeUntilCleared' => false,
                        'stayHomeNote' => null, 'recipient' => '',
                    ], $nurse);
                }
            }

            foreach (self::INCIDENTS as $i => $case) {
                $studentId = $students[$i];
                $occurredAt = $now->subWeekdays(14 - $i * 3)->setTimeFromTimeString($case['time']);
                $incident = app(IncidentService::class)->stageOne([
                    'studentId' => (string) $studentId, 'personnelId' => null,
                    'time' => $occurredAt->toIso8601String(), 'complaint' => $case['complaint'],
                    'generalNotes' => $case['notes'], 'vitals' => [],
                ], $nurse);
                $incidentId = self::savedId($incident);
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
                    app(IncidentService::class)->stageTwo($incidentId, $stageTwo, $nurse);
                }
                $contact = $contacts[$i];
                app(IncidentService::class)->addNotification($incidentId, [
                    'outcome' => $case['outcome'],
                    'calledContact' => [
                        'name' => $contact['name'], 'relationship' => $contact['relationship'],
                        'phone' => $contact['phone'], 'source' => 'emergency_contact',
                    ],
                ], $nurse);
                if ($i === 0) {
                    app(IncidentService::class)->approve($incidentId, $nurse);
                }
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
        $this->command?->info('Simulation seeded: 3 fictional accounts; five linked records per daily-use list with varied stock and workflow states, plus Philippine holidays.');
    }

    /** @return array<string, mixed> */
    private static function record(mixed $value): array
    {
        if (! is_array($value)) {
            throw new RuntimeException('The fictional development fixture has an invalid record.');
        }
        $record = [];
        foreach ($value as $key => $field) {
            if (! is_string($key)) {
                throw new RuntimeException('The fictional development fixture has an invalid record key.');
            }
            $record[$key] = $field;
        }

        return $record;
    }

    /** @return list<array<string, mixed>> */
    private static function records(mixed $value): array
    {
        if (! is_array($value) || ! array_is_list($value)) {
            throw new RuntimeException('The fictional development fixture has an invalid record list.');
        }
        $records = [];
        foreach ($value as $record) {
            $records[] = self::record($record);
        }

        return $records;
    }

    /** @param array<string, mixed> $record */
    private static function requiredString(array $record, string $key): string
    {
        $value = $record[$key] ?? null;
        if (! is_string($value) || $value === '') {
            throw new RuntimeException("The fictional development fixture is missing {$key}.");
        }

        return $value;
    }

    /** @param array<string, mixed> $saved */
    private static function savedId(array $saved, ?string $wrapper = null): int
    {
        $record = $wrapper === null ? $saved : self::record($saved[$wrapper] ?? null);
        $id = Row::toInt($record['id'] ?? null);
        if ($id === null || $id <= 0) {
            throw new RuntimeException('The fictional simulation could not save a record.');
        }

        return $id;
    }
}
