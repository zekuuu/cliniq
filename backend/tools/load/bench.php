<?php

declare(strict_types=1);

/*
 * The load-test client (08-Logs/Load-Test-Nov16). Plain PHP with curl, no Laravel, so the same file
 * runs on the clinic PC (PHP, no Node) against its training database. It signs in for real (the CSRF
 * cookie, the login, then the session and X-XSRF-TOKEN), one session per person, and never weakens a
 * limit: logins are paced under 10 a minute, each person stays under 120 requests a minute.
 *
 *   php tools/load/bench.php journey  [--base=http://localhost:8081] [--runs=5] [--user=load.nurse]
 *   php tools/load/bench.php crowd    --people=5 --minutes=10 [--pause=3]    (pause 0 = until the first 429 or error)
 *   php tools/load/bench.php nav      count the requests one screen change makes is a browser job; see NOTES
 *
 * Accounts: load.nurse and load.bench01..20, password Load-Test-Only-2026 (test database only).
 * Results: printed, and appended to storage/load/results.jsonl.
 */

$cmd = $argv[1] ?? 'journey';
$opt = ['base' => 'http://localhost:8081', 'runs' => 5, 'user' => 'load.nurse', 'people' => 5, 'minutes' => 10, 'pause' => 3, 'label' => ''];
foreach (array_slice($argv, 2) as $a) {
    if (preg_match('/\A--([a-z]+)=(.*)\z/', $a, $m) === 1) {
        $opt[$m[1]] = is_numeric($m[2]) ? $m[2] + 0 : $m[2];
    }
}
const PASSWORD = 'Load-Test-Only-2026';
$jar = __DIR__.'/../../storage/load/sessions';
@mkdir($jar, 0777, true);

/** One signed-in person: a curl handle with its own cookie file. */
final class Person
{
    public CurlHandle $h;

    public string $cookies;

    public function __construct(public string $user, string $jar, public string $base)
    {
        $this->cookies = "{$jar}/{$user}.txt";
        $this->h = curl_init();
    }

    public function xsrf(): string
    {
        foreach (is_file($this->cookies) ? file($this->cookies) : [] as $line) {
            $f = explode("\t", trim($line));
            if (count($f) >= 7 && $f[5] === 'XSRF-TOKEN') {
                return urldecode($f[6]);
            }
        }

        return '';
    }

    /** Sets the handle up for one request; the caller runs it (alone or in curl_multi). */
    public function prepare(string $method, string $path, ?array $body = null): CurlHandle
    {
        curl_reset($this->h);
        $headers = ['Accept: application/json', 'Referer: '.$this->base.'/', 'Origin: '.$this->base, 'X-XSRF-TOKEN: '.$this->xsrf()];
        if ($body !== null) {
            $headers[] = 'Content-Type: application/json';
        }
        curl_setopt_array($this->h, [
            CURLOPT_URL => $this->base.$path, CURLOPT_CUSTOMREQUEST => $method, CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => $headers, CURLOPT_COOKIEFILE => $this->cookies, CURLOPT_COOKIEJAR => $this->cookies,
            CURLOPT_TIMEOUT => 120, CURLOPT_ENCODING => '',
        ] + ($body !== null ? [CURLOPT_POSTFIELDS => json_encode($body)] : []));

        return $this->h;
    }

    /** @return array{0: int, 1: float, 2: int, 3: mixed} status, ms, bytes, decoded body */
    public function call(string $method, string $path, ?array $body = null): array
    {
        $h = $this->prepare($method, $path, $body);
        $out = (string) curl_exec($h);
        curl_setopt($h, CURLOPT_COOKIEJAR, $this->cookies); // flush the jar now

        return [curl_getinfo($h, CURLINFO_RESPONSE_CODE), curl_getinfo($h, CURLINFO_TOTAL_TIME) * 1000, (int) curl_getinfo($h, CURLINFO_SIZE_DOWNLOAD), json_decode($out, true)];
    }

