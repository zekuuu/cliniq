<?php

declare(strict_types=1);

namespace App\Modules\StaffPatients\Services;

use App\Shared\AuditLog\AuditAction;
use App\Shared\AuditLog\AuditEvent;
use App\Shared\AuditLog\AuditLogger;
use App\Shared\AuditLog\AuditTarget;
use App\Shared\AuditLog\DatabaseAuditLogger;
use App\Shared\Sequences\Sequences;
use App\Shared\Support\ClinicTime;
use App\Shared\Support\PatientFields;
use App\Shared\Support\PersonName;
use App\Shared\Support\Row;
use App\Shared\Support\SchoolYears;
use Carbon\CarbonImmutable;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Staff patients (ADR-043): `listPersonnel`, `searchPersonnel`, `getPersonnel`, `savePersonnel`,
 * `archivePersonnel` and `getStaffIncompleteQueue` in the mock API. Staff only; the review queue lives
 * in `staff_record_reviews` (ADR-067, ADR-076).
 */
final class PersonnelService
{
    private const AUDITED = ['firstName', 'lastName', 'middleName', 'sex', 'type', 'department', 'contactInfo', 'allergies', 'medicalConditions', 'emergencyContacts'];

    public function __construct(private readonly AuditLogger $audit, private readonly SchoolYears $schoolYears) {}

    /** @return list<array<string, mixed>> `Personnel[]`, by last, first and middle name */
    public function list(string $search, string $type, bool $includeArchived): array
    {
        $search = mb_strtolower(trim($search));

        return array_values($this->records(fn (Builder $q) => $q
            ->when(! $includeArchived, fn (Builder $w) => $w->whereNull('p.archived_at'))
            ->when($type !== '', fn (Builder $w) => $w->where('p.type', $type)))
            ->filter(fn (PersonnelRecord $p): bool => $search === '' || PersonName::matches($p->fullName, $search) || str_contains(mb_strtolower($p->staffNumber), $search))
            ->map(fn (PersonnelRecord $p): array => $p->toArray())->all());
    }

    /**
     * Active staff by Staff No. ("STF-0007" or "0007") first, then by name; capped, nothing medical.
     *
     * @return list<array{id: string, staffNumber: string, fullName: string, type: string}>
     */
    public function search(string $query, int $limit): array
    {
        return array_values($this->matches($query)->take($limit)->map(fn (PersonnelRecord $p): array => $p->match())->all());
    }

    /** @return Collection<int, PersonnelRecord> the search's order, uncapped */
    public function matches(string $query): Collection
    {
        $q = mb_strtolower(trim($query));
        $number = preg_match('/\d/', $q) === 1 ? strtoupper((string) preg_replace('/\s/', '', $q)) : null;
        $active = $this->records(fn (Builder $w) => $w->whereNull('p.archived_at'), withDetails: false);
        $byNumber = $active->filter(fn (PersonnelRecord $p): bool => $number !== null && (str_starts_with($p->staffNumber, $number) || str_starts_with(substr($p->staffNumber, 4), $number)));

        return $byNumber->merge($active->filter(fn (PersonnelRecord $p): bool => ! $byNumber->has($p->id) && PersonName::matches($p->fullName, $q)));
    }

    public function find(int $id): PersonnelRecord
    {
        $record = $this->records(fn (Builder $w) => $w->where('p.id', $id))->first();
        abort_if($record === null, 404);

        return $record;
    }

    /** @return list<array<string, mixed>> `StaffIncompleteRecord[]` */
    public function incompleteQueue(): array
    {
        $reviews = DB::table('staff_record_reviews as r')->leftJoin('users as u', 'u.id', '=', 'r.resolved_by_user_id')
            ->orderBy('r.id')->get(['r.staff_id', 'r.resolved_by_user_id', 'r.resolved_at', 'u.name as resolved_by_name'])
            ->keyBy(fn (object $r): int => (int) Row::int($r, 'staff_id'));

        $out = [];
        foreach ($this->records(fn (Builder $w) => $w->whereNull('p.archived_at')) as $p) {
            $review = $reviews->get($p->id);
            $resolvedAt = $review === null ? null : Row::str($review, 'resolved_at');
            if ($p->missingFields === [] && $resolvedAt === null) {
                continue;
            }
            $out[] = [
                'person' => $p->toArray(),
                'missingFields' => $p->missingFields,
                'review' => $review === null ? null : [
                    'personnelId' => (string) $p->id,
                    'resolvedByUserId' => Row::str($review, 'resolved_by_user_id'),
                    'resolvedAt' => $resolvedAt === null ? null : ClinicTime::iso(CarbonImmutable::parse($resolvedAt)),
                ],
                'status' => $resolvedAt === null ? 'open' : 'resolved',
                'resolvedByName' => $review === null ? null : Row::str($review, 'resolved_by_name'),
            ];
        }

        return $out;
    }

