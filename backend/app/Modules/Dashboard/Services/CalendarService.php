<?php

declare(strict_types=1);

namespace App\Modules\Dashboard\Services;

use App\Shared\AuditLog\AuditAction;
use App\Shared\AuditLog\AuditEvent;
use App\Shared\AuditLog\AuditLogger;
use App\Shared\AuditLog\AuditTarget;
use App\Shared\AuditLog\DatabaseAuditLogger;
use App\Shared\Support\ClinicTime;
use App\Shared\Support\Row;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;

/**
 * The Dashboard calendar's two editable or synced layers: Staff and Admin events (ADR-019, ADR-042)
 * and read-only national holidays (ADR-020), synced monthly from a URL when online (Zean, November 13, 2026).
 */
final class CalendarService
{
    public const TITLE_MAX = 60;

    private const KINDS = ['regular', 'special-non-working', 'special-working', 'islamic'];

    public function __construct(private readonly AuditLogger $audit) {}

    /** @return list<array{id: string, title: string, startDate: string, endDate: string|null}> events overlapping the period, earliest first */
    public function events(string $from, string $to): array
    {
        return array_values(DB::table('calendar_events')->where('start_date', '<=', $to)->where('last_date', '>=', $from)->orderBy('start_date')->orderBy('title')->get()
            ->map(fn (object $e): array => ['id' => (string) Row::int($e, 'id'), 'title' => (string) Row::str($e, 'title'), 'startDate' => (string) Row::str($e, 'start_date'), 'endDate' => Row::str($e, 'end_date')])->all());
    }

    /**
     * @param  array<string, mixed>  $in
     * @return array<string, mixed> `CalendarEvent`
     */
    public function save(array $in, ?int $id, int $userId, string $role): array
    {
        $before = $id === null ? null : $this->find($id);
        $row = self::clean($in);

        return DB::transaction(function () use ($before, $id, $row, $userId, $role): array {
            if ($id === null) {
                $id = DB::table('calendar_events')->insertGetId($row + ['created_by_user_id' => $userId]);
            } else {
                DB::table('calendar_events')->where('id', $id)->update($row);
            }
            $after = $this->find($id);
            $changed = $before === null ? [] : array_values(array_filter(['title', 'startDate', 'endDate'], fn (string $f): bool => $before[$f] !== $after[$f]));
            $this->log($userId, $role, $before === null ? AuditAction::Create : AuditAction::Update, $id, $before === null ? null : DatabaseAuditLogger::changedSummary($changed));

            return $after;
        });
    }

    /** The one real delete in the system: an event is not a health record. */
    public function delete(int $id, int $userId, string $role): void
    {
        $this->find($id);
        DB::transaction(function () use ($id, $userId, $role): void {
            DB::table('calendar_events')->where('id', $id)->delete();
            $this->log($userId, $role, AuditAction::Delete, $id, null);
        });
    }

    /** @return array{holidays: list<array{date: string, name: string, kind: string, confirmed: bool}>, years: list<int>, lastUpdated: string|null, source: string} */
    public function holidays(string $from, string $to): array
    {
        $last = DB::table('holiday_sync_runs')->where('status', 'ok')->orderByDesc('ran_at')->orderByDesc('id')->first();

        return [
            'holidays' => array_values(DB::table('holidays')->whereBetween('holiday_date', [$from, $to])->orderBy('holiday_date')->orderBy('name')->get()
                ->map(fn (object $h): array => ['date' => (string) Row::str($h, 'holiday_date'), 'name' => (string) Row::str($h, 'name'), 'kind' => (string) Row::str($h, 'kind'), 'confirmed' => Row::str($h, 'is_confirmed') === '1'])->all()),
            'years' => array_values(DB::table('holidays')->selectRaw('DISTINCT YEAR(holiday_date) AS y')->orderBy('y')->pluck('y')->map(fn (mixed $y): int => (int) Row::toInt($y))->all()),
            'lastUpdated' => $last === null ? null : substr((string) Row::str($last, 'ran_at'), 0, 10),
            'source' => $last === null ? '' : (string) Row::str($last, 'source'),
        ];
    }

