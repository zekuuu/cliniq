<?php

declare(strict_types=1);

namespace App\Shared\AuditLog;

use App\Shared\Support\Row;
use Carbon\CarbonImmutable;

/** The Audit Log's streamed print document; all record text is escaped before entering HTML. */
final class AuditPrintHtml
{
    private static function h(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }

    public static function start(int $total, string $scope): string
    {
        $logo = base64_encode((string) file_get_contents(resource_path('print/mca-logo.png')));
        $entries = number_format($total).' '.($total === 1 ? 'entry' : 'entries');
        $scope = self::h($scope);

        return <<<HTML
<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>CLINIQ Audit Log</title>
<style>
@page { size: A4; margin: 0 15mm 20mm; @bottom-right { content: "Page " counter(page) " of " counter(pages); font: 7.5pt Arial, sans-serif; } }
body { margin: 0; color: #1a1a1a; background: white; font: 10pt/1.35 Arial, sans-serif; }
main { padding-top: 14mm; -webkit-box-decoration-break: clone; box-decoration-break: clone; }
header { display: flex; align-items: center; gap: 10mm; border-bottom: 1px solid #222; padding-bottom: 5mm; }
header img { width: 20mm; height: 20mm; object-fit: contain; }
header p { margin: 0; } h1 { font-size: 15pt; margin: 1mm 0 0; }
.scope { margin: 5mm 0; } table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 9pt; }
th, td { text-align: left; vertical-align: top; border-bottom: 1px solid #ddd; padding: 2mm 1mm; overflow-wrap: anywhere; }
thead { display: table-header-group; } tr { break-inside: avoid; } .minor { display: block; color: #555; font-size: 8.5pt; }
#print-controls { margin: 5mm 0; } button { font: inherit; padding: 2mm 4mm; cursor: pointer; }
@media print { #print-controls { display: none; } }
</style></head><body><main>
<header><img src="data:image/png;base64,{$logo}" alt="Mendez Christian Academy logo"><div><p>Mendez Christian Academy — School Clinic</p><h1>Audit Log</h1></div></header>
<p class="scope">{$entries}. Filters: {$scope}. Entries are permanent and cannot be edited or deleted.</p>
<div id="print-controls" role="status">Preparing the complete document… <button id="print-button" type="button">Print / Save as PDF</button></div>
<table><caption>Filtered audit log</caption><thead><tr><th style="width:22%">Date and time</th><th style="width:24%">Who</th><th style="width:26%">Action</th><th>Record</th></tr></thead><tbody>
HTML;
    }

    /** @param array<string, mixed> $row */
    public static function row(array $row): string
    {
        $dateTime = Row::text($row['dateTime'] ?? '');
        $date = self::h($dateTime === '' ? '' : CarbonImmutable::parse($dateTime)->format('M j, Y g:i A'));
        $who = self::h(Row::text($row['userName'] ?? 'Unknown user'));
        $role = match ($row['userRole'] ?? null) {
            'staff' => 'School Clinician', 'admin' => 'Admin / Principal', default => '',
        };
        $action = self::h(match ($row['actionType'] ?? null) {
            'login' => 'Login', 'logout' => 'Logout', 'submit' => 'Submit', 'approve' => 'Approve',
            'create' => 'Create', 'update' => 'Update', 'delete' => 'Delete', 'archive' => 'Archive',
            'print' => 'Print / Save as PDF', 'view' => 'Viewed a record', default => Row::text($row['actionType'] ?? ''),
        });
        $summary = self::h(Row::text($row['summary'] ?? ''));
        $target = is_array($row['target'] ?? null) ? $row['target'] : [];
        $record = self::h(trim(implode(' · ', array_filter([Row::text($target['kind'] ?? ''), Row::text($target['label'] ?? '')]))));
        if ($record === '') {
            $record = 'No record';
        }
        $role = $role === '' ? '' : '<span class="minor">'.self::h($role).'</span>';
        $summary = $summary === '' ? '' : '<span class="minor">'.$summary.'</span>';

        return "<tr><td>{$date}</td><td>{$who}{$role}</td><td>{$action}{$summary}</td><td>{$record}</td></tr>\n";
    }

    public static function end(string $nonce): string
    {
        return <<<HTML
</tbody></table></main>
<script nonce="{$nonce}">
document.getElementById('print-button').addEventListener('click', () => window.print());
window.addEventListener('load', () => {
  document.getElementById('print-controls').firstChild.textContent = 'Complete document ready. ';
  window.print();
});
window.addEventListener('afterprint', () => window.close());
</script></body></html>
HTML;
    }
}
