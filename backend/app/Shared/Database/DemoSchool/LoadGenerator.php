<?php

declare(strict_types=1);

namespace App\Shared\Database\DemoSchool;

/*
 * The fictional demo and load-test school (08-Logs/Load-Test-Nov16/NOTES.md, "JOB 2 PLAN"), moved here
 * from tools/load/Generator.php on Wednesday, November 18, 2026 so DemoSchoolSeeder and build.php share
 * it. Development only: both refuse production, any database outside their allow list, and a database
 * holding rows they did not make. Every person is invented; every LRN is in the reserved range
 * 999900000001 to 999900999999. The clock is set to each record's time (Carbon::setTestNow), as the
 * development seeder does.
 *
 * Deterministic and prefix-stable: the school runs from the first school year's June 15 up to `until`
 * (default: the real clock) and stops at that minute. Each school day draws from its own seed (the
 * fixed seed and the date), and the no-class days are chosen by a hash of the seed and the date, so a
 * later `until` never changes an earlier day: a reseed tomorrow gives the same rows, with the same ids,
 * up to today, and adds tomorrow.
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

    private const GRADES = ['Kinder', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];

    private const SECTIONS = ['Faith', 'Hope', 'Charity', 'Joy', 'Peace', 'Patience', 'Kindness', 'Goodness', 'Gentleness', 'Humility', 'Wisdom', 'Courage', 'Honesty', 'Diligence', 'Mercy', 'Grace', 'Justice', 'Prudence', 'Temperance', 'Fortitude', 'Loyalty', 'Respect', 'Charity II', 'Obedience', 'Simplicity', 'Integrity'];

    private const FIRST_F = ['Maria', 'Ana', 'Sofia', 'Andrea', 'Bea', 'Camille', 'Danica', 'Erika', 'Faith', 'Gabrielle', 'Hannah', 'Isabel', 'Jasmine', 'Kristine', 'Lea', 'Mika', 'Nicole', 'Patricia', 'Rhea', 'Samantha', 'Trisha', 'Venice', 'Ysabel', 'Zia', 'Ma. Teresa', 'Precious', 'Angelica', 'Bianca', 'Clarisse', 'Denise', 'Elaine', 'Frances', 'Joanna', 'Katrina', 'Lorraine', 'Marian', 'Noreen', 'Pia', 'Rochelle', 'Shaira', 'Ximena', 'Yvette', 'Iñez', 'Ángela', 'Julieta', 'Rosario', 'Liza', 'Carmela'];

    private const FIRST_M = ['Juan', 'Jose', 'Miguel', 'Carlo', 'Daniel', 'Enzo', 'Francis', 'Gabriel', 'Harvey', 'Ivan', 'Jericho', 'Kenneth', 'Lance', 'Mark', 'Nathan', 'Oliver', 'Paolo', 'Rafael', 'Sean', 'Tristan', 'Vince', 'Warren', 'Xander', 'Yuri', 'Zachary', 'John Paul', 'Christian', 'Adrian', 'Bryan', 'Cedric', 'Dominic', 'Emmanuel', 'Gian', 'Joshua', 'Kurt', 'Luis', 'Matthew', 'Neil', 'Patrick', 'Renz', 'Simon', 'Timothy', 'Ramón', 'Nicolás', 'Andrés', 'Iñigo', 'Rogelio', 'Efren'];

    private const LAST = ['Abalos', 'Bautista', 'Cabral', 'Dimaculangan', 'Escaño', 'Fajardo', 'Galvez', 'Hernandez', 'Ilagan', 'Javier', 'Katigbak', 'Lacson', 'Magbanua', 'Natividad', 'Ocampo', 'Pangilinan', 'Quiambao', 'Robles', 'Salonga', 'Tuazon', 'Umali', 'Villareal', 'Wenceslao', 'Yap', 'Zamora', 'Dela Cruz', 'De Guzman', 'Del Rosario', 'San Juan', 'Santa Maria', 'Peñaflor', 'Muñoz', 'Ibáñez', 'Nuñez', "D'Angelo", "O'Brien", 'Reyes-Ocampo', 'Lim-Tan', 'Macaraeg', 'Buenaventura', 'Concepcion', 'Evangelista', 'Fernandez', 'Gatchalian', 'Hidalgo', 'Lualhati', 'Malabanan', 'Pacheco', 'Sarmiento', 'Valenzuela', 'Agbayani', 'Belmonte', 'Calderon', 'Dumalagan', 'Estrella', 'Florentino', 'Guevarra', 'Lagman', 'Mendiola', 'Panganiban'];

    private const MIDDLE = ['Santos', 'Reyes', 'Cruz', 'Garcia', 'Mendoza', 'Torres', 'Flores', 'Ramos', 'Aquino', 'Castro', 'Rivera', 'Navarro', 'Soriano', 'Domingo', 'Mercado', 'Aguilar', 'Salazar', 'Pascual', 'Manalo', 'Ilustre'];

    /** [label, weight] of the 12 visit complaint types, plus a few free-text ones (cough is "Cough and colds"). */
    private const COMPLAINTS = [['Headache', 18], ['Stomachache', 14], ['Fever', 10], ['Cough and colds', 12], ['Dizziness', 8], ['Minor wound', 10], ['Menstrual cramps', 5], ['Toothache', 3], ['Sprain', 4], ['Allergic reaction', 3], ['Fainting', 1], ['Chills', 2], ['Eye irritation', 2], ['Nosebleed', 2], ['Itchy skin', 2], ['Body ache', 2]];

    private const INCIDENT_COMPLAINTS = [['Fall injury', 35], ['Head bump during PE', 20], ['Fainting', 15], ['Asthma attack', 15], ['Severe allergic reaction', 5], ['Deep cut', 5], ['Seizure', 2], ['Hit by a ball', 3]];

    private const DISPOSITIONS = [['returned_to_class', 60], ['resting_in_clinic', 15], ['sent_home', 22], ['referred_to_hospital', 3]];

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

    /** @var list<int> active personnel ids */
    private array $staffIds = [];

    /** @var array<int, array{threshold: int, category: string, tags: list<int>, slow: bool}> */
    private array $items = [];

    /** @var array<int, list<int>> complaint type id to item ids */
    private array $itemsFor = [];

    /** @var array<string, int> complaint type ids by label */
    private array $types = [];

    /** @var list<array{id: int, due: string}> */
    private array $openFollowUps = [];

    /** @var list<array{visit: int, from: string, until: string}> */
    private array $lettersToApprove = [];

    /** @var list<int> */
    private array $incidentsToApprove = [];

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
        mt_srand($this->o['seed']);
        $end = $this->until;
        $currentStart = $end->month >= 6 && ! ($end->month === 6 && $end->day < 15) ? $end->year : $end->year - 1;
        $years = range($currentStart - $this->o['years'] + 1, $currentStart);
        $this->types = DB::table('complaint_types')->pluck('id', 'label')->map(fn ($v) => (int) $v)->all();

        try {
            $this->phase('accounts', fn () => $this->accounts(CarbonImmutable::create($years[0], 6, 1, 7, 0, 0, 'Asia/Manila')));
            $this->phase('holidays', fn () => app(CalendarService::class)->sync(true, base_path('../frontend/src/lib/mock-db/holidays-ph.json')));
            $this->phase('inventory', fn () => $this->inventory(CarbonImmutable::create($years[0], 6, 10, 8, 0, 0, 'Asia/Manila')));
            try {
                foreach ($years as $y) {
                    $this->phase("year {$y}–".($y + 1), fn () => $this->year($y, $y === $years[0]));
                }
            } catch (ReachedEnd) {
                // The clock reached `until`: the school stops at that minute.
            }
            if ($this->o['audit'] > 0) {
                $this->phase('audit padding', fn () => $this->padAudit($this->o['audit'], $end));
            }
        } finally {
            Carbon::setTestNow();
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

    /** Sets the clock to the next record's time; nothing is written after `until`. */
    private function at(CarbonImmutable $t): void
    {
        if ($t->greaterThan($this->until)) {
            throw new ReachedEnd;
        }
        Carbon::setTestNow($t);
    }

    /** A fresh random stream for one day or one year-start, so a later `until` never changes it. */
    private function reseed(string $key): void
    {
        mt_srand(crc32($this->o['seed'].'|'.$key));
    }

    // ---------------------------------------------------------------- accounts

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

    // ---------------------------------------------------------------- inventory

    private function inventory(CarbonImmutable $at): void
    {
        $this->at($at);
        $t = $this->types;
        $catalogue = [
            ['Paracetamol 500mg', 'medicine', 'tablets', ['Headache', 'Fever', 'Body ache', 'Toothache']],
            ['Paracetamol 250mg/5mL syrup', 'medicine', 'bottles', ['Fever', 'Headache']],
            ['Ibuprofen 200mg', 'medicine', 'tablets', ['Headache', 'Toothache', 'Sprain', 'Menstrual cramps']],
            ['Mefenamic acid 250mg', 'medicine', 'capsules', ['Menstrual cramps', 'Toothache']],
            ['Mefenamic acid 500mg', 'medicine', 'tablets', ['Menstrual cramps']],
            ['Loperamide 2mg', 'medicine', 'capsules', ['Stomachache']],
            ['Oral rehydration salts', 'medicine', 'sachets', ['Stomachache', 'Dizziness']],
            ['Antacid chewable tablet', 'medicine', 'tablets', ['Stomachache']],
            ['Hyoscine 10mg', 'medicine', 'tablets', ['Stomachache', 'Menstrual cramps']],
            ['Cetirizine 10mg', 'medicine', 'tablets', ['Allergic reaction', 'Itchy skin']],
            ['Loratadine 10mg', 'medicine', 'tablets', ['Allergic reaction']],
            ['Diphenhydramine 25mg', 'medicine', 'capsules', ['Allergic reaction', 'Itchy skin']],
            ['Salbutamol nebule 2.5mg', 'medicine', 'nebules', ['Cough and colds']],
            ['Carbocisteine 500mg', 'medicine', 'capsules', ['Cough and colds']],
            ['Ambroxol 30mg', 'medicine', 'tablets', ['Cough and colds']],
            ['Throat lozenges', 'medicine', 'pieces', ['Cough and colds']],
            ['Phenylephrine + paracetamol', 'medicine', 'tablets', ['Cough and colds', 'Fever', 'Chills']],
            ['Vitamin C 500mg', 'medicine', 'tablets', ['Cough and colds']],
            ['Meclizine 25mg', 'medicine', 'tablets', ['Dizziness']],
            ['Calamine lotion', 'medicine', 'bottles', ['Itchy skin', 'Allergic reaction']],
            ['Hydrocortisone 1% cream', 'medicine', 'tubes', ['Itchy skin', 'Allergic reaction']],
            ['Mupirocin ointment', 'medicine', 'tubes', ['Minor wound']],
            ['Povidone-iodine solution', 'medicine', 'bottles', ['Minor wound']],
            ['Silver sulfadiazine cream', 'medicine', 'tubes', ['Minor wound']],
            ['Saline eye drops', 'medicine', 'bottles', ['Eye irritation']],
            ['Lubricating eye drops', 'medicine', 'bottles', ['Eye irritation']],
            ['Clove oil', 'medicine', 'bottles', ['Toothache']],
            ['Menthol ointment', 'medicine', 'jars', ['Headache', 'Body ache', 'Dizziness']],
            ['Analgesic balm', 'medicine', 'jars', ['Sprain', 'Body ache']],
            ['Ammonia inhalant', 'medicine', 'ampules', ['Fainting', 'Dizziness']],
            ['Activated charcoal', 'medicine', 'tablets', ['Stomachache']],
            ['Simethicone 40mg', 'medicine', 'tablets', ['Stomachache']],
            ['Zinc sulfate syrup', 'medicine', 'bottles', ['Stomachache']],
            ['Epinephrine auto-injector (trainer)', 'medicine', 'pieces', ['Allergic reaction']],
            ['Petroleum jelly', 'medicine', 'jars', ['Itchy skin']],
            ['Cotton balls', 'supply', 'packs', ['Minor wound', 'Nosebleed']],
            ['Sterile gauze pads', 'supply', 'pieces', ['Minor wound', 'Nosebleed']],
            ['Adhesive bandage strips', 'supply', 'pieces', ['Minor wound']],
            ['Elastic bandage 3 inch', 'supply', 'rolls', ['Sprain']],
            ['Elastic bandage 4 inch', 'supply', 'rolls', ['Sprain']],
            ['Micropore tape', 'supply', 'rolls', ['Minor wound']],
            ['Instant cold pack', 'supply', 'pieces', ['Sprain', 'Nosebleed', 'Headache']],
            ['Hot water bag', 'supply', 'pieces', ['Menstrual cramps', 'Stomachache']],
            ['Isopropyl alcohol 70%', 'supply', 'bottles', ['Minor wound']],
            ['Hydrogen peroxide', 'supply', 'bottles', ['Minor wound']],
            ['Disposable face masks', 'supply', 'pieces', ['Cough and colds', 'Fever']],
            ['Examination gloves', 'supply', 'pairs', ['Minor wound', 'Nosebleed']],
            ['Thermometer probe covers', 'supply', 'pieces', ['Fever', 'Chills']],
            ['Tongue depressors', 'supply', 'pieces', ['Cough and colds']],
            ['Sanitary napkins', 'supply', 'pieces', ['Menstrual cramps']],
            ['Triangular bandage', 'supply', 'pieces', ['Sprain']],
            ['Finger splint', 'supply', 'pieces', ['Sprain']],
            ['Eye pad', 'supply', 'pieces', ['Eye irritation']],
            ['Emesis bag', 'supply', 'pieces', ['Dizziness', 'Stomachache']],
            ['Disposable tissue', 'supply', 'packs', ['Cough and colds', 'Nosebleed']],
            ['Wet wipes', 'supply', 'packs', ['Minor wound']],
            ['Sterile water for irrigation', 'supply', 'bottles', ['Minor wound', 'Eye irritation']],
            ['Cotton-tipped applicators', 'supply', 'packs', ['Minor wound', 'Toothache']],
            ['Burn gel dressing', 'supply', 'pieces', ['Minor wound']],
            ['Oxygen mask (pediatric)', 'supply', 'pieces', ['Fainting']],
        ];
        $service = app(InventoryService::class);
        foreach ($catalogue as $i => [$name, $category, $unit, $tags]) {
            $tagIds = array_values(array_filter(array_map(fn (string $l): ?int => $t[$l] ?? null, $tags)));
            $slow = $i % 7 === 3; // a slow mover now and then, so some batches expire before they are used
            $threshold = $slow ? 3 : [5, 10, 20, 30][mt_rand(0, 3)];
            $medicine = $category === 'medicine';
            $saved = $service->save([
                'name' => $name, 'category' => $category, 'unit' => $unit, 'lowStockThreshold' => $threshold, 'brand' => null,
                'avoidIfAllergicTo' => [], 'usedFor' => array_map('strval', $tagIds ?: [array_values($t)[0]]),
                'expirationDate' => $medicine ? $at->addMonths(mt_rand(10, 24))->format('Y-m-d') : null, 'noExpirationConfirmed' => ! $medicine,
                'currentStock' => $threshold * ($slow ? 4 : 8),
            ], null, $this->nurse->id);
            $id = (int) ($saved['id'] ?? $saved['item']['id']);
            $this->items[$id] = ['threshold' => $threshold, 'category' => $category, 'tags' => $tagIds, 'slow' => $slow];
            foreach ($tagIds as $tag) {
                $this->itemsFor[$tag][] = $id;
            }
        }
    }

    // ---------------------------------------------------------------- a school year

    private function year(int $y, bool $first): void
    {
        $start = CarbonImmutable::create($y, 6, 15, 7, 0, 0, 'Asia/Manila');
        $lastClass = CarbonImmutable::create($y + 1, 4, 14, 16, 0, 0, 'Asia/Manila');
        $this->at($start);
        $this->reseed("year-{$y}");
        $this->http->as($this->nurse)->ok('POST', '/api/school-years/start');
        if ($first) {
            $this->staffImport($this->o['staff']);
        }
        $this->studentImport($y, $first);

        // The whole year's days, as for a finished year; at() stops the loop at `until`.
        $days = $this->schoolDays($start, $lastClass);
        foreach ($days as $dayNo => $day) {
            $this->reseed($day->format('Y-m-d'));
            $this->day($day, $dayNo, count($days));
        }
        $this->at($lastClass->setTime(16, 30));
        $this->http->as($this->nurse)->ok('POST', '/api/school-years/end');
    }

    /** @return list<CarbonImmutable> */
    private function schoolDays(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $holidays = array_flip(DB::table('holidays')->pluck('holiday_date')->map(fn ($d) => (string) $d)->all());
        $out = [];
        for ($d = $from->startOfDay(); $d->lessThanOrEqualTo($to); $d = $d->addDay()) {
            $md = (int) $d->format('md');
            if ($d->isWeekend() || $md >= 1218 || $md <= 104 || isset($holidays[$d->format('Y-m-d')])) {
                continue;
            }
            $out[] = $d;
        }

        // About 20 no-class days a year (exams, events): one in ten, by a hash of the seed and the date,
        // not by position, so the end date never changes which days exist. The first day stays.
        return array_values(array_filter($out, fn (CarbonImmutable $d, int $i): bool => $i === 0 || crc32($this->o['seed'].'|drop|'.$d->format('Y-m-d')) % 10 !== 0, ARRAY_FILTER_USE_BOTH));
    }

    // ---------------------------------------------------------------- students and staff

    private function newStudent(int $grade, int $startYear): array
    {
        $female = mt_rand(0, 1) === 1;
        $first = $female ? self::FIRST_F[mt_rand(0, count(self::FIRST_F) - 1)] : self::FIRST_M[mt_rand(0, count(self::FIRST_M) - 1)];
        if (mt_rand(1, 100) <= 8) {
            $first .= ' '.($female ? self::FIRST_F[mt_rand(0, count(self::FIRST_F) - 1)] : self::FIRST_M[mt_rand(0, count(self::FIRST_M) - 1)]);
        }
        $last = self::LAST[mt_rand(0, count(self::LAST) - 1)];
        if (mt_rand(1, 400) === 1) {
            $last = 'Villanueva-Buenaventura y Concepcion-Dimaculangan'; // a long one, under 50 characters
        }
        $age = 5 + $grade;
        $birth = CarbonImmutable::create($startYear - $age, 1, 1)->addDays(mt_rand(0, 364))->format('Y-m-d');
        $this->lrnSeq++;
        $noSex = mt_rand(1, 1000) <= 30;

        return [
            'lrn' => self::LRN_PREFIX.str_pad((string) $this->lrnSeq, 6, '0', STR_PAD_LEFT),
            'firstName' => $first, 'lastName' => $last, 'middleName' => mt_rand(1, 10) <= 9 ? self::MIDDLE[mt_rand(0, count(self::MIDDLE) - 1)] : '',
            'sex' => $female ? 'female' : 'male', 'noSex' => $noSex, 'birthDate' => mt_rand(1, 20) === 1 ? '' : $birth,
            'grade' => $grade, 'section' => '', 'id' => null, 'active' => true,
            'weight' => mt_rand(1, 100) <= 20 ? 6 : 1, 'stayIncomplete' => mt_rand(1, 1000) <= 15,
            'allergies' => mt_rand(1, 100) <= 8 ? [['Peanuts', 'Shrimp', 'Penicillin', 'Dust', 'Ibuprofen'][mt_rand(0, 4)]] : [],
            'conditions' => mt_rand(1, 100) <= 6 ? [['Asthma', 'Epilepsy', 'Heart murmur', 'Migraine', 'Eczema'][mt_rand(0, 4)]] : [],
        ];
    }

    private function studentImport(int $y, bool $first): void
    {
        if ($first) {
            $perGrade = intdiv($this->o['students'], 13);
            $extra = $this->o['students'] % 13;
            foreach (self::GRADES as $g => $_) {
                foreach (range(1, $perGrade + ($g < $extra ? 1 : 0)) as $_n) {
                    $s = $this->newStudent($g, $y);
                    $this->roster[$s['lrn']] = $s;
                }
            }
            $this->siblingsAndTwins();
        } else {
            foreach ($this->roster as $lrn => $s) {
                if ($s['active']) {
                    $this->roster[$lrn]['grade']++;
                }
            }
            foreach (range(1, intdiv($this->o['students'], 13)) as $_n) {
                $s = $this->newStudent(0, $y);
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

    /** Siblings share a guardian surname; three same-name pairs and three same-birthday pairs. */
    private function siblingsAndTwins(): void
    {
        $lrns = array_keys($this->roster);
        for ($i = 0; $i < 3; $i++) {
            $a = $lrns[mt_rand(0, count($lrns) - 1)];
            $b = $lrns[mt_rand(0, count($lrns) - 1)];
            $this->roster[$b]['firstName'] = $this->roster[$a]['firstName'];
            $this->roster[$b]['lastName'] = $this->roster[$a]['lastName'];
            $c = $lrns[mt_rand(0, count($lrns) - 1)];
            $this->roster[$c]['birthDate'] = $this->roster[$a]['birthDate'];
        }
    }

    /** @return array<string, mixed> a `StudentInput`; contacts only once the nurse has them */
    private function studentInput(array $s, bool $withContacts): array
    {
        $guardian = ['Mother', 'Father', 'Grandmother', 'Aunt', 'Guardian'][crc32($s['lrn']) % 5];

        return [
            'lrn' => $s['lrn'], 'firstName' => $s['firstName'], 'lastName' => $s['lastName'], 'middleName' => $s['middleName'] ?: null,
            'gradeLevel' => self::GRADES[min(12, $s['grade'])], 'section' => $s['section'] ?: null, 'sex' => $s['noSex'] ? null : $s['sex'],
            'birthDate' => $s['birthDate'] ?: null, 'allergies' => $s['allergies'], 'medicalConditions' => $s['conditions'],
            'emergencyContacts' => $withContacts && ! $s['stayIncomplete'] ? [[
                'name' => self::FIRST_F[crc32($s['lastName']) % count(self::FIRST_F)].' '.$s['lastName'], 'relationship' => $guardian,
                'phone' => '0917'.str_pad((string) (crc32($s['lrn']) % 10000000), 7, '0', STR_PAD_LEFT), 'verified' => false,
            ]] : [],
        ];
    }

    private function staffImport(int $n): void
    {
        $types = ['Teacher', 'Teacher', 'Teacher', 'Non-teaching staff', 'Utility worker'];
        $rows = [];
        foreach (range(1, $n + 5) as $i) {
            $female = $i % 3 !== 0;
            $rows[] = [
                'staffNumber' => '', 'firstName' => ($female ? self::FIRST_F : self::FIRST_M)[($i * 7) % 48], 'lastName' => self::LAST[($i * 11) % count(self::LAST)],
                'middleName' => self::MIDDLE[$i % count(self::MIDDLE)], 'sex' => $female ? 'Female' : 'Male', 'type' => $types[$i % 5],
                'department' => $types[$i % 5] === 'Teacher' ? self::GRADES[$i % 13].' adviser' : 'Office', 'contactInfo' => '0918'.str_pad((string) (1000000 + $i), 7, '0', STR_PAD_LEFT),
                'contactName' => self::FIRST_F[$i % 48].' '.self::LAST[($i * 5) % count(self::LAST)], 'contactRelationship' => 'Spouse', 'contactPhone' => '0919'.str_pad((string) (2000000 + $i), 7, '0', STR_PAD_LEFT),
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
        $this->staffIds = array_slice($ids, 0, -5);
    }

    // ---------------------------------------------------------------- one school day

    private function day(CarbonImmutable $day, int $dayNo, int $dayCount): void
    {
        $nurse = $this->staffUsers[$dayNo % 23 === 7 ? 1 + ($dayNo % 3) : 0]; // a covering Staff some days
        $logger = app(AuditLogger::class);
        $this->at($day->setTime(0, 15));
        app(FollowUpService::class)->closeMissed();
        $this->at($day->setTime(7, 25));
        $logger->record(new AuditEvent(actorId: (string) $nurse->id, actorRole: 'staff', action: AuditAction::Login, targetType: AuditTarget::User, targetId: (string) $nurse->id, targetLabel: null, at: CarbonImmutable::now(), summary: 'Signed in'));

        $this->morning($day, $nurse, $dayNo, $dayCount);

        // Visits and incidents, in time order.
        $month = (int) $day->format('n');
        $cough = $month === 10 && (int) $day->format('j') <= 9;
        $fever = $month === 2 && in_array((int) $day->format('j'), [10, 11, 12], true);
        $n = 20 + mt_rand(0, 10) + ($cough ? 15 : 0) + ($fever ? 20 : 0);
        $events = [];
        for ($i = 0; $i < $n; $i++) {
            $events[] = [mt_rand(450, 990), 'visit', $cough && mt_rand(1, 2) === 1 ? 'Cough and colds' : ($fever && mt_rand(1, 2) === 1 ? 'Fever' : null)];
        }
        for ($i = 0, $s = mt_rand(2, 4); $i < $s; $i++) {
            $events[] = [mt_rand(450, 990), 'staffVisit', null];
        }
        if (mt_rand(1, 100) <= 80) {
            $events[] = [mt_rand(480, 960), 'incident', null];
        }
        for ($i = 0, $v = mt_rand(10, 20); $i < $v; $i++) {
            $events[] = [mt_rand(450, 1000), 'view', null];
        }
        if (mt_rand(1, 3) === 1) {
            $events[] = [mt_rand(600, 1000), 'print', null];
        }
        if (mt_rand(1, 36) === 1) {
            $events[] = [mt_rand(600, 1000), 'issue', null];
        }
        if (mt_rand(1, 6) === 1) {
            $events[] = [mt_rand(480, 1000), 'calendar', null];
        }
        if (mt_rand(1, 33) === 1) {
            $events[] = [mt_rand(480, 900), 'transferOut', null];
        }
        if (mt_rand(1, 33) === 1) {
            $events[] = [mt_rand(480, 900), 'transferIn', null];
        }
        usort($events, fn (array $a, array $b): int => $a[0] <=> $b[0]);
        foreach ($events as [$minute, $kind, $complaint]) {
            $this->at($day->setTime(intdiv($minute, 60), $minute % 60, mt_rand(0, 59)));
            match ($kind) {
                'visit' => $this->visit($nurse, true, $complaint),
                'staffVisit' => $this->visit($nurse, false, null),
                'incident' => $this->incident($nurse),
                'view', 'print' => $this->viewOrPrint($logger, $nurse, $kind),
                'issue' => $this->http->as($nurse)->ok('POST', '/api/issue-reports', ['description' => 'The page was slow to load during the morning rush.', 'route' => '/visits', 'pageName' => 'Visit Log']),
                'calendar' => app(CalendarService::class)->save(['title' => ['Intramurals', 'Parent-teacher conference', 'Deworming day', 'Dental check-up', 'Field trip', 'Quarterly exams', 'Recognition day'][mt_rand(0, 6)], 'startDate' => $day->addDays(mt_rand(3, 20))->format('Y-m-d'), 'endDate' => $day->addDays(mt_rand(21, 23))->format('Y-m-d')], null, $nurse->id, 'staff'),
                'transferOut' => $this->transferOut($nurse),
                'transferIn' => $this->transferIn($nurse, $day),
            };
        }
        $this->at($day->setTime(17, 5));
        $logger->record(new AuditEvent(actorId: (string) $nurse->id, actorRole: 'staff', action: AuditAction::Logout, targetType: AuditTarget::User, targetId: (string) $nurse->id, targetLabel: null, at: CarbonImmutable::now(), summary: 'Signed out'));
        // The scheduled backup at 18:00 (direct insert, labelled: see the header).
        $this->at($day->setTime(18, 0));
        DB::table('backup_logs')->insert(['run_key' => 'load-'.$day->format('Ymd'), 'ran_at' => CarbonImmutable::now(), 'file_name' => 'cliniq-'.$day->format('Y-m-d').'-1800.zip', 'file_size_bytes' => 400000 + $dayNo * 900, 'sha256' => hash('sha256', $day->format('Ymd')), 'status' => 'ok', 'created_at' => CarbonImmutable::now()]);
    }

    /** Approvals of yesterday's work, follow-up outcomes, the first weeks' contact entry, and the Monday stock check. */
    private function morning(CarbonImmutable $day, User $nurse, int $dayNo, int $dayCount): void
    {
        $this->at($day->setTime(7, 35));
        $letters = app(ExcuseLetterService::class);
        foreach ($this->lettersToApprove as $l) {
            if (mt_rand(1, 10) <= 9) {
                $letters->approve($l['visit'], ['excusedFrom' => $l['from'], 'excusedUntil' => $l['until'], 'note' => null, 'recipient' => null, 'body' => null, 'stayHomeUntilCleared' => false, 'stayHomeNote' => null], $nurse->id);
            }
        }
        $this->lettersToApprove = [];
        $this->at($day->setTime(7, 50));
        $incidents = app(IncidentService::class);
        foreach ($this->incidentsToApprove as $id) {
            if (mt_rand(1, 10) <= 8) {
                $incidents->approve($id, $this->admin->id);
            }
        }
        $this->incidentsToApprove = [];
        $this->at($day->setTime(8, 5));
        $follow = app(FollowUpService::class);
        $keep = [];
        $today = $day->format('Y-m-d');
        foreach ($this->openFollowUps as $f) {
            if ($f['due'] >= $today) {
                $keep[] = $f;

                continue;
            }
            $r = mt_rand(1, 100);
            if ($r <= 75) {
                $follow->setStatus($f['id'], 'completed', null, $nurse->id);
            } elseif ($r <= 80) {
                $follow->setStatus($f['id'], 'cancelled', 'Parent took the student to their own doctor', $nurse->id);
            } // else left open: the nightly job marks it missed
        }
        $this->openFollowUps = $keep;
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
        if ($day->isMonday()) {
            $this->stockCheck($day, $nurse, $dayNo >= $dayCount - 15);
        }
    }

    private function stockCheck(CarbonImmutable $day, User $nurse, bool $endOfWindow): void
    {
        $this->at($day->setTime(7, 40));
        $inventory = app(InventoryService::class);
        $today = $day->format('Y-m-d');
        foreach ($this->items as $id => $item) {
            $usable = (int) DB::table('inventory_batches')->where('item_id', $id)->where(fn ($q) => $q->whereNull('expiration_date')->orWhere('expiration_date', '>=', $today))->sum('quantity');
            // A few items are "ordered, not arrived" in the last weeks, so the low-stock group exists.
            if ($endOfWindow && $id % 9 === 0) {
                continue;
            }
            if ($usable < 2 * $item['threshold']) {
                $medicine = $item['category'] === 'medicine';
                // Most medicine lots last 12 to 30 months; a slow mover's short-dated lot expires on the shelf.
                $months = $item['slow'] ? mt_rand(4, 9) : mt_rand(12, 30);
                $inventory->restock($id, ['quantity' => $item['threshold'] * ($item['slow'] ? 4 : 10), 'expirationDate' => $medicine ? $day->addMonths($months)->format('Y-m-d') : null, 'noExpirationConfirmed' => ! $medicine], $nurse->id);
            }
            // Expired lots are disposed of at the first check of each month, unless they expired in the last 60 days.
            if ($day->day <= 7) {
                foreach (DB::table('inventory_batches')->where('item_id', $id)->where('quantity', '>', 0)->where('expiration_date', '<', $day->subDays(60)->format('Y-m-d'))->get(['id', 'quantity']) as $b) {
                    $inventory->adjust($id, ['reason' => 'expired_disposed', 'batchId' => (string) $b->id, 'change' => -(int) $b->quantity, 'note' => null], $nurse->id);
                }
            }
        }
    }

    /** An item whose every batch has expired can't be given (StockService); the nurse skips it until the next restock. */
    private function givable(int $item): bool
    {
        $today = CarbonImmutable::now()->format('Y-m-d');

        return DB::table('inventory_batches')->where('item_id', $item)->where(fn ($q) => $q->whereNull('expiration_date')->orWhere('expiration_date', '>=', $today))->exists();
    }

    private function pick(array $weighted): string
    {
        $total = array_sum(array_column($weighted, 1));
        $r = mt_rand(1, $total);
        foreach ($weighted as [$v, $w]) {
            if (($r -= $w) <= 0) {
                return $v;
            }
        }

        return $weighted[0][0];
    }

    /** @var list<array{0: int, 1: string}>|null cumulative weights of the active students, rebuilt after a change */
    private ?array $draw = null;

    private int $drawTotal = 0;

    /** @return array<string, mixed>|null a weighted active student (frequent visitors weigh 6) */
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

    private function visit(User $nurse, bool $student, ?string $complaint): void
    {
        $patient = $student ? $this->someStudent() : null;
        if ($student && $patient === null) {
            return;
        }
        $complaint ??= $this->pick(self::COMPLAINTS);
        if (! $student && $complaint === 'Menstrual cramps') {
            $complaint = 'Headache';
        }
        $disposition = $this->pick(self::DISPOSITIONS);
        $lines = [];
        $typeId = $this->types[$complaint] ?? null;
        if (mt_rand(1, 100) <= 40) {
            $candidates = $typeId !== null ? ($this->itemsFor[$typeId] ?? []) : [];
            $item = $candidates !== [] ? $candidates[mt_rand(0, count($candidates) - 1)] : array_keys($this->items)[mt_rand(0, count($this->items) - 1)];
            $quantity = mt_rand(1, 2);
            if ($this->givable($item)) {
                $lines[] = ['itemId' => (string) $item, 'quantity' => $quantity, 'instructions' => null];
            }
        }
        $now = CarbonImmutable::now();
        $letter = $student && in_array($disposition, ['sent_home', 'referred_to_hospital'], true) && mt_rand(1, 100) <= 95;
        $follow = mt_rand(1, 100) <= 8;
        $saved = app(VisitService::class)->record([
            'studentId' => $student ? (string) $patient['id'] : null, 'personnelId' => $student ? null : (string) $this->staffIds[mt_rand(0, count($this->staffIds) - 1)],
            'complaint' => $complaint, 'extraComplaints' => mt_rand(1, 10) === 1 ? ['Dizziness'] : [],
            'treatment' => 'Assessed and given first aid.', 'disposition' => $disposition, 'eventTag' => null,
            'referredTo' => $disposition === 'referred_to_hospital' ? 'Municipal health center' : null,
            'temperatureC' => mt_rand(1, 10) <= 8 ? round(36.2 + mt_rand(0, 25) / 10, 1) : null,
            'timeOut' => null, 'assistedBy' => null, 'parentGuardian' => null, 'remarks' => null,
            'itemsGiven' => $lines,
            'followUp' => $follow ? ['followUpDate' => $now->addDays(mt_rand(1, 7))->format('Y-m-d'), 'reason' => 'Check how the patient is doing.', 'notes' => null, 'stayHomeUntilCleared' => false, 'stayHomeNote' => null] : null,
            'excuseLetterDraft' => $letter ? ['excusedFrom' => $now->format('Y-m-d'), 'excusedUntil' => $now->addDays(mt_rand(0, 1))->format('Y-m-d'), 'note' => null] : null,
        ], $nurse->id);
        $id = (int) $saved['visit']['id'];
        if ($saved['followUp'] !== null) {
            $this->openFollowUps[] = ['id' => (int) $saved['followUp']['id'], 'due' => (string) $saved['followUp']['followUpDate']];
        }
        if ($letter) {
            $this->lettersToApprove[] = ['visit' => $id, 'from' => $now->format('Y-m-d'), 'until' => $now->addDays(1)->format('Y-m-d')];
        }
        if (mt_rand(1, 100) === 1) {
            $this->at($now->addMinutes(5));
            app(VisitService::class)->markEnteredInError($id, 'Wrong student selected', $nurse->id);
            $this->lettersToApprove = array_values(array_filter($this->lettersToApprove, fn (array $l): bool => $l['visit'] !== $id));
            $this->openFollowUps = array_values(array_filter($this->openFollowUps, fn (array $f): bool => $f['id'] !== (int) ($saved['followUp']['id'] ?? 0)));
        }
    }

    private function incident(User $nurse): void
    {
        $student = mt_rand(1, 10) <= 9;
        $patient = $student ? $this->someStudent() : null;
        if ($student && $patient === null) {
            return;
        }
        $service = app(IncidentService::class);
        $complaint = $this->pick(self::INCIDENT_COMPLAINTS);
        $vitals = ['temperatureC' => 36.5 + mt_rand(0, 15) / 10, 'pulseBpm' => mt_rand(70, 120), 'bloodPressure' => mt_rand(95, 125).'/'.mt_rand(60, 85), 'oxygenSaturationPct' => mt_rand(94, 99)];
        $who = ['studentId' => $student ? (string) $patient['id'] : null, 'personnelId' => $student ? null : (string) $this->staffIds[mt_rand(0, count($this->staffIds) - 1)]];
        $saved = $service->stageOne($who + ['complaint' => $complaint, 'eventTag' => null, 'vitals' => $vitals], $nurse->id);
        $id = (int) $saved['id'];
        if (mt_rand(1, 10) === 1) {
            return; // stays at Stage 1
        }
        $this->at(CarbonImmutable::now()->addMinutes(mt_rand(15, 50)));
        $referral = mt_rand(1, 100) <= 15;
        $lines = [];
        if (mt_rand(1, 2) === 1) {
            $typeId = $this->types[$complaint] ?? null;
            $c = $typeId !== null ? ($this->itemsFor[$typeId] ?? []) : [];
            $item = $c !== [] ? $c[0] : array_keys($this->items)[mt_rand(0, count($this->items) - 1)];
            if ($this->givable($item)) {
                $lines[] = ['itemId' => (string) $item, 'quantity' => 1, 'instructions' => null];
            }
        }
        $service->stageTwo($id, [
            'complaint' => $complaint, 'vitals' => $vitals, 'itemsGiven' => $lines, 'followUp' => null,
            'hospitalReferral' => $referral ? ['destination' => 'Municipal hospital', 'transportMode' => 'School vehicle', 'departureTime' => CarbonImmutable::now()->addMinutes(10)->toIso8601String()] : null,
            'newParentNotifications' => [['outcome' => ['reached', 'no_answer', 'left_message_or_voicemail'][mt_rand(0, 2)]]],
        ], $nurse->id);
        $this->incidentsToApprove[] = $id;
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
        $s = $this->newStudent(mt_rand(0, 12), (int) $day->format('n') >= 6 ? $day->year : $day->year - 1);
        $s['section'] = self::SECTIONS[($s['grade'] * 2) % count(self::SECTIONS)];
        $saved = app(StudentService::class)->save($this->studentInput($s, true), null, true, null, $nurse->id, 'staff');
        $s['id'] = (int) $saved['student']['id'];
        $s['contactsDone'] = true;
        $this->roster[$s['lrn']] = $s;
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
