import { describe, expect, it } from 'vitest'
import { lrnMatchesSearch } from './lrn'

describe('lrnMatchesSearch (ADR-080)', () => {
  it('matches a full LRN by its prefix, as the mock logs always did', () => {
    expect(lrnMatchesSearch('000000260048', '0000002600')).toBe(true)
    expect(lrnMatchesSearch('000000260048', '0048')).toBe(false)
    expect(lrnMatchesSearch('000000260048', '')).toBe(true)
  })

  it('matches a masked LRN by its visible last 4 digits only', () => {
    const masked = '●●●●●●●●0048'
    expect(lrnMatchesSearch(masked, '0048')).toBe(true)
    expect(lrnMatchesSearch(masked, '48')).toBe(true)
    expect(lrnMatchesSearch(masked, '000000260048')).toBe(true)
    expect(lrnMatchesSearch(masked, '000000260049')).toBe(false)
    expect(lrnMatchesSearch(masked, '0000002600')).toBe(false)
    expect(lrnMatchesSearch(masked, 'fever')).toBe(false)
  })
})
