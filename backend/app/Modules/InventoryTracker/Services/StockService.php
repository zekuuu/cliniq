<?php

declare(strict_types=1);

namespace App\Modules\InventoryTracker\Services;

use App\Shared\AuditLog\AuditAction;
use App\Shared\AuditLog\AuditEvent;
use App\Shared\AuditLog\AuditLogger;
use App\Shared\AuditLog\AuditTarget;
use App\Shared\Http\BusinessRuleViolation;
use App\Shared\Support\ClinicTime;
use App\Shared\Support\Row;
use Carbon\CarbonImmutable;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

/**
 * Medicines and supplies given (ADR-018; the mock's `applyItemLines`). The Inventory module owns the
 * stock tables (ERD M-1); visits and incidents call this service inside their own transaction. The
 * earliest-expiring usable batch is taken first, under row locks; a shortfall stays a visible
 * negative on the last usable batch and is reported in `belowZero`. A new record dispenses; an edit
 * writes `visit_edited` adjustments and never rewrites a dispense.
 *
 * @phpstan-type LineInput array{itemId: int, quantity: int, instructions: string|null}
 * @phpstan-type Link array{studentId: int|null, personnelId: int|null, visitId: int|null, incidentId: int|null}
 */
final class StockService
{
    public const INSTRUCTIONS_MAX = 120;

    public function __construct(private readonly AuditLogger $audit) {}

    /**
     * Validates every line first, then moves stock for each changed item and saves the lines.
     *
     * @param  Link  $link
     * @param  list<LineInput>  $next
     * @return list<string> the names of changed items now below zero
     */
    public function apply(array $link, array $next, string $mode, int $userId, string $role): array
    {
        $seen = [];
        foreach ($next as $line) {
            if (isset($seen[$line['itemId']])) {
                throw new BusinessRuleViolation('stock_rule', 'Each item can appear on only one line.');
            }
            $seen[$line['itemId']] = true;
            if ($line['quantity'] < 1) {
                throw new BusinessRuleViolation('stock_rule', 'Quantities must be whole numbers of at least 1.');
            }
            if (mb_strlen(trim((string) $line['instructions'])) > self::INSTRUCTIONS_MAX) {
                throw new BusinessRuleViolation('stock_rule', 'Instructions can be at most '.self::INSTRUCTIONS_MAX.' characters.');
            }
        }
        $column = $link['visitId'] !== null ? 'visit_id' : 'incident_id';
        $owner = $link['visitId'] ?? $link['incidentId'];
        $before = DB::table('treatment_item_lines')->where($column, $owner)->get()->keyBy(fn (object $l): int => (int) Row::int($l, 'item_id'));
        $old = $before->map(fn (object $l): int => (int) Row::int($l, 'quantity'))->all();
        $new = array_column($next, 'quantity', 'itemId');
        $changes = [];
        foreach (array_unique([...array_keys($old), ...array_keys($new)]) as $itemId) {
            $delta = ($new[$itemId] ?? 0) - ($old[$itemId] ?? 0);
            if ($delta !== 0) {
                $changes[$itemId] = $delta;
            }
        }
        ksort($changes); // lock items in one order, so two saves never deadlock
        $items = DB::table('inventory_items')->whereIn('id', array_keys($changes))->get()->keyBy(fn (object $i): int => (int) Row::int($i, 'id'));
        foreach ($changes as $itemId => $delta) {
            $item = $items->get($itemId);
            if ($item === null || ($delta > 0 && Row::str($item, 'archived_at') !== null)) {
                throw new BusinessRuleViolation('stock_rule', 'One of the items no longer exists in inventory.');
            }
        }

        $now = CarbonImmutable::now();
        $belowZero = [];
        foreach ($changes as $itemId => $delta) {
            $item = $items->get($itemId);
            $name = (string) ($item === null ? '' : Row::str($item, 'name'));
            $moves = $delta > 0 ? $this->take($itemId, $name, $delta) : $this->giveBack($itemId, $column, (int) $owner, -$delta);
            foreach ($moves as $batchId => $change) {
                DB::table('inventory_batches')->where('id', $batchId)->increment('quantity', $change);
            }
            $stock = (int) DB::table('inventory_batches')->where('item_id', $itemId)->sum('quantity');
            $txn = DB::table('inventory_transactions')->insertGetId([
                'item_id' => $itemId, 'type' => $mode === 'dispense' ? 'dispense' : 'adjustment', 'quantity_delta' => -$delta,
                'stock_after' => $stock, 'occurred_at' => $now, 'user_id' => $userId,
                'student_id' => $link['studentId'], 'personnel_id' => $link['personnelId'], 'visit_id' => $link['visitId'], 'incident_id' => $link['incidentId'],
                'reason' => $mode === 'dispense' ? null : 'visit_edited',
            ]);
            foreach ($moves as $batchId => $change) {
                DB::table('inventory_transaction_batches')->insert(['transaction_id' => $txn, 'batch_id' => $batchId, 'quantity' => $change]);
            }
            $this->audit->record(new AuditEvent(
                actorId: (string) $userId, actorRole: $role, action: AuditAction::Submit,
                targetType: $mode === 'dispense' ? AuditTarget::InventoryDispensation : AuditTarget::InventoryAdjustment,
                targetId: (string) $txn, targetLabel: null, at: $now, summary: $mode === 'dispense' ? null : 'Visit edited',
            ));
            if (DB::table('inventory_batches')->where('item_id', $itemId)->where('quantity', '<', 0)->exists()) {
                $belowZero[] = $name;
            }
        }

        $this->saveLines($column, (int) $owner, $next, $before->all(), $items->all());

        return $belowZero;
    }

