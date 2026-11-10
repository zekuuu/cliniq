#!/usr/bin/env node
// Documentation freshness check. Changes nothing; prints a pass/fail list and exits 1 on any failure.
//
//   npm run docs:check                 # from the repository root
//   npm run docs:check -- --mermaid    # also render every Mermaid block (needs Chrome or Chromium; see below)
//
// Checks:
//   1. numbers   numbers in the front documents (READMEs, Start Here) against a fresh Facts sheet
//   2. links     every relative link and heading anchor in tracked Markdown (logs and _read-first excluded)
//   3. mermaid   every ```mermaid block parses and renders (only with --mermaid)
//   4. dates     "Last checked" lines older than the newest ADR or changelog row
//   5. stale     removed features still described as current (email reset, QR, Student Number, LAN, ...)
//   6. agents    AGENTS.md and CLAUDE.md identical apart from the title
//
// --mermaid renders with @mermaid-js/mermaid-cli, fetched by npx on first use. Set MMDC to an installed mmdc
// to skip the download, and PUPPETEER_EXECUTABLE_PATH to Chrome or Chromium (never Microsoft Edge, AGENTS.md).

import { execFileSync, execSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, normalize, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { computeFacts } from './docs-facts.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const KB = 'CLINIQ-Knowledge-Base'
const args = process.argv.slice(2)
const read = (p) => readFileSync(join(ROOT, p), 'utf8')
const results = []
const report = (check, ok, detail = []) => results.push({ check, ok, detail })

const tracked = execSync('git ls-files --cached --others --exclude-standard "*.md"', { cwd: ROOT, encoding: 'utf8' })
  .split('\n')
  .filter(Boolean)
  .filter((p) => !p.includes('/08-Logs/') && !p.startsWith('_read-first/') && !p.includes('node_modules/') && !p.startsWith('backend/vendor/'))

// Front documents: the ones a newcomer reads first, which must quote the Facts sheet.
const FRONT = ['README.md', 'README_ORIGINAL.md', `${KB}/README.md`, `${KB}/00-Project-Core/Start-Here-For-SRS-And-Project-Plan.md`, 'backend/README.md', 'frontend/README.md', 'CONTRIBUTING.md']
  .filter((p) => existsSync(join(ROOT, p)))
/** Markdown with fenced code and inline code blanked out, line numbers kept. */
function prose(text) {
  let fence = false
  return text.split('\n').map((l) => {
    if (/^\s*(```|~~~)/.test(l)) {
      fence = !fence
      return ''
    }
    return fence ? '' : l.replace(/`[^`]*`/g, '')
  })
}

// GitHub heading anchors.
function anchors(text) {
  const seen = new Map()
  const out = new Set()
  for (const l of prose(text)) {
    const m = l.match(/^#{1,6}\s+(.+?)\s*#*\s*$/)
    if (!m) continue
    const base = m[1]
      .replace(/<[^>]+>/g, '')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s_-]/gu, '')
      .replace(/ /g, '-')
    const n = seen.get(base) || 0
    seen.set(base, n + 1)
    out.add(n ? `${base}-${n}` : base)
  }
  // Explicit HTML anchors.
  for (const m of text.matchAll(/<a\s+(?:name|id)="([^"]+)"/g)) out.add(m[1])
  return out
}

// 1. Numbers
{
  const f = computeFacts()
  const rules = [
    [/\b(\d+)[- ]table\b|\b(\d+) tables\b/i, f.tables, 'tables'],
    [/ADR-001 to ADR-(\d+)/, +f.adrLast.slice(4), 'newest ADR'],
    [/\b(\d+) (?:ADRs|decision records)\b/i, f.adrCount, 'ADRs'],
    [/\b(\d+) (?:numbered )?screens\b/i, f.screens, 'screens'],
    [/\b(\d+) (?:frontend )?routes\b/i, f.routeCount, 'routes'],
    [/\b(\d+) constraint tests?\b/i, f.constraintTests, 'constraint tests'],
    [/\b(\d+) (?:Laravel )?migrations\b/i, f.migrations, 'migrations'],
    [/\b(\d+) (?:API )?contract entries\b/i, f.contractEntries, 'contract entries'],
    [/\b(\d+) backend modules\b/i, f.modules.length, 'backend modules'],
  ]
  const bad = []
  for (const file of FRONT) {
    prose(read(file)).forEach((l, i) => {
      if (/^\s*>/.test(l) || /\b(was|were|then|before|earlier|previously|from \d+ to)\b/i.test(l)) return
      for (const [re, want, what] of rules) {
        const m = l.match(re)
        const got = m && +(m[1] ?? m[2])
        if (m && got !== want) bad.push(`${file}:${i + 1}: says ${got} ${what}; Facts sheet: ${want}`)
      }
    })
  }
  // The committed sheet itself must match a fresh run.
  const tmp = join(mkdtempSync(join(tmpdir(), 'cliniq-docs-')), 'Facts-Sheet.md')
  execFileSync(process.execPath, [join(ROOT, KB, '04-Development/tools/docs-facts.mjs'), '--out', tmp], { cwd: ROOT })
  const strip = (s) => s.replace(/^\*\*(Last regenerated|From commit):\*\*.*$/gm, '')
  if (existsSync(join(ROOT, KB, '00-Project-Core/Facts-Sheet.md')) && strip(readFileSync(tmp, 'utf8')) !== strip(read(`${KB}/00-Project-Core/Facts-Sheet.md`)))
    bad.push(`${KB}/00-Project-Core/Facts-Sheet.md: out of date; run npm run docs:facts`)
  report('numbers match the Facts sheet', bad.length === 0, bad)
}

// 2. Links and anchors
{
  const bad = []
  const cache = new Map()
  const anchorsOf = (p) => (cache.has(p) ? cache.get(p) : cache.set(p, anchors(readFileSync(p, 'utf8'))).get(p))
  for (const file of tracked) {
    const lines = prose(read(file))
    lines.forEach((l, i) => {
      for (const m of l.matchAll(/!?\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g)) {
        const target = m[1]
        if (/^(https?:|mailto:|tel:|data:)/.test(target)) continue
        const [rawPath, hash] = target.split('#')
        let path
        try {
          path = rawPath ? normalize(join(ROOT, dirname(file), decodeURIComponent(rawPath))) : join(ROOT, file)
        } catch {
          bad.push(`${file}:${i + 1}: bad link ${target}`)
          continue
        }
        if (!existsSync(path)) {
          bad.push(`${file}:${i + 1}: missing ${target}`)
          continue
        }
        if (hash && path.endsWith('.md') && !anchorsOf(path).has(decodeURIComponent(hash).toLowerCase()))
          bad.push(`${file}:${i + 1}: no heading for #${hash} in ${relative(ROOT, path).replace(/\\/g, '/')}`)
      }
    })
  }
  report(`relative links and anchors (${tracked.length} files)`, bad.length === 0, bad)
}

// 3. Mermaid
{
  const blocks = []
  for (const file of tracked) {
    const text = read(file)
    for (const m of text.matchAll(/^```mermaid\r?\n([\s\S]*?)^```/gm)) blocks.push({ file, line: text.slice(0, m.index).split('\n').length, src: m[1] })
  }
  if (!args.includes('--mermaid')) {
    report(`mermaid blocks (${blocks.length} found; not rendered, add --mermaid)`, true)
  } else {
    const dir = mkdtempSync(join(tmpdir(), 'cliniq-mmd-'))
    const cfg = join(dir, 'puppeteer.json')
    writeFileSync(cfg, JSON.stringify({ executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined, args: ['--no-sandbox'] }))
    const mmdc = process.env.MMDC ? [process.env.MMDC] : ['npx', '-y', '-p', '@mermaid-js/mermaid-cli@11.4.2', 'mmdc']
    const bad = []
    blocks.forEach((b, n) => {
      const input = join(dir, `${n}.mmd`)
      writeFileSync(input, b.src)
      try {
        execFileSync(mmdc[0], [...mmdc.slice(1), '-i', input, '-o', join(dir, `${n}.svg`), '-p', cfg, '-q'], { stdio: 'pipe', shell: process.platform === 'win32' })
      } catch (e) {
        bad.push(`${b.file}:${b.line}: ${String(e.stderr || e.message).split('\n').find((x) => /error|Parse/i.test(x)) || 'render failed'}`)
      }
    })
    report(`mermaid blocks render (${blocks.length})`, bad.length === 0, bad)
  }
}

// 4. "Last checked" dates
{
  const MONTHS = 'January February March April May June July August September October November December'.split(' ')
  const toDate = (s) => {
    const m = s.match(new RegExp(`(${MONTHS.join('|')}) (\\d{1,2}), (\\d{4})`))
    return m ? new Date(+m[3], MONTHS.indexOf(m[1]), +m[2]) : null
  }
  const adrDates = execSync(`git ls-files "${KB}/06-Decisions/ADR-0*.md"`, { cwd: ROOT, encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)
    .map((p) => toDate((read(p).match(/^\*\*Date:\*\*(.*)$/m) || [, ''])[1]))
  const logDates = [`${KB}/08-Logs/Frontend-Changelog.md`, `${KB}/08-Logs/Backend-Changelog.md`]
    .filter((p) => existsSync(join(ROOT, p)))
    .flatMap((p) => [...read(p).matchAll(/^\|[^|\n]*\|/gm)].map((m) => toDate(m[0])))
  const newest = new Date(Math.max(...[...adrDates, ...logDates].filter(Boolean).map(Number)))
  const bad = []
  for (const file of FRONT) {
    prose(read(file)).forEach((l, i) => {
      if (!/Last (checked|verified|regenerated)/i.test(l)) return
      const d = toDate(l)
      if (d && d < newest) bad.push(`${file}:${i + 1}: ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} is older than the newest ADR or changelog row (${MONTHS[newest.getMonth()]} ${newest.getDate()}, ${newest.getFullYear()})`)
    })
  }
  report('"Last checked" lines are current', bad.length === 0, bad)
}

// 5. Stale phrases: removed features described as current. History words on the line excuse it.
{
  const STALE = [
    [/reset(ting)? (a |the |their )?password(s)? by e-?mail|e-?mail(ed)? (password )?reset|reset link/i, 'email password reset (ADR-073)'],
    [/\bQR (code )?(lookup|scan|card)/i, 'QR lookup (ADR-027)'],
    [/\bStudent Number\b/, 'Student Number (ADR-027, ADR-028)'],
    [/Clinic Overview (Report )?print(out)?|Clinic Overview Report\b/i, 'Clinic Overview printout (ADR-074)'],
    [/\b(served|reach(ed|able)?|access(ed|ible)?|used) (over|on|from|across) the (school |clinic(’s|'s)? )?(LAN|network)\b|\bintranet\b|HTTPS on the LAN|cliniq\.local/i, 'LAN access (ADR-079)'],
    [/Backend:? (is )?not (started|built)|backend \(planned\)/i, 'backend not started'],
  ]
  const HISTORY = /\b(no|not|never|removed|replaced|replaces|dropped|instead|was|were|formerly|old|older|earlier|no longer|superseded|reversed|rejected|out of scope|ADR-0(27|28|73|74|79))\b/i
  const skip = (p) => p.includes('/06-Decisions/') || p.includes('/09-References/Canonical-Documents/CLINIQ_Review_of_Related_Systems') || p.startsWith('.claude/')
  const bad = []
  for (const file of tracked.filter((p) => !skip(p))) {
    prose(read(file)).forEach((l, i) => {
      // Dated notes, checklist build notes and revision-history rows are history, not current claims.
      if (/^\s*>/.test(l) || /^\s*- \[x\]|Build note|Resume note|^\|\s*\d+\.\d+\s*\|/.test(l) || HISTORY.test(l)) return
      for (const [re, what] of STALE) if (re.test(l)) bad.push(`${file}:${i + 1}: ${what}: ${l.trim().slice(0, 110)}`)
    })
  }
  report('no removed feature described as current', bad.length === 0, bad)
}

// 6. AGENTS.md and CLAUDE.md
{
  const body = (p) => read(p).split('\n').slice(1).join('\n')
  report('AGENTS.md equals CLAUDE.md (title aside)', body('AGENTS.md') === body('CLAUDE.md'))
}

let failed = 0
for (const r of results) {
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.check}${r.ok ? '' : ` (${r.detail.length})`}`)
  for (const d of r.detail.slice(0, 40)) console.log(`      ${d}`)
  if (r.detail.length > 40) console.log(`      ... ${r.detail.length - 40} more`)
  if (!r.ok) failed++
}
console.log(failed ? `\n${failed} check(s) failed.` : '\nAll checks passed.')
process.exit(failed ? 1 : 0)
