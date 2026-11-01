<?php

declare(strict_types=1);

use App\Shared\Logging\RedactSensitiveData;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Route;

it('never writes an LRN, name, birthdate, password or token to a log', function () {
    $dir = sys_get_temp_dir().'/cliniq-log-'.uniqid();
    mkdir($dir);
    config(['logging.default' => 'daily', 'logging.channels.daily.path' => $dir.'/test.log']);
    app('log')->forgetChannel('daily');

    Route::middleware('api')->post('api/_t/log', function () {
        Log::info('Saving 123456789012 for nurse@school.test', ['password' => 'hunter2', 'lrn' => '123456789012', 'nested' => ['token' => 'abc-token']]);

        throw new RuntimeException('Duplicate entry for Reyes, Ana born 2015-03-14 with hunter2');
    });

    $this->postJson('/api/_t/log', [
        'lrn' => '123456789012',
        'fullName' => 'Reyes, Ana',
        'birthDate' => '2015-03-14',
        'password' => 'hunter2',
        'token' => 'abc-token',
    ], ['X-Request-Id' => 'abc-12345678'])->assertStatus(500);

    app('log')->forgetChannel('daily');
    $logs = implode('', array_map(file_get_contents(...), glob($dir.'/*') ?: []));

    expect($logs)->toContain('abc-12345678')->toContain('RuntimeException')
        ->not->toContain('123456789012')
        ->not->toContain('Reyes')
        ->not->toContain('2015-03-14')
        ->not->toContain('hunter2')
        ->not->toContain('abc-token')
        ->not->toContain('nurse@school.test');
});

it('keeps 14 days of daily logs', function () {
    expect((int) config('logging.channels.daily.days'))->toBe(14);
});

it('redacts on every file channel', function () {
    expect(config('logging.channels.daily.tap'))->toContain(RedactSensitiveData::class)
        ->and(config('logging.channels.single.tap'))->toContain(RedactSensitiveData::class);
});
