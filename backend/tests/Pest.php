<?php

declare(strict_types=1);

use Illuminate\Contracts\Auth\Authenticatable;
use Tests\TestCase;

pest()->extend(TestCase::class)->in('Feature', 'Unit');

/** Requests from the SPA's own origin, so Sanctum starts the session cookie as in the browser. */
function asSpa(): TestCase
{
    return test()->withHeader('Referer', 'http://'.config('sanctum.stateful')[0].'/');
}

/** A fresh sign-in: a new session, then the user. One session never switches user (Sanctum logs it out). */
function signIn(Authenticatable $user): TestCase
{
    return asSpa()->flushSession()->actingAs($user);
}
