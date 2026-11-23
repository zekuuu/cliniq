#!/usr/bin/env node
// Clears /update-docs change markers from the Project Plan and SRS section files, in place.
//
//   npm run docs:clear-markers             # clear them
//   npm run docs:clear-markers -- --check  # fail if any section file still has markers
//
// Run only after the groupmate has reviewed the marked sections (see 10-Project-Documents/README.md).

import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { stripMarkers } from './docs-markers.mjs'

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '10-Project-Documents')
const check = process.argv.includes('--check')
let hits = 0

for (const doc of ['Project-Plan', 'SRS']) {
  for (const f of readdirSync(join(DIR, doc)).filter((f) => /^\d\d-.+\.md$/.test(f) && !f.startsWith('00-'))) {
    const path = join(DIR, doc, f)
    const text = readFileSync(path, 'utf8')
    const clean = stripMarkers(text)
    if (clean === text) continue
    hits++
    if (check) console.log(`FAIL  ${doc}/${f} still has markers`)
    else {
      writeFileSync(path, clean)
      console.log(`cleared  ${doc}/${f}`)
    }
  }
}

if (!hits) console.log('No markers found.')
else if (!check) console.log(`\n${hits} file(s) cleared. Run npm run docs:documents -- --check next.`)
process.exit(check && hits ? 1 : 0)
