<?php

declare(strict_types=1);

namespace App\Shared\Database\DemoSchool;

use RuntimeException;

/** Thrown by LoadGenerator when the next record's time is after `until`: the school stops there. */
final class ReachedEnd extends RuntimeException {}
