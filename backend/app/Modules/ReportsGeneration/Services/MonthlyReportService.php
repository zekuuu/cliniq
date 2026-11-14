<?php

declare(strict_types=1);

namespace App\Modules\ReportsGeneration\Services;

use App\Modules\EmergencyResponse\Services\IncidentService;
use App\Shared\Support\ClinicTime;
use App\Shared\Support\Complaints;
use App\Shared\Support\Lrn;
use App\Shared\Support\Row;
use Carbon\CarbonImmutable;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

/**
 * The four monthly reports' data (ADR-074; `getMonthlyReport`), computed from the records on every
 * call, never stored. Counted visits leave out those entered in error and those escalated to an
 * incident, which counts once, as the incident (ADR-036). Patients appear as a masked LRN or a Staff
 * No.; the full LRN only on Staff's printout (`fullLrn`, ADR-044). Staff incidents are included (Q8).
 */
final class MonthlyReportService
{
    private const DISPOSITIONS = ['returned_to_class', 'resting_in_clinic', 'sent_home', 'referred_to_hospital'];

    private const STATUSES = ['pending', 'completed', 'missed', 'cancelled'];

    public function __construct(private readonly IncidentService $incidents) {}

    /** "YYYY-MM" of the newest visit or incident up to today, else this month (ADR-077). */
    public function latestMonth(): string
    {
        $today = ClinicTime::today().' 23:59:59';
        $visit = self::counted()->where('visited_at', '<=', $today)->max('visited_at');
        $incident = DB::table('incidents')->where('occurred_at', '<=', $today)->max('occurred_at');
        $latest = max(Row::text($visit), Row::text($incident));

        return $latest !== '' ? substr($latest, 0, 7) : substr(ClinicTime::today(), 0, 7);
    }

    /** @return array<string, mixed> `MonthlyReportData` */
    public function report(string $month, bool $fullLrn): array
    {
        $first = "{$month}-01";
        $last = CarbonImmutable::parse($first)->endOfMonth()->format('Y-m-d');
        $visits = self::counted()->whereBetween('visited_at', ["{$first} 00:00:00", "{$last} 23:59:59"])
            ->leftJoin('students as s', 's.id', '=', 'visits.student_id')->leftJoin('personnel as p', 'p.id', '=', 'visits.personnel_id')
            ->get(['visits.visited_at', 'visits.complaint', 'visits.disposition', 'visits.student_id', 'visits.personnel_id', 's.sex as student_sex', 'p.sex as staff_sex']);
        $known = array_values(DB::table('complaint_types')->where('used_in_visits', 1)->orderBy('sort_order')->orderBy('id')->pluck('label')->map(fn (mixed $v): string => Row::text($v))->all());

        $groups = [];
        foreach ($visits as $v) {
            $label = Complaints::reportLabel((string) Row::str($v, 'complaint'), $known);
            $groups[$label] = ($groups[$label] ?? 0) + 1;
        }
        uksort($groups, fn (string $a, string $b): int => $groups[$b] <=> $groups[$a] ?: strcmp($a, $b));
        $complaintCounts = array_map(fn (string $c, int $n): array => ['complaint' => $c, 'count' => $n], array_keys($groups), array_values($groups));

        $weeks = self::weeks($month);
        $rows = array_map(fn (array $g): array => ['complaint' => $g['complaint'], 'counts' => array_fill(0, count($weeks), 0), 'total' => $g['count']], $complaintCounts);
        $index = array_flip(array_column($rows, 'complaint'));
        foreach ($visits as $v) {
            $day = substr((string) Row::str($v, 'visited_at'), 0, 10);
            foreach ($weeks as $w => $week) {
                if ($day >= $week['from'] && $day <= $week['to']) {
                    $rows[$index[Complaints::reportLabel((string) Row::str($v, 'complaint'), $known)]]['counts'][$w]++;
                }
            }
        }
        $totals = array_map(fn (int $w): int => array_sum(array_map(fn (array $r): int => $r['counts'][$w], $rows)), array_keys($weeks));

        $sex = fn (string $s): array => [
            'students' => $visits->filter(fn (object $v): bool => Row::int($v, 'student_id') !== null && Row::str($v, 'student_sex') === $s)->count(),
            'staff' => $visits->filter(fn (object $v): bool => Row::int($v, 'personnel_id') !== null && Row::str($v, 'staff_sex') === $s)->count(),
        ];
        $previous = CarbonImmutable::parse($first)->subMonth()->format('Y-m');

        return [
            'month' => $month,
            'counts' => $this->counts($month),
            'previousCounts' => $this->counts($previous),
            'dispositions' => array_map(fn (string $d): array => ['disposition' => $d, 'count' => $visits->where('disposition', $d)->count()], self::DISPOSITIONS),
            'followUpsByStatus' => array_map(fn (string $s): array => ['status' => $s, 'count' => DB::table('follow_ups')->where('follow_up_date', 'like', "{$month}-%")->where('status', $s)->count()], self::STATUSES),
            'itemsGiven' => $this->itemsGiven($month),
            'incidents' => $this->incidentRows($first, $last, $fullLrn),
            'complaintCounts' => $complaintCounts,
            'weeklyComplaints' => ['weeks' => $weeks, 'rows' => $rows, 'totals' => $totals],
            'visitsBySex' => [
                'female' => $sex('female'), 'male' => $sex('male'),
                // A missing sex is never read as female (contract G4): a student or staff record without one counts here.
                'noSexRecorded' => $visits->filter(fn (object $v): bool => Row::str($v, Row::int($v, 'student_id') !== null ? 'student_sex' : 'staff_sex') === null)->count(),
            ],
            'inventory' => $this->inventory($first, $last),
            'principalName' => Row::str((object) ['n' => DB::table('users')->where('role', 'admin')->whereNull('deactivated_at')->orderBy('id')->value('name')], 'n'),
        ];
    }