    /** Reuses a saved session; otherwise signs in for real. Returns true if a login was needed. */
    public function signIn(): bool
    {
        if ($this->call('GET', '/api/auth/me')[0] === 200) {
            return false;
        }
        @unlink($this->cookies);
        $this->call('GET', '/sanctum/csrf-cookie');
        [$status, , , $body] = $this->call('POST', '/api/auth/login', ['username' => $this->user, 'password' => PASSWORD]);
        if ($status !== 200) {
            throw new RuntimeException("Sign-in of {$this->user} answered {$status}: ".json_encode($body));
        }

        return true;
    }
}

/** @param list<float> $xs */
function pct(array $xs, float $p): float
{
    if ($xs === []) {
        return 0;
    }
    sort($xs);

    return $xs[(int) min(count($xs) - 1, max(0, ceil($p / 100 * count($xs)) - 1))];
}

/** @param array<string, array{ms: list<float>, bytes: list<int>, errors: int, codes: array<int, int>}> $stats */
function report(string $title, array $stats, array $opt, array $extra = []): void
{
    printf("\n%s\n%-46s %5s %4s %7s %7s %7s %7s %9s\n", $title, 'endpoint', 'n', 'err', 'p50', 'p95', 'p99', 'max', 'bytes');
    $rows = [];
    foreach ($stats as $k => $s) {
        $row = ['endpoint' => $k, 'n' => count($s['ms']), 'errors' => $s['errors'], 'p50' => round(pct($s['ms'], 50)), 'p95' => round(pct($s['ms'], 95)),
            'p99' => round(pct($s['ms'], 99)), 'max' => round(max($s['ms'] ?: [0])), 'bytes' => (int) round(array_sum($s['bytes']) / max(1, count($s['bytes']))), 'codes' => $s['codes']];
        $rows[] = $row;
        printf("%-46s %5d %4d %7d %7d %7d %7d %9d\n", mb_substr($k, 0, 46), $row['n'], $row['errors'], $row['p50'], $row['p95'], $row['p99'], $row['max'], $row['bytes']);
    }
    foreach ($extra as $k => $v) {
        printf("%s: %s\n", $k, is_scalar($v) ? $v : json_encode($v));
    }
    file_put_contents(__DIR__.'/../../storage/load/results.jsonl', json_encode(['at' => date('c'), 'title' => $title, 'opt' => $opt, 'rows' => $rows, 'extra' => $extra])."\n", FILE_APPEND);
}

/**
 * What a nurse does, as API calls: the journey of step 6, item 1. Ids are found once with the same API.
 *
 * @return list<array{0: string, 1: string, 2: string, 3: array|null}> [label, method, path, body]
 */
