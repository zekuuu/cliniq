#!/usr/bin/env node
// Regenerates 06-Decisions/ADR-Index.md from the ADR files and Decisions-Summary.md.
//
//   npm run docs:adrs
//
// Number and title come from each ADR's first heading, status and date from its **Status:** and **Date:**
// lines, the one-line effect from the first sentence of its entry in Decisions-Summary.md, and "Changed"
// lists the documents named in its Consequences section.

import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { manilaNow } from './docs-facts.mjs'

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '06-Decisions')
const summary = readFileSync(join(DIR, 'Decisions-Summary.md'), 'utf8').replace(/\r/g, '')

const firstSentence = (s) => (s.match(/^(.+?[.!?])(\s|$)/) || [, s])[1].trim()
const effectFor = (n) => {
  const num = String(n)
  const m = summary.match(new RegExp(`^#{2,3} (?:ADR-)?0*${num}(?::|\\s)[^\\n]*\\n\\n([^\\n]+)`, 'm'))
  return m ? firstSentence(m[1]).replace(/\|/g, '\\|') : ''
}
const shortDate = (s) => (s.match(/(January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, \d{4}/) || [''])[0]

const rows = readdirSync(DIR)
  .filter((f) => /^ADR-\d{3}-/.test(f))
  .sort()
  .map((file) => {
    const text = readFileSync(join(DIR, file), 'utf8').replace(/\r/g, '')
    const [, num, title] = text.match(/^# ADR-(\d+):?\s*(.+)$/m) || [, file.slice(4, 7), file]
    const statusLine = (text.match(/^\*\*Status:\*\*\s*(.+)$/m) || [, ''])[1]
    const status = (statusLine.match(/^(Accepted|Superseded|Replaced|Amended|Proposed|Rejected|Deprecated)[^.(;]*/i) || [statusLine.split(/[.(;]/)[0]])[0].trim()
    const date = shortDate((text.match(/^\*\*Date:\*\*\s*(.+)$/m) || [, ''])[1]) || shortDate(statusLine)
    const consequences = (text.match(/^## Consequences\n([\s\S]*?)(?=^## |\s*$)/m) || [, ''])[1]
    const docs = [...new Set([...consequences.matchAll(/([A-Za-z][\w-]+\.md)\b/g)].map((m) => m[1].replace('.md', '')))].slice(0, 3).join(', ')
    return `| [${+num}](${file}) | ${title.replace(/\|/g, '\\|')} | ${status.slice(0, 40)} | ${date} | ${effectFor(+num)} | ${docs || '—'} |`
  })

writeFileSync(
  join(DIR, 'ADR-Index.md'),
  `# ADR index

Every decision record, one line each. Generated ${manilaNow()} by \`npm run docs:adrs\` from the ADR headers and [Decisions-Summary.md](Decisions-Summary.md); do not edit by hand. A later dated note at the top of an ADR changes what it says, and a later ADR can replace an earlier one: always read the record itself before quoting it. Plain-language summaries: [Decisions-Summary.md](Decisions-Summary.md). What changed since Project Plan revision 2.8: [Changes-Since-Project-Plan-2.8.md](Changes-Since-Project-Plan-2.8.md).

| ADR | Title | Status | Date | Effect in one line | Changed |
|---|---|---|---|---|---|
${rows.join('\n')}
`,
)
console.log(`Wrote ADR-Index.md (${rows.length} ADRs).`)
