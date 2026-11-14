<?php

declare(strict_types=1);

use App\Modules\UserManagement\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->travelTo('2026-11-10 09:00:00');
    $this->staff = User::factory()->create();
    $this->headache = DB::table('complaint_types')->insertGetId(['label' => 'Headache Test', 'sort_order' => 1]);
    $this->fever = DB::table('complaint_types')->insertGetId(['label' => 'Fever Test', 'sort_order' => 0]);
    signIn($this->staff);
});

function itemInput(array $over = []): array
{
    return $over + ['name' => 'Paracetamol 500 mg', 'category' => 'medicine', 'unit' => 'tablet', 'lowStockThreshold' => 5, 'brand' => 'generic',
        'avoidIfAllergicTo' => ['paracetamol', 'Paracetamol'], 'usedFor' => [(string) test()->headache, (string) test()->fever],
        'currentStock' => 20, 'expirationDate' => '2027-01-01'];
}

it('adds an item with its first batch, tags in the option order, and audits it', function () {
    $item = $this->postJson('/api/inventory', itemInput())->assertCreated()->json('data');

    expect($item['currentStock'])->toBe(20)->and($item['batches'][0]['expirationDate'])->toBe('2027-01-01')
        ->and($item['avoidIfAllergicTo'])->toBe(['paracetamol'])->and($item['usedFor'])->toBe([(string) $this->fever, (string) $this->headache])
        ->and($item['flags'])->toBe([])->and(DB::table('audit_logs')->value('target_type'))->toBe('inventory');
});

it('refuses bad items with the mock messages', function (Closure $over, int $status, string $message) {
    $this->postJson('/api/inventory', itemInput($over()))->assertStatus($status)->assertJsonPath('message', $message);
})->with([
    'blank expiry' => [fn () => ['expirationDate' => null], 409, 'Choose an expiration date, or confirm this item has no expiration date.'],
    'both' => [fn () => ['noExpirationConfirmed' => true], 409, 'Choose either an expiration date or no expiration date for this item.'],
    'past expiry' => [fn () => ['expirationDate' => '2026-11-09'], 409, "The expiration date can't be in the past."],
    'negative stock' => [fn () => ['currentStock' => -1], 422, 'The current stock must be a whole number of 0 or more.'],
    'no symptoms' => [fn () => ['usedFor' => []], 422, 'Choose at least one symptom this item is commonly used for.'],
    'repeat symptom' => [fn () => ['usedFor' => [(string) test()->fever, (string) test()->fever]], 422, 'Choose the symptoms from the list, each once.'],
]);

it('refuses a second item of the same name, and keeps tags when an edit leaves them out', function () {
    $id = $this->postJson('/api/inventory', itemInput())->json('data.id');
    $this->postJson('/api/inventory', itemInput(['name' => ' paracetamol 500 MG ']))->assertConflict()->assertJsonPath('rule', 'duplicate_item_name');

    $in = itemInput(['lowStockThreshold' => 25, 'currentStock' => 999]);
    unset($in['usedFor']);
    $this->putJson("/api/inventory/{$id}", $in)->assertOk()->assertJsonPath('data.currentStock', 20)->assertJsonPath('data.flags', ['low_stock'])
        ->assertJsonPath('data.usedFor', [(string) $this->fever, (string) $this->headache]);
    expect(DB::table('audit_logs')->where('action_type', 'update')->value('summary'))->toBe('Updated low-stock threshold');
});

