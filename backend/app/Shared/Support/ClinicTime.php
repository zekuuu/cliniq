<?php

declare(strict_types=1);

namespace App\Shared\Support;

use Carbon\CarbonImmutable;
use DateTimeInterface;

/** The server's clock in Philippine time (D6). The client's clock is never trusted. */
final class ClinicTime
{
    public const ZONE = 'Asia/Manila';

    public static function now(): CarbonImmutable
    {
        return now(self::ZONE)->toImmutable();
    }

    public static function today(): string
    {
        return self::now()->format('Y-m-d');
    }

    public static function iso(DateTimeInterface $at): string
    {
        return CarbonImmutable::instance($at)->setTimezone(self::ZONE)->format('Y-m-d\TH:i:sP');
    }

    public static function date(DateTimeInterface $at): string
    {
        return CarbonImmutable::instance($at)->setTimezone(self::ZONE)->format('Y-m-d');
    }
}
