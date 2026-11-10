#!/usr/bin/env node
// Regenerates CLINIQ-Knowledge-Base/00-Project-Core/Facts-Sheet.md from the repository.
//
//   node CLINIQ-Knowledge-Base/04-Development/tools/docs-facts.mjs            # write the sheet
//   node CLINIQ-Knowledge-Base/04-Development/tools/docs-facts.mjs --tests    # also run both test suites
//   node CLINIQ-Knowledge-Base/04-Development/tools/docs-facts.mjs --out f.md # write somewhere else (docs-check uses this)
//   node CLINIQ-Knowledge-Base/04-Development/tools/docs-facts.mjs --json     # print the numbers as JSON
//
// Reads only the repository (and `php artisan route:list` when PHP is installed). No dependencies.
// Without --tests, the "Test runs" section is carried over from the current sheet unchanged.

import { execSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const KB = join(ROOT, 'CLINIQ-Knowledge-Base')
const SHEET = join(KB, '00-Project-Core', 'Facts-Sheet.md')

const read = (p) => readFileSync(join(ROOT, p), 'utf8')
const has = (p) => existsSync(join(ROOT, p))
const sh = (cmd, cwd = ROOT) => execSync(cmd, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
const count = (text, re) => (text.match(re) || []).length

function walk(dir, keep, out = []) {
  if (!existsSync(dir)) return out
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'vendor' || name.startsWith('.')) continue
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, keep, out)
    else if (keep(p)) out.push(p)
  }
  return out
}
const lines = (files) => files.reduce((n, f) => n + readFileSync(f, 'utf8').split('\n').filter((l) => l.trim()).length, 0)

// Backend source: the working tree when backend code is here (the `backend` branch), otherwise the
// `backend` branch read through git without checking it out (`main` carries only backend/README.md, ADR-056).
const BE_LOCAL = existsSync(join(ROOT, 'backend', 'app'))
const BE_REF = BE_LOCAL ? null : ['backend', 'origin/backend'].find((r) => { try { sh(`git rev-parse --verify --quiet ${r}`); return true } catch { return false } })
const beRead = (p) => (BE_LOCAL ? read(p) : sh(`git show ${BE_REF}:${p}`))
const beFiles = (prefix) => (BE_LOCAL ? walk(join(ROOT, prefix), () => true).map((p) => relative(ROOT, p).replace(/\\/g, '/')) : sh(`git ls-tree -r --name-only ${BE_REF} -- ${prefix}`).split('\n').filter(Boolean))
const beDirs = (prefix) => [...new Set(beFiles(prefix).map((p) => p.slice(prefix.length + 1).split('/')[0]).filter((x) => x && !x.includes('.')))].sort()
const beLines = (files) => (BE_LOCAL ? lines(files.map((p) => join(ROOT, p))) : files.reduce((n, p) => n + beRead(p).split('\n').filter((l) => l.trim()).length, 0))

