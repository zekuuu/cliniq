<?php

declare(strict_types=1);

use App\Modules\UserManagement\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->travelTo('2026-11-10 09:00:00');
    $this->staff = User::factory()->create();
    $this->student = DB::table('students')->insertGetId(['lrn' => '100000000001', 'first_name' => 'Ana', 'last_name' => 'Cruz', 'section' => 'Rizal',
        'grade_level_id' => DB::table('grade_levels')->where('name', 'Grade 7')->value('id')]);
    $this->personnel = DB::table('personnel')->insertGetId(['staff_number' => 'STF-0001', 'first_name' => 'Rosa', 'last_name' => 'Lim', 'sex' => 'female', 'type' => 'Teacher']);
    $this->item = DB::table('inventory_items')->insertGetId(['name' => 'Paracetamol 500 mg', 'category' => 'medicine', 'unit' => 'tablet']);
    $this->later = DB::table('inventory_batches')->insertGetId(['item_id' => $this->item, 'quantity' => 10, 'expiration_date' => '2027-06-01', 'received_date' => '2026-01-01']);
    $this->sooner = DB::table('inventory_batches')->insertGetId(['item_id' => $this->item, 'quantity' => 3, 'expiration_date' => '2026-12-01', 'received_date' => '2026-01-01']);
    DB::table('inventory_batches')->insert(['item_id' => $this->item, 'quantity' => 50, 'expiration_date' => '2026-11-01', 'received_date' => '2025-01-01']); // expired
    signIn($this->staff);
});

function visitInput(array $over = []): array
{
    return $over + ['studentId' => (string) test()->student, 'complaint' => '  headache ', 'treatment' => 'Rest', 'disposition' => 'returned_to_class', 'followUp' => null];
}

function batchQty(int $id): int
{
    return (int) DB::table('inventory_batches')->where('id', $id)->value('quantity');
}

it('records a visit, dispenses from the earliest-expiring usable batch, and audits each step', function () {
    $res = $this->postJson('/api/visits', visitInput(['itemsGiven' => [['itemId' => (string) $this->item, 'quantity' => 5, 'instructions' => 'After meals']]]))->assertCreated();

    $visit = $res->json('data.visit');
    expect($visit['complaint'])->toBe('Headache') // the shipped type's spelling
        ->and($visit['gradeLevelAtTime'])->toBe('Grade 7')->and($visit['sectionAtTime'])->toBe('Rizal')
        ->and($visit['dateTime'])->toBe('2026-11-10T09:00:00+08:00')->and($visit['itemsGiven'][0]['itemName'])->toBe('Paracetamol 500 mg')
        ->and($visit['itemsGiven'][0]['batchAllocations'])->toBe([['batchId' => (string) $this->sooner, 'quantity' => 3], ['batchId' => (string) $this->later, 'quantity' => 2]])
        ->and($res->json('data.belowZero'))->toBe([])
        ->and(batchQty($this->sooner))->toBe(0)->and(batchQty($this->later))->toBe(8)
        ->and(DB::table('inventory_transactions')->value('stock_after'))->toBe(58)
        ->and(DB::table('audit_logs')->orderBy('id')->pluck('target_type')->all())->toBe(['visit', 'inventory-dispensation']);
});

it('marks a visit dated more than 30 minutes back as a late entry, never in the future', function () {
    $this->postJson('/api/visits', visitInput(['dateTime' => '2026-11-10T08:29']))->assertCreated()->assertJsonPath('data.visit.lateEntry', true);
    $this->postJson('/api/visits', visitInput(['dateTime' => '2026-11-10T08:31']))->assertCreated()->assertJsonPath('data.visit.lateEntry', false);
    $this->postJson('/api/visits', visitInput(['dateTime' => '2026-11-10T09:01']))->assertUnprocessable()->assertJsonPath('message', "The visit date and time can't be in the future.");
    expect(DB::table('audit_logs')->where('target_type', 'visit')->orderBy('id')->value('summary'))->toBe('Late entry');
});

it('refuses bad visits with the mock messages', function (Closure $over, int $status, string $message) {
    $this->postJson('/api/visits', visitInput($over()))->assertStatus($status)->assertJsonPath('message', $message);
    expect(DB::table('visits')->count())->toBe(0)->and(DB::table('inventory_transactions')->count())->toBe(0);
})->with([
    'no patient' => [fn () => ['studentId' => null], 422, 'Choose one patient: a student or a staff member.'],
    'two patients' => [fn () => ['personnelId' => (string) test()->personnel], 422, 'Choose one patient: a student or a staff member.'],
    'time out early' => [fn () => ['dateTime' => '2026-11-10T08:00', 'timeOut' => '07:59'], 422, "Time out can't be earlier than the time in."],
    'four extras' => [fn () => ['extraComplaints' => ['a', 'b', 'c', 'd']], 422, 'Add at most 3 extra complaints.'],
    'letter when returned' => [fn () => ['excuseLetterDraft' => ['excusedFrom' => '2026-11-10', 'excusedUntil' => '2026-11-10']], 422, 'Only a Sent home or Referred visit has an excuse letter.'],
    'letter for staff' => [fn () => ['studentId' => null, 'personnelId' => (string) test()->personnel, 'disposition' => 'sent_home', 'excuseLetterDraft' => ['excusedFrom' => '2026-11-10', 'excusedUntil' => '2026-11-10']], 409, 'An excuse letter is only for a student.'],
    'line twice' => [fn () => ['itemsGiven' => [['itemId' => (string) test()->item, 'quantity' => 1], ['itemId' => (string) test()->item, 'quantity' => 2]]], 409, 'Each item can appear on only one line.'],
    'zero quantity' => [fn () => ['itemsGiven' => [['itemId' => (string) test()->item, 'quantity' => 0]]], 409, 'Quantities must be whole numbers of at least 1.'],
    'unknown item' => [fn () => ['itemsGiven' => [['itemId' => '999999', 'quantity' => 1]]], 409, 'One of the items no longer exists in inventory.'],
]);

