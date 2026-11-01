/**
 * The yearly student list (ADR-047): reading the registrar's CSV and matching its columns. The
 * school's file format is unknown, so the registrar maps columns to these fields.
 */
export const IMPORT_FIELDS = [
  { key: 'lrn', label: 'LRN', required: true, guess: /lrn|learner/i },
  { key: 'lastName', label: 'Last name', required: true, guess: /last|surname|family/i },
  { key: 'firstName', label: 'First name', required: true, guess: /first|given/i },
  { key: 'middleName', label: 'Middle name', required: false, guess: /middle/i },
  { key: 'sex', label: 'Sex', required: true, guess: /sex|gender/i },
  { key: 'birthDate', label: 'Birth date', required: false, guess: /birth/i },
  { key: 'gradeLevel', label: 'Grade', required: true, guess: /grade|level/i },
  { key: 'section', label: 'Section', required: false, guess: /section/i },
] as const

export type ImportFieldKey = (typeof IMPORT_FIELDS)[number]['key']
/** Each field's column index, or -1 when not mapped. */
export type ImportMapping = Record<ImportFieldKey, number>
export type ImportRow = Record<ImportFieldKey, string>

/** RFC 4180 CSV: quoted fields, doubled quotes, commas and line breaks inside quotes. Blank lines are dropped. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  const source = text.replace(/^\uFEFF/, '')
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i]
    if (quoted) {
      if (char !== '"') field += char
      else if (source[i + 1] === '"') {
        field += '"'
        i += 1
      } else quoted = false
    } else if (char === '"') quoted = true
    else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[i + 1] === '\n') i += 1
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += char
  }
  row.push(field)
  rows.push(row)
  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ''))
}

export function guessMapping(headers: string[]): ImportMapping {
  const mapping = {} as ImportMapping
  for (const field of IMPORT_FIELDS) mapping[field.key] = headers.findIndex((header) => field.guess.test(header))
  return mapping
}

export function mapRows(rows: string[][], mapping: ImportMapping): ImportRow[] {
  return rows.map((cells) => {
    const row = {} as ImportRow
    for (const field of IMPORT_FIELDS) row[field.key] = (cells[mapping[field.key]] ?? '').trim()
    return row
  })
}
