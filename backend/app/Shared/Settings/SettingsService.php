<?php

declare(strict_types=1);

namespace App\Shared\Settings;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Reads `system_settings` through a 60-second cache; saving clears it (API-Contract "Idle sign-out").
 */
final class SettingsService
{
    private const CACHE_KEY = 'cliniq.system_settings';

    private const CACHE_SECONDS = 60;

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
    }

    /** @return array<string, string> */
    private function all(): array
    {
        /** @var array<string, string> */
        return Cache::remember(self::CACHE_KEY, self::CACHE_SECONDS, fn (): array => DB::table('system_settings')
            ->pluck('setting_value', 'setting_key')->map(fn (mixed $v): string => is_scalar($v) ? (string) $v : '')->all());
    }
}