    /**
     * Create (`$id` null) or update. The Staff No. is assigned on create, never edited or reused.
     *
     * @param  array<string, mixed>  $input  validated `PersonnelInput`
     * @return array{personnel: array<string, mixed>, action: string}
     */
    public function save(array $input, ?int $id, int $userId): array
    {
        $current = $id === null ? null : $this->find($id);
        $name = PatientFields::name($input, "the staff member's");
        $sex = PatientFields::text($input, 'sex');
        if (! in_array($sex, ['female', 'male'], true)) {
            throw ValidationException::withMessages(['sex' => 'Choose the sex.']);
        }
        $type = PatientFields::text($input, 'type');
        if (! in_array($type, $this->types(), true)) {
            throw ValidationException::withMessages(['type' => 'Choose the staff type.']);
        }
        $department = trim(PatientFields::text($input, 'department'));
        if (mb_strlen($department) > 60) {
            throw ValidationException::withMessages(['department' => 'Department or role can be at most 60 characters.']);
        }
        $contactInfo = trim(PatientFields::text($input, 'contactInfo'));
        $row = [
            'first_name' => $name['firstName'], 'last_name' => $name['lastName'], 'middle_name' => $name['middleName'], 'sex' => $sex, 'type' => $type,
            'department' => $department === '' ? null : $department, 'contact_number' => $contactInfo === '' ? null : $contactInfo,
        ];
        $health = ['allergy' => PatientFields::labels($input['allergies'] ?? []), 'condition' => PatientFields::labels($input['medicalConditions'] ?? [])];
        $contacts = PatientFields::contacts($input['emergencyContacts'] ?? []);

        $savedId = DB::transaction(function () use ($id, $row, $health, $contacts, $current, $userId): int {
            $now = CarbonImmutable::now();
            if ($id === null) {
                $id = DB::table('personnel')->insertGetId($row + ['staff_number' => sprintf('STF-%04d', Sequences::next('staff_number')), 'created_by_user_id' => $userId]);
            } else {
                DB::table('personnel')->where('id', $id)->update($row);
            }
            $this->writeDetails($id, $health, $contacts, $userId);
            $saved = $this->find($id);
            $old = $current?->toArray();
            $new = $saved->toArray();
            $this->audit->record(new AuditEvent(
                actorId: (string) $userId, actorRole: 'staff', action: $current === null ? AuditAction::Create : AuditAction::Update,
                targetType: AuditTarget::Staff, targetId: (string) $id, targetLabel: null, at: $now, subjectPersonnelId: (string) $id,
                summary: $old === null ? null : DatabaseAuditLogger::changedSummary(array_values(array_filter(self::AUDITED, fn (string $f): bool => $old[$f] !== $new[$f]))),
            ));
            $this->syncReview($id, $saved->missingFields !== [], $userId, $now);

            return $id;
        });

        return ['personnel' => $this->find($savedId)->toArray(), 'action' => $current === null ? 'create' : 'update'];
    }

    /** @return array<string, mixed> */
    public function archive(int $id, string $reason, int $userId): array
    {
        $this->find($id);
        $reason = PatientFields::archiveReason($reason);
        DB::transaction(function () use ($id, $reason, $userId): void {
            $now = CarbonImmutable::now();
            DB::table('personnel')->where('id', $id)->update([
                'archived_at' => $now, 'archived_by_user_id' => $userId, 'archive_reason' => $reason,
                'archived_school_year' => $this->schoolYears->labelOn(ClinicTime::date($now)),
            ]);
            $this->audit->record(new AuditEvent(
                actorId: (string) $userId, actorRole: 'staff', action: AuditAction::Archive, targetType: AuditTarget::Staff,
                targetId: (string) $id, targetLabel: null, at: $now, subjectPersonnelId: (string) $id,
            ));
        });

        return $this->find($id)->toArray();
    }