it('restocks a new batch, dispenses earliest expiry first, and lists the movements with masked patients', function () {
    $id = $this->postJson('/api/inventory', itemInput(['currentStock' => 3]))->json('data.id');
    $this->postJson("/api/inventory/{$id}/restock", ['quantity' => 10, 'expirationDate' => '2026-12-01'])->assertOk()->assertJsonPath('data.expirationDate', '2026-12-01')
        ->assertJsonPath('data.flags', ['nearing_expiration']); // 21 days, inside the 30-day warning
    $student = DB::table('students')->insertGetId(['lrn' => '100000000001', 'first_name' => 'Ana', 'last_name' => 'Cruz']);

    $res = $this->postJson("/api/inventory/{$id}/dispense", ['quantity' => 12, 'studentId' => (string) $student])->assertOk();
    expect($res->json('data.remainingStock'))->toBe(1)->and($res->json('data.belowZero'))->toBeFalse();

    $moves = $this->getJson('/api/inventory/movements')->assertOk()->json('data');
    expect($moves[0]['type'])->toBe('dispense')->and($moves[0]['change'])->toBe(-12)->and($moves[0]['patientNumber'])->toBe('●●●●●●●●0001')
        ->and($moves[0]['batches'])->toBe([['expirationDate' => '2026-12-01', 'quantity' => 10], ['expirationDate' => '2027-01-01', 'quantity' => 2]]);
    $history = $this->getJson("/api/inventory/{$id}/history")->json('data');
    expect(array_column($history, 'type'))->toBe(['dispense', 'restock'])->and($history[0]['quantity'])->toBe(12);
    $this->postJson("/api/inventory/{$id}/dispense", ['quantity' => 1, 'studentId' => (string) $student, 'personnelId' => '1'])->assertConflict()
        ->assertJsonPath('message', 'Choose one patient: a student or a staff member.');
});

it('adjusts one batch, never below 0, marking a large write-off; expired disposal needs an expired batch', function () {
    $id = $this->postJson('/api/inventory', itemInput(['currentStock' => 10]))->json('data.id');
    $batch = DB::table('inventory_batches')->where('item_id', $id)->value('id');

    $this->postJson("/api/inventory/{$id}/adjust", ['batchId' => $batch, 'change' => -11, 'reason' => 'damaged_spilled'])->assertConflict()
        ->assertJsonPath('message', "Stock can't go below 0. 10 tablet in this batch.");
    $this->postJson("/api/inventory/{$id}/adjust", ['batchId' => $batch, 'change' => -1, 'reason' => 'visit_edited'])->assertConflict()->assertJsonPath('message', 'Choose a reason for the adjustment.');
    $this->postJson("/api/inventory/{$id}/adjust", ['batchId' => $batch, 'change' => -1, 'reason' => 'expired_disposed'])->assertConflict()
        ->assertJsonPath('message', 'Choose an expired batch to record expired stock disposal.');
    $this->postJson("/api/inventory/{$id}/adjust", ['batchId' => $batch, 'countedQuantity' => 7, 'reason' => 'miscount_correction'])->assertOk()->assertJsonPath('data.currentStock', 7);
    $this->postJson("/api/inventory/{$id}/adjust", ['batchId' => $batch, 'change' => -2, 'reason' => 'other'])->assertOk(); // no note needed (ADR-068)

    expect(DB::table('audit_logs')->where('target_type', 'inventory-adjustment')->orderBy('id')->pluck('summary')->all())
        ->toBe(['Miscount correction · Large write-off', 'Other · Large write-off']);
});

it('flags expired and nearing-expiration stock separately from low stock', function () {
    $id = $this->postJson('/api/inventory', itemInput(['currentStock' => 2, 'expirationDate' => '2026-11-20']))->json('data.id');
    DB::table('inventory_batches')->insert(['item_id' => $id, 'quantity' => 4, 'expiration_date' => '2026-10-01', 'received_date' => '2026-01-01']);

    $item = $this->getJson("/api/inventory/{$id}")->json('data');
    expect($item['flags'])->toBe(['low_stock', 'expired'])->and($item['expiredStock'])->toBe(4)->and($item['daysUntilExpiry'])->toBe(10);
    $this->getJson('/api/inventory?hasExpiredStock=1')->assertJsonCount(1, 'data');
    $this->getJson('/api/inventory?attention=expiry')->assertJsonCount(1, 'data');
});

it('keeps inventory from the Admin', function () {
    $this->app['auth']->forgetGuards();
    signIn(User::factory()->admin()->create());
    $this->getJson('/api/inventory')->assertForbidden();
});
