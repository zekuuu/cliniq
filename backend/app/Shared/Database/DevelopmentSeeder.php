<?php

declare(strict_types=1);

namespace App\Shared\Database;

use App\Modules\ClinicVisits\Services\ExcuseLetterService;
use App\Modules\ClinicVisits\Services\VisitService;
use App\Modules\Dashboard\Services\CalendarService;
use App\Modules\EmergencyResponse\Services\IncidentService;
use App\Modules\InventoryTracker\Services\InventoryService;
use App\Modules\StaffPatients\Services\PersonnelService;
use App\Modules\StudentRecords\Services\StudentService;
use App\Modules\UserManagement\Models\User;
use App\Shared\FollowUps\FollowUpService;
use App\Shared\Support\ClinicTime;
use App\Shared\Support\Row;
use Carbon\Carbon;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use RuntimeException;

/**
 * Development data from the frontend's mock seed (`frontend/src/lib/mock-db/mock-db.json`, fictional,
 * read only). Every record goes through its owner module's service (ERD rule M-1), with the clock set
 * to the record's time, so stock, reference numbers, the Staff No. sequence and the audit trail come
 * out as if the nurse had typed them. Dates in the mock are relative to today.
 *
 * Run on a freshly migrated, empty development database (never production):
 *   php artisan db:seed --class="App\Shared\Database\DevelopmentSeeder"
 *
 * Left out: the mock's audit log, backup logs and locations (machine-specific), issue reports, PE
 * referrals, Sports Reports and the import review queue. The app writes those itself when used.
 */
final class DevelopmentSeeder extends Seeder
{
    /** @var array<string, int> mock id to database id */
    private array $ids = [];

    /** @var list<array{0: CarbonImmutable, 1: int, 2: \Closure(): void}> */
    private array $events = [];

    public function run(): void
    {
        if (app()->isProduction()) {
            throw new RuntimeException('The development seeder never runs in production.');
        }
        if (DB::table('users')->exists() || DB::table('students')->exists()) {
            throw new RuntimeException('The database already has data. Run it after migrate:fresh.');
        }
        $path = base_path('../frontend/src/lib/mock-db/mock-db.json');
        $mock = json_decode((string) file_get_contents($path), true, flags: JSON_THROW_ON_ERROR);
        if (! is_array($mock)) {
            throw new RuntimeException('mock-db.json is not readable.');
        }
        $front = self::list($mock, 'frontendOnly');

        try {
            $this->users(self::rows($mock, 'users'), self::rows($front, 'devAccounts'));
            $this->students(self::rows($mock, 'students'));
            $this->personnel(self::rows($mock, 'personnel'));
            $this->inventory(self::rows($mock, 'inventoryItems'), $mock);
            $this->visits(self::rows($mock, 'visits'), self::rows($front, 'excuseLetterApprovals'));
            $this->incidents(self::rows($mock, 'incidents'));
            $this->followUps(self::rows($mock, 'followUps'), $mock);
            $this->calendar(self::rows($front, 'calendarEvents'));
            usort($this->events, fn (array $a, array $b): int => [$a[0], $a[1]] <=> [$b[0], $b[1]]);
            foreach ($this->events as [$at, , $run]) {
                Carbon::setTestNow($at);
                $run();
            }
        } finally {
            Carbon::setTestNow();
        }
        $this->command?->info(sprintf('Seeded %d records from mock-db.json.', count($this->ids)));
    }

    /**
     * @param  list<array<array-key, mixed>>  $users
     * @param  list<array<array-key, mixed>>  $accounts
     */
    private function users(array $users, array $accounts): void
    {
        $byUser = collect($accounts)->keyBy(fn (array $a): string => Row::text($a['userId'] ?? ''));
        foreach ($users as $u) {
            $account = $byUser->get(Row::text($u['id']), []);
            $last = is_array($u['lastLogin'] ?? null) ? self::at($u['lastLogin']) : null;
            $this->ids[Row::text($u['id'])] = (int) User::query()->forceCreate([
                'name' => $u['name'], 'username' => $u['username'], 'role' => $u['role'],
                'password_hash' => Hash::make(Row::text($account['password'] ?? 'password')),
                'must_change_password' => (bool) ($account['mustChangePassword'] ?? false), 'last_login_at' => $last,
            ])->id;
        }
    }

