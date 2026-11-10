#!/usr/bin/env node
// Regenerates the traceability table at the end of 01-Requirements/Functional-Requirements.md:
// requirement -> module -> screen -> API endpoints -> tables -> ADRs -> tests.
//
//   npm run docs:trace           # rewrite the table between the traceability markers
//   npm run docs:trace -- --check  # print missing links only; change nothing
//
// The map below is the only hand-kept part. The script checks every route against AppRoutes.tsx,
// every endpoint prefix against API-Contract.md, every table against Reference-Schema.sql, every ADR
// file and every test file, and marks anything it cannot find with "(missing)". When a requirement,
// screen, endpoint, table or test is added, add it to the map and run the script.

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { backendTestNames, computeFacts } from './docs-facts.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const KB = join(ROOT, 'CLINIQ-Knowledge-Base')
const FR = join(KB, '01-Requirements', 'Functional-Requirements.md')

// id: [module, routes, contract path prefixes, tables, ADRs, test files]
const MAP = {
  'FR-01': ['User Management', ['/login', '/users', '/users/new'], ['/api/auth/login', '/api/users'], ['users'], [33, 38, 29], ['LoginPage.test.tsx', 'UserFormPage.test.tsx', 'admin-read-only.test.tsx']],
  'FR-02': ['Student Records', ['/students', '/students/new', '/students/import', '/students/incomplete'], ['/api/students'], ['students', 'student_import_batches', 'student_record_reviews', 'emergency_contacts'], [47, 51, 59, 64], ['StudentFormPage.test.tsx', 'StudentImportPage.test.tsx', 'IncompleteRecordsQueuePage.test.tsx']],
  'FR-03': ['Staff Patients', ['/staff', '/staff/new'], ['/api/personnel'], ['personnel', 'personnel_emergency_contacts', 'personnel_health_entries'], [43, 63], ['StaffPages.test.tsx', 'staff-patients.test.tsx']],
  'FR-04': ['Clinic Visits', ['/visits', '/visits/new'], ['/api/visits'], ['visits', 'visit_extra_complaints', 'treatment_item_lines'], [18, 36, 53, 70, 71], ['NewVisitEntryPage.test.tsx', 'VisitDetailPage.test.tsx', 'VisitLogListPage.test.tsx']],
  'FR-05': ['Clinic Visits', ['/visits/pe-referral'], ['/api/excuse-letters', '/api/pe-referrals'], ['excuse_letters', 'pe_referrals'], [49], ['ExcuseLetterPage.test.tsx', 'PeSportsReferralPage.test.tsx']],
  'FR-06': ['Emergency Response', ['/incidents', '/incidents/new', '/incidents/notifications', '/incidents/report'], ['/api/incidents'], ['incidents', 'incident_vital_readings', 'hospital_referrals', 'parent_notification_attempts', 'incident_report_approvals'], [36, 60, 65], ['IncidentEntryPage.test.tsx', 'IncidentReportPage.test.tsx', 'ParentNotificationPage.test.tsx']],
  'FR-07': ['Emergency Response', ['/follow-ups'], ['/api/follow-ups'], ['follow_ups'], [51], ['FollowUpListPage.test.tsx']],
  'FR-08': ['Reports Generation', ['/reports', '/reports/sports'], ['/api/reports', '/api/sports-reports'], ['sports_reports', 'sports_report_students'], [26, 34, 50, 55, 74, 79], ['ReportsPage.test.tsx', 'SportsReport.test.tsx', 'MonthlyReportPdf.test.tsx']],
  'FR-09': ['Student Records', ['/visits/new', '/incidents/new'], ['/api/students/search'], ['students'], [28], ['search.test.ts']],
  'FR-10': ['All modules', ['/visits', '/incidents'], ['/api/students/query'], ['students'], [4, 28, 40, 44], ['lrn-render.test.tsx']],
  'FR-11': ['First-Aid Checklist', ['/visits/new'], ['/api/reference/visit-complaint-types'], ['triage_steps', 'triage_checks'], [], ['NewVisitEntryPage.test.tsx']],
  'FR-12': ['Inventory Tracker', ['/inventory', '/inventory/new', '/inventory/dispense', '/inventory/history'], ['/api/inventory'], ['inventory_items', 'inventory_batches', 'inventory_transactions', 'inventory_transaction_batches'], [18, 30, 35], ['InventoryListPage.test.tsx', 'StockActions.test.tsx', 'stock.test.ts']],
  'FR-13': ['Dashboard', ['/', '/calendar'], ['/api/dashboard', '/api/calendar'], ['calendar_events', 'holidays', 'holiday_sync_runs'], [19, 20, 25, 32, 42, 50], ['DashboardPage.test.tsx', 'CalendarPage.test.tsx']],
  'FR-14': ['Backup Verification', ['/backup'], ['/api/backups'], ['backup_logs', 'backup_locations', 'backup_location_results'], [37, 39, 52], ['AccessAndBackup.test.tsx']],
  'FR-15': ['Audit Log Viewer', ['/audit-log'], ['/api/audit-log', '/api/audit'], ['audit_logs'], [16, 17, 37, 48, 58], ['AuditLogPage.test.tsx', 'auditCoverage.test.ts', 'AuditLogTest.php']],
  'FR-16': ['User Management', ['/login'], ['/api/auth/recovery', '/api/auth/authenticator'], ['users', 'recovery_codes'], [73], ['Authenticator.test.tsx', 'totp.test.ts']],
  'FR-17': ['User Management', ['/login', '/force-password-change'], ['/api/auth/login', '/api/auth/password'], ['users', 'password_histories'], [15, 57], ['LoginPage.test.tsx', 'ForcePasswordChangePage.test.tsx', 'MiddlewareTest.php']],
  'FR-18': ['User Management', ['/settings'], ['/api/settings/idle-signout', '/api/session/keepalive'], ['system_settings'], [48, 78], ['idle-signout.test.tsx', 'MiddlewareTest.php']],
  'FR-19': ['User Management', ['/account/password'], ['/api/auth/profile'], ['users'], [66], ['AccountMenu.test.tsx', 'ownProfile.test.ts']],
  'FR-20': ['Student Records', ['/archive'], ['/api/archive', '/api/school-years'], ['school_years', 'students', 'personnel'], [51, 72, 75], ['ArchivePage.test.tsx', 'schoolYear.test.ts']],
  'FR-21': ['Staff Patients', ['/staff/import', '/staff/incomplete'], ['/api/personnel'], ['personnel', 'staff_record_reviews'], [67, 69, 76], ['StaffImport.test.tsx']],
  'FR-22': ['Reports Generation', ['/reports'], ['/api/reports'], [], [38, 77], ['AdminReportsPage.test.tsx']],
  'FR-23': ['Inventory Tracker', ['/inventory'], ['/api/inventory'], ['inventory_item_symptom_tags', 'inventory_transactions'], [61, 68, 71], ['SuggestedMedicines.test.tsx', 'StockActions.test.tsx']],
  'FR-24': ['Backup Verification', ['/backup'], ['/api/backups'], ['backup_locations'], [52, 79], ['AccessAndBackup.test.tsx']],
}

