#!/usr/bin/env node
// Exports every diagram to SVG and 2x PNG in 02-Architecture/Database/Diagrams/, for pasting into Word or Google Docs.
// The Markdown keeps the Mermaid source (GitHub renders it); these files are the copies for documents.
//
//   npm run docs:diagrams
//
// Needs: @mermaid-js/mermaid-cli (fetched by npx on first use, or set MMDC to an installed mmdc) with Chrome or
// Chromium (set PUPPETEER_EXECUTABLE_PATH; never Microsoft Edge, AGENTS.md); and, for ERD-Overview, Graphviz `dot`
// on PATH or @hpcc-js/wasm-graphviz (set GRAPHVIZ_WASM to its folder). Writes only the export files.

import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const ARCH = join(ROOT, 'CLINIQ-Knowledge-Base', '02-Architecture')
const OUT = join(ARCH, 'Database', 'Diagrams')

// [Markdown file under 02-Architecture, index of the ```mermaid block in it, export name]
const MERMAID = [
  ['Database/Use-Case-Diagram.md', 0, 'Use-Case'],
  ['Database/Data-Flow-Diagram.md', 0, 'DFD-Level-0'],
  ['Database/Data-Flow-Diagram.md', 1, 'DFD-Level-1'],
  ['Database/Activity-Diagram.md', 0, 'Activity-2-Emergency'],
  ['Database/Activity-Diagram.md', 1, 'Activity-3-Follow-Up'],
  ['Database/Activity-Diagram.md', 2, 'Activity-4-Sign-In'],
  ['Database/Activity-Diagram.md', 3, 'Activity-5-Recovery'],
  ['Database/Activity-Diagram.md', 4, 'Activity-6-Visit'],
  ['Database/Activity-Diagram.md', 5, 'Activity-7-Import'],
  ['Database/Activity-Diagram.md', 6, 'Activity-8-School-Year'],
  ['Database/Activity-Diagram.md', 7, 'Activity-9-Backup'],
  ['Database/Module-Linkage-Diagram.md', 0, 'Module-Linkage'],
  ['Database/ERD.md', 1, 'ERD-3.2-Students'],
  ['Database/ERD.md', 2, 'ERD-3.3-Visits'],
  ['Database/ERD.md', 3, 'ERD-3.4-Emergency'],
  ['Database/ERD.md', 4, 'ERD-3.5-Inventory'],
  ['Database/ERD.md', 5, 'ERD-3.6-Access-and-Operations'],
  ['Deployment-Diagram.md', 0, 'Deployment'],
  ['Context-Diagram.md', 0, 'Context'],
  ['Sequence-Diagrams.md', 0, 'Sequence-1-Sign-In'],
  ['Sequence-Diagrams.md', 1, 'Sequence-2-Idle-Keep-Alive'],
  ['Sequence-Diagrams.md', 2, 'Sequence-3-Recovery'],
  ['Sequence-Diagrams.md', 3, 'Sequence-4-Visit'],
  ['State-Diagrams.md', 0, 'State-1-School-Year'],
  ['State-Diagrams.md', 1, 'State-2-Incident'],
  ['State-Diagrams.md', 2, 'State-3-Follow-Up'],
  ['Role-Permission-Matrix.md', 0, 'Role-Permissions'],
  ['Screen-Flow-Map.md', 0, 'Screen-Flow-Staff'],
  ['Screen-Flow-Map.md', 1, 'Screen-Flow-Admin'],
  ['Backup-And-Recovery-Flow.md', 0, 'Backup-Recovery'],
]

// One look for every diagram: neutral theme, one font, white background (pastes cleanly into documents).
const CONFIG = { theme: 'neutral', themeVariables: { fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '14px' } }

const tmp = mkdtempSync(join(tmpdir(), 'cliniq-diagrams-'))
writeFileSync(join(tmp, 'config.json'), JSON.stringify(CONFIG))
writeFileSync(join(tmp, 'puppeteer.json'), JSON.stringify({ executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined, args: ['--no-sandbox'] }))
const mmdc = process.env.MMDC ? [process.env.MMDC] : ['npx', '-y', '-p', '@mermaid-js/mermaid-cli@11.4.2', 'mmdc']
const run = (args) => execFileSync(mmdc[0], [...mmdc.slice(1), ...args], { stdio: 'pipe', shell: process.platform === 'win32' })

let failed = 0
for (const [file, index, name] of MERMAID) {
  const blocks = [...readFileSync(join(ARCH, file), 'utf8').replace(/\r/g, '').matchAll(/^```mermaid\n([\s\S]*?)^```/gm)]
  if (!blocks[index]) {
    console.log(`FAIL ${name}: no block ${index} in ${file}`)
    failed++
    continue
  }
  const src = join(tmp, `${name}.mmd`)
  writeFileSync(src, blocks[index][1])
  const common = ['-i', src, '-c', join(tmp, 'config.json'), '-p', join(tmp, 'puppeteer.json'), '-b', 'white', '-q']
  try {
    run([...common, '-o', join(OUT, `${name}.svg`)])
    run([...common, '-o', join(OUT, `${name}.png`), '-s', '2', '-w', '1200'])
    console.log(`ok   ${name}`)
  } catch (e) {
    console.log(`FAIL ${name}: ${String(e.stderr || e.message).split('\n').find((l) => l.trim()) || 'render failed'}`)
    failed++
  }
}

// ERD overview: Graphviz source kept beside the images.
const dotSrc = readFileSync(join(OUT, 'ERD-Overview.dot'), 'utf8')
try {
  try {
    writeFileSync(join(OUT, 'ERD-Overview.svg'), execFileSync('dot', ['-Tsvg'], { input: dotSrc }))
    writeFileSync(join(OUT, 'ERD-Overview.png'), execFileSync('dot', ['-Tpng', '-Gdpi=144'], { input: dotSrc }))
  } catch {
    const base = process.env.GRAPHVIZ_WASM
    if (!base) throw new Error('install Graphviz or set GRAPHVIZ_WASM')
    const { Graphviz } = await import(pathToFileURL(join(base, 'dist', 'index.js')).href)
    const svg = (await Graphviz.load()).dot(dotSrc, 'svg')
    writeFileSync(join(OUT, 'ERD-Overview.svg'), svg)
    const svgFile = join(tmp, 'erd.svg')
    writeFileSync(svgFile, svg)
    // PNG from the SVG through the same headless browser mmdc uses is not available, so the PNG needs `dot`.
    console.log('note ERD-Overview.png kept as is (needs Graphviz dot for PNG)')
  }
  console.log('ok   ERD-Overview')
} catch (e) {
  console.log(`FAIL ERD-Overview: ${e.message}`)
  failed++
}
process.exit(failed ? 1 : 0)