    /** @param  list<array<array-key, mixed>>  $students */
    private function students(array $students): void
    {
        $service = app(StudentService::class);
        $nurse = $this->nurse();
        foreach ($students as $s) {
            $saved = $service->save(self::only($s, ['lrn', 'firstName', 'lastName', 'middleName', 'gradeLevel', 'birthDate', 'allergies', 'medicalConditions', 'emergencyContacts'])
                + ['section' => null, 'sex' => null], null, true, null, $nurse, 'staff');
            $id = self::savedId($saved, 'student');
            $this->ids[Row::text($s['id'])] = $id;
            if (($s['archived'] ?? false) === true) {
                $service->archive($id, Row::text($s['archiveReason'] ?? 'Moved to another school'), $nurse, 'staff');
            }
        }
    }

    /** @param  list<array<array-key, mixed>>  $personnel */
    private function personnel(array $personnel): void
    {
        $service = app(PersonnelService::class);
        $nurse = $this->nurse();
        foreach ($personnel as $p) {
            $saved = $service->save(self::only($p, ['firstName', 'lastName', 'middleName', 'sex', 'type', 'department', 'contactInfo', 'allergies', 'medicalConditions', 'emergencyContacts']), null, $nurse);
            $id = self::savedId($saved, 'personnel');
            $this->ids[Row::text($p['id'])] = $id;
            if (($p['archived'] ?? false) === true) {
                $service->archive($id, Row::text($p['archiveReason'] ?? 'Resigned'), $nurse);
            }
        }
    }

    /**
     * Each item starts with its mock stock plus everything the mock records hand out later, so the
     * stock after seeding matches the mock's.
     *
     * @param  list<array<array-key, mixed>>  $items
     * @param  array<array-key, mixed>  $mock
     */
    private function inventory(array $items, array $mock): void
    {
        $given = [];
        $first = CarbonImmutable::now(ClinicTime::ZONE)->setTime(7, 0);
        foreach (self::rows($mock, 'visits') as $v) {
            $first = $first->min(self::at(self::list($v, 'dateTime'))->subDay()->setTime(7, 0));
        }
        foreach ([...self::rows($mock, 'visits'), ...self::rows($mock, 'incidents')] as $r) {
            foreach (self::rows($r, 'itemsGiven') as $line) {
                $key = Row::text($line['itemId']);
                $given[$key] = ($given[$key] ?? 0) + (int) Row::toInt($line['quantity']);
            }
        }
        $types = DB::table('complaint_types')->pluck('id', 'label');
        $service = app(InventoryService::class);
        foreach ($items as $i) {
            $usedFor = collect(is_array($i['usedFor'] ?? null) ? $i['usedFor'] : [])->map(fn (mixed $l): ?string => $types->has(Row::text($l)) ? (string) Row::toInt($types[Row::text($l)]) : null)->filter()->values()->all();
            $expiry = is_array($i['expirationDate'] ?? null) ? self::day($i['expirationDate']) : null;
            // The mock keeps untagged items from before ADR-071, which a new save refuses: save with
            // one tag, then clear it so the item matches the mock (a list a save rebuilds anyway).
            // In stock before the first mock visit, and saved before its own expiry date.
            $at = $first;
            if ($expiry !== null && CarbonImmutable::parse($expiry, ClinicTime::ZONE)->subDay()->lessThan($at)) {
                $at = CarbonImmutable::parse($expiry, ClinicTime::ZONE)->subDay()->setTime(7, 0);
            }
            Carbon::setTestNow($at);
            $saved = $service->save(self::only($i, ['name', 'category', 'unit', 'lowStockThreshold', 'brand']) + [
                'avoidIfAllergicTo' => [], 'noExpirationConfirmed' => $expiry === null, 'usedFor' => $usedFor === [] ? [(string) Row::toInt($types->first())] : $usedFor, 'expirationDate' => $expiry,
                'currentStock' => (int) Row::toInt($i['currentStock']) + ($given[Row::text($i['id'])] ?? 0),
            ], null, $this->nurse());
            $id = self::savedId($saved, 'item');
            if ($usedFor === []) {
                DB::table('inventory_item_symptom_tags')->where('item_id', $id)->delete();
            }
            $this->ids[Row::text($i['id'])] = $id;
        }
    }

