#!/usr/bin/env node
// Builds each document's 00-Combined-<document>.md in its section folder by joining its
// section files (NN-*.md) in order. Deterministic: the same section files always give the same output.
//
//   npm run docs:documents               # rebuild the combined files
//   npm run docs:documents -- --check    # fail if a combined file differs from what the sections produce
//   npm run docs:documents -- --diagrams # also render every tagged Mermaid diagram to assets/<name>.png (2x)
//
// A diagram is tagged by the comment `<!-- diagram: <name> -->` on the line before its ```mermaid block.
// --diagrams uses @mermaid-js/mermaid-cli (fetched by npx, or set MMDC) with Chrome or Chromium
// (set PUPPETEER_EXECUTABLE_PATH; never Microsoft Edge, AGENTS.md).

import { execFileSync } from 'node:child_process'
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '10-Project-Documents')
const DOCS = ['Project-Plan', 'SRS']
const args = process.argv.slice(2)
const combinedName = (doc) => `00-Combined-${doc}.md`

const sections = (doc) =>
  readdirSync(join(DIR, doc))
    .filter((f) => /^\d\d-.+\.md$/.test(f) && f !== combinedName(doc))
    .sort()
    .map((f) => [f, readFileSync(join(DIR, doc, f), 'utf8').replace(/\r\n/g, '\n').trim()])

function combined(doc) {
  const body = sections(doc)
    .map(([, text]) => text)
    .join('\n\n')
  return `<!-- Built from the section files in ${doc}/ by docs-documents-build.mjs. Do not edit. -->\n\n${body}\n`
}

let failed = 0
for (const doc of DOCS) {
  const relativeFile = `${doc}/${combinedName(doc)}`
  const file = join(DIR, doc, combinedName(doc))
  const want = combined(doc)
  if (args.includes('--check')) {
    let have = ''
    try {
      have = readFileSync(file, 'utf8').replace(/\r\n/g, '\n')
    } catch {}
    const ok = have === want
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${relativeFile} ${ok ? 'matches its section files' : 'differs from its section files (run npm run docs:documents)'}`)
    if (!ok) failed++
  } else {
    writeFileSync(file, want)
    console.log(`built ${relativeFile} (${sections(doc).length} sections)`)
  }
}

if (args.includes('--diagrams')) {
  const tmp = mkdtempSync(join(tmpdir(), 'cliniq-documents-'))
  const config = { theme: 'neutral', themeVariables: { fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '14px' } }
  writeFileSync(join(tmp, 'config.json'), JSON.stringify(config))
  writeFileSync(join(tmp, 'puppeteer.json'), JSON.stringify({ executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined, args: ['--no-sandbox'] }))
  const mmdc = process.env.MMDC ? [process.env.MMDC] : ['npx', '-y', '-p', '@mermaid-js/mermaid-cli@11.4.2', 'mmdc']
  for (const doc of DOCS) {
    for (const [f, text] of sections(doc)) {
      for (const m of text.matchAll(/<!-- diagram: ([\w.-]+) -->\n```mermaid\n([\s\S]*?)\n```/g)) {
        const src = join(tmp, `${m[1]}.mmd`)
        writeFileSync(src, m[2])
        try {
          execFileSync(mmdc[0], [...mmdc.slice(1), '-i', src, '-o', join(DIR, doc, 'assets', `${m[1]}.png`), '-c', join(tmp, 'config.json'), '-p', join(tmp, 'puppeteer.json'), '-b', 'white', '-s', '2', '-q'], { stdio: 'pipe', shell: process.platform === 'win32' })
          console.log(`ok    ${doc}/assets/${m[1]}.png`)
        } catch (e) {
          console.log(`FAIL  ${m[1]} (${f}): ${String(e.stderr || e.message).split('\n').find((l) => l.trim()) || 'render failed'}`)
          failed++
        }
      }
    }
  }
}
process.exit(failed ? 1 : 0)