export function computeFacts() {
  const f = {}
  f.timestamp = manilaNow()
  f.commit = sh('git rev-parse --short HEAD')
  f.branch = sh('git rev-parse --abbrev-ref HEAD')

  // Decisions
  const adrs = readdirSync(join(KB, '06-Decisions')).filter((n) => /^ADR-\d+/.test(n)).sort()
  f.adrCount = adrs.length
  f.adrFirst = adrs[0].match(/ADR-\d+/)[0]
  f.adrLast = adrs.at(-1).match(/ADR-\d+/)[0]

  // Screens and routes
  const inv = read('CLINIQ-Knowledge-Base/03-Design/Screen-Inventory.md')
  const nums = [...inv.matchAll(/^(\d+)\. \*\*/gm)].map((m) => +m[1])
  f.screens = nums.length
  f.screenMax = Math.max(...nums)
  const routesSrc = read('frontend/src/routes/AppRoutes.tsx')
  const block = routesSrc.slice(routesSrc.indexOf('const APP_ROUTES'), routesSrc.indexOf('function RouteLoading'))
  const pathsSrc = read('frontend/src/routes/paths.ts')
  const resolve = (expr) => {
    const lit = expr.match(/^'([^']+)'$/)
    if (lit) return lit[1]
    const key = expr.replace('paths.', '')
    return (pathsSrc.match(new RegExp(`\\b${key}: '([^']+)'`)) || [])[1] || expr
  }
  f.routes = [...block.matchAll(/path: ([^,]+),\s*\n\s*title: '([^']+)',[\s\S]*?roles: \[([^\]]+)\],\s*\n\s*nav: ([^,]+),/g)].map((m) => ({
    path: resolve(m[1].trim()),
    title: m[2],
    roles: m[3].replace(/'/g, '').split(',').map((s) => s.trim()),
    nav: m[4].replace(/'/g, '').trim(),
  }))
  f.routeCount = f.routes.length + 2 // + Login and Force Password Change, outside APP_ROUTES
  f.routesStaffOnly = f.routes.filter((r) => r.roles.join() === 'staff').length
  f.routesAdminOnly = f.routes.filter((r) => r.roles.join() === 'admin').length
  f.routesBoth = f.routes.filter((r) => r.roles.length === 2).length

  // Modules and roles
  f.backendSource = BE_LOCAL ? 'this working tree' : `the \`${BE_REF}\` branch at \`${sh(`git rev-parse --short ${BE_REF}`)}\` (read through git; \`main\` holds no backend code, ADR-056)`
  f.modules = beDirs('backend/app/Modules')
  f.shared = beDirs('backend/app/Shared')
  const schema = read('CLINIQ-Knowledge-Base/02-Architecture/Database/Reference-Schema.sql')
  f.roles = (schema.match(/chk_users_role CHECK \(role IN \(([^)]+)\)/) || [, ''])[1].replace(/'/g, '').split(',')

  // Mock data layer
  const api = read('frontend/src/lib/mock-db/api.ts')
  f.mockFunctions = count(api, /^export (async )?function /gm)
  f.mockConstants = count(api, /^export const /gm)
  f.mockErrors = count(api, /^export class /gm)
  f.mockTypes = count(read('frontend/src/lib/mock-db/types.ts'), /^export (type|interface) /gm)

  // Database
  const tables = [...schema.matchAll(/^CREATE TABLE (\w+) \(([\s\S]*?)^\)/gm)]
  f.tables = tables.length
  const notColumn = /^(PRIMARY|UNIQUE|KEY|INDEX|CONSTRAINT|FOREIGN|CHECK|--|\))/
  f.columns = tables.reduce((n, t) => n + t[2].split('\n').map((l) => l.trim()).filter((l) => /^[a-z_][a-z0-9_]*\s+[A-Z]/.test(l) && !notColumn.test(l)).length, 0)
  f.checks = count(schema, /CONSTRAINT \w+\s+CHECK/g)
  f.uniques = count(schema, /UNIQUE KEY /g)
  f.foreignKeys = count(schema, /FOREIGN KEY/g)
  const ct = read('CLINIQ-Knowledge-Base/02-Architecture/Database/Checks/constraint-tests.sql')
  f.constraintTests = count(ct, /^CALL t_(accepts|rejects|count)\(/gm)
  f.migrations = beFiles('backend/app').filter((p) => /Database\/Migrations\/.+\.php$/.test(p)).length

  // API
  const contract = read('CLINIQ-Knowledge-Base/04-Development/API-Contract.md')
  f.contractEntries = count(contract, /^#### `(GET|POST|PUT|PATCH|DELETE) \//gm)
  try {
    if (!BE_LOCAL) throw new Error('no backend here')
    const list = JSON.parse(sh('php artisan route:list --json', join(ROOT, 'backend')))
    f.liveRoutes = list.map((r) => `${r.method.replace('|HEAD', '')} /${r.uri}`).sort()
    f.liveRoutesSource = '`php artisan route:list`'
  } catch {
    // Sanctum registers GET /sanctum/csrf-cookie itself; it is not in routes/api.php.
    f.liveRoutes = ['GET /sanctum/csrf-cookie', ...[...beRead('backend/routes/api.php').matchAll(/Route::(get|post|put|patch|delete)\('([^']+)'/g)].map((m) => `${m[1].toUpperCase()} /api/${m[2].replace(/^\//, '')}`)].sort()
    f.liveRoutesSource = '`backend/routes/api.php` plus Sanctum\'s CSRF route'
  }

  // Tests and size
  const feTests = walk(join(ROOT, 'frontend/src'), (p) => /\.test\.tsx?$/.test(p))
  f.frontendTestFiles = feTests.length
  f.backendTestFiles = beFiles('backend/tests').filter((p) => /Test\.php$/.test(p)).length
  f.frontendLines = lines(walk(join(ROOT, 'frontend/src'), (p) => /\.(tsx?|css)$/.test(p)))
  f.backendLines = beLines(['app', 'config', 'routes', 'database', 'tests', 'bootstrap'].flatMap((d) => beFiles(`backend/${d}`)).filter((p) => p.endsWith('.php')))

  // Stack
  const pkg = JSON.parse(read('frontend/package.json'))
  const lock = has('frontend/package-lock.json') ? JSON.parse(read('frontend/package-lock.json')) : { packages: {} }
  const v = (name) => lock.packages[`node_modules/${name}`]?.version || (pkg.dependencies?.[name] || pkg.devDependencies?.[name] || '?').replace('^', '')
  f.frontendStack = ['react', 'react-router', 'typescript', 'vite', 'tailwindcss', 'vitest', 'chart.js', 'qrcode'].map((n) => [n, v(n)])
  const composer = JSON.parse(beRead('backend/composer.json'))
  const clock = JSON.parse(beRead('backend/composer.lock'))
  const cv = (name) => [...clock.packages, ...clock['packages-dev']].find((p) => p.name === name)?.version?.replace(/^v/, '') || composer.require?.[name] || composer['require-dev']?.[name] || '?'
  f.backendStack = [['php', composer.require.php], ...['laravel/framework', 'laravel/sanctum', 'pestphp/pest', 'larastan/larastan', 'laravel/pint'].map((n) => [n, cv(n)])]
  f.nodeEngines = (setupNode() || '22.22.2 or a later 22.x, 24.15 or a later 24.x, or 26 or later')

  // Session and settings (backend/config/cliniq.php)
  const cfg = beRead('backend/config/cliniq.php')
  const num = (key) => +(cfg.match(new RegExp(`'${key}' => (?:\\(int\\) env\\('[A-Z_]+', )?(\\d+)`)) || [])[1]
  f.sessionDays = num('session_days')
  f.failedAttempts = num('failed_attempts')
  f.lockMinutes = num('lock_minutes')
  f.idleStaff = num('idle_signout_minutes_staff')
  f.idleAdmin = num('idle_signout_minutes_admin')
  f.lrnLength = num('lrn_length')
  const range = cfg.match(/(\d+) to (\d+) \(ADR-048, ADR-078\)/)
  f.idleRange = range ? `${range[1]} to ${range[2]}` : '?'
  return f
}

export function manilaNow(d = new Date()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', weekday: 'long', month: 'long', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(d)
      .map((x) => [x.type, x.value]),
  )
  return `${p.weekday}, ${p.month} ${p.day}, ${p.year} — ${p.hour}:${p.minute} PHT`
}

function setupNode() {
  if (!has('setup-step.md')) return null
  return (read('setup-step.md').match(/Node\.js \*\*([^*]+)\*\*/) || [])[1]
}

async function runTests() {
  const out = {}
  try {
    const fe = sh('npx vitest run 2>&1 || true', join(ROOT, 'frontend'))
    out.frontend = (fe.match(/Tests\s+(.+\(\d+\))/) || [, 'no summary line'])[1].replace(/\x1b\[[0-9;]*m/g, '')
  } catch (e) {
    out.frontend = `could not run (${e.message.split('\n')[0]})`
  }
  if (!BE_LOCAL) out.backend = `not run here: no backend code on this branch; run \`composer test\` on \`backend\``
  else try {
    const be = sh('composer test 2>&1 || true', join(ROOT, 'backend')).replace(/\x1b\[[0-9;]*m/g, '')
    out.backend = (be.match(/Tests:\s+(.+)/) || [, 'no summary line'])[1].trim()
  } catch (e) {
    out.backend = `could not run (${e.message.split('\n')[0]})`
  }
  for (const k in out) out[k] = out[k].replace(/\|/g, '\\|')
  return out
}

/** Backend test file names, from this tree or the `backend` branch (docs-trace uses them). */
export const backendTestNames = () => beFiles('backend/tests').map((p) => p.split('/').pop())

export function renderSheet(f, testSection) {
  // Backend paths link to the `backend` branch on GitHub when this tree has no backend code.
  const rel = (p) => (!BE_LOCAL && p.startsWith('backend/') ? `https://github.com/zekuuu/cliniq/${p.includes('.') ? 'blob' : 'tree'}/backend/${p}` : relative(join(KB, '00-Project-Core'), join(ROOT, p)).replace(/\\/g, '/'))
  const routeRows = f.routes.map((r) => `| \`${r.path}\` | ${r.title} | ${r.roles.length === 2 ? 'Both' : r.roles[0] === 'staff' ? 'Staff' : 'Admin'} |`).join('\n')
  return `# Facts sheet

**Last regenerated:** ${f.timestamp}
**From commit:** \`${f.commit}\` on \`${f.branch}\`; backend numbers from ${f.backendSource}
**Regenerate with:** \`npm run docs:facts\` from the repository root (add \`-- --tests\` to rerun both test suites). The script is [\`docs-facts.mjs\`](${rel('CLINIQ-Knowledge-Base/04-Development/tools/docs-facts.mjs')}).

Every README, requirement document, diagram caption, and the Project Plan and SRS quote their numbers from this sheet. If a document disagrees with this sheet, the document is wrong. If this sheet disagrees with the repository, regenerate it: the script reads the repository and nothing else. Do not edit the numbers by hand.

## Numbers

| Fact | Value | Source |
|---|---|---|
| Decision records (ADRs) | **${f.adrCount}** (${f.adrFirst} to ${f.adrLast}) | [\`06-Decisions/\`](../06-Decisions/), template not counted |
| Screens in the inventory | **${f.screens}** numbered entries (numbers 1 to ${f.screenMax}; removed numbers are not reused) | [Screen Inventory](../03-Design/Screen-Inventory.md) |
| Frontend routes | **${f.routeCount}** (${f.routes.length} signed-in routes plus Login and Force Password Change): ${f.routesStaffOnly} Staff only, ${f.routesAdminOnly} Admin only, ${f.routesBoth} both | [\`AppRoutes.tsx\`](${rel('frontend/src/routes/AppRoutes.tsx')}) |
| Roles | **${f.roles.length}**: ${f.roles.map((r) => (r === 'staff' ? 'Staff (the School Clinician)' : 'Admin (the Principal)')).join(', ')} | \`chk_users_role\` in the schema; ADR-029, ADR-038 |
| Backend modules | **${f.modules.length}**: ${f.modules.join(', ')} | [\`backend/app/Modules/\`](${rel('backend/app/Modules')}) |
| Backend shared services | **${f.shared.length}**: ${f.shared.join(', ')} | [\`backend/app/Shared/\`](${rel('backend/app/Shared')}) |
| Mock API (sample data layer) | **${f.mockFunctions}** functions, **${f.mockConstants}** constants, **${f.mockErrors}** error classes | [\`mock-db/api.ts\`](${rel('frontend/src/lib/mock-db/api.ts')}) |
| Mock entity types | **${f.mockTypes}** | [\`mock-db/types.ts\`](${rel('frontend/src/lib/mock-db/types.ts')}) |
| Database tables (approved schema) | **${f.tables}** | [\`Reference-Schema.sql\`](../02-Architecture/Database/Reference-Schema.sql); ADR-057 |
| Database columns | **${f.columns}** | same |
| \`CHECK\` / \`UNIQUE\` / foreign keys | **${f.checks}** / **${f.uniques}** / **${f.foreignKeys}** | same |
| Constraint test cases | **${f.constraintTests}** | [\`Checks/constraint-tests.sql\`](../02-Architecture/Database/Checks/constraint-tests.sql) |
| Laravel migrations on disk | **${f.migrations}** (one per table) | \`backend/app/**/Database/Migrations/\` |
| API contract entries | **${f.contractEntries}** | [API Contract](../04-Development/API-Contract.md) (\`####\` endpoint headings) |
| API routes live in the backend | **${f.liveRoutes.length}**: ${f.liveRoutes.map((r) => `\`${r}\``).join(', ')} | ${f.liveRoutesSource} |
| Frontend test files | **${f.frontendTestFiles}** | \`frontend/src/**/*.test.ts(x)\` |
| Backend test files | **${f.backendTestFiles}** | \`backend/tests/**/*Test.php\` |
| Lines of code (non-blank) | frontend **${f.frontendLines}** (\`src\`, tests included); backend **${f.backendLines}** (\`app\`, \`config\`, \`routes\`, \`database\`, \`tests\`, \`bootstrap\`) | counted by the script |

${testSection}

## Stack (installed versions)

| Frontend | Version | Backend | Version |
|---|---|---|---|
${Array.from({ length: Math.max(f.frontendStack.length, f.backendStack.length) }, (_, i) => `| ${f.frontendStack[i]?.[0] ?? ''} | ${f.frontendStack[i]?.[1] ?? ''} | ${f.backendStack[i]?.[0] ?? ''} | ${f.backendStack[i]?.[1] ?? ''} |`).join('\n')}

Database: MariaDB 10.4 or later, as shipped with XAMPP (the schema's stated target). Node.js for development: ${f.nodeEngines} ([setup-step.md](${rel('setup-step.md')})). Versions are read from \`package-lock.json\` and \`composer.lock\`.

## Deployment

CLINIQ runs on the clinic PC only, at \`http://localhost\`: no LAN access, no hostname, no HTTPS, inbound connections blocked by Windows Firewall. The Admin account is used on the clinic PC. The clinician sends the Principal the Monthly Report as a PDF (printed, or saved with the browser's Save as PDF). Backups must not stay only on the clinic PC's own disk: a second drive or a USB drive kept elsewhere. Source: ADR-029, ADR-039, ADR-079.

## Session, lock-out and idle sign-out

Values from [\`backend/config/cliniq.php\`](${rel('backend/config/cliniq.php')}); the idle minutes are settings stored in \`system_settings\` with these as defaults.

| Rule | Value | Decision |
|---|---|---|
| Session maximum, however active | **${f.sessionDays} days** after sign-in, both roles | ADR-015, ADR-057 |
| Lock-out | **${f.failedAttempts}** wrong passwords in a row lock the account for **${f.lockMinutes} minutes** | ADR-015 (5 minutes since Sunday, November 8, 2026) |
| Idle sign-out, Staff | **${f.idleStaff} minutes** (setting, ${f.idleRange}) | ADR-078 |
| Idle sign-out, Admin | **${f.idleAdmin} minutes** (setting, ${f.idleRange}) | ADR-048, ADR-078 |
| Idle warning | 2 minutes before, with a live countdown | ADR-078 |
| Password recovery | authenticator app (6-digit code) or one of 8 recovery codes; no email on accounts | ADR-073 |
| LRN length | **${f.lrnLength}** digits | ADR-028 |

## School year

Runs **June 15 to April 14** by default (dates are a Staff setting). Staff end a school year and start the next **by hand**; nothing changes by itself, and a Dashboard banner reminds them 7 days before each due day. Archive is per school year. Source: ADR-072, ADR-075.

## Signed-in routes by role

| Path | Screen title | Who |
|---|---|---|
${routeRows}
`
}

const DEFAULT_TESTS = `## Test runs

Not run for this sheet. Run \`npm run docs:facts -- --tests\` to record the summary lines.`

async function main() {
  const args = process.argv.slice(2)
  const f = computeFacts()
  if (args.includes('--json')) return console.log(JSON.stringify(f, null, 2))
  let tests = existsSync(SHEET) ? (readFileSync(SHEET, 'utf8').match(/## Test runs[\s\S]*?(?=\n## )/) || [DEFAULT_TESTS])[0].trim() : DEFAULT_TESTS
  if (args.includes('--tests')) {
    const t = await runTests()
    tests = `## Test runs

Recorded ${f.timestamp} at \`${f.commit}\` by \`docs-facts.mjs --tests\`.

| Suite | Command | Result |
|---|---|---|
| Frontend (Vitest) | \`cd frontend && npm test\` | ${t.frontend} |
| Backend (Pest) | \`cd backend && composer test\` | ${t.backend} |

A frontend count that moves between runs comes from 5-second timeouts under full-suite load; the failing files pass when run alone. See the VERIFY entry "The full test suite fails more under CPU load" in [Frontend-Issues-and-TODOs](../08-Logs/Frontend-Issues-and-TODOs.md).`
  }
  const outIdx = args.indexOf('--out')
  const out = outIdx >= 0 ? args[outIdx + 1] : SHEET
  writeFileSync(out, renderSheet(f, tests))
  console.log(`Wrote ${relative(ROOT, out) || out}`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main()
