<?php

declare(strict_types=1);

namespace App\Modules\InventoryTracker\Services;

use App\Shared\AuditLog\AuditAction;
use App\Shared\AuditLog\AuditEvent;
use App\Shared\AuditLog\AuditLogger;
use App\Shared\AuditLog\AuditTarget;
use App\Shared\AuditLog\DatabaseAuditLogger;
use App\Shared\Http\BusinessRuleViolation;
use App\Shared\Settings\SettingsService;
use App\Shared\Support\ClinicTime;
use App\Shared\Support\Lrn;
use App\Shared\Support\Row;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Inventory (Module 8): items, their derived status, history and movements, and the Dispense,
 * Restock and Adjust actions. Stock moves only through `StockService` (ADR-018); every action takes
 * the item's batch rows under lock first (ERD section 9).
 */
final class InventoryService
{
    public const ADJUSTMENT_LABELS = ['visit_edited' => 'Visit edited', 'expired_disposed' => 'Expired - disposed', 'damaged_spilled' => 'Damaged or spilled', 'miscount_correction' => 'Miscount correction', 'other' => 'Other'];

    private const PAST_EXPIRY = "The expiration date can't be in the past.";

    public function __construct(private readonly StockService $stock, private readonly AuditLogger $audit, private readonly SettingsService $settings) {}

    /** @return list<array<string, mixed>> `InventoryItemView[]` */
    public function list(string $search, string $category, bool $hasExpiredStock, string $attention): array
    {
        $views = $this->views(DB::table('inventory_items')->whereNull('archived_at')
            ->when($search !== '', fn ($q) => $q->where('name', 'like', '%'.addcslashes($search, '%_\\').'%'))
            ->when($category !== '', fn ($q) => $q->where('category', $category))->orderBy('name')->get()->values()->all());

        return array_values(array_filter($views, function (array $v) use ($hasExpiredStock, $attention): bool {
            /** @var list<string> $flags */
            $flags = $v['flags'];

            return (! $hasExpiredStock || $v['expiredStock'] > 0)
                && ($attention === '' || ($attention === 'low_stock' ? in_array('low_stock', $flags, true) : array_diff($flags, ['low_stock']) !== []));
        }));
    }

    /** @return array<string, mixed> `InventoryItemView` */
    public function find(int $id): array
    {
        $row = DB::table('inventory_items')->where('id', $id)->first();
        abort_if($row === null, 404);

        return $this->views([$row])[0];
    }