    /**
     * @param  list<array<array-key, mixed>>  $visits
     * @param  list<array<array-key, mixed>>  $approvals
     */
    private function visits(array $visits, array $approvals): void
    {
        foreach ($visits as $v) {
            $this->later(self::at(self::list($v, 'dateTime')), 1, function () use ($v): void {
                $draft = is_array($v['excuseLetterDraft'] ?? null) ? $v['excuseLetterDraft'] : null;
                $saved = app(VisitService::class)->record(self::only($v, ['complaint', 'treatment', 'disposition', 'eventTag', 'referredTo', 'temperatureC', 'timeOut', 'assistedBy', 'parentGuardian', 'remarks']) + [
                    ...$this->patient($v), 'itemsGiven' => $this->lines($v), 'followUp' => null,
                    'excuseLetterDraft' => $draft === null ? null : [
                        'excusedFrom' => self::day(self::list($draft, 'excusedFrom')), 'excusedUntil' => self::day(self::list($draft, 'excusedUntil')), 'note' => $draft['note'] ?? null,
                    ],
                ], $this->id($v['loggedByUserId']));
                $this->ids[Row::text($v['id'])] = (int) Row::toInt(self::list($saved, 'visit')['id'] ?? null);
            });
        }
        foreach ($approvals as $a) {
            $this->later(self::at(self::list($a, 'approvedAt')), 2, fn () => app(ExcuseLetterService::class)->approve($this->id($a['visitId']), [
                'excusedFrom' => self::day(self::list($a, 'excusedFrom')), 'excusedUntil' => self::day(self::list($a, 'excusedUntil')), 'note' => self::textOrNull($a, 'note'),
                'recipient' => null, 'body' => null, 'stayHomeUntilCleared' => false, 'stayHomeNote' => null,
            ], $this->id($a['approvedByUserId'])));
        }
    }

    /** @param  list<array<array-key, mixed>>  $incidents */
    private function incidents(array $incidents): void
    {
        $service = app(IncidentService::class);
        foreach ($incidents as $i) {
            $mockId = Row::text($i['id']);
            $vitals = self::list($i, 'vitals');
            $start = self::at(self::list($i, 'time'));
            $this->later($start, 1, function () use ($service, $i, $mockId, $vitals): void {
                $saved = $service->stageOne($this->patient($i) + ['complaint' => $i['complaint'], 'eventTag' => $i['eventTag'] ?? null,
                    'vitals' => array_intersect_key($vitals, array_flip(['temperatureC', 'pulseBpm', 'bloodPressure', 'oxygenSaturationPct']))], $this->nurse());
                $this->ids[$mockId] = (int) Row::toInt($saved['id'] ?? null);
            });
            if (($i['stage'] ?? 1) !== 2) {
                continue;
            }
            $calls = self::rows($i, 'parentNotifications');
            $first = $calls === [] ? $start->addMinutes(10) : self::at(self::list($calls[0], 'timestamp'));
            $referral = is_array($i['hospitalReferral'] ?? null) ? $i['hospitalReferral'] : null;
            $this->later($first, 2, fn () => $service->stageTwo($this->id($mockId), [
                'complaint' => $i['complaint'], 'vitals' => $vitals, 'itemsGiven' => $this->lines($i), 'followUp' => null,
                'hospitalReferral' => $referral === null ? null : self::only($referral, ['destination', 'transportMode']) + ['departureTime' => ClinicTime::iso(self::at(self::list($referral, 'departureTime')))],
                'newParentNotifications' => $calls === [] ? [] : [['outcome' => $calls[0]['outcome']]],
            ], $this->nurse()));
            foreach (array_slice($calls, 1) as $call) {
                $this->later(self::at(self::list($call, 'timestamp')), 3, fn () => $service->addNotification($this->id($mockId), ['outcome' => $call['outcome']], $this->nurse()));
            }
        }
    }

    /**
     * Created a minute after their visit or incident; closed this morning when the mock says so.
     *
     * @param  list<array<array-key, mixed>>  $followUps
     * @param  array<array-key, mixed>  $mock
     */
    private function followUps(array $followUps, array $mock): void
    {
        $times = [];
        foreach (self::rows($mock, 'visits') as $v) {
            $times[Row::text($v['id'])] = self::at(self::list($v, 'dateTime'));
        }
        foreach (self::rows($mock, 'incidents') as $i) {
            $times[Row::text($i['id'])] = self::at(self::list($i, 'time'));
        }
        $service = app(FollowUpService::class);
        $morning = CarbonImmutable::now(ClinicTime::ZONE)->setTime(7, 0);
        foreach ($followUps as $f) {
            $source = self::list($f, 'relatedRecord');
            $mockId = Row::text($f['id']);
            $at = $times[Row::text($source['id'])]->addMinute();
            $this->later($at, 5, function () use ($service, $f, $source, $mockId, $at): void {
                $who = $this->patient($f);
                $saved = $service->create(['studentId' => $who['studentId'] === null ? null : (int) $who['studentId'], 'personnelId' => $who['personnelId'] === null ? null : (int) $who['personnelId']], Row::text($source['type']), $this->id($source['id']), [
                    'followUpDate' => self::day(self::list($f, 'followUpDate')), 'reason' => Row::text($f['reason']), 'notes' => self::textOrNull($f, 'notes'),
                    'stayHomeUntilCleared' => false, 'stayHomeNote' => null,
                ], $this->id($f['createdByUserId']), $at);
                $this->ids[$mockId] = (int) Row::toInt($saved['id'] ?? null);
            });
            $status = Row::text($f['status']);
            if ($status !== 'pending') {
                $this->later($morning, 6, fn () => $service->setStatus($this->id($mockId), $status, $status === 'cancelled' ? 'No longer needed' : null, $this->nurse()));
            }
        }
    }