it('lets stock fall below zero on the last usable batch and reports it (ADR-018); refuses an item with only expired stock', function () {
    $this->postJson('/api/visits', visitInput(['itemsGiven' => [['itemId' => (string) $this->item, 'quantity' => 15]]]))->assertCreated()
        ->assertJsonPath('data.belowZero', ['Paracetamol 500 mg']);
    expect(batchQty($this->later))->toBe(-2);

    $expiredOnly = DB::table('inventory_items')->insertGetId(['name' => 'Old syrup', 'category' => 'medicine', 'unit' => 'bottle']);
    DB::table('inventory_batches')->insert(['item_id' => $expiredOnly, 'quantity' => 5, 'expiration_date' => '2026-01-01', 'received_date' => '2025-01-01']);
    $this->postJson('/api/visits', visitInput(['itemsGiven' => [['itemId' => (string) $expiredOnly, 'quantity' => 1]]]))->assertConflict()
        ->assertJsonPath('rule', 'stock_rule')->assertJsonPath('message', "Old syrup has no usable batch and can't be given. Dispose of expired stock before restocking.");
});

it('edits a visit: changed lines move stock through visit_edited adjustments, and the audit names fields only', function () {
    $id = $this->postJson('/api/visits', visitInput(['itemsGiven' => [['itemId' => (string) $this->item, 'quantity' => 5]]]))->json('data.visit.id');

    $this->putJson("/api/visits/{$id}", visitInput(['itemsGiven' => [['itemId' => (string) $this->item, 'quantity' => 2]], 'treatment' => 'Rest and water']))->assertOk()
        ->assertJsonPath('data.visit.itemsGiven.0.quantity', 2)
        ->assertJsonPath('data.visit.itemsGiven.0.batchAllocations', [['batchId' => (string) $this->sooner, 'quantity' => 2]]);
    expect(batchQty($this->later))->toBe(10)->and(batchQty($this->sooner))->toBe(1)
        ->and(DB::table('inventory_transactions')->where('type', 'adjustment')->value('reason'))->toBe('visit_edited')
        ->and(DB::table('inventory_transactions')->where('type', 'dispense')->value('quantity_delta'))->toBe(-5)
        ->and(DB::table('audit_logs')->where('action_type', 'update')->value('summary'))->toBe('Updated treatment notes and medicines and supplies');
});

it('marks a visit entered in error: stock returns, the letter is voided, follow-ups cancelled, and the visit leaves the list', function () {
    $id = $this->postJson('/api/visits', visitInput([
        'disposition' => 'sent_home', 'itemsGiven' => [['itemId' => (string) $this->item, 'quantity' => 4]],
        'excuseLetterDraft' => ['excusedFrom' => '2026-11-10', 'excusedUntil' => '2026-11-11'],
        'followUp' => ['followUpDate' => '2026-11-12', 'reason' => 'Check fever', 'notes' => null],
    ]))->assertCreated()->json('data.visit.id');

    $this->postJson("/api/visits/{$id}/entered-in-error", ['reason' => ' '])->assertUnprocessable();
    $this->postJson("/api/visits/{$id}/entered-in-error", ['reason' => 'Wrong student'])->assertOk()->assertJsonPath('data.enteredInError.reason', 'Wrong student');
    $this->postJson("/api/visits/{$id}/entered-in-error", ['reason' => 'Again'])->assertConflict()->assertJsonPath('rule', 'visit_entered_in_error');
    $this->putJson("/api/visits/{$id}", visitInput())->assertConflict()->assertJsonPath('rule', 'visit_entered_in_error');

    expect(batchQty($this->sooner) + batchQty($this->later))->toBe(13)
        ->and(DB::table('excuse_letters')->value('status'))->toBe('voided')
        ->and(DB::table('follow_ups')->value('status_reason'))->toBe('Visit entered in error: Wrong student')
        ->and(DB::table('audit_logs')->pluck('summary')->implode(' '))->not->toContain('Wrong student');
    $this->getJson('/api/visits')->assertJsonCount(0, 'data');
    $this->getJson('/api/visits?includeEnteredInError=1')->assertJsonCount(1, 'data');
});

