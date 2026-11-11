<?php

declare(strict_types=1);

namespace App\Shared\Settings;

use App\Shared\AuditLog\AuditAction;
use App\Shared\AuditLog\AuditEvent;
use App\Shared\AuditLog\AuditLogger;
use App\Shared\Auth\ClinicUser;
use App\Shared\Http\ApiError;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

/** `GET` and `PUT /api/settings/idle-signout` (`getIdleSignoutSettings`, `saveIdleSignoutSettings`, ADR-078). */
final class IdleSignoutSettingsController
{
    /** API field => setting key, with the audit label the mock's FIELD_LABELS use. */
    private const FIELDS = [
        'idleSignoutMinutesStaff' => ['idle_signout_minutes_staff', 'Staff idle sign-out minutes'],
        'idleSignoutMinutesAdmin' => ['idle_signout_minutes_admin', 'Admin idle sign-out minutes'],
    ];

    public function __construct(private readonly SettingsService $settings) {}

    public function show(): JsonResponse
    {
        return response()->json(['data' => $this->current()]);
    }

    public function update(Request $request, AuditLogger $audit): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof ClinicUser || $user->clinicRole() !== ClinicUser::STAFF) {
            throw new ApiError(403, 'forbidden', 'Only the clinic staff can change the sign-out times.');
        }
        $rule = ['required', 'integer', 'between:10,240'];
        Validator::make($request->all(), ['idleSignoutMinutesStaff' => $rule, 'idleSignoutMinutesAdmin' => $rule], [
            '*' => 'Enter whole minutes from 10 to 240.',
        ])->validate();

        $before = $this->current();
        $changed = array_keys(array_filter(self::FIELDS, fn (array $_, string $field): bool => $before[$field] !== $request->integer($field), ARRAY_FILTER_USE_BOTH));
        if ($changed !== []) {
            DB::transaction(function () use ($changed, $request, $user, $audit): void {
                $values = [];
                foreach ($changed as $field) {
                    $values[self::FIELDS[$field][0]] = $request->integer($field);
                }
                $authId = Auth::id();
                $this->settings->save($values, is_int($authId) ? $authId : null);
                $labels = array_map(fn (string $f): string => self::FIELDS[$f][1], $changed);
                $audit->record(new AuditEvent(
                    actorId: is_scalar($authId) ? (string) $authId : null,
                    actorRole: $user->clinicRole(),
                    action: AuditAction::Update,
                    targetType: null,
                    targetId: null,
                    targetLabel: 'settings/idle-signout',
                    at: CarbonImmutable::now(),
                    summary: 'Updated '.implode(' and ', $labels),
                ));
            });
        }

        return response()->json(['data' => $this->current()]);
    }

    /** @return array{idleSignoutMinutesStaff: int, idleSignoutMinutesAdmin: int} */
    private function current(): array
    {
        return [
            'idleSignoutMinutesStaff' => $this->settings->int('idle_signout_minutes_staff'),
            'idleSignoutMinutesAdmin' => $this->settings->int('idle_signout_minutes_admin'),
        ];
    }
}
