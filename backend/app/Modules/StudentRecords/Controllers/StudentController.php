<?php

declare(strict_types=1);

namespace App\Modules\StudentRecords\Controllers;

use App\Modules\StudentRecords\Services\StudentImportService;
use App\Modules\StudentRecords\Services\StudentService;
use App\Modules\UserManagement\Controllers\AuthController;
use App\Shared\Http\Paging;
use App\Shared\Support\PatientFields;
use App\Shared\Support\PersonName;
use App\Shared\Support\Row;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Student Records (API-Contract Module 2). An LRN only ever travels in a request body (ADR-028). */
final class StudentController
{
    private const INPUT_RULES = PatientFields::RULES + [
        'lrn' => ['required', 'string', 'max:20'],
        'gradeLevel' => ['nullable', 'string', 'max:40'],
        'section' => ['nullable', 'string', 'max:60'],
        'sex' => ['nullable', 'string', 'in:female,male'],
        'birthDate' => ['nullable', 'string', 'max:10'],
    ];

    public function __construct(private readonly StudentService $students) {}

    public function query(Request $request): JsonResponse
    {
        $request->validate([
            'search' => ['nullable', 'string', 'max:120'], 'gradeLevel' => ['nullable', 'string', 'max:40'],
            'includeArchived' => ['boolean'], 'recordStatus' => ['nullable', 'in:complete,incomplete'], 'limit' => ['nullable', 'integer', 'min:1', 'max:5000'],
        ]);

        $rows = $this->students->list(
            $request->string('search')->value(),
            $request->string('gradeLevel')->value(),
            $request->boolean('includeArchived'),
            $request->string('recordStatus')->value(),
            Paging::wanted($request) || ! $request->filled('limit') ? null : $request->integer('limit'),
        );
        if (! Paging::wanted($request)) {
            return response()->json(['data' => $rows]);
        }
        // One page of the Student List (ADR-082). ponytail: sorted and cut in memory, which the school
        // roll bounds (about 1,200 rows with the archived); the name match and the record status are
        // PHP rules. Move to SQL if the roll ever passes about 20,000.
        [$sort, $direction] = Paging::sort($request, ['name', 'number', 'grade', 'status'], 'name');
        $value = fn (array $s): string => match ($sort) {
            'number' => substr(Row::text($s['lrn']), -4),
            'grade' => Row::text($s['gradeLevel']),
            'status' => $s['recordComplete'] ? ($s['archived'] ? 'Complete Archived' : 'Complete') : 'Incomplete',
            default => '',
        };
        $sign = $direction === 'desc' ? -1 : 1;
        if ($sort === 'name') {
            $rows = $sign === 1 ? $rows : array_reverse($rows);
        } else {
            // usort is stable: equal values keep the name order, as the screen's sort did.
            usort($rows, fn (array $a, array $b): int => $sign * strnatcasecmp($value($a), $value($b)));
        }

        return Paging::json($request, $rows);
    }

    public function search(Request $request): JsonResponse
    {
        $request->validate(['q' => ['nullable', 'string', 'max:120'], 'limit' => ['nullable', 'integer', 'min:1', 'max:50']]);

        return response()->json(['data' => $this->students->search($request->string('q')->value(), $request->filled('limit') ? $request->integer('limit') : 8)]);
    }

