<?php

declare(strict_types=1);

namespace App\Modules\Dashboard\Controllers;

use App\Modules\Dashboard\Services\CalendarService;
use App\Modules\Dashboard\Services\DashboardService;
use App\Modules\UserManagement\Controllers\AuthController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/** The Dashboard and its calendar (API-Contract Module 9). Staff and Admin. */
final class DashboardController
{
    public function __construct(private readonly DashboardService $dashboard, private readonly CalendarService $calendar) {}

    public function summary(Request $request): JsonResponse
    {
        $request->validate(['preset' => ['nullable', 'string'], 'from' => ['nullable', 'date_format:Y-m-d'], 'to' => ['nullable', 'date_format:Y-m-d'],
            'sex' => ['nullable', 'in:female,male'], 'gradeLevel' => ['nullable', 'string', 'max:40']]);
        $range = DashboardService::range(
            $request->filled('preset') ? $request->string('preset')->value() : 'thisMonth',
            $request->filled('from') ? $request->string('from')->value() : null,
            $request->filled('to') ? $request->string('to')->value() : null,
        );

        return response()->json(['data' => $this->dashboard->summary(
            $range,
            $request->filled('sex') ? $request->string('sex')->value() : null,
            $request->filled('gradeLevel') ? $request->string('gradeLevel')->value() : null,
            AuthController::user($request)->role === 'admin',
        )]);
    }

    public function clusters(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->dashboard->clusters(AuthController::user($request)->role === 'admin')]);
    }

    public function days(Request $request): JsonResponse
    {
        [$from, $to] = self::period($request);

        return response()->json(['data' => $this->dashboard->calendarDays($from, $to)]);
    }

    public function holidays(Request $request): JsonResponse
    {
        [$from, $to] = self::period($request);

        return response()->json(['data' => $this->calendar->holidays($from, $to)]);
    }

    public function events(Request $request): JsonResponse
    {
        [$from, $to] = self::period($request);

        return response()->json(['data' => $this->calendar->events($from, $to)]);
    }

    public function storeEvent(Request $request): JsonResponse
    {
        $user = AuthController::user($request);

        return response()->json(['data' => $this->calendar->save(self::eventInput($request), null, $user->id, $user->role)], 201);
    }

    public function updateEvent(Request $request, int $id): JsonResponse
    {
        $user = AuthController::user($request);

        return response()->json(['data' => $this->calendar->save(self::eventInput($request), $id, $user->id, $user->role)]);
    }

    public function deleteEvent(Request $request, int $id): Response
    {
        $user = AuthController::user($request);
        $this->calendar->delete($id, $user->id, $user->role);

        return response()->noContent();
    }

    /** @return array{0: string, 1: string} at most about two years of days */
    private static function period(Request $request): array
    {
        $request->validate(['from' => ['required', 'date_format:Y-m-d'], 'to' => ['required', 'date_format:Y-m-d', 'after_or_equal:from']]);
        $from = $request->string('from')->value();
        $to = $request->string('to')->value();
        abort_if((new \DateTimeImmutable($from))->diff(new \DateTimeImmutable($to))->days > 800, 422, 'Choose a shorter period.');

        return [$from, $to];
    }

    /** @return array<string, mixed> */
    private static function eventInput(Request $request): array
    {
        $request->validate(['title' => ['nullable', 'string', 'max:500'], 'startDate' => ['nullable', 'string', 'max:10'], 'endDate' => ['nullable', 'string', 'max:10']]);

        return ['title' => $request->input('title'), 'startDate' => $request->input('startDate'), 'endDate' => $request->input('endDate')];
    }
}
