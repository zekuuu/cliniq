<?php

declare(strict_types=1);

namespace App\Providers;

use App\Shared\Support\ConfigurationCheck;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Model::shouldBeStrict(! $this->app->isProduction());

        // Tests check ConfigurationCheck directly with each setting.
        if (! $this->app->runningUnitTests()) {
            ConfigurationCheck::enforce();
        }

        // A first layer per address; LoginLockout holds the per-account lock of ADR-015.
        RateLimiter::for('login', fn (Request $request): Limit => Limit::perMinute(10)->by((string) $request->ip()));

        // Recovery: a second limit per username, so one name cannot be guessed from many addresses (ADR-073).
        RateLimiter::for('recovery', fn (Request $request): Limit => Limit::perMinute(5)->by('recovery:'.mb_strtolower(trim($request->string('username')->value()))));

        RateLimiter::for('api', function (Request $request): Limit {
            $id = $request->user()?->getAuthIdentifier();

            return Limit::perMinute(120)->by(is_scalar($id) ? 'user:'.$id : 'ip:'.$request->ip());
        });
    }
}