    /**
     * The standalone Dispense page (`dispenseInventoryItem`): below zero warns, never blocks (ADR-018).
     *
     * @param  array{studentId: int|null, personnelId: int|null, visitId: int|null}  $link
     */
    public function dispense(int $itemId, int $quantity, array $link, int $userId): void
    {
        $name = Row::text(DB::table('inventory_items')->where('id', $itemId)->value('name'));
        $this->move($itemId, 'dispense', $this->take($itemId, $name, $quantity), $link + ['incidentId' => null], null, null, $userId, AuditTarget::InventoryDispensation, null);
    }

    /** Restock adds its own batch; it never overwrites one. */
    public function restock(int $itemId, int $quantity, ?string $expirationDate, int $userId): void
    {
        $batch = DB::table('inventory_batches')->insertGetId(['item_id' => $itemId, 'quantity' => $quantity, 'expiration_date' => $expirationDate, 'received_date' => ClinicTime::today()]);
        $this->move($itemId, 'restock', [$batch => $quantity], [], null, null, $userId, AuditTarget::InventoryRestock, null, applyToBatches: false);
    }

    /** One batch's adjustment; the batch never goes below 0 (checked by the caller under the lock). */
    public function adjust(int $itemId, int $batchId, int $change, string $reason, ?string $note, string $summary, int $userId): void
    {
        $this->move($itemId, 'adjustment', [$batchId => $change], [], $reason, $note, $userId, AuditTarget::InventoryAdjustment, $summary);
    }

    /**
     * Applies batch changes and writes one transaction, its batch rows and its audit entry.
     *
     * @param  array<int, int>  $moves  batch id => stock change
     * @param  array{studentId?: int|null, personnelId?: int|null, visitId?: int|null, incidentId?: int|null}  $link
     */
    private function move(int $itemId, string $type, array $moves, array $link, ?string $reason, ?string $note, int $userId, AuditTarget $target, ?string $summary, bool $applyToBatches = true): void
    {
        $now = CarbonImmutable::now();
        if ($applyToBatches) {
            foreach ($moves as $batchId => $change) {
                DB::table('inventory_batches')->where('id', $batchId)->increment('quantity', $change);
            }
        }
        $txn = DB::table('inventory_transactions')->insertGetId([
            'item_id' => $itemId, 'type' => $type, 'quantity_delta' => array_sum($moves),
            'stock_after' => (int) DB::table('inventory_batches')->where('item_id', $itemId)->sum('quantity'), 'occurred_at' => $now, 'user_id' => $userId,
            'student_id' => $link['studentId'] ?? null, 'personnel_id' => $link['personnelId'] ?? null, 'visit_id' => $link['visitId'] ?? null, 'incident_id' => $link['incidentId'] ?? null,
            'reason' => $reason, 'note' => $note,
        ]);
        foreach ($moves as $batchId => $change) {
            DB::table('inventory_transaction_batches')->insert(['transaction_id' => $txn, 'batch_id' => $batchId, 'quantity' => $change]);
        }
        $this->audit->record(new AuditEvent(
            actorId: (string) $userId, actorRole: 'staff', action: AuditAction::Submit, targetType: $target,
            targetId: (string) $txn, targetLabel: null, at: $now, summary: $summary,
        ));
    }