    /** @param  list<array<array-key, mixed>>  $events */
    private function calendar(array $events): void
    {
        foreach ($events as $e) {
            $this->later(self::at(self::list($e, 'createdAt')), 1, fn () => app(CalendarService::class)->save([
                'title' => $e['title'], 'startDate' => self::day(self::list($e, 'startDate')), 'endDate' => self::day(self::list($e, 'endDate')),
            ], null, $this->id($e['createdByUserId']), 'staff'));
        }
    }

    /**
     * @param  array<array-key, mixed>  $record
     * @return list<array{itemId: string, quantity: int, instructions: mixed}>
     */
    private function lines(array $record): array
    {
        return array_map(fn (array $l): array => ['itemId' => (string) $this->id($l['itemId']), 'quantity' => (int) Row::toInt($l['quantity']), 'instructions' => $l['instructions'] ?? null], self::rows($record, 'itemsGiven'));
    }

    /**
     * @param  array<array-key, mixed>  $record
     * @return array{studentId: string|null, personnelId: string|null}
     */
    private function patient(array $record): array
    {
        $student = $record['studentId'] ?? null;
        $staff = $record['personnelId'] ?? null;

        return ['studentId' => $student === null ? null : (string) $this->id($student), 'personnelId' => $staff === null ? null : (string) $this->id($staff)];
    }

    private function later(CarbonImmutable $at, int $order, \Closure $run): void
    {
        $this->events[] = [$at, $order, $run];
    }

    private function nurse(): int
    {
        return $this->ids['user-staff-01'];
    }

    private function id(mixed $mockId): int
    {
        return $this->ids[Row::text($mockId)] ?? throw new RuntimeException('Unknown mock id '.Row::text($mockId));
    }

    /**
     * `{daysAgo|daysFromNow, time}` to a Manila time today-relative.
     *
     * @param  array<array-key, mixed>  $rel
     */
    private static function at(array $rel): CarbonImmutable
    {
        $days = (int) Row::toInt($rel['daysFromNow'] ?? 0) - (int) Row::toInt($rel['daysAgo'] ?? 0);
        [$h, $m] = array_map('intval', explode(':', Row::text($rel['time'] ?? '08:00')));

        return CarbonImmutable::now(ClinicTime::ZONE)->startOfDay()->addDays($days)->setTime($h, $m);
    }

    /** @param  array<array-key, mixed>  $rel */
    private static function day(array $rel): string
    {
        return self::at($rel)->format('Y-m-d');
    }

    /** @param  array<array-key, mixed>  $saved */
    private static function savedId(array $saved, string $key): int
    {
        $row = is_array($saved[$key] ?? null) ? $saved[$key] : $saved;

        return (int) Row::toInt($row['id'] ?? null);
    }

    /**
     * @param  array<array-key, mixed>  $row
     * @param  list<string>  $keys
     * @return array<string, mixed>
     */
    private static function only(array $row, array $keys): array
    {
        return array_intersect_key($row, array_flip($keys));
    }

    /** @param  array<array-key, mixed>  $row */
    private static function textOrNull(array $row, string $key): ?string
    {
        return is_string($row[$key] ?? null) ? $row[$key] : null;
    }

    /**
     * @param  array<array-key, mixed>  $row
     * @return array<array-key, mixed>
     */
    private static function list(array $row, string $key): array
    {
        return is_array($row[$key] ?? null) ? $row[$key] : [];
    }

    /**
     * @param  array<array-key, mixed>  $row
     * @return list<array<array-key, mixed>>
     */
    private static function rows(array $row, string $key): array
    {
        return array_values(array_filter(self::list($row, $key), 'is_array'));
    }
}
