import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Lrn, MaskedLrn } from '../components/ui/MaskedLrn'

/**
 * One LRN look on every screen (professor's consultation, November 6, 2026). Every screen renders an
 * LRN through `<Lrn>` (masked) or `<Lrn full>`; text strings (print scope lines, file names) are
 * the only exception, since a component can't sit inside a string.
 */
const sources = import.meta.glob(['../**/*.tsx', '!../**/*.test.tsx', '!../components/ui/MaskedLrn.tsx'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>

describe('LRN rendering', () => {
  it('renders no LRN as bare JSX text outside the shared component', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(50)
    const offenders = Object.entries(sources).flatMap(([file, text]) =>
      text
        .split('\n')
        .map((line, index) => ({ line: line.trim(), at: `${file}:${index + 1}` }))
        // `{student.lrn}` as a child: not a prop (`lrn={…}`, `value={…}`) and not inside a template string.
        .filter(({ line }) => /(?<![=$\w])\{[\w.?]+\.lrn\}/.test(line))
        .map(({ at, line }) => `${at}  ${line}`),
    )
    expect(offenders).toEqual([])
  })

  it('masks with drawn dots and a spoken label, and shows the full LRN as plain tabular digits', () => {
    const { container } = render(
      <p>
        <MaskedLrn lrn="000000260001" /> <Lrn lrn="000000260001" full />
      </p>,
    )
    const masked = container.querySelector('[data-lrn="masked"]')!
    expect(masked.querySelector('[data-lrn-dots]')).not.toBeNull()
    expect(masked).toHaveTextContent('LRN ending in 0001')
    const full = container.querySelector('[data-lrn="full"]')!
    expect(full).toHaveTextContent(/^000000260001$/)
    expect(full).toHaveClass('tabular-nums', 'whitespace-nowrap')
  })
})
