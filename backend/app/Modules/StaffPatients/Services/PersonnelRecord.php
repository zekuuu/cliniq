<?php

declare(strict_types=1);

namespace App\Modules\StaffPatients\Services;

use App\Shared\Support\ClinicTime;
use App\Shared\Support\PersonName;
use App\Shared\Support\Row;
use Carbon\CarbonImmutable;

/** One stored staff patient (ADR-043); `toArray()` is the `Personnel` type. Lists show names (D7). */
final readonly class PersonnelRecord
{
    public string $fullName;

    /** @var list<string> `missingStaffFields` (ADR-067); saving never blocks on these. */
    public array $missingFields;

    /**
     * @param  list<string>  $allergies
     * @param  list<string>  $medicalConditions
     * @param  list<array{name: string, relationship: string, phone: string, verified: bool}>  $contacts
     */
    public function __construct(
        public int $id,
        public string $staffNumber,
        public string $firstName,
        public string $lastName,
        public ?string $middleName,
        public ?string $sex,
        public string $type,
        public ?string $department,
        public string $contactInfo,
        public array $allergies,
        public array $medicalConditions,
        public array $contacts,
        public ?string $archivedAt,
        public ?string $archiveReason,
        public ?string $archivedSchoolYear,
    ) {
        $this->fullName = PersonName::format($firstName, $middleName, $lastName);
        $missing = [];
        if ($sex === null) {
            $missing[] = 'Sex';
        }
        if ($contacts === []) {
            $missing[] = 'Emergency contact';
        }
        $this->missingFields = $missing;
    }

    /**
     * @param  list<string>  $allergies
     * @param  list<string>  $conditions
     * @param  list<array{name: string, relationship: string, phone: string, verified: bool}>  $contacts
     */
    public static function fromRow(object $p, array $allergies, array $conditions, array $contacts): self
    {
        $archivedAt = Row::str($p, 'archived_at');

        return new self(
            id: (int) Row::int($p, 'id'),
            staffNumber: (string) Row::str($p, 'staff_number'),
            firstName: (string) Row::str($p, 'first_name'),
            lastName: (string) Row::str($p, 'last_name'),
            middleName: Row::str($p, 'middle_name'),
            sex: Row::str($p, 'sex'),
            type: (string) Row::str($p, 'type'),
            department: Row::str($p, 'department'),
            contactInfo: Row::str($p, 'contact_number') ?? '',
            allergies: $allergies,
            medicalConditions: $conditions,
            contacts: $contacts,
            archivedAt: $archivedAt === null ? null : ClinicTime::iso(CarbonImmutable::parse($archivedAt)),
            archiveReason: Row::str($p, 'archive_reason'),
            archivedSchoolYear: Row::str($p, 'archived_school_year'),
        );
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'id' => (string) $this->id,
            'staffNumber' => $this->staffNumber,
            'firstName' => $this->firstName,
            'lastName' => $this->lastName,
            'middleName' => $this->middleName,
            'fullName' => $this->fullName,
            'sex' => $this->sex,
            'type' => $this->type,
            'department' => $this->department,
            'contactInfo' => $this->contactInfo,
            'allergies' => $this->allergies,
            'medicalConditions' => $this->medicalConditions,
            'emergencyContacts' => $this->contacts,
            'archived' => $this->archivedAt !== null,
            'archivedAt' => $this->archivedAt,
            'archiveReason' => $this->archiveReason,
            'archivedSchoolYear' => $this->archivedSchoolYear,
        ];
    }

    /** @return array{id: string, staffNumber: string, fullName: string, type: string} `PersonnelSearchResult` */
    public function match(): array
    {
        return ['id' => (string) $this->id, 'staffNumber' => $this->staffNumber, 'fullName' => $this->fullName, 'type' => $this->type];
    }
}
