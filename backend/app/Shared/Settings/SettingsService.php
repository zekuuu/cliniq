<?php

declare(strict_types=1);

namespace App\Shared\Settings;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Reads `system_settings` through a 60-second cache; saving clears it (API-Contract "Idle sign-out").
 * Within one request the settings are read from the cache once: a list that asks for a setting per row
 * read the cache store per row (about 1,800 reads, 3.8 s, on the follow-up list; ADR-082).
 */
final class SettingsService
{
    private const CACHE_KEY = 'cliniq.system_settings';

    private const CACHE_SECONDS = 60;

    /** The request attribute holding this request's copy, shared by every instance. */
    private const REQUEST_COPY = 'cliniq.system_settings';

    public function int(string $key): int
    {
        $value = $this->all()[$key] ?? null;
        if ($value === null) {
            throw new \RuntimeException("Missing system setting {$key}.");
        }

        return (int) $value;
    }

    /** @param array<string, int|string> $values */
    public function save(array $values, ?int $userId): void
    {
        DB::transaction(function () use ($values, $userId): void {
            foreach ($values as $key => $value) {
                DB::table('system_settings')->where('setting_key', $key)
                    ->update(['setting_value' => (string) $value, 'updated_by_user_id' => $userId]);
            }
        });
        Cache::forget(self::CACHE_KEY);
        request()->attributes->remove(self::REQUEST_COPY);
    }

    /** @return array<string, string> */
    private function all(): array
    {
        $copy = request()->attributes->get(self::REQUEST_COPY);
        if ($copy instanceof SettingsCopy) {
            return $copy->values;
        }
        /** @var array<string, string> */
        $values = Cache::remember(self::CACHE_KEY, self::CACHE_SECONDS, fn (): array => DB::table('system_settings')
            ->pluck('setting_value', 'setting_key')->map(fn (mixed $v): string => is_scalar($v) ? (string) $v : '')->all());
        // Only while an HTTP request is handled: a console command (the seeder, the daily jobs) is one
        // long "request" that may change the settings as it goes.
        if (request()->route() !== null) {
            request()->attributes->set(self::REQUEST_COPY, new SettingsCopy($values));
        }

        return $values;
    }
}