function build() {
  const f = computeFacts()
  const routes = new Set(['/login', '/force-password-change', ...f.routes.map((r) => r.path)])
  const contract = readFileSync(join(KB, '04-Development', 'API-Contract.md'), 'utf8')
  const endpoints = [...contract.matchAll(/^#### `(GET|POST|PUT|PATCH|DELETE) (\/[^`]+)`/gm)].map((m) => m[2])
  const tables = new Set([...readFileSync(join(KB, '02-Architecture/Database/Reference-Schema.sql'), 'utf8').matchAll(/^CREATE TABLE (\w+)/gm)].map((m) => m[1]))
  const adrs = readdirSync(join(KB, '06-Decisions')).filter((n) => /^ADR-\d+/.test(n))
  const tests = new Set()
  const walk = (d) => existsSync(d) && readdirSync(d, { withFileTypes: true }).forEach((e) => (e.name === 'node_modules' || e.name === 'vendor' ? 0 : e.isDirectory() ? walk(join(d, e.name)) : tests.add(e.name)))
  walk(join(ROOT, 'frontend/src'))
  backendTestNames().forEach((n) => tests.add(n))
  const missing = []
  const mark = (ok, label, id) => (ok ? label : (missing.push(`${id}: ${label}`), `${label} (missing)`))
  const rows = Object.entries(MAP).map(([id, [mod, rs, eps, tbs, ads, ts]]) => {
    const r = rs.map((p) => mark(routes.has(p), `\`${p}\``, id)).join(', ')
    const e = eps.map((p) => mark(endpoints.some((x) => x.startsWith(p)), `\`${p}\` (${endpoints.filter((x) => x.startsWith(p)).length})`, id)).join(', ')
    const t = tbs.map((x) => mark(tables.has(x), `\`${x}\``, id)).join(', ') || '—'
    const a = ads.map((n) => { const k = `ADR-${String(n).padStart(3, '0')}`; const file = adrs.find((x) => x.startsWith(k)); return file ? `[${n}](../06-Decisions/${file})` : mark(false, k, id) }).join(', ') || '—'
    const s = ts.map((x) => mark(tests.has(x), `\`${x}\``, id)).join(', ')
    return `| ${id} | ${mod} | ${r} | ${e} | ${t} | ${a} | ${s} |`
  })
  return { rows, missing, f }
}

const START = '<!-- traceability:start -->'
const END = '<!-- traceability:end -->'
const { rows, missing, f } = build()
if (process.argv.includes('--check')) {
  console.log(missing.length ? missing.join('\n') : 'Traceability: every link resolves.')
  process.exit(missing.length ? 1 : 0)
}
const table = `${START}
## Traceability

Generated ${f.timestamp} at \`${f.commit}\` by \`npm run docs:trace\` ([\`docs-trace.mjs\`](../04-Development/tools/docs-trace.mjs)); edit the map in the script, not this table. Screens are frontend routes (see the [Facts sheet](../00-Project-Core/Facts-Sheet.md#signed-in-routes-by-role)); endpoints are path prefixes in the [API Contract](../04-Development/API-Contract.md) with the number of entries under each; tables are in the [Reference Schema](../02-Architecture/Database/Reference-Schema.sql). Only \`/api/health\`, \`/sanctum/csrf-cookie\` and \`/api/session/keepalive\` are live in the backend today; the rest are contract entries. Tests ending \`.php\` are backend (Pest); the others are frontend (Vitest). Non-functional requirements trace to ADRs in [Non-Functional Requirements](Non-Functional-Requirements.md).

| ID | Module | Screens | API endpoints | Tables | ADRs | Tests |
|---|---|---|---|---|---|---|
${rows.join('\n')}
${END}`
let text = readFileSync(FR, 'utf8')
text = text.includes(START) ? text.replace(new RegExp(`${START}[\\s\\S]*${END}`), table) : `${text.trimEnd()}\n\n${table}\n`
const outIdx = process.argv.indexOf('--out')
writeFileSync(outIdx >= 0 ? process.argv[outIdx + 1] : FR, text)
console.log(`Wrote the traceability table (${rows.length} requirements, ${missing.length} missing links).`)
if (missing.length) console.log(missing.join('\n'))
