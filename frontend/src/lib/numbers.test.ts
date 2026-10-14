import { describe, expect, it } from 'vitest'
import { formatDecimal } from './numbers'

describe('formatDecimal', () => {
  it('rounds to at most 2 decimal places', () => {
    expect(formatDecimal('36.912')).toBe('36.91')
    expect(formatDecimal(36.9)).toBe('36.9')
    expect(formatDecimal('104')).toBe('104')
    expect(formatDecimal('37.005')).toBe('37.01')
  })

  it('leaves non-numeric text unchanged', () => {
    expect(formatDecimal('120/80')).toBe('120/80')
    expect(formatDecimal('')).toBe('')
  })
})