    /** @return list<string> `personnel_types` in `reference_settings` */
    public function types(): array
    {
        $json = DB::table('reference_settings')->where('setting_key', 'personnel_types')->value('setting_value');
        $types = is_string($json) ? json_decode($json, true) : null;

        return is_array($types) ? array_values(array_filter($types, is_string(...))) : [];
    }

    /**
     * @param  callable(Builder): mixed  $where
     * @return Collection<int, PersonnelRecord> in name order, keyed by id
     */
    private function records(callable $where, bool $withDetails = true): Collection
    {
        $query = DB::table('personnel as p')->select('p.*');
        $where($query);
        $rows = $query->get()->sort(PersonName::compare(...))->values();
        $ids = $withDetails ? $rows->map(fn (object $r): int => (int) Row::int($r, 'id'))->all() : [];
        $health = DB::table('personnel_health_entries')->whereIn('personnel_id', $ids)->orderBy('sort_order')->get();
        $contacts = DB::table('personnel_emergency_contacts')->whereIn('personnel_id', $ids)->orderBy('sort_order')->get();

        return $rows->mapWithKeys(function (object $r) use ($health, $contacts): array {
            $id = (int) Row::int($r, 'id');
            $labels = fn (string $kind): array => array_values($health
                ->filter(fn (object $h): bool => Row::int($h, 'personnel_id') === $id && Row::str($h, 'kind') === $kind)
                ->map(fn (object $h): string => (string) Row::str($h, 'label'))->all());
            $mine = array_values($contacts->filter(fn (object $c): bool => Row::int($c, 'personnel_id') === $id)
                ->map(fn (object $c): array => [
                    'name' => (string) Row::str($c, 'name'), 'relationship' => Row::str($c, 'relationship') ?? '',
                    'phone' => (string) Row::str($c, 'phone'), 'verified' => Row::str($c, 'is_verified') === '1',
                ])->all());

            return [$id => PersonnelRecord::fromRow($r, $labels('allergy'), $labels('condition'), $mine)];
        });
    }

    /**
     * @param  array<string, list<string>>  $health
     * @param  list<array{name: string, relationship: string, phone: string, verified: bool}>  $contacts
     */
    private function writeDetails(int $id, array $health, array $contacts, int $userId): void
    {
        DB::table('personnel_health_entries')->where('personnel_id', $id)->delete();
        foreach ($health as $kind => $labels) {
            foreach ($labels as $i => $label) {
                DB::table('personnel_health_entries')->insert(['personnel_id' => $id, 'kind' => $kind, 'label' => $label, 'sort_order' => $i, 'created_by_user_id' => $userId]);
            }
        }
        DB::table('personnel_emergency_contacts')->where('personnel_id', $id)->delete();
        foreach ($contacts as $i => $c) {
            DB::table('personnel_emergency_contacts')->insert([
                'personnel_id' => $id, 'name' => $c['name'], 'relationship' => $c['relationship'] === '' ? null : $c['relationship'],
                'phone' => $c['phone'], 'is_primary' => $i === 0 ? 1 : 0, 'sort_order' => $i, 'is_verified' => $c['verified'] ? 1 : 0,
            ]);
        }
    }

    /** ADR-076: an incomplete save opens a review if none is open; a complete save resolves the open one. */
    public function syncReview(int $id, bool $incomplete, int $userId, CarbonImmutable $now): void
    {
        $open = DB::table('staff_record_reviews')->where('staff_id', $id)->whereNull('resolved_at')->value('id');
        if ($incomplete && $open === null) {
            DB::table('staff_record_reviews')->insert(['staff_id' => $id, 'opened_at' => $now]);
        } elseif (! $incomplete && $open !== null) {
            DB::table('staff_record_reviews')->where('id', $open)->update(['resolved_by_user_id' => $userId, 'resolved_at' => $now]);
        }
    }
}
