<?php

declare(strict_types=1);

use App\Shared\Support\Age;
use App\Shared\Support\ClinicTime;
use App\Shared\Support\Lrn;
use Illuminate\Support\Carbon;

it('masks an LRN exactly as the frontend does', function () {
    expect(Lrn::mask('123456789012'))->toBe('●●●●●●●●9012')
        ->and(Lrn::mask('000000000007'))->toBe('●●●●●●●●0007')
        ->and(Lrn::mask(Lrn::mask('123456789012')))->toBe('●●●●●●●●9012');
});

it('normalizes and checks an LRN as the frontend does', function () {
    expect(Lrn::normalize('1234-5678 9012 34'))->toBe('123456789012')
        ->and(Lrn::isLrn('123456789012'))->toBeTrue()
        ->and(Lrn::isLrn('12345678901'))->toBeFalse()
        ->and(Lrn::isLrn("123456789012\n"))->toBeFalse()
        ->and(Lrn::label('123456789012'))->toBe('LRN ending in 9012');
});

it('turns a year older on the birthday, not the day before', function () {
    expect(Age::on('2017-10-30', '2026-10-30'))->toBe(9)
        ->and(Age::on('2017-10-30', '2026-10-29'))->toBe(8);
});

it('counts a 29 February birthdate as turned on 1 March in a year with no 29 February', function () {
    expect(Age::on('2016-02-29', '2026-02-28'))->toBe(9)
        ->and(Age::on('2016-02-29', '2026-03-01'))->toBe(10)
        ->and(Age::on('2016-02-29', '2024-02-29'))->toBe(8);
});

it('gives no age for a birthdate after the day asked about, or none at all', function () {
    expect(Age::on('2026-10-31', '2026-10-30'))->toBeNull()
        ->and(Age::on(null, '2026-10-30'))->toBeNull()
        ->and(Age::on('', '2026-10-30'))->toBeNull();
});

it('reads as whole years', function () {
    expect(Age::text(9))->toBe('9 years old')
        ->and(Age::text(1))->toBe('1 year old');
});

it('knows the usual age for each grade', function () {
    expect(Age::usualForGrade('Kinder'))->toBe(5)
        ->and(Age::usualForGrade('Grade 1'))->toBe(6)
        ->and(Age::usualForGrade('Grade 12'))->toBe(17)
        ->and(Age::usualForGrade('Other'))->toBeNull();
});

it('starts the unusual-age note only past the limit', function () {
    expect(Age::unusualNote('2015-01-01', 'Grade 3', '2026-10-30', 3))->toBeNull()
        ->and(Age::unusualNote('2014-01-01', 'Grade 3', '2026-10-30', 3))->toBe('Age 12 is unusual for Grade 3. Check the birthdate.')
        ->and(Age::unusualNote('2011-01-01', 'Grade 3', '2026-10-30', 3))->toBe('Age 15 is unusual for Grade 3. Check the birthdate.')
        ->and(Age::unusualNote('', 'Grade 3', '2026-10-30', 3))->toBeNull()
        ->and(Age::unusualNote('2011-01-01', '', '2026-10-30', 3))->toBeNull();
});

it('reads today in Manila, not UTC', function () {
    $this->travelTo(Carbon::parse('2026-10-31 17:30:00', 'UTC'));

    expect(ClinicTime::today())->toBe('2026-11-01');
});

it('writes timestamps with the +08:00 offset', function () {
    expect(ClinicTime::iso(Carbon::parse('2026-11-01 01:30:00', 'UTC')))->toBe('2026-11-01T09:30:00+08:00')
        ->and(ClinicTime::date(Carbon::parse('2026-10-31 17:30:00', 'UTC')))->toBe('2026-11-01');
});
