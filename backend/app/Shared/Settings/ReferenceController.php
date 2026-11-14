<?php

declare(strict_types=1);

namespace App\Shared\Settings;

use App\Modules\StaffPatients\Services\PersonnelService;
use App\Shared\Support\Row;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

/** Reference data (API-Contract "Reference data"): read only, no audit, text-only lists. */
final class ReferenceController
{
    public function __construct(private readonly SettingsService $settings) {}

    /** `ComplaintType[]` with their first-aid steps; `id` is what "Commonly used for" sends (ADR-071). */
    public function visitComplaintTypes(): JsonResponse
    {
        $steps = DB::table('triage_steps')->where('is_active', 1)->orderBy('sort_order')->orderBy('id')->get()->groupBy(fn (object $s): int => (int) Row::int($s, 'complaint_type_id'));

        return response()->json(['data' => array_values(DB::table('complaint_types')->where('used_in_visits', 1)->where('is_active', 1)->orderBy('sort_order')->orderBy('id')->get()
            ->map(fn (object $c): array => [
                'id' => (string) Row::int($c, 'id'), 'label' => (string) Row::str($c, 'label'),
                'triageSteps' => array_values(array_map(fn (mixed $s): string => is_object($s) ? (string) Row::str($s, 'step_text') : '', ($steps->get((int) Row::int($c, 'id')) ?? collect())->all())),
            ])->all())]);
    }

    /** The predefined types plus every complaint used on a visit, by use, then recency (`complaintSuggestions`). */
    public function visitComplaintSuggestions(): JsonResponse
    {
        $pool = [];
        foreach (DB::table('complaint_types')->where('used_in_visits', 1)->where('is_active', 1)->orderBy('sort_order')->pluck('label') as $label) {
            $pool[mb_strtolower(Row::text($label))] = ['label' => Row::text($label), 'count' => 0, 'last' => '', 'predefined' => true];
        }
        foreach (DB::table('visits')->whereNull('entered_in_error_at')->groupBy('complaint')->get(['complaint', DB::raw('COUNT(*) AS n'), DB::raw('MAX(visited_at) AS last')]) as $v) {
            $label = trim((string) Row::str($v, 'complaint'));
            $key = mb_strtolower($label);
            $entry = $pool[$key] ?? ['label' => $label, 'count' => 0, 'last' => '', 'predefined' => false];
            $entry['count'] += (int) Row::int($v, 'n');
            $last = (string) Row::str($v, 'last');
            if ($last > $entry['last']) {
                $entry['last'] = $last;
                $entry['label'] = $entry['predefined'] ? $entry['label'] : $label;
            }
            $pool[$key] = $entry;
        }
        usort($pool, fn (array $a, array $b): int => $b['count'] <=> $a['count'] ?: strcmp($b['last'], $a['last']) ?: strcmp($a['label'], $b['label']));

        return response()->json(['data' => array_column($pool, 'label')]);
    }

    public function incidentComplaintTypes(): JsonResponse
    {
        return response()->json(['data' => array_values(DB::table('complaint_types')->where('used_in_incidents', 1)->where('is_active', 1)->orderBy('sort_order')->orderBy('id')->pluck('label')->map(fn (mixed $l): string => Row::text($l))->all())]);
    }

    /** `VitalsWarningRanges` with `usual`. */
    public function vitalsRanges(): JsonResponse
    {
        $json = fn (string $key): mixed => json_decode(Row::text(DB::table('reference_settings')->where('setting_key', $key)->value('setting_value')), true);
        $ranges = $json('vitals_warning_ranges');

        return response()->json(['data' => (is_array($ranges) ? $ranges : []) + ['usual' => $json('vitals_usual_ranges')]]);
    }

    public function medicalCertificateAfterDays(): JsonResponse
    {
        return response()->json(['data' => $this->settings->int('medical_certificate_after_days')]);
    }

    public function unusualAgeYears(): JsonResponse
    {
        return response()->json(['data' => $this->settings->int('unusual_age_years')]);
    }

    public function largeWriteOffPercent(): JsonResponse
    {
        return response()->json(['data' => $this->settings->int('large_write_off_percent')]);
    }

    /** In school order (`grade_levels.sort_order`). */
    public function gradeLevels(): JsonResponse
    {
        return response()->json(['data' => array_values(DB::table('grade_levels')->where('is_active', 1)->orderBy('sort_order')->pluck('name')->map(fn (mixed $n): string => Row::text($n))->all())]);
    }

    public function personnelTypes(PersonnelService $personnel): JsonResponse
    {
        return response()->json(['data' => $personnel->types()]);
    }

    /** Departments or roles in use, by staff type, as suggestions (D4). */
    public function personnelDepartments(): JsonResponse
    {
        $out = [];
        foreach (DB::table('personnel')->whereNotNull('department')->distinct()->orderBy('department')->get(['type', 'department']) as $p) {
            $out[(string) Row::str($p, 'type')][] = (string) Row::str($p, 'department');
        }

        return response()->json(['data' => (object) $out]);
    }
}
