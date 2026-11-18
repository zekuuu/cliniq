<?php

declare(strict_types=1);

namespace App\Modules\StudentRecords\Services;

use App\Shared\Support\ClinicTime;
use App\Shared\Support\Lrn;
use App\Shared\Support\PersonName;
use App\Shared\Support\Row;
use Carbon\CarbonImmutable;

/** One stored student, read with its health entries and contacts; `toArray()` is the `Student` type. */
final readonly class StudentRecord
{
    public string $fullName;

    /** @var list<string> `missingRequiredFields` in the mock's selectors; saving never blocks on these. */
    public array $missingFields;

    /**
     * @param  list<string>  $allergies
     * @param  list<string>  $medicalConditions
     * @param  list<array{name: string, relationship: string, phone: string, verified: bool}>  $contacts
     */
    public function __construct(
        public int $id,
        public string $lrn,
        public string $firstName,
        public string $lastName,
        public ?string $middleName,
        public string $gradeLevel,
        public ?string $section,
        public ?string $sex,
        public ?string $birthDate,
        public array $allergies,
        public array $medicalConditions,
        public array $contacts,
        public ?string $archivedAt,
        public ?string $archiveReason,
        public ?string $archivedSchoolYear,
    ) {
        $this->fullName = PersonName::format($firstName, $middleName, $lastName);
        $this->missingFields = self::missing($gradeLevel, $sex, $birthDate, $contacts);
    }

    /**
     * @param  list<string>  $allergies
     * @param  list<string>  $conditions
     * @param  list<array{name: string, relationship: string, phone: string, verified: bool}>  $contacts
     */
    public static function fromRow(object $s, array $allergies, array $conditions, array $contacts): self
    {
        $archivedAt = Row::str($s, 'archived_at');

        return new self(
            id: (int) Row::int($s, 'id'),
            lrn: (string) Row::str($s, 'lrn'),
            firstName: (string) Row::str($s, 'first_name'),
            lastName: (string) Row::str($s, 'last_name'),
            middleName: Row::str($s, 'middle_name'),
            gradeLevel: Row::str($s, 'grade_level') ?? '',
            section: Row::str($s, 'section'),
            sex: Row::str($s, 'sex'),
            birthDate: Row::str($s, 'birth_date'),
            allergies: $allergies,
            medicalConditions: $conditions,
            contacts: $contacts,
            archivedAt: $archivedAt === null ? null : ClinicTime::iso(CarbonImmutable::parse($archivedAt)),
            archiveReason: Row::str($s, 'archive_reason'),
            archivedSchoolYear: Row::str($s, 'archived_school_year'),
        );
    }

    public function complete(): bool
    {
        return $this->missingFields === [];
    }

    /** @return array<string, mixed> the `Student` type, full LRN (single-student responses only, ADR-040) */
    public function toArray(): array
    {
        return [
            'id' => (string) $this->id,
            'lrn' => $this->lrn,
            'firstName' => $this->firstName,
            'lastName' => $this->lastName,
            'middleName' => $this->middleName,
            'fullName' => $this->fullName,
            'gradeLevel' => $this->gradeLevel,
            'section' => $this->section,
            'sex' => $this->sex,
            'birthDate' => $this->birthDate,
            'allergies' => $this->allergies,
            'medicalConditions' => $this->medicalConditions,
            'emergencyContacts' => $this->contacts,
            'recordComplete' => $this->complete(),
            'archived' => $this->archivedAt !== null,
            'archivedAt' => $this->archivedAt,
            'archiveReason' => $this->archiveReason,
            'archivedSchoolYear' => $this->archivedSchoolYear,
        ];
    }

    /** @return array{id: string, lrn: string, fullName: string, gradeLevel: string, archived: bool, recordComplete: bool} `StudentListRow`, masked */
    public function row(): array
    {
        return [
            'id' => (string) $this->id, 'lrn' => Lrn::mask($this->lrn), 'fullName' => $this->fullName,
            'gradeLevel' => $this->gradeLevel, 'archived' => $this->archivedAt !== null, 'recordComplete' => $this->complete(),
        ];
    }

    /** @return array{id: string, lrn: string, fullName: string, gradeLevel: string} `StudentSearchResult` and `DuplicateMatch`, masked */
    public function match(): array
    {
        return ['id' => (string) $this->id, 'lrn' => Lrn::mask($this->lrn), 'fullName' => $this->fullName, 'gradeLevel' => $this->gradeLevel];
    }

    /**
     * @param  list<array{name: string, relationship: string, phone: string, verified: bool}>  $contacts
     * @return list<string>
     */
    private static function missing(string $grade, ?string $sex, ?string $birthDate, array $contacts): array
    {
        $missing = [];
        if ($grade === '') {
            $missing[] = 'Grade level';
        }
        if ($sex === null) {
            $missing[] = 'Sex';
        }
        if ($birthDate === null) {
            $missing[] = 'Birthdate';
        }
        if ($contacts === []) {
            $missing[] = 'Emergency contact';
        }
        foreach ($contacts as $i => $c) {
            $prefix = count($contacts) === 1 ? 'Emergency contact' : 'Emergency contact '.($i + 1);
            foreach (['name', 'relationship', 'phone'] as $key) {
                if ($c[$key] === '') {
                    $missing[] = "{$prefix} {$key}";
                }
            }
        }

        return $missing;
    }
}
