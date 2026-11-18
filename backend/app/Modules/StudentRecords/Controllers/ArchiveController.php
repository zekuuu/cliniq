<?php

declare(strict_types=1);

namespace App\Modules\StudentRecords\Controllers;

use App\Modules\UserManagement\Controllers\AuthController;
use App\Shared\Support\ClinicTime;
use App\Shared\Support\Lrn;
use App\Shared\Support\PersonName;
use App\Shared\Support\Row;
use App\Shared\Support\SchoolYears;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * The Archive page (ADR-072, ADR-075; `getArchive` in the mock): the year switcher and the archived
 * students and staff of one year. Reads only; names with no medical or visit detail, as the masterlists.
 */
final class ArchiveController
{
    private const SORTS = ['name', 'number', 'group', 'date', 'reason'];

    public function __construct(private readonly SchoolYears $years) {}

    /** `GET /api/archive/years`: every year with archived records, visits, incidents or audit entries, plus the current one. */
    public function years(): JsonResponse
    {
        $today = ClinicTime::today();
        $current = $this->years->of($today);
        $archived = DB::table('students')->whereNotNull('archived_school_year')->distinct()->pluck('archived_school_year')
            ->merge(DB::table('personnel')->whereNotNull('archived_school_year')->distinct()->pluck('archived_school_year'))
            ->filter(fn (mixed $v): bool => is_string($v))->unique()->values();
        $dates = DB::query()->fromSub(
            DB::table('visits')->selectRaw('DATE(visited_at) AS d')
                ->union(DB::table('incidents')->selectRaw('DATE(occurred_at) AS d'))
                ->union(DB::table('audit_logs')->selectRaw('DATE(occurred_at) AS d')),
            'x',
        )->distinct()->pluck('d')->filter(fn (mixed $v): bool => is_string($v));
        // ponytail: one school-year lookup per distinct day; fine for years of daily records.
        $labels = $dates->map(fn (string $d): string => $this->years->labelOn($d))
            ->merge($archived)->push($current['label'])->unique()->sortDesc()->values();

        $starts = $this->years->starts();
        $settings = $this->years->settings();
        $years = $labels->map(function (string $label) use ($current, $starts, $settings, $today): array {
            $start = $starts->firstWhere('label', $label);
            $year = $label === $current['label'] ? $current : $this->years->of($start->started_on ?? sprintf('%s-%02d-%02d', substr($label, 0, 4), $settings['schoolYearStartMonth'], $settings['schoolYearStartDay']));
            $months = [];
            for ($m = CarbonImmutable::parse(substr($year['from'], 0, 7).'-01'); $m->format('Y-m') <= substr(min($year['to'], $today), 0, 7); $m = $m->addMonth()) {
                $months[] = $m->format('Y-m');
            }

            return ['label' => $label, 'from' => $year['from'], 'to' => $year['to'], 'months' => $months];
        })->all();

        return response()->json(['data' => ['years' => $years, 'defaultYear' => $archived->sortDesc()->first()]]);
    }

    public function students(Request $request): JsonResponse
    {
        return $this->list($request, 'student');
    }

    public function staff(Request $request): JsonResponse
    {
        return $this->list($request, 'personnel');
    }

    /** `ArchivedRecordRow[]` with `meta: { page, perPage, total, totalInYear, reasons }`. */
    private function list(Request $request, string $kind): JsonResponse
    {
        AuthController::user($request);
        $request->validate([
            'year' => ['required', 'string', 'regex:/\A\d{4}–\d{4}\z/u'], 'search' => ['nullable', 'string', 'max:120'], 'reason' => ['nullable', 'string', 'max:80'],
            'sort' => ['nullable', 'string', 'in:'.implode(',', [...self::SORTS, ...array_map(fn (string $s): string => "-{$s}", self::SORTS)])],
            'page' => ['nullable', 'integer', 'min:1'], 'perPage' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);
        $query = $kind === 'student'
            ? DB::table('students as r')->leftJoin('grade_levels as g', 'g.id', '=', 'r.grade_level_id')->select(['r.*', 'r.lrn as number', 'g.name as grp'])
            : DB::table('personnel as r')->select(['r.*', 'r.staff_number as number', 'r.type as grp']);
        $rows = $query->whereNotNull('r.archived_at')->where('r.archived_school_year', $request->string('year')->value())->get()
            ->map(fn (object $r): array => [
                'id' => (string) Row::int($r, 'id'),
                'kind' => $kind,
                'fullName' => PersonName::format((string) Row::str($r, 'first_name'), Row::str($r, 'middle_name'), (string) Row::str($r, 'last_name')),
                'sortName' => PersonName::key(Row::str($r, 'last_name').' '.Row::str($r, 'first_name').' '.Row::str($r, 'middle_name')),
                'rawNumber' => (string) Row::str($r, 'number'),
                'number' => $kind === 'student' ? Lrn::mask((string) Row::str($r, 'number')) : (string) Row::str($r, 'number'),
                'group' => Row::str($r, 'grp') ?? '',
                'archivedAt' => ($at = Row::str($r, 'archived_at')) === null ? null : ClinicTime::iso(CarbonImmutable::parse($at)),
                'archiveReason' => Row::str($r, 'archive_reason'),
                'archivedSchoolYear' => (string) Row::str($r, 'archived_school_year'),
            ]);
        $totalInYear = $rows->count();
        $reasons = $rows->pluck('archiveReason')->filter(fn (mixed $v): bool => is_string($v))->unique()->sort()->values()->all();

        $search = mb_strtolower(trim($request->string('search')->value()));
        $reason = $request->string('reason')->value();
        $rows = $rows->filter(fn (array $r): bool => ($reason === '' || $r['archiveReason'] === $reason) && ($search === ''
            || PersonName::matches($r['fullName'], $search)
            || ($kind === 'student' && preg_match('/\A\d{1,4}\z/', $search) === 1 && str_ends_with($r['rawNumber'], $search))
            || ($kind === 'personnel' && str_contains(mb_strtolower($r['rawNumber']), $search))));

        $sort = $request->string('sort')->value() ?: '-date';
        $desc = str_starts_with($sort, '-');
        $key = ['name' => 'sortName', 'number' => 'rawNumber', 'group' => 'group', 'date' => 'archivedAt', 'reason' => 'archiveReason'][ltrim($sort, '-')] ?? 'archivedAt';
        $rows = $rows->sort(function (array $a, array $b) use ($key, $desc): int {
            $cmp = strcmp((string) $a[$key], (string) $b[$key]);

            return ($desc ? -$cmp : $cmp) ?: strcmp($a['sortName'], $b['sortName']) ?: strcmp($a['id'], $b['id']); // deterministic
        })->values();

        $page = $request->filled('page') ? $request->integer('page') : 1;
        $perPage = $request->filled('perPage') ? $request->integer('perPage') : 25;

        return response()->json([
            'data' => $rows->forPage($page, $perPage)->map(fn (array $r): array => array_diff_key($r, ['sortName' => 0, 'rawNumber' => 0]))->values()->all(),
            'meta' => ['page' => $page, 'perPage' => $perPage, 'total' => $rows->count(), 'totalInYear' => $totalInYear, 'reasons' => $reasons],
        ]);
    }
}
