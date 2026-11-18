<?php

declare(strict_types=1);

namespace App\Modules\StaffPatients\Controllers;

use App\Modules\StaffPatients\Services\PersonnelService;
use App\Modules\StaffPatients\Services\StaffImportService;
use App\Modules\StudentRecords\Services\StudentService;
use App\Modules\UserManagement\Controllers\AuthController;
use App\Shared\Support\PatientFields;
use App\Shared\Support\PersonName;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Staff patients and the one patient box (API-Contract Module 2a, ADR-043). Staff only, but `GET /api/patients/student/{id}`. */
final class PersonnelController
{
    private const INPUT_RULES = PatientFields::RULES + [
        'sex' => ['nullable', 'string'],
        'type' => ['nullable', 'string', 'max:30'],
        'department' => ['nullable', 'string', 'max:200'],
        'contactInfo' => ['nullable', 'string', 'max:60'],
    ];

    public function __construct(private readonly PersonnelService $personnel) {}

    public function index(Request $request): JsonResponse
    {
        $request->validate(['search' => ['nullable', 'string', 'max:120'], 'type' => ['nullable', 'string', 'max:30'], 'includeArchived' => ['nullable', 'in:0,1,true,false']]);

        return response()->json(['data' => $this->personnel->list($request->string('search')->value(), $request->string('type')->value(), $request->boolean('includeArchived'))]);
    }

    public function search(Request $request): JsonResponse
    {
        $request->validate(['q' => ['nullable', 'string', 'max:120'], 'limit' => ['nullable', 'integer', 'min:1', 'max:50']]);

        return response()->json(['data' => $this->personnel->search($request->string('q')->value(), $request->filled('limit') ? $request->integer('limit') : 8)]);
    }

    private const IMPORT_KEYS = ['staffNumber', 'firstName', 'lastName', 'middleName', 'sex', 'type', 'department', 'contactInfo', 'contactName', 'contactRelationship', 'contactPhone'];

    public function importPreview(Request $request, StaffImportService $import): JsonResponse
    {
        /** @var list<array{staffNumber: string, firstName: string, lastName: string, middleName: string, sex: string, type: string, department: string, contactInfo: string, contactName: string, contactRelationship: string, contactPhone: string}> $rows */
        $rows = PatientFields::importRows($request, self::IMPORT_KEYS);

        return response()->json(['data' => $import->preview($rows)]);
    }

    public function import(Request $request, StaffImportService $import): JsonResponse
    {
        /** @var list<array{staffNumber: string, firstName: string, lastName: string, middleName: string, sex: string, type: string, department: string, contactInfo: string, contactName: string, contactRelationship: string, contactPhone: string}> $rows */
        $rows = PatientFields::importRows($request, self::IMPORT_KEYS);
        $request->validate(['fileName' => ['nullable', 'string', 'max:255']]);

        return response()->json(['data' => $import->apply($rows, $request->string('fileName')->value(), AuthController::user($request)->id)]);
    }

    public function incomplete(): JsonResponse
    {
        return response()->json(['data' => $this->personnel->incompleteQueue()]);
    }

    public function show(int $id): JsonResponse
    {
        return response()->json(['data' => $this->personnel->find($id)->toArray()]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate(self::INPUT_RULES);

        return response()->json(['data' => $this->personnel->save(self::input($request), null, AuthController::user($request)->id)], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $request->validate(self::INPUT_RULES);

        return response()->json(['data' => $this->personnel->save(self::input($request), $id, AuthController::user($request)->id)]);
    }

    public function archive(Request $request, int $id): JsonResponse
    {
        $request->validate(['reason' => ['nullable', 'string', 'max:200']]);

        return response()->json(['data' => $this->personnel->archive($id, $request->string('reason')->value(), AuthController::user($request)->id)]);
    }

    /** `POST /api/patients/search`: students and staff, labelled by kind, by last name, capped (ADR-043 item 5). */
    public function searchPatients(Request $request, StudentService $students): JsonResponse
    {
        $request->validate(['q' => ['nullable', 'string', 'max:120'], 'limit' => ['nullable', 'integer', 'min:1', 'max:50']]);
        $q = $request->string('q')->value();
        $limit = $request->filled('limit') ? $request->integer('limit') : 8;
        $rows = [];
        foreach ($students->matches($q)->take($limit) as $s) {
            $rows[] = ['sort' => [$s->lastName, $s->firstName, (string) $s->middleName], 'row' => ['kind' => 'student'] + $s->match()];
        }
        foreach ($this->personnel->matches($q)->take($limit) as $p) {
            $rows[] = ['sort' => [$p->lastName, $p->firstName, (string) $p->middleName], 'row' => ['kind' => 'personnel'] + $p->match()];
        }
        usort($rows, fn (array $a, array $b): int => array_map(PersonName::key(...), $a['sort']) <=> array_map(PersonName::key(...), $b['sort']));

        return response()->json(['data' => array_slice(array_column($rows, 'row'), 0, $limit)]);
    }

    /** `GET /api/patients/{kind}/{id}`: a staff patient does not exist for the Admin (404, ADR-038). */
    public function patient(Request $request, string $kind, int $id, StudentService $students): JsonResponse
    {
        if ($kind === 'student') {
            return response()->json(['data' => ['kind' => 'student'] + $students->show($id)]);
        }
        abort_unless($kind === 'personnel' && AuthController::user($request)->role === 'staff', 404);

        return response()->json(['data' => ['kind' => 'personnel'] + $this->personnel->find($id)->toArray()]);
    }

    /** @return array<string, mixed> */
    private static function input(Request $request): array
    {
        $input = [];
        foreach ($request->only(array_keys(array_filter(self::INPUT_RULES, fn (string $k): bool => ! str_contains($k, '.'), ARRAY_FILTER_USE_KEY))) as $key => $value) {
            $input[(string) $key] = $value;
        }

        return $input;
    }
}