it('approves a letter with its wording stored, fixes its period, and replaces it', function () {
    $id = $this->postJson('/api/visits', visitInput(['disposition' => 'sent_home', 'excuseLetterDraft' => ['excusedFrom' => '2026-11-10', 'excusedUntil' => '2026-11-11', 'note' => 'Rest']]))
        ->json('data.visit.id');
    $this->getJson('/api/excuse-letters/pending')->assertJsonPath('data.0.lrn', '●●●●●●●●0001');

    $letter = $this->postJson("/api/visits/{$id}/excuse-letter/approve", ['excusedFrom' => '2026-11-10', 'excusedUntil' => '2026-11-11'])->assertCreated()->json('data');
    expect($letter['referenceNo'])->toBe('EL-2026-0001')->and($letter['recipient'])->toBe('Class Adviser')
        ->and($letter['body'])->toContain('Ana Cruz visited the school clinic on Nov 10, 2026')->toContain('from Nov 10, 2026 to Nov 11, 2026');
    $this->getJson('/api/excuse-letters/pending')->assertJsonCount(0, 'data');
    $this->getJson("/api/visits/{$id}")->assertJsonPath('data.excuseLetterDraft', null);
    $this->putJson("/api/visits/{$id}", visitInput(['disposition' => 'sent_home', 'excuseLetterDraft' => ['excusedFrom' => '2026-11-10', 'excusedUntil' => '2026-11-12']]))
        ->assertConflict()->assertJsonPath('message', 'This visit already has an approved excuse letter. Its period is fixed.');
    $this->postJson("/api/visits/{$id}/excuse-letter/approve", ['excusedFrom' => '2026-11-10', 'excusedUntil' => '2026-11-11'])->assertConflict()->assertJsonPath('rule', 'excuse_letter');

    $this->postJson("/api/visits/{$id}/excuse-letter/replacement", ['reason' => 'Wrong dates'])->assertNoContent();
    $this->getJson("/api/visits/{$id}")->assertJsonPath('data.excuseLetterDraft.excusedUntil', '2026-11-11');
    expect(array_column($this->getJson("/api/students/{$this->student}/excuse-letters")->json('data'), 'status'))->toBe(['pending', 'superseded']);
    $this->getJson("/api/excuse-letters/{$letter['id']}")->assertJsonPath('data.superseded.reason', 'Wrong dates');
});

it('saves and approves a letter in one write, or refuses with no draft', function () {
    $this->postJson('/api/visits', visitInput(['disposition' => 'sent_home', 'approveExcuseLetterNow' => true]))->assertConflict()
        ->assertJsonPath('message', 'Prepare the excuse letter before approving it.');
    expect(DB::table('visits')->count())->toBe(0);

    $id = $this->postJson('/api/visits', visitInput(['disposition' => 'sent_home', 'approveExcuseLetterNow' => true, 'excuseLetterDraft' => ['excusedFrom' => '2026-11-10', 'excusedUntil' => '2026-11-10']]))
        ->assertCreated()->json('data.visit.id');
    $this->getJson("/api/visits/{$id}/excuse-letter")->assertJsonPath('data.status', 'approved')->assertJsonPath('data.body', fn (string $b): bool => str_contains($b, 'excused on Nov 10, 2026'));
});

it('logs a PE referral, and a hospital referral as an escalation too', function () {
    $this->postJson('/api/pe-referrals', ['studentId' => (string) $this->student, 'referredBy' => 'Coach', 'activity' => 'Basketball', 'injurySummary' => 'Sprain',
        'clinicalAssessment' => 'Mild', 'treatment' => 'Ice', 'disposition' => 'referred_to_hospital'])->assertCreated()->assertJsonPath('data.activity', 'Basketball');
    expect(DB::table('audit_logs')->orderBy('id')->pluck('target_type')->all())->toBe(['pe-sports-referral', 'incident-escalation']);
    $this->postJson('/api/pe-referrals', ['studentId' => '999999', 'disposition' => 'sent_home'])->assertNotFound();
});

it('keeps visits from the Admin', function () {
    $this->app['auth']->forgetGuards();
    signIn(User::factory()->admin()->create());
    $this->getJson('/api/visits')->assertForbidden();
    $this->getJson('/api/follow-ups')->assertForbidden();
});

it('pages the visit list only when asked (contract Q19)', function () {
    signIn($this->staff);
    foreach (range(1, 3) as $i) {
        $this->postJson('/api/visits', visitInput(['complaint' => "Cough {$i}"]))->assertCreated();
    }

    $this->getJson('/api/visits')->assertOk()->assertJsonCount(3, 'data')->assertJsonMissingPath('meta');
    $this->getJson('/api/visits?page=2&perPage=2')->assertOk()->assertJsonCount(1, 'data')
        ->assertJsonPath('meta', ['page' => 2, 'perPage' => 2, 'total' => 3]);
    $this->getJson('/api/visits?perPage=101')->assertUnprocessable();
});