    public function checkDuplicates(Request $request): JsonResponse
    {
        $request->validate(['lrn' => ['nullable', 'string', 'max:20'], 'firstName' => ['nullable', 'string', 'max:200'], 'lastName' => ['nullable', 'string', 'max:200'], 'middleName' => ['nullable', 'string', 'max:200']]);
        $fullName = PersonName::format($request->string('firstName')->value(), $request->string('middleName')->value(), $request->string('lastName')->value());

        return response()->json(['data' => $this->students->checkDuplicates($request->string('lrn')->value(), $fullName)]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate(self::INPUT_RULES + ['confirmDuplicate' => ['boolean']]);
        $input = self::input($request);
        $user = AuthController::user($request);
        $result = $this->students->save($input, null, $request->boolean('confirmDuplicate'), null, $user->id, $user->role);

        return response()->json(['data' => $result], $result['status'] === 'saved' ? 201 : 200);
    }

    public function show(int $id): JsonResponse
    {
        return response()->json(['data' => $this->students->show($id)]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $request->validate(self::INPUT_RULES + ['nameCorrectionReason' => ['nullable', 'string', 'max:300']]);
        $input = self::input($request);
        $user = AuthController::user($request);
        $reason = $request->filled('nameCorrectionReason') ? $request->string('nameCorrectionReason')->value() : null;

        return response()->json(['data' => $this->students->save($input, $id, false, $reason, $user->id, $user->role)]);
    }

    public function archive(Request $request, int $id): JsonResponse
    {
        $request->validate(['reason' => ['nullable', 'string', 'max:200']]);
        $user = AuthController::user($request);

        return response()->json(['data' => $this->students->archive($id, $request->string('reason')->value(), $user->id, $user->role)]);
    }

    /** Undo of an archive (ADR-085). */
    public function restore(Request $request, int $id): JsonResponse
    {
        $user = AuthController::user($request);

        return response()->json(['data' => $this->students->restore($id, $user->id, $user->role)]);
    }

    public function verifyContact(Request $request, int $id, int $index): JsonResponse
    {
        $request->validate(['verified' => ['boolean']]);
        $user = AuthController::user($request);

        return response()->json(['data' => $this->students->verifyContact($id, $index, $request->boolean('verified', true), $user->id, $user->role)]);
    }

    private const IMPORT_KEYS = ['lrn', 'firstName', 'lastName', 'middleName', 'gradeLevel', 'section', 'sex', 'birthDate'];

    public function importPreview(Request $request, StudentImportService $import): JsonResponse
    {
        /** @var list<array{lrn: string, firstName: string, lastName: string, middleName: string, gradeLevel: string, section: string, sex: string, birthDate: string}> $rows */
        $rows = PatientFields::importRows($request, self::IMPORT_KEYS);

        return response()->json(['data' => $import->preview($rows)]);
    }

    public function import(Request $request, StudentImportService $import): JsonResponse
    {
        /** @var list<array{lrn: string, firstName: string, lastName: string, middleName: string, gradeLevel: string, section: string, sex: string, birthDate: string}> $rows */
        $rows = PatientFields::importRows($request, self::IMPORT_KEYS);
        $request->validate(['fileName' => ['nullable', 'string', 'max:255'], 'archiveIds' => ['array', 'max:5000'], 'archiveIds.*' => ['integer']]);
        $ids = array_values(array_map(fn (mixed $v): int => is_numeric($v) ? (int) $v : 0, (array) $request->input('archiveIds', [])));

        return response()->json(['data' => $import->apply($rows, $request->string('fileName')->value(), $ids, AuthController::user($request)->id)]);
    }

    public function incomplete(Request $request): JsonResponse
    {
        $rows = $this->students->incompleteQueue();
        if (! Paging::wanted($request)) {
            return response()->json(['data' => $rows]);
        }
        // One page of the Incomplete Records Queue (ADR-082), with the Open and Resolved counts of the
        // whole queue. ponytail: filtered and cut in memory; the active roll bounds it (about 900).
        $request->validate(['status' => ['nullable', 'in:open,resolved,all'], 'search' => ['nullable', 'string', 'max:120']]);
        $counts = ['open' => 0, 'resolved' => 0];
        foreach ($rows as $r) {
            $counts[$r['status'] === 'open' ? 'open' : 'resolved']++;
        }
        $status = $request->string('status')->value() ?: 'open';
        $term = mb_strtolower(trim($request->string('search')->value()));
        $digits = (string) preg_replace('/[\s-]/', '', $term);
        $student = fn (array $r): array => is_array($r['student']) ? $r['student'] : [];
        $rows = array_values(array_filter($rows, function (array $r) use ($status, $term, $digits, $student): bool {
            if ($status !== 'all' && $r['status'] !== $status) {
                return false;
            }
            if ($term === '') {
                return true;
            }
            $s = $student($r);
            $tail = substr(Row::text($s['lrn'] ?? ''), -4);
            $byLrn = preg_match('/\A\d+\z/', $digits) === 1 && (strlen($digits) <= 4 ? str_contains($tail, $digits) : str_ends_with($digits, $tail));

            return $byLrn || PersonName::matches(Row::text($s['fullName'] ?? ''), $term) || str_contains(mb_strtolower(Row::text($s['gradeLevel'] ?? '')), $term);
        }));
        [$sort, $direction] = Paging::sort($request, ['student', 'grade', 'missing', 'imported', 'status'], '-imported');
        $value = fn (array $r): ?string => match ($sort) {
            'grade' => Row::text($student($r)['gradeLevel'] ?? ''),
            'missing' => implode(', ', array_map(Row::text(...), is_array($r['missingFields']) ? $r['missingFields'] : [])),
            'imported' => is_array($r['review']) ? Row::text($r['review']['importedAt'] ?? '') : null,
            'status' => $r['status'] === 'open' ? 'Open' : 'Resolved',
            default => null,
        };
        $sign = $direction === 'desc' ? -1 : 1;
        if ($sort === 'student') {
            $rows = $sign === 1 ? $rows : array_reverse($rows);
        } else {
            // A record with no value (no import review) stays at the bottom either way, as on the screen.
            usort($rows, fn (array $a, array $b): int => match (true) {
                $value($a) === null && $value($b) === null => 0,
                $value($a) === null => 1,
                $value($b) === null => -1,
                default => $sign * strnatcasecmp((string) $value($a), (string) $value($b)),
            });
        }
        [$page, $meta] = Paging::apply($request, $rows);

        return response()->json(['data' => $page, 'meta' => ($meta ?? []) + ['counts' => $counts]]);
    }

    /** @return array<string, mixed> the validated `StudentInput` fields */
    private static function input(Request $request): array
    {
        $input = [];
        foreach ($request->only(array_keys(array_filter(self::INPUT_RULES, fn (string $k): bool => ! str_contains($k, '.'), ARRAY_FILTER_USE_KEY))) as $key => $value) {
            $input[(string) $key] = $value;
        }

        return $input;
    }
}