    /**
     * The saved lines of many records at once, with their batch allocations read from the movements (ADR-057).
     *
     * @param  list<int>  $owners
     * @return array<int, list<array{itemId: string, itemName: string, unit: string, quantity: int, instructions: string|null, batchAllocations: list<array{batchId: string, quantity: int}>}>>
     */
    public function linesFor(string $column, array $owners): array
    {
        $net = [];
        $moves = DB::table('inventory_transaction_batches as tb')->join('inventory_transactions as t', 't.id', '=', 'tb.transaction_id')
            ->whereIn("t.{$column}", $owners === [] ? [0] : $owners)->orderBy('tb.id')->get(["t.{$column} as owner", 't.item_id', 'tb.batch_id', 'tb.quantity']);
        foreach ($moves as $m) {
            $key = Row::int($m, 'owner').'-'.Row::int($m, 'item_id');
            $batch = (string) Row::int($m, 'batch_id');
            $net[$key][$batch] = ($net[$key][$batch] ?? 0) - (int) Row::int($m, 'quantity');
        }
        $out = [];
        foreach (DB::table('treatment_item_lines')->whereIn($column, $owners === [] ? [0] : $owners)->orderBy('sort_order')->get() as $l) {
            $owner = (int) Row::int($l, $column);
            $itemId = (int) Row::int($l, 'item_id');
            $alloc = array_filter($net["{$owner}-{$itemId}"] ?? []);
            $out[$owner][] = [
                'itemId' => (string) $itemId, 'itemName' => (string) Row::str($l, 'item_name_snapshot'), 'unit' => (string) Row::str($l, 'unit_snapshot'),
                'quantity' => (int) Row::int($l, 'quantity'), 'instructions' => Row::str($l, 'instructions'),
                'batchAllocations' => array_map(fn (string|int $b, int $q): array => ['batchId' => (string) $b, 'quantity' => $q], array_keys($alloc), array_values($alloc)),
            ];
        }

        return $out;
    }

    /**
     * Earliest-expiring usable stock first, locked; a shortfall goes on the last usable batch.
     *
     * @return array<int, int> batch id => stock change (negative)
     */
    private function take(int $itemId, string $name, int $quantity): array
    {
        $batches = DB::table('inventory_batches')->where('item_id', $itemId)
            ->where(fn (Builder $q) => $q->whereNull('expiration_date')->orWhere('expiration_date', '>=', ClinicTime::today()))
            ->orderByRaw('expiration_date IS NULL, expiration_date, id')->lockForUpdate()->get();
        if ($batches->isEmpty()) {
            throw new BusinessRuleViolation('stock_rule', "{$name} has no usable batch and can't be given. Dispose of expired stock before restocking.");
        }
        $left = $quantity;
        $moves = [];
        foreach ($batches as $b) {
            $taken = min(max((int) Row::int($b, 'quantity'), 0), $left);
            if ($taken > 0) {
                $moves[(int) Row::int($b, 'id')] = -$taken;
                $left -= $taken;
            }
        }
        if ($left > 0) {
            $last = (int) Row::int($batches->last(), 'id'); // not empty: checked above
            $moves[$last] = ($moves[$last] ?? 0) - $left;
        }

        return $moves;
    }

    /**
     * Returns stock to the batches it came from, the latest allocation first.
     *
     * @return array<int, int> batch id => stock change (positive)
     */
    private function giveBack(int $itemId, string $column, int $owner, int $quantity): array
    {
        $net = [];
        $rows = DB::table('inventory_transaction_batches as tb')->join('inventory_transactions as t', 't.id', '=', 'tb.transaction_id')
            ->where("t.{$column}", $owner)->where('t.item_id', $itemId)->orderBy('tb.id')->get(['tb.batch_id', 'tb.quantity']);
        foreach ($rows as $r) {
            $batch = (int) Row::int($r, 'batch_id');
            $net[$batch] = ($net[$batch] ?? 0) - (int) Row::int($r, 'quantity');
        }
        DB::table('inventory_batches')->whereIn('id', array_keys($net))->lockForUpdate()->get(['id']);
        $left = $quantity;
        $moves = [];
        foreach (array_reverse($net, true) as $batch => $given) {
            $amount = min(max($given, 0), $left);
            if ($amount > 0) {
                $moves[$batch] = $amount;
                $left -= $amount;
            }
        }

        return $moves;
    }

    /**
     * New lines snapshot the item's name and unit; kept lines keep theirs.
     *
     * @param  list<LineInput>  $next
     * @param  array<int, object>  $before
     * @param  array<int, object>  $items
     */
    private function saveLines(string $column, int $owner, array $next, array $before, array $items): void
    {
        $keep = array_column($next, 'itemId');
        DB::table('treatment_item_lines')->where($column, $owner)->whereNotIn('item_id', $keep === [] ? [0] : $keep)->delete();
        foreach ($next as $i => $line) {
            $instructions = trim((string) $line['instructions']);
            $values = ['quantity' => $line['quantity'], 'instructions' => $instructions === '' ? null : $instructions, 'sort_order' => $i];
            if (isset($before[$line['itemId']])) {
                DB::table('treatment_item_lines')->where($column, $owner)->where('item_id', $line['itemId'])->update($values);

                continue;
            }
            $item = $items[$line['itemId']] ?? null;
            if ($item === null) {
                $item = DB::table('inventory_items')->where('id', $line['itemId'])->first();
            }
            if ($item === null) {
                throw new BusinessRuleViolation('stock_rule', 'One of the items no longer exists in inventory.');
            }
            DB::table('treatment_item_lines')->insert($values + [
                $column => $owner, 'item_id' => $line['itemId'],
                'item_name_snapshot' => (string) Row::str($item, 'name'), 'unit_snapshot' => (string) Row::str($item, 'unit'),
            ]);
        }
    }
}