    /**
     * Adds an item with its first batch, or edits one's details. Stock and expiry change only through
     * the stock actions (ADR-018); `usedFor` left out of an edit keeps the tags (ADR-071).
     *
     * @param  array<string, mixed>  $in
     * @return array<string, mixed>
     */
    public function save(array $in, ?int $id, int $userId): array
    {
        $existing = $id === null ? null : $this->find($id);
        $name = trim((string) preg_replace('/\s+/u', ' ', Row::text($in['name'] ?? '')));
        if ($name === '' || mb_strlen($name) > 120) {
            throw ValidationException::withMessages(['name' => 'Enter the item name (at most 120 characters).']);
        }
        $category = Row::text($in['category'] ?? '');
        if (! in_array($category, ['medicine', 'supply'], true)) {
            throw ValidationException::withMessages(['category' => 'Choose medicine or supply.']);
        }
        $unit = trim(Row::text($in['unit'] ?? ''));
        if ($unit === '' || mb_strlen($unit) > 30) {
            throw ValidationException::withMessages(['unit' => 'Enter the unit (at most 30 characters).']);
        }
        $threshold = $in['lowStockThreshold'] ?? 0;
        if (! is_int($threshold) || $threshold < 0) {
            throw ValidationException::withMessages(['lowStockThreshold' => 'The low-stock threshold must be a whole number of 0 or more.']);
        }
        $brand = $in['brand'] ?? null;
        if ($brand !== null && ! in_array($brand, ['generic', 'branded'], true)) {
            throw ValidationException::withMessages(['brand' => 'Choose generic or branded.']);
        }
        $words = self::words($in['avoidIfAllergicTo'] ?? []);
        $usedFor = array_key_exists('usedFor', $in) || $existing === null ? $this->usedFor($in['usedFor'] ?? []) : null;
        if (DB::table('inventory_items')->whereNull('archived_at')->whereRaw('LOWER(TRIM(name)) = ?', [mb_strtolower($name)])->when($id !== null, fn ($q) => $q->where('id', '!=', $id))->exists()) {
            throw new BusinessRuleViolation('duplicate_item_name', 'An item with this name already exists. Restock it instead.');
        }
        $first = null;
        if ($existing === null) {
            $stock = $in['currentStock'] ?? null;
            if (! is_int($stock) || $stock < 0) {
                throw ValidationException::withMessages(['currentStock' => 'The current stock must be a whole number of 0 or more.']);
            }
            $first = ['quantity' => $stock, 'expiration_date' => $this->expiry($in, 'item')];
        }

        $savedId = DB::transaction(function () use ($existing, $id, $name, $category, $unit, $threshold, $brand, $words, $usedFor, $first, $userId): int {
            $now = CarbonImmutable::now();
            $row = ['name' => $name, 'category' => $category, 'unit' => $unit, 'low_stock_threshold' => $threshold, 'brand' => $brand];
            if ($id === null) {
                $id = DB::table('inventory_items')->insertGetId($row);
                DB::table('inventory_batches')->insert((array) $first + ['item_id' => $id, 'received_date' => ClinicTime::today()]);
            } else {
                DB::table('inventory_items')->where('id', $id)->update($row);
            }
            DB::table('inventory_item_allergy_words')->where('item_id', $id)->delete();
            foreach ($words as $word) {
                DB::table('inventory_item_allergy_words')->insert(['item_id' => $id, 'word' => $word]);
            }
            if ($usedFor !== null) {
                DB::table('inventory_item_symptom_tags')->where('item_id', $id)->delete();
                foreach ($usedFor as $type) {
                    DB::table('inventory_item_symptom_tags')->insert(['item_id' => $id, 'complaint_type_id' => $type]);
                }
            }
            $summary = null;
            if ($existing !== null) {
                $after = $this->find($id);
                $summary = DatabaseAuditLogger::changedSummary(array_values(array_filter(
                    ['name', 'category', 'unit', 'lowStockThreshold', 'brand', 'avoidIfAllergicTo', 'usedFor'],
                    fn (string $f): bool => json_encode($existing[$f]) !== json_encode($after[$f]),
                )));
            }
            $this->audit->record(new AuditEvent(
                actorId: (string) $userId, actorRole: 'staff', action: $existing === null ? AuditAction::Create : AuditAction::Update,
                targetType: AuditTarget::Inventory, targetId: (string) $id, targetLabel: null, at: $now, summary: $summary,
            ));

            return $id;
        });

        return $this->find($savedId);
    }

    /**
     * @param  array{studentId: int|null, personnelId: int|null, visitId: int|null}  $link
     * @return array{item: array<string, mixed>, remainingStock: int, belowZero: bool}
     */
    public function dispense(int $id, int $quantity, array $link, int $userId): array
    {
        $this->find($id);
        self::quantity($quantity);
        if ($link['studentId'] !== null && $link['personnelId'] !== null) {
            throw new BusinessRuleViolation('stock_rule', 'Choose one patient: a student or a staff member.');
        }
        if ($link['studentId'] !== null && ! DB::table('students')->where('id', $link['studentId'])->exists()) {
            throw new BusinessRuleViolation('stock_rule', 'This student record was not found.');
        }
        if ($link['personnelId'] !== null && ! DB::table('personnel')->where('id', $link['personnelId'])->exists()) {
            throw new BusinessRuleViolation('stock_rule', 'This staff record was not found.');
        }
        if ($link['visitId'] !== null) {
            $visit = DB::table('visits')->where('id', $link['visitId'])->first();
            if ($visit === null) {
                throw new BusinessRuleViolation('stock_rule', 'That visit no longer exists.');
            }
            // A movement linked to a visit names its patient (`chk_txn_link_has_patient`).
            $link['studentId'] ??= Row::int($visit, 'student_id');
            $link['personnelId'] ??= Row::int($visit, 'personnel_id');
        }
        DB::transaction(fn () => $this->stock->dispense($id, $quantity, $link, $userId));
        $view = $this->find($id);

        return ['item' => $view, 'remainingStock' => (int) Row::toInt($view['currentStock']), 'belowZero' => $view['belowZero'] === true];
    }

