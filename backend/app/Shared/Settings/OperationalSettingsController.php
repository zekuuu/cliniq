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

/** Staff-editable warning horizons; both roles can read them. */
final class OperationalSettingsController
{
    private const FIELDS = [
        'upcomingFollowUpDays' => ['upcoming_follow_up_days', 'Upcoming follow-up days'],
        'expiryWarningDays' => ['expiry_warning_days', 'Expiry warning days'],
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
            throw new ApiError(403, 'forbidden', 'Only the clinic staff can change warning periods.');
        }
        Validator::make($request->all(), [
            'upcomingFollowUpDays' => ['required', 'integer', 'between:1,30'],
            'expiryWarningDays' => ['required', 'integer', 'between:1,180'],
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
                $audit->record(new AuditEvent(
                    actorId: is_scalar($authId) ? (string) $authId : null,
                    actorRole: $user->clinicRole(),
                    action: AuditAction::Update,
                    targetType: null,
                    targetId: null,
                    targetLabel: 'settings/operational',
                    at: CarbonImmutable::now(),
                    summary: 'Updated '.implode(' and ', array_map(fn (string $field): string => self::FIELDS[$field][1], $changed)),
                ));
            });
        }

        return response()->json(['data' => $this->current()]);
    }

    /** @return array{upcomingFollowUpDays: int, expiryWarningDays: int} */
    private function current(): array
    {
        return [
            'upcomingFollowUpDays' => $this->settings->int('upcoming_follow_up_days'),
            'expiryWarningDays' => $this->settings->int('expiry_warning_days'),
        ];
    }
}
