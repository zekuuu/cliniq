<?php

declare(strict_types=1);

namespace App\Shared\Http\Middleware;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

trait EndsSession
{
    private function endSession(Request $request): void
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
    }
}