    /**
     * @param  array<string, mixed>  $in
     * @return array<string, mixed>
     */
    public function restock(int $id, array $in, int $userId): array
    {
        $this->find($id);
        $quantity = is_int($in['quantity'] ?? null) ? $in['quantity'] : 0;
        self::quantity($quantity);
        $expiry = $this->expiry($in, 'batch');
        DB::transaction(fn () => $this->stock->restock($id, $quantity, $expiry, $userId));

        return $this->find($id);
    }

    /**
     * Adjust Stock: disposal, damage, or a recount of one batch; it never goes below 0. The note is
     * optional for every reason (ADR-068); a large write-off is marked in the audit (ADR-061).
     *
     * @param  array<string, mixed>  $in
     * @return array<string, mixed>
     */
    public function adjust(int $id, array $in, int $userId): array
    {
        $this->find($id);
        $reason = Row::text($in['reason'] ?? '');
        if (! array_key_exists($reason, self::ADJUSTMENT_LABELS) || $reason === 'visit_edited') {
            throw new BusinessRuleViolation('stock_rule', 'Choose a reason for the adjustment.');
        }
        $note = mb_substr(trim(Row::text($in['note'] ?? '')), 0, 255) ?: null;
        DB::transaction(function () use ($id, $in, $reason, $note, $userId): void {
            $batches = DB::table('inventory_batches')->where('item_id', $id)->orderBy('id')->lockForUpdate()->get();
            $wanted = Row::toInt($in['batchId'] ?? null);
            $batch = $batches->first(fn (object $b): bool => Row::int($b, 'id') === $wanted) ?? $batches->first();
            if ($batch === null) {
                throw new BusinessRuleViolation('stock_rule', 'This item has no batch to adjust.');
            }
            $current = (int) Row::int($batch, 'quantity');
            $counted = $in['countedQuantity'] ?? null;
            if ($counted !== null && (! is_int($counted) || $counted < 0)) {
                throw new BusinessRuleViolation('stock_rule', 'The counted quantity must be a whole number of 0 or more.');
            }
            $change = is_int($counted) ? $counted - $current : ($in['change'] ?? 0);
            if (! is_int($change) || $change === 0) {
                throw new BusinessRuleViolation('stock_rule', 'Enter a whole-number change other than 0.');
            }
            if ($current + $change < 0) {
                $unit = Row::text(DB::table('inventory_items')->where('id', $id)->value('unit'));
                throw new BusinessRuleViolation('stock_rule', "Stock can't go below 0. {$current} {$unit} in this batch.");
            }
            $expiry = Row::str($batch, 'expiration_date');
            if ($reason === 'expired_disposed' && ! ($expiry !== null && $expiry < ClinicTime::today())) {
                throw new BusinessRuleViolation('stock_rule', 'Choose an expired batch to record expired stock disposal.');
            }
            $onHand = (int) $batches->sum(fn (object $b): int => (int) Row::int($b, 'quantity'));
            $large = $change < 0 && ($onHand + $change <= 0 || -$change * 100 >= $onHand * $this->settings->int('large_write_off_percent'));
            $this->stock->adjust($id, (int) Row::int($batch, 'id'), $change, $reason, $note, self::ADJUSTMENT_LABELS[$reason].($large ? ' · Large write-off' : ''), $userId);
        });

        return $this->find($id);
    }

