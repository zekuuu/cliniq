<?php

declare(strict_types=1);

namespace App\Modules\StaffPatients\Services;

use App\Shared\AuditLog\AuditAction;
use App\Shared\AuditLog\AuditEvent;
use App\Shared\AuditLog\AuditLogger;
use App\Shared\AuditLog\AuditTarget;
use App\Shared\Sequences\Sequences;
use App\Shared\Support\PersonName;
use App\Shared\Support\Row;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

/**
 * The staff list import (ADR-067, ADR-069; `previewStaffImport`, `applyStaffImport`). Adds new staff,
 * updates matched ones and restores a matched archived record; staff missing from the file are left
 * alone. Matches by Staff No., else by name and type. A file that changes nothing writes nothing.
 *
 * @phpstan-type StaffRow array{staffNumber: string, firstName: string, lastName: string, middleName: string, sex: string, type: string, department: string, contactInfo: string, contactName: string, contactRelationship: string, contactPhone: string}
 * @phpstan-type Plan array{row: StaffRow, id: int|null, fields: array<string, string|null>, contact: array{name: string, relationship: string, phone: string}|null, changes: bool}
 */
final class StaffImportService
{
    /** `frontend/src/lib/phone.ts`: mobile, landline with area code, or a 7- or 8-digit local number. */
    private const PHONE = '/\A(?:09\d{9}|\+?639\d{9}|0[2-8]\d{8}|\+?63[2-8]\d{8}|\d{7,8})\z/';

    public function __construct(private readonly PersonnelService $personnel, private readonly AuditLogger $audit) {}

    /**
     * @param  list<StaffRow>  $rows
     * @return array{newCount: int, continuingCount: int, changedCount: int, problems: list<array{line: int, name: string, problem: string}>}
     */
    public function preview(array $rows): array
    {
        [$plans, $problems] = $this->plan($rows);
        $known = array_filter($plans, fn (array $p): bool => $p['id'] !== null);

        return [
            'newCount' => count($plans) - count($known),
            'continuingCount' => count($known),
            'changedCount' => count(array_filter($known, fn (array $p): bool => $p['changes'])),
            'problems' => $problems,
        ];
    }

    /**
     * @param  list<StaffRow>  $rows
     * @return array{created: int, updated: int, flagged: int}
     */
    public function apply(array $rows, string $fileName, int $userId): array
    {
        [$plans, $problems] = $this->plan($rows);
        $todo = array_values(array_filter($plans, fn (array $p): bool => $p['id'] === null || $p['changes']));
        $created = count(array_filter($todo, fn (array $p): bool => $p['id'] === null));
        $result = ['created' => $created, 'updated' => count($todo) - $created, 'flagged' => count($problems)];
        if ($todo === []) {
            return $result;
        }
        DB::transaction(function () use ($todo, $result, $fileName, $userId): void {
            $now = CarbonImmutable::now();
            foreach ($todo as $plan) {
                $id = $plan['id'];
                if ($id === null) {
                    $id = DB::table('personnel')->insertGetId($plan['fields'] + ['staff_number' => sprintf('STF-%04d', Sequences::next('staff_number')), 'created_by_user_id' => $userId]);
                } else {
                    // A matched archived record comes back (ADR-069).
                    DB::table('personnel')->where('id', $id)->update($plan['fields'] + ['archived_at' => null, 'archived_by_user_id' => null, 'archive_reason' => null, 'archived_school_year' => null]);
                }
                if ($plan['contact'] !== null) {
                    DB::table('personnel_emergency_contacts')->insert(['personnel_id' => $id, 'is_primary' => 1, 'sort_order' => 0, 'is_verified' => 0] + $plan['contact']);
                }
                $this->personnel->syncReview($id, $this->personnel->find($id)->missingFields !== [], $userId, $now);
            }
            $this->audit->record(new AuditEvent(
                actorId: (string) $userId, actorRole: 'staff', action: AuditAction::Submit, targetType: AuditTarget::StaffImport,
                targetId: null, targetLabel: mb_substr('Staff import '.$now->format('Y-m-d H:i').($fileName !== '' ? ' ('.preg_replace('/\d{12,}|@/', '…', $fileName).')' : ''), 0, 120), at: $now,
                summary: "{$result['created']} added, {$result['updated']} updated, {$result['flagged']} flagged",
            ));
        });

        return $result;
    }