function journey(Person $p): array
{
    static $plan = null;
    if ($plan !== null) {
        return $plan;
    }
    $today = date('Y-m-d');
    $monday = date('Y-m-d', strtotime('monday this week'));
    $month1 = date('Y-m-01');
    $busy = date('Y-m', strtotime('first day of last month'));
    [, , , $all] = $p->call('GET', '/api/visits');
    $counts = [];
    foreach ($all['data'] ?? [] as $v) {
        if (! empty($v['studentId'])) {
            $counts[$v['studentId']] = ($counts[$v['studentId']] ?? 0) + 1;
        }
    }
    arsort($counts);
    $long = (string) array_key_first($counts);
    $visitId = (string) ($all['data'][0]['id'] ?? '1');
    [, , , $students] = $p->call('POST', '/api/students/query', ['search' => '', 'gradeLevel' => '', 'includeArchived' => false, 'recordStatus' => '']);
    $one = $students['data'][intdiv(count($students['data'] ?? [1]), 2)] ?? [];
    $last4 = substr((string) ($one['lrn'] ?? '0000'), -4);
    [, , , $items] = $p->call('GET', '/api/inventory');
    $item = (string) ($items['data'][0]['id'] ?? '1');
    [, , , $years] = $p->call('GET', '/api/archive/years');
    $year = (string) ($years['data']['defaultYear'] ?? $years['data']['years'][0]['label'] ?? '');

    return $plan = [
        ['shell: auth/me', 'GET', '/api/auth/me', null],
        ['shell: settings/idle-signout', 'GET', '/api/settings/idle-signout', null],
        ['shell: school-years/reminder', 'GET', '/api/school-years/reminder', null],
        ['dashboard/summary (this month)', 'GET', '/api/dashboard/summary?preset=thisMonth', null],
        ['dashboard/cluster-alerts', 'GET', '/api/dashboard/cluster-alerts', null],
        ['calendar/days (month)', 'GET', "/api/calendar/days?from={$month1}&to=".date('Y-m-t'), null],
        ['calendar/holidays (month)', 'GET', "/api/calendar/holidays?from={$month1}&to=".date('Y-m-t'), null],
        ['students/query (whole list)', 'POST', '/api/students/query', ['search' => '', 'gradeLevel' => '', 'includeArchived' => false, 'recordStatus' => '']],
        ['students/search (name)', 'POST', '/api/students/search', ['q' => 'Dela', 'limit' => 8]],
        ['students/search (last 4 LRN)', 'POST', '/api/students/search', ['q' => $last4, 'limit' => 8]],
        ['students/query (grade filter)', 'POST', '/api/students/query', ['search' => '', 'gradeLevel' => 'Grade 7', 'includeArchived' => false, 'recordStatus' => '']],
        ['students/{id} (long history)', 'GET', "/api/students/{$long}", null],
        ['students/{id}/history (200)', 'GET', "/api/students/{$long}/history?limit=200", null],
        ['students/{id}/excuse-letters', 'GET', "/api/students/{$long}/excuse-letters", null],
        ['visits (today)', 'GET', "/api/visits?from={$today}&to={$today}", null],
        ['visits (this week)', 'GET', "/api/visits?from={$monday}&to={$today}", null],
        ['visits (this month)', 'GET', "/api/visits?from={$month1}&to={$today}", null],
        ['visits (whole list)', 'GET', '/api/visits', null],
        ['visits (page 1 of 25)', 'GET', '/api/visits?page=1&perPage=25', null],
        ['visits/{id}', 'GET', "/api/visits/{$visitId}", null],
        ['incidents (whole list)', 'GET', '/api/incidents', null],
        ['incidents (this month)', 'GET', "/api/incidents?from={$month1}&to={$today}", null],
        ['follow-ups', 'GET', '/api/follow-ups', null],
        ['students/incomplete', 'GET', '/api/students/incomplete', null],
        ['excuse-letters/pending', 'GET', '/api/excuse-letters/pending', null],
        ['inventory', 'GET', '/api/inventory', null],
        ['inventory/{id}/history', 'GET', "/api/inventory/{$item}/history", null],
        ['inventory/movements (month)', 'GET', "/api/inventory/movements?from={$month1}&to={$today}", null],
        ['reports/monthly (last month)', 'GET', "/api/reports/monthly?month={$busy}", null],
        ['audit-log (whole)', 'GET', '/api/audit-log', null],
        ['audit-log (page 1 of 25)', 'GET', '/api/audit-log?page=1&perPage=25', null],
        ['audit-log (page 40 of 25)', 'GET', '/api/audit-log?page=40&perPage=25', null],
        ['archive/years', 'GET', '/api/archive/years', null],
        ['archive/students (year, page 1)', 'GET', '/api/archive/students?year='.rawurlencode($year).'&page=1&perPage=25', null],
        ['personnel', 'GET', '/api/personnel', null],
        ['backups/status', 'GET', '/api/backups/status', null],
        ['visits POST (with a medicine)', 'POST', '/api/visits', ['studentId' => (string) ($one['id'] ?? $long), 'personnelId' => null, 'complaint' => 'Headache', 'treatment' => 'Rest.', 'disposition' => 'returned_to_class',
            'temperatureC' => 36.8, 'itemsGiven' => [['itemId' => $item, 'quantity' => 1, 'instructions' => null]], 'followUp' => null, 'excuseLetterDraft' => null]],
    ];
}

function newStat(): array
{
    return ['ms' => [], 'bytes' => [], 'errors' => 0, 'codes' => []];
}

