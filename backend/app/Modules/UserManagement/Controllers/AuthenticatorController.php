<?php

declare(strict_types=1);

namespace App\Modules\UserManagement\Controllers;

use App\Modules\UserManagement\Services\AuthenticatorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/** The signed-in user's authenticator and the three unauthenticated recovery steps (ADR-073). */
final class AuthenticatorController
{
    public function __construct(private readonly AuthenticatorService $service) {}

    public function status(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->service->status(AuthController::user($request))]);
    }

    public function setup(Request $request): JsonResponse
    {
        $request->validate(['proof' => ['nullable', 'string', 'max:20']]);
        $proof = $request->filled('proof') ? $request->string('proof')->value() : null;

        return response()->json(['data' => $this->service->startSetup(AuthController::user($request), $proof, $request->session())]);
    }

    public function confirm(Request $request): JsonResponse
    {
        $request->validate(['code' => ['required', 'string', 'max:20']]);

        return response()->json(['data' => $this->service->confirm(AuthController::user($request), $request->string('code')->value(), $request->session())]);
    }

    public function turnOff(Request $request): Response
    {
        $request->validate(['proof' => ['required', 'string', 'max:20']]);
        $this->service->turnOff(AuthController::user($request), $request->string('proof')->value());

        return response()->noContent();
    }

    public function check(Request $request): Response
    {
        $request->validate(['username' => ['required', 'string', 'max:50']]);
        $this->service->checkAccount($request->string('username')->value());

        return response()->noContent();
    }

    public function verify(Request $request): JsonResponse
    {
        $request->validate(['username' => ['required', 'string', 'max:50'], 'code' => ['required', 'string', 'max:20']]);

        return response()->json(['data' => ['token' => $this->service->verify($request->string('username')->value(), $request->string('code')->value())]]);
    }

    public function reset(Request $request): Response
    {
        $request->validate(['token' => ['required', 'string', 'max:100'], 'nextPassword' => ['required', 'string', 'max:255']]);
        $this->service->reset($request->string('token')->value(), $request->string('nextPassword')->value());

        return response()->noContent();
    }
}