    /** @return list<array<string, mixed>> `InventoryHistoryRow[]`, newest first */
    public function history(int $id): array
    {
        $this->find($id);
        $allocations = $this->allocations(array_values(DB::table('inventory_transactions')->where('item_id', $id)->pluck('id')->all()));

        return array_values(DB::table('inventory_transactions')->where('item_id', $id)->orderByDesc('occurred_at')->orderByDesc('id')->get()
            ->map(fn (object $t): array => [
                'id' => (string) Row::int($t, 'id'), 'type' => (string) Row::str($t, 'type'), 'quantity' => self::shownQuantity($t),
                'timestamp' => ClinicTime::iso(CarbonImmutable::parse((string) Row::str($t, 'occurred_at'))),
                'reason' => Row::str($t, 'reason'), 'note' => Row::str($t, 'note'),
                'batchAllocations' => array_map(fn (array $a): array => ['batchId' => $a['batchId'], 'quantity' => $a['quantity']], $allocations[(int) Row::int($t, 'id')] ?? []),
            ])->all());
    }

    /** @return list<array<string, mixed>> `InventoryMovementRow[]`, newest first; the patient is a masked number */
    public function movements(?string $from, ?string $to, ?int $itemId, string $type): array
    {
        $rows = DB::table('inventory_transactions as t')->leftJoin('inventory_items as i', 'i.id', '=', 't.item_id')
            ->leftJoin('students as s', 's.id', '=', 't.student_id')->leftJoin('personnel as p', 'p.id', '=', 't.personnel_id')->leftJoin('users as u', 'u.id', '=', 't.user_id')
            ->when($from !== null, fn ($q) => $q->where('t.occurred_at', '>=', "{$from} 00:00:00"))->when($to !== null, fn ($q) => $q->where('t.occurred_at', '<=', "{$to} 23:59:59"))
            ->when($itemId !== null, fn ($q) => $q->where('t.item_id', $itemId))->when($type !== '', fn ($q) => $q->where('t.type', $type))
            ->orderByDesc('t.occurred_at')->orderByDesc('t.id')->get(['t.*', 'i.name as item_name', 'i.unit', 's.lrn', 'p.staff_number', 'u.name as user_name']);
        $allocations = $this->allocations($rows->map(fn (object $t): int => (int) Row::int($t, 'id'))->all());

        return array_values($rows->map(fn (object $t): array => [
            'id' => (string) Row::int($t, 'id'), 'timestamp' => ClinicTime::iso(CarbonImmutable::parse((string) Row::str($t, 'occurred_at'))),
            'itemId' => (string) Row::int($t, 'item_id'), 'itemName' => Row::str($t, 'item_name') ?? 'Unknown item', 'unit' => Row::str($t, 'unit') ?? '',
            'type' => (string) Row::str($t, 'type'), 'reason' => Row::str($t, 'reason'), 'change' => (int) Row::int($t, 'quantity_delta'),
            'batches' => array_map(fn (array $a): array => ['expirationDate' => $a['expirationDate'], 'quantity' => abs($a['quantity'])], $allocations[(int) Row::int($t, 'id')] ?? []),
            'patientNumber' => ($lrn = Row::str($t, 'lrn')) !== null ? Lrn::mask($lrn) : Row::str($t, 'staff_number'),
            'by' => Row::str($t, 'user_name') ?? 'Unknown user',
        ])->all());
    }

    // ---- helpers -------------------------------------------------------------------------