    /**
     * The mock's `planStaffImport`, in its order of checks.
     *
     * @param  list<StaffRow>  $rows
     * @return array{0: list<Plan>, 1: list<array{line: int, name: string, problem: string}>}
     */
    private function plan(array $rows): array
    {
        $types = $this->personnel->types();
        $all = DB::table('personnel')->get()->map(fn (object $p): array => [
            'id' => (int) Row::int($p, 'id'), 'staffNumber' => (string) Row::str($p, 'staff_number'), 'type' => (string) Row::str($p, 'type'),
            'key' => PersonName::key(PersonName::format((string) Row::str($p, 'first_name'), Row::str($p, 'middle_name'), (string) Row::str($p, 'last_name'))),
            'archived' => Row::str($p, 'archived_at') !== null,
            'fields' => ['first_name' => Row::str($p, 'first_name'), 'last_name' => Row::str($p, 'last_name'), 'middle_name' => Row::str($p, 'middle_name'), 'sex' => Row::str($p, 'sex'), 'type' => Row::str($p, 'type'), 'department' => Row::str($p, 'department'), 'contact_number' => Row::str($p, 'contact_number')],
        ])->values()->all();
        $withContacts = array_flip(DB::table('personnel_emergency_contacts')->distinct()->pluck('personnel_id')->map(fn (mixed $v): int => is_numeric($v) ? (int) $v : 0)->all());
        $numbers = array_count_values(array_filter(array_map(fn (array $r): string => strtoupper(trim($r['staffNumber'])), $rows)));
        $plans = [];
        $problems = [];
        $claimed = [];
        foreach ($rows as $i => $row) {
            $line = $i + 2;
            $name = trim(PersonName::clean($row['firstName']).' '.PersonName::clean($row['lastName']));
            $type = collect($types)->first(fn (string $t): bool => mb_strtolower($t) === mb_strtolower(trim($row['type'])));
            $sex = preg_match('/\Am(ale)?\z/i', trim($row['sex'])) === 1 ? 'male' : (preg_match('/\Af(emale)?\z/i', trim($row['sex'])) === 1 ? 'female' : null);
            $contactStarted = trim($row['contactName'].$row['contactRelationship'].$row['contactPhone']) !== '';
            $number = strtoupper(trim($row['staffNumber']));
            $byNumber = $number === '' ? null : (array_values(array_filter($all, fn (array $p): bool => $p['staffNumber'] === $number))[0] ?? null);
            $key = PersonName::key(PersonName::format($row['firstName'], $row['middleName'], $row['lastName']));
            $byName = $number === '' ? array_values(array_filter($all, fn (array $p): bool => $p['type'] === $type && $p['key'] === $key)) : [];
            $department = trim($row['department']);
            $problem = match (true) {
                PersonName::clean($row['firstName']) === '' || PersonName::clean($row['lastName']) === '' => 'The name is incomplete.',
                mb_strlen(PersonName::clean($row['firstName'])) > 50 || mb_strlen(PersonName::clean($row['lastName'])) > 50 || mb_strlen(PersonName::clean($row['middleName'])) > 40 => 'The name is too long.',
                $sex === null => 'Sex must be Male or Female.',
                $type === null => "\"{$row['type']}\" is not a staff type (".implode(', ', $types).').',
                $number !== '' && ($numbers[$number] ?? 0) > 1 => 'This Staff No. appears more than once in the file.',
                $number !== '' && $byNumber === null => "No staff record has the Staff No. {$number}. Leave it blank to add a new staff member.",
                count($byName) > 1 => 'More than one staff member has this name and type. Add the Staff No. to this row.',
                mb_strlen($department) > 60 => 'Department or role can be at most 60 characters.',
                $contactStarted && (trim($row['contactName']) === '' || trim($row['contactRelationship']) === '' || trim($row['contactPhone']) === '') => 'The emergency contact needs a name, relationship and phone.',
                $contactStarted && preg_match(self::PHONE, (string) preg_replace('/[\s().-]/', '', trim($row['contactPhone']))) !== 1 => 'The emergency contact phone is not a Philippine number.',
                default => null,
            };
            $record = $byNumber ?? ($byName[0] ?? null);
            if ($problem === null && $record !== null && isset($claimed[$record['id']])) {
                $problem = 'Another row in the file is the same staff member.';
            }
            if ($problem !== null) {
                $problems[] = ['line' => $line, 'name' => $name, 'problem' => $problem];

                continue;
            }
            if ($record !== null) {
                $claimed[$record['id']] = true;
            }
            $fields = [
                'first_name' => PersonName::clean($row['firstName']), 'last_name' => PersonName::clean($row['lastName']),
                'middle_name' => PersonName::clean($row['middleName']) ?: null, 'sex' => $sex, 'type' => (string) $type,
                'department' => $department !== '' ? $department : ($record['fields']['department'] ?? null),
            ];
            if (trim($row['contactInfo']) !== '') {
                $fields['contact_number'] = mb_substr(trim($row['contactInfo']), 0, 60);
            }
            $contact = $contactStarted && ($record === null || ! isset($withContacts[$record['id']]))
                ? ['name' => mb_substr(PersonName::clean($row['contactName']), 0, 120), 'relationship' => mb_substr(trim($row['contactRelationship']), 0, 40), 'phone' => mb_substr(trim($row['contactPhone']), 0, 30)]
                : null;
            $changes = $record === null || $record['archived'] || $contact !== null
                || array_filter($fields, fn (?string $v, string $k): bool => ($record['fields'][$k] ?? null) !== $v, ARRAY_FILTER_USE_BOTH) !== [];
            $plans[] = ['row' => $row, 'id' => $record['id'] ?? null, 'fields' => $fields, 'contact' => $contact, 'changes' => $changes];
        }

        return [$plans, $problems];
    }
}