function record(array &$stats, string $label, int $status, float $ms, int $bytes): void
{
    $stats[$label] ??= newStat();
    $stats[$label]['ms'][] = $ms;
    $stats[$label]['bytes'][] = $bytes;
    $stats[$label]['codes'][$status] = ($stats[$label]['codes'][$status] ?? 0) + 1;
    if ($status >= 400 || $status === 0) {
        $stats[$label]['errors']++;
    }
}

if ($cmd === 'journey') {
    $p = new Person((string) $opt['user'], $jar, (string) $opt['base']);
    $p->signIn();
    $plan = journey($p);
    $stats = [];
    for ($r = 0; $r < (int) $opt['runs']; $r++) {
        foreach ($plan as [$label, $method, $path, $body]) {
            [$status, $ms, $bytes] = $p->call($method, $path, $body);
            record($stats, $label, $status, $ms, $bytes);
            usleep(520000); // 120 a minute per person: stay just under it
        }
    }
    report("Single user, {$opt['runs']} runs of the journey ({$opt['user']}) {$opt['label']}", $stats, $opt);
    exit(0);
}

if ($cmd === 'crowd') {
    $n = (int) $opt['people'];
    $people = [];
    foreach (range(1, $n) as $i) {
        $people[] = $p = new Person(sprintf('load.bench%02d', $i), $jar, (string) $opt['base']);
        if ($p->signIn()) {
            usleep(6_500_000); // logins: under 10 a minute per address
        }
    }
    $plan = journey($people[0]);
    $mh = curl_multi_init();
    $stats = [];
    $next = array_fill(0, $n, microtime(true));
    $step = array_map(fn ($i) => ($i * 5) % count($plan), range(0, $n - 1));
    $busy = [];
    $end = microtime(true) + (float) $opt['minutes'] * 60;
    $pause = (float) $opt['pause'];
    $done = 0;
    $firstFail = null;
    $t0 = microtime(true);
    while (microtime(true) < $end || $busy !== []) {
        foreach ($people as $i => $p) {
            if (! isset($busy[$i]) && microtime(true) >= $next[$i] && microtime(true) < $end && $firstFail === null) {
                [$label, $method, $path, $body] = $plan[$step[$i]];
                curl_multi_add_handle($mh, $p->prepare($method, $path, $body));
                $busy[$i] = $label;
            }
        }
        curl_multi_exec($mh, $running);
        curl_multi_select($mh, 0.05);
        while ($info = curl_multi_info_read($mh)) {
            $h = $info['handle'];
            $i = array_search($h, array_map(fn ($p) => $p->h, $people), true);
            $status = curl_getinfo($h, CURLINFO_RESPONSE_CODE);
            record($stats, $busy[$i], $status, curl_getinfo($h, CURLINFO_TOTAL_TIME) * 1000, (int) curl_getinfo($h, CURLINFO_SIZE_DOWNLOAD));
            if (($status >= 429 || $status === 0) && $firstFail === null) {
                $firstFail = ['after_s' => round(microtime(true) - $t0, 1), 'status' => $status, 'endpoint' => $busy[$i], 'requests_before' => $done];
            }
            curl_multi_remove_handle($mh, $h);
            unset($busy[$i]);
            $done++;
            $step[$i] = ($step[$i] + 1) % count($plan);
            // Realistic: a pause around $pause seconds, never faster than 120 a minute per person.
            $next[$i] = microtime(true) + ($pause > 0 ? max(0.55, $pause * (0.5 + mt_rand() / mt_getrandmax())) : 0);
        }
        if ($pause == 0 && $firstFail !== null && $busy === []) {
            break;
        }
    }
    $secs = microtime(true) - $t0;
    $all = array_merge(...array_column($stats, 'ms'));
    report("Crowd: {$n} people, pause {$pause} s, {$opt['minutes']} min {$opt['label']}", $stats, $opt, [
        'requests' => $done, 'seconds' => round($secs, 1), 'requests_per_second' => round($done / $secs, 2),
        'overall_p50' => round(pct($all, 50)), 'overall_p95' => round(pct($all, 95)), 'first_failure' => $firstFail ?? 'none',
    ]);
    exit(0);
}

fwrite(STDERR, "Unknown command {$cmd}\n");
exit(1);
