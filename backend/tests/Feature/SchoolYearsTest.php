<?php

declare(strict_types=1);

use App\Modules\UserManagement\Models\User;
use App\Shared\Support\SchoolYears;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->staff = User::factory()->create(['name' => 'Nurse Joy']);
    $this->admin = User::factory()->admin()->create();
});

it('falls back to the June 15 to April 14 settings before any recorded start, at the edge dates', function () {
    $years = app(SchoolYears::class);

    expect($years->labelOn('2026-06-14'))->toBe('2025–2026')
        ->and($years->labelOn('2026-06-15'))->toBe('2026–2027')
        ->and($years->of('2027-04-14')['lastClassDay'])->toBe('2027-04-14')
        ->and($years->of('2026-06-15')['to'])->toBe('2027-06-14');
});

it('starts and ends a year by hand, refusing the steps out of order, and audits each', function () {
    $this->travelTo('2026-06-15 08:00:00');
    signIn($this->staff);

    $this->postJson('/api/school-years/end')->assertConflict()->assertJsonPath('message', 'Start a school year before ending one.');
    $this->postJson('/api/school-years/start')->assertOk()->assertJsonPath('data.label', '2026–2027')->assertJsonPath('data.from', '2026-06-15');
    $this->postJson('/api/school-years/start')->assertConflict()->assertJsonPath('message', 'End school year 2026–2027 first.');

    $this->travelTo('2027-04-14 16:00:00');
    signIn($this->staff); // a new sign-in after the long jump (idle sign-out)
    $this->postJson('/api/school-years/end')->assertOk()->assertJsonPath('data.endedOn', '2027-04-14');
    $this->postJson('/api/school-years/end')->assertConflict()->assertJsonPath('message', 'School year 2026–2027 has already ended.');
    $this->postJson('/api/school-years/start')->assertConflict()->assertJsonPath('message', 'School year 2026–2027 ended today. Start the next one from tomorrow.');

    // The break stays in the year just ended until the next is started, however late.
    $this->travelTo('2027-06-20 08:00:00');
    signIn($this->staff);
    expect(app(SchoolYears::class)->labelOn('2027-06-20'))->toBe('2026–2027');
    $this->postJson('/api/school-years/start')->assertOk()->assertJsonPath('data.label', '2027–2028');
    expect(app(SchoolYears::class)->of('2027-06-19')['to'])->toBe('2027-06-19');

    expect(DB::table('audit_logs')->where('target_type', 'school-year')->orderBy('id')->pluck('summary')->all())
        ->toBe(['Started school year 2026–2027', 'Ended school year 2026–2027', 'Started school year 2027–2028']);
    $this->getJson('/api/school-years')->assertOk()->assertJsonPath('data.current.startedBy', 'Nurse Joy')->assertJsonCount(2, 'data.years');
});

it('reminds Staff from 7 days before a step is due, and never the Admin', function () {
    $years = app(SchoolYears::class);
    expect($years->reminder('2026-06-07', 'staff'))->toBeNull()
        ->and($years->reminder('2026-06-08', 'staff'))->toBe(['kind' => 'start', 'label' => '2026–2027', 'dueOn' => '2026-06-15', 'overdue' => false, 'dueToday' => false])
        ->and($years->reminder('2026-06-16', 'staff')['overdue'] ?? null)->toBeTrue()
        ->and($years->reminder('2026-06-16', 'admin'))->toBeNull();

    $this->travelTo('2026-06-15 08:00:00');
    signIn($this->staff);
    $this->getJson('/api/school-years/reminder')->assertOk()->assertJsonPath('data.dueToday', true);
});

it('gives the Admin no reminder and no writes', function () {
    $this->travelTo('2026-06-16 08:00:00');
    signIn($this->admin);

    $this->getJson('/api/school-years/reminder')->assertOk()->assertJsonPath('data', null);
    $this->getJson('/api/school-years')->assertOk();
    $this->postJson('/api/school-years/start')->assertForbidden()->assertJsonPath('message', 'Only the clinic staff can start a school year.');
    $this->putJson('/api/school-years/settings', ['schoolYearStartMonth' => 6, 'schoolYearStartDay' => 1, 'schoolYearEndMonth' => 4, 'schoolYearEndDay' => 1])
        ->assertForbidden()->assertJsonPath('message', 'Only the clinic staff can change the school year dates.');
});

it('saves the dates by the rules and audits the changed fields only', function (array $dates, ?string $message) {
    $this->travelTo('2026-11-10 08:00:00');
    signIn($this->staff);
    $res = $this->putJson('/api/school-years/settings', $dates + ['schoolYearStartMonth' => 6, 'schoolYearStartDay' => 15, 'schoolYearEndMonth' => 4, 'schoolYearEndDay' => 14]);

    if ($message === null) {
        $res->assertOk()->assertJsonPath('data.schoolYearStartDay', 1);
        expect(DB::table('audit_logs')->value('summary'))->toBe('Updated start day');
    } else {
        $res->assertUnprocessable()->assertJsonPath('message', $message);
    }
})->with([
    'a good change' => [['schoolYearStartDay' => 1], null],
    'month 13' => [['schoolYearEndMonth' => 13], 'Choose a month from January to December.'],
    'February 29' => [['schoolYearStartMonth' => 2, 'schoolYearStartDay' => 29], 'The start day is not a date in that month.'],
    'end on the start' => [['schoolYearEndMonth' => 6, 'schoolYearEndDay' => 15], 'The last class day must fall before the next school year starts.'],
]);
