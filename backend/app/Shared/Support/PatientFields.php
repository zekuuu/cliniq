<?php

declare(strict_types=1);

namespace App\Shared\Support;

use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/** Input cleaning shared by students and staff patients (ADR-043, ADR-064): names, health labels, contacts. */
final class PatientFields
{
    private const NAME_MAX = ['firstName' => 50, 'lastName' => 50, 'middleName' => 40];

    private const NAME_LABELS = ['firstName' => 'first name', 'lastName' => 'last name', 'middleName' => 'middle name'];

    /**
     * Trimmed, single-spaced parts; first and last required, middle optional (`cleanName` in the mock).
     *
     * @param  array<mixed>  $input
     * @return array{firstName: string, lastName: string, middleName: string|null}
     */
    public static function name(array $input, string $whose): array
    {
        $middle = PersonName::clean(self::text($input, 'middleName'));
        $name = ['firstName' => PersonName::clean(self::text($input, 'firstName')), 'lastName' => PersonName::clean(self::text($input, 'lastName')), 'middleName' => $middle === '' ? null : $middle];
        if ($name['firstName'] === '') {
            throw ValidationException::withMessages(['firstName' => "Enter {$whose} first name."]);
        }
        if ($name['lastName'] === '') {
            throw ValidationException::withMessages(['lastName' => "Enter {$whose} last name."]);
        }
        foreach (self::NAME_MAX as $key => $max) {
            if (mb_strlen((string) $name[$key]) > $max) {
                throw ValidationException::withMessages([$key => 'The '.self::NAME_LABELS[$key]." can be at most {$max} characters."]);
            }
        }

        return $name;
    }

    /** @param array<mixed> $input */
    public static function text(array $input, string $key): string
    {
        $v = $input[$key] ?? null;

        return is_string($v) ? $v : '';
    }

    /**
     * Trimmed, blanks dropped, each label once (ignoring case).
     *
     * @return list<string>
     */
    public static function labels(mixed $values): array
    {
        $out = [];
        foreach (is_array($values) ? $values : [] as $value) {
            $clean = PersonName::clean(is_string($value) ? $value : '');
            if ($clean !== '' && ! in_array(mb_strtolower($clean), array_map(mb_strtolower(...), $out), true)) {
                $out[] = $clean;
            }
        }

        return $out;
    }

    /** @return list<array{name: string, relationship: string, phone: string, verified: bool}> */
    public static function contacts(mixed $values): array
    {
        $out = [];
        foreach (is_array($values) ? $values : [] as $c) {
            $c = is_array($c) ? $c : [];
            $out[] = [
                'name' => PersonName::clean(self::text($c, 'name')), 'relationship' => trim(self::text($c, 'relationship')),
                'phone' => trim(self::text($c, 'phone')), 'verified' => ($c['verified'] ?? false) === true,
            ];
        }

        return $out;
    }

    /** One archive reason: single-spaced, at most 80 characters (ADR-072). */
    public static function archiveReason(string $reason): string
    {
        $reason = mb_substr(PersonName::clean($reason), 0, 80);
        if ($reason === '') {
            throw ValidationException::withMessages(['reason' => 'Give the reason for archiving.']);
        }

        return $reason;
    }

    /** The `StudentInput`/`PersonnelInput` validation rules for the shared fields. */
    public const RULES = [
        'firstName' => ['present', 'nullable', 'string', 'max:200'],
        'lastName' => ['present', 'nullable', 'string', 'max:200'],
        'middleName' => ['nullable', 'string', 'max:200'],
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

    /**
     * The mapped rows of an import, every field a string ("" when the column is empty).
     *
     * @param  list<string>  $keys
     * @return list<array<string, string>>
     */
    public static function importRows(Request $request, array $keys): array
    {
        $rules = ['rows' => ['required', 'array', 'max:5000']];
        foreach ($keys as $k) {
            $rules["rows.*.{$k}"] = ['nullable', 'string', 'max:255'];
        }
        $request->validate($rules);
        $out = [];
        foreach ((array) $request->input('rows') as $row) {
            $clean = [];
            foreach ($keys as $k) {
                $v = is_array($row) ? ($row[$k] ?? '') : '';
                $clean[$k] = is_string($v) ? $v : '';
            }
            $out[] = $clean;
        }

        return $out;
    }
}