    /**
     * Fetches the holidays when the last good sync is 30 or more days old (or `$force`), from a URL or
     * a local file in the bundled `holidays-ph.json` format. A failure keeps the last good data and is
     * logged; the scheduler tries again the next day. Never throws.
     *
     * @return array{status: string, message: string}
     */
    public function sync(bool $force, ?string $file): array
    {
        $lastOk = DB::table('holiday_sync_runs')->where('status', 'ok')->max('ran_at');
        if (! $force && $file === null && is_string($lastOk) && CarbonImmutable::parse($lastOk)->greaterThan(CarbonImmutable::now()->subDays(30))) {
            return ['status' => 'skipped', 'message' => 'Holidays are up to date.'];
        }
        $source = $file ?? config()->string('cliniq.holiday_source_url');
        $year = (int) substr(ClinicTime::today(), 0, 4);
        $years = $year.','.($year + 1);
        try {
            if ($source === '') {
                throw new \RuntimeException('No holiday source is set (CLINIQ_HOLIDAY_SOURCE_URL).');
            }
            $body = $file !== null ? (string) @file_get_contents($file) : Http::timeout(15)->get($source)->throw()->body();
            $data = json_decode($body, true);
            $list = is_array($data) && is_array($data['holidays'] ?? null) ? $data['holidays'] : null;
            if ($list === null || $list === []) {
                throw new \RuntimeException('The holiday source returned no holidays.');
            }
            $rows = [];
            foreach ($list as $h) {
                $h = is_array($h) ? $h : [];
                $date = Row::text($h['date'] ?? '');
                $name = mb_substr(trim(Row::text($h['name'] ?? '')), 0, 120);
                $kind = Row::text($h['kind'] ?? '');
                if (preg_match('/\A\d{4}-\d{2}-\d{2}\z/', $date) === 1 && $name !== '' && in_array($kind, self::KINDS, true)) {
                    $rows[$date.'|'.mb_strtolower($name)] = ['holiday_date' => $date, 'name' => $name, 'kind' => $kind, 'is_confirmed' => ($h['confirmed'] ?? true) === false ? 0 : 1];
                }
            }
            if ($rows === []) {
                throw new \RuntimeException('The holiday source had no usable entries.');
            }
            $label = mb_substr(Row::text(is_array($data['meta'] ?? null) ? ($data['meta']['source'] ?? 'Holiday list') : 'Holiday list'), 0, 60);
            DB::transaction(function () use ($rows, $label, $years): void {
                $now = CarbonImmutable::now();
                $listed = array_unique(array_map(fn (array $r): string => substr($r['holiday_date'], 0, 4), $rows));
                // The years the source lists are replaced as a whole; other years keep their last good data.
                DB::table('holidays')->whereIn(DB::raw('YEAR(holiday_date)'), $listed)->delete();
                foreach (array_chunk(array_values($rows), 200) as $chunk) {
                    DB::table('holidays')->insert(array_map(fn (array $r): array => $r + ['source' => $label, 'synced_at' => $now], $chunk));
                }
                DB::table('holiday_sync_runs')->insert(['ran_at' => $now, 'source' => $label, 'years_requested' => $years, 'status' => 'ok', 'records_upserted' => count($rows)]);
            });

            return ['status' => 'ok', 'message' => count($rows).' holidays loaded.'];
        } catch (\Throwable $e) {
            DB::table('holiday_sync_runs')->insert(['ran_at' => CarbonImmutable::now(), 'source' => mb_substr($file !== null ? 'local file' : 'url', 0, 60), 'years_requested' => $years, 'status' => 'failed', 'error_message' => mb_substr($e->getMessage(), 0, 500)]);

            return ['status' => 'failed', 'message' => 'Holiday sync failed; the last good list stays. It will try again tomorrow.'];
        }
    }

    /** @return array<string, mixed> */
    private function find(int $id): array
    {
        $e = DB::table('calendar_events')->where('id', $id)->first();
        abort_if($e === null, 404);
        $at = fn (string $c): string => ClinicTime::iso(CarbonImmutable::parse((string) Row::str($e, $c)));

        return [
            'id' => (string) $id, 'title' => (string) Row::str($e, 'title'), 'startDate' => (string) Row::str($e, 'start_date'), 'endDate' => Row::str($e, 'end_date'),
            'createdByUserId' => (string) Row::int($e, 'created_by_user_id'), 'createdAt' => $at('created_at'), 'updatedAt' => $at('updated_at'),
        ];
    }

    /**
     * `validateCalendarEvent`: field messages, all at once.
     *
     * @param  array<string, mixed>  $in
     * @return array{title: string, start_date: string, end_date: string|null}
     */
    private static function clean(array $in): array
    {
        $title = trim(Row::text($in['title'] ?? ''));
        $start = Row::text($in['startDate'] ?? '');
        $end = Row::text($in['endDate'] ?? '');
        $real = fn (string $d): bool => ($x = \DateTimeImmutable::createFromFormat('!Y-m-d', $d)) !== false && $x->format('Y-m-d') === $d;
        $errors = [];
        if ($title === '') {
            $errors['title'] = 'Enter a title for the event.';
        } elseif (mb_strlen($title) > self::TITLE_MAX) {
            $errors['title'] = 'Keep the title to '.self::TITLE_MAX.' characters or fewer.';
        }
        if ($start === '') {
            $errors['startDate'] = 'Choose the date the event starts.';
        } elseif (! $real($start)) {
            $errors['startDate'] = 'Enter a valid start date.';
        }
        if ($end !== '') {
            if (! $real($end)) {
                $errors['endDate'] = 'Enter a valid end date.';
            } elseif (! isset($errors['startDate']) && $end < $start) {
                $errors['endDate'] = "The end date can't be before the start date.";
            }
        }
        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }

        return ['title' => $title, 'start_date' => $start, 'end_date' => $end !== '' && $end !== $start ? $end : null];
    }

    private function log(int $userId, string $role, AuditAction $action, int $id, ?string $summary): void
    {
        $this->audit->record(new AuditEvent(
            actorId: (string) $userId, actorRole: $role, action: $action, targetType: AuditTarget::CalendarEvent,
            targetId: (string) $id, targetLabel: null, at: CarbonImmutable::now(), summary: $summary,
        ));
    }
}