    /**
     * Items with their batches, tags and derived status (`inventoryStatus`): low stock is at or
     * below the threshold; expiry flags are independent of it.
     *
     * @param  array<int, object>  $rows
     * @return list<array<string, mixed>>
     */
    private function views(array $rows): array
    {
        $ids = array_values(array_map(fn (object $r): int => (int) Row::int($r, 'id'), $rows));
        $in = $ids === [] ? [0] : $ids;
        $batches = DB::table('inventory_batches')->whereIn('item_id', $in)->orderBy('id')->get();
        $words = DB::table('inventory_item_allergy_words')->whereIn('item_id', $in)->orderBy('id')->get();
        $tags = DB::table('inventory_item_symptom_tags as t')->join('complaint_types as c', 'c.id', '=', 't.complaint_type_id')
            ->whereIn('t.item_id', $in)->orderBy('c.sort_order')->orderBy('c.id')->get(['t.item_id', 'c.id']);
        $today = ClinicTime::today();
        $warn = $this->settings->int('expiry_warning_days');
        $out = [];
        foreach ($rows as $r) {
            $id = (int) Row::int($r, 'id');
            $mine = array_values(array_filter($batches->all(), fn (object $b): bool => Row::int($b, 'item_id') === $id));
            $list = array_map(fn (object $b): array => [
                'id' => (string) Row::int($b, 'id'), 'quantity' => (int) Row::int($b, 'quantity'),
                'expirationDate' => Row::str($b, 'expiration_date'), 'receivedDate' => (string) Row::str($b, 'received_date'),
            ], $mine);
            $expired = array_filter($list, fn (array $b): bool => $b['quantity'] > 0 && $b['expirationDate'] !== null && $b['expirationDate'] < $today);
            $usable = array_filter($list, fn (array $b): bool => ! ($b['expirationDate'] !== null && $b['expirationDate'] < $today));
            $dated = array_filter(array_map(fn (array $b): ?string => $b['quantity'] > 0 ? $b['expirationDate'] : null, $usable));
            sort($dated);
            $expiredDates = array_map(fn (array $b): string => (string) $b['expirationDate'], $expired);
            sort($expiredDates);
            $expiry = $dated[0] ?? null;
            $days = $expiry === null ? null : (int) CarbonImmutable::parse($today)->diffInDays(CarbonImmutable::parse($expiry), false);
            $current = array_sum(array_column($usable, 'quantity'));
            $expiredStock = array_sum(array_column($expired, 'quantity'));
            $threshold = (int) Row::int($r, 'low_stock_threshold');
            $flags = [];
            if ($current <= $threshold) {
                $flags[] = 'low_stock';
            }
            if ($expiredStock > 0) {
                $flags[] = 'expired';
            } elseif ($days !== null && $days <= $warn) {
                $flags[] = 'nearing_expiration';
            }
            $out[] = [
                'id' => (string) $id, 'name' => (string) Row::str($r, 'name'), 'category' => (string) Row::str($r, 'category'), 'unit' => (string) Row::str($r, 'unit'),
                'batches' => $list, 'lowStockThreshold' => $threshold, 'brand' => Row::str($r, 'brand'),
                'avoidIfAllergicTo' => array_values(array_map(fn (object $w): string => (string) Row::str($w, 'word'), array_filter($words->all(), fn (object $w): bool => Row::int($w, 'item_id') === $id))),
                'usedFor' => array_values(array_map(fn (object $t): string => (string) Row::int($t, 'id'), array_filter($tags->all(), fn (object $t): bool => Row::int($t, 'item_id') === $id))),
                'flags' => $flags, 'currentStock' => $current, 'expiredStock' => $expiredStock, 'totalOnHand' => array_sum(array_column($list, 'quantity')),
                'expirationDate' => $expiry, 'oldestExpiredDate' => $expiredDates[0] ?? null, 'daysUntilExpiry' => $days,
                'belowZero' => array_filter($list, fn (array $b): bool => $b['quantity'] < 0) !== [],
            ];
        }

        return $out;
    }

