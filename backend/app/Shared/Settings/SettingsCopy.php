<?php

declare(strict_types=1);

namespace App\Shared\Settings;

/** One request's settings, kept on the request so every `SettingsService` shares them (ADR-082). */
final class SettingsCopy
{
    /** @param array<string, string> $values */
    public function __construct(public readonly array $values) {}
}
