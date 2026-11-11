<?php

declare(strict_types=1);

namespace App\Modules\StudentRecords\Controllers;

use App\Modules\StudentRecords\Services\StudentService;
use App\Modules\UserManagement\Controllers\AuthController;
use App\Shared\Support\PersonName;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Student Records (API-Contract Module 2). An LRN only ever travels in a request body (ADR-028). */
final class StudentController
{
    private const INPUT_RULES = [
        'lrn' => ['required', 'string', 'max:20'],
        'firstName' => ['present', 'nullable', 'string', 'max:200'],
        'lastName' => ['present', 'nullable', 'string', 'max:200'],
        'middleName' => ['nullable', 'string', 'max:200'],
        'gradeLevel' => ['nullable', 'string', 'max:40'],
        'section' => ['nullable', 'string', 'max:60'],
        'sex' => ['nullable', 'string', 'in:female,male'],
        'birthDate' => ['nullable', 'string', 'max:10'],
        'allergies' => ['array', 'max:50'],
        'allergies.*' => ['string', 'max:150'],
        'medicalConditions' => ['array', 'max:50'],
        'medicalConditions.*' => ['string', 'max:150'],
        'emergencyContacts' => ['array', 'max:10'],
        'emergencyContacts.*.name' => ['nullable', 'string', 'max:120'],
        'emergencyContacts.*.relationship' => ['nullable', 'string', 'max:40'],
        'emergencyContacts.*.phone' => ['nullable', 'string', 'max:30'],
        'emergencyContacts.*.verified' => ['boolean'],
    ];

    public function __construct(private readonly StudentService $students) {}

    public function query(Request $request): JsonResponse
    {
        $request->validate([
            'search' => ['nullable', 'string', 'max:120'], 'gradeLevel' => ['nullable', 'string', 'max:40'],
            'includeArchived' => ['boolean'], 'recordStatus' => ['nullable', 'in:complete,incomplete'], 'limit' => ['nullable', 'integer', 'min:1', 'max:5000'],
        ]);

        return response()->json(['data' => $this->students->list(
            $request->string('search')->value(),
            $request->string('gradeLevel')->value(),
            $request->boolean('includeArchived'),
            $request->string('recordStatus')->value(),
            $request->filled('limit') ? $request->integer('limit') : null,
        )]);
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

    public function incomplete(): JsonResponse
    {
        return response()->json(['data' => $this->students->incompleteQueue()]);
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