    /**
     * @param  array<int, mixed>  $txnIds
     * @return array<int, list<array{batchId: string, quantity: int, expirationDate: string|null}>>
     */
    private function allocations(array $txnIds): array
    {
        $out = [];
        $rows = DB::table('inventory_transaction_batches as tb')->join('inventory_batches as b', 'b.id', '=', 'tb.batch_id')
            ->whereIn('tb.transaction_id', $txnIds === [] ? [0] : $txnIds)->orderBy('tb.id')->get(['tb.transaction_id', 'tb.batch_id', 'tb.quantity', 'b.expiration_date']);
        foreach ($rows as $a) {
            $out[(int) Row::int($a, 'transaction_id')][] = ['batchId' => (string) Row::int($a, 'batch_id'), 'quantity' => (int) Row::int($a, 'quantity'), 'expirationDate' => Row::str($a, 'expiration_date')];
        }

        return $out;
    }

    /** A dispense shows the amount taken; other movements their signed change (the mock's history rows). */
    private static function shownQuantity(object $t): int
    {
        $delta = (int) Row::int($t, 'quantity_delta');

        return Row::str($t, 'type') === 'dispense' ? -$delta : $delta;
    }

    /**
     * ADR-035: a date, or an explicit "no expiration"; never a past date.
     *
     * @param  array<string, mixed>  $in
     */
    private function expiry(array $in, string $what): ?string
    {
        $date = $in['expirationDate'] ?? null;
        $none = ($in['noExpirationConfirmed'] ?? false) === true;
        if ($date === null || $date === '') {
            if (! $none) {
                throw new BusinessRuleViolation('stock_rule', "Choose an expiration date, or confirm this {$what} has no expiration date.");
            }

            return null;
        }
        if ($none) {
            throw new BusinessRuleViolation('stock_rule', "Choose either an expiration date or no expiration date for this {$what}.");
        }
        $d = is_string($date) ? \DateTimeImmutable::createFromFormat('!Y-m-d', $date) : false;
        if ($d === false || $d->format('Y-m-d') !== $date) {
            throw ValidationException::withMessages(['expirationDate' => 'Enter a real expiration date.']);
        }
        if ($date < ClinicTime::today()) {
            throw new BusinessRuleViolation('stock_rule', self::PAST_EXPIRY);
        }

        return $date;
    }

    private static function quantity(int $q): void
    {
        if ($q < 1) {
            throw new BusinessRuleViolation('stock_rule', 'Quantities must be whole numbers of at least 1.');
        }
    }

    /** @return list<string> distinct words, first spelling kept, at most 60 characters each */
    private static function words(mixed $values): array
    {
        $out = [];
        foreach (is_array($values) ? $values : [] as $v) {
            $w = trim(Row::text($v));
            if ($w !== '' && ! in_array(mb_strtolower($w), array_map(mb_strtolower(...), $out), true)) {
                if (mb_strlen($w) > 60) {
                    throw ValidationException::withMessages(['avoidIfAllergicTo' => 'Each allergy word can be at most 60 characters.']);
                }
                $out[] = $w;
            }
        }

        return $out;
    }

    /**
     * ADR-071 and the contract: complaint-type ids of the visit symptom options, at least one, no repeats.
     *
     * @return list<int>
     */
    private function usedFor(mixed $values): array
    {
        $ids = array_map(fn (mixed $v): ?int => Row::toInt($v), is_array($values) ? $values : []);
        if ($ids === []) {
            throw ValidationException::withMessages(['usedFor' => 'Choose at least one symptom this item is commonly used for.']);
        }
        $valid = DB::table('complaint_types')->where('used_in_visits', 1)->whereIn('id', array_filter($ids))->pluck('id')->map(fn (mixed $v): int => (int) Row::toInt($v))->all();
        if (in_array(null, $ids, true) || count(array_unique($ids)) !== count($ids) || count($valid) !== count($ids)) {
            throw ValidationException::withMessages(['usedFor' => 'Choose the symptoms from the list, each once.']);
        }

        return array_values(array_map(fn (?int $v): int => (int) $v, $ids));
    }
}