    /** Visits that count in totals: not entered in error, not escalated (ADR-036). */
    public static function counted(): Builder
    {
        return DB::table('visits')->whereNull('visits.entered_in_error_at')->whereNull('visits.escalated_incident_id');
    }

    /**
     * The month split at each Sunday (`monthWeeks`).
     *
     * @return list<array{from: string, to: string, label: string}>
     */
    public static function weeks(string $month): array
    {
        $day = CarbonImmutable::parse("{$month}-01");
        $end = $day->endOfMonth();
        $chunks = [];
        for (; $day->lessThanOrEqualTo($end); $day = $day->addDay()) {
            if ($chunks === [] || $day->dayOfWeek === 0) {
                $chunks[] = [];
            }
            $chunks[count($chunks) - 1][] = $day;
        }

        return array_map(function (array $chunk): array {
            $a = $chunk[0];
            $b = $chunk[count($chunk) - 1];

            return ['from' => $a->format('Y-m-d'), 'to' => $b->format('Y-m-d'), 'label' => $a->day === $b->day ? (string) $a->day : $a->day.'-'.$b->day];
        }, $chunks);
    }

    /** @return array{visits: int, incidents: int, followUps: int} */
    private function counts(string $month): array
    {
        return [
            'visits' => self::counted()->where('visited_at', 'like', "{$month}-%")->count(),
            'incidents' => DB::table('incidents')->where('occurred_at', 'like', "{$month}-%")->count(),
            'followUps' => DB::table('follow_ups')->where('follow_up_date', 'like', "{$month}-%")->count(),
        ];
    }

    /** @return list<array{itemName: string, unit: string, quantity: int}> dispensed minus what visit edits returned */
    private function itemsGiven(string $month): array
    {
        return array_values(DB::table('inventory_transactions as t')->join('inventory_items as i', 'i.id', '=', 't.item_id')
            ->where('t.occurred_at', 'like', "{$month}-%")
            ->where(fn (Builder $q) => $q->where('t.type', 'dispense')->orWhere(fn (Builder $w) => $w->where('t.type', 'adjustment')->where('t.reason', 'visit_edited')))
            ->groupBy('i.id', 'i.name', 'i.unit')->havingRaw('SUM(-t.quantity_delta) > 0')->orderBy('i.name')
            ->get(['i.name', 'i.unit', DB::raw('SUM(-t.quantity_delta) AS given')])
            ->map(fn (object $r): array => ['itemName' => (string) Row::str($r, 'name'), 'unit' => (string) Row::str($r, 'unit'), 'quantity' => (int) Row::int($r, 'given')])->all());
    }

    /** @return list<array<string, mixed>> `Incident & { patient }`, newest first */
    private function incidentRows(string $first, string $last, bool $fullLrn): array
    {
        $numbers = DB::table('incidents as i')->leftJoin('students as s', 's.id', '=', 'i.student_id')->leftJoin('personnel as p', 'p.id', '=', 'i.personnel_id')
            ->whereBetween('i.occurred_at', ["{$first} 00:00:00", "{$last} 23:59:59"])->get(['i.id', 's.lrn', 'p.staff_number'])
            ->keyBy(fn (object $r): string => (string) Row::int($r, 'id'));

        return array_map(function (array $incident) use ($numbers, $fullLrn): array {
            $n = $numbers->get(Row::text($incident['id']));
            $lrn = $n === null ? null : Row::str($n, 'lrn');
            $incident['patient'] = $lrn !== null
                ? ['kind' => 'student', 'number' => $fullLrn ? $lrn : Lrn::mask($lrn)]
                : ['kind' => 'personnel', 'number' => $n === null ? '' : (string) Row::str($n, 'staff_number')];

            return $incident;
        }, $this->incidents->list($first, $last, false));
    }

    /**
     * The monthly inventory sheet (ADR-050, D17), wound back from today's stock over later movements.
     *
     * @return list<array{itemId: string, itemName: string, unit: string, newPurchase: int, totalAvailable: int, endingInventory: int}>
     */
    private function inventory(string $first, string $last): array
    {
        $out = [];
        foreach (DB::table('inventory_items')->orderBy('name')->get() as $item) {
            $id = (int) Row::int($item, 'id');
            $now = (int) DB::table('inventory_batches')->where('item_id', $id)->sum('quantity');
            $moves = fn (): Builder => DB::table('inventory_transactions')->where('item_id', $id);
            $month = ["{$first} 00:00:00", "{$last} 23:59:59"];
            $ending = $now - (int) Row::toInt($moves()->where('occurred_at', '>', "{$last} 23:59:59")->sum('quantity_delta'));
            $purchase = (int) Row::toInt($moves()->whereBetween('occurred_at', $month)->where('type', 'restock')->sum('quantity_delta'));
            $start = $ending - (int) Row::toInt($moves()->whereBetween('occurred_at', $month)->sum('quantity_delta'));
            $out[] = ['itemId' => (string) $id, 'itemName' => (string) Row::str($item, 'name'), 'unit' => (string) Row::str($item, 'unit'),
                'newPurchase' => $purchase, 'totalAvailable' => $start + $purchase, 'endingInventory' => $ending];
        }

        return $out;
    }
}
