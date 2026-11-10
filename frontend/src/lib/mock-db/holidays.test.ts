import { afterEach, describe, expect, it } from 'vitest'
import { getHolidays } from '.'
import holidayData from './holidays-ph.json'

/**
 * The bundled list must match the proclamations exactly. This is the expected 2026 list, copied from
 * Proclamation No. 1006, s. 2025 (all but the Eid days), No. 1189, s. 2026 (Eid'l Fitr), and
 * No. 1264, s. 2026 (Eid'l Adha), and 2027 from No. 1427, s. 2026. If the JSON drifts from these texts, this test fails.
 */
const PROCLAIMED_2026 = [
  ['2026-01-01', "New Year's Day", 'regular'],
  ['2026-02-17', 'Chinese New Year', 'special-non-working'],
  ['2026-02-25', 'EDSA People Power Revolution Anniversary', 'special-working'],
  ['2026-03-20', "Eid'l Fitr (Feast of Ramadhan)", 'islamic'],
  ['2026-04-02', 'Maundy Thursday', 'regular'],
  ['2026-04-03', 'Good Friday', 'regular'],
  ['2026-04-04', 'Black Saturday', 'special-non-working'],
  ['2026-04-09', 'Araw ng Kagitingan', 'regular'],
  ['2026-05-01', 'Labor Day', 'regular'],
  ['2026-05-27', "Eid'l Adha", 'islamic'],
  ['2026-06-12', 'Independence Day', 'regular'],
  ['2026-08-21', 'Ninoy Aquino Day', 'special-non-working'],
  ['2026-08-31', 'National Heroes Day', 'regular'],
  ['2026-11-01', "All Saints' Day", 'special-non-working'],
  ['2026-11-02', "All Souls' Day", 'special-non-working'],
  ['2026-11-30', 'Bonifacio Day', 'regular'],
  ['2026-12-08', 'Feast of the Immaculate Conception of Mary', 'special-non-working'],
  ['2026-12-24', 'Christmas Eve', 'special-non-working'],
  ['2026-12-25', 'Christmas Day', 'regular'],
  ['2026-12-30', 'Rizal Day', 'regular'],
  ['2026-12-31', 'Last Day of the Year', 'special-non-working'],
]

/** Proclamation No. 1427, s. 2026, Section 1. Eid'l Fitr and Eid'l Adha are left out until they are proclaimed. */
const PROCLAIMED_2027 = [
  ['2027-01-01', "New Year's Day", 'regular'],
  ['2027-02-06', 'Chinese New Year', 'special-non-working'],
  ['2027-02-25', 'EDSA People Power Revolution Anniversary', 'special-working'],
  ['2027-03-25', 'Maundy Thursday', 'regular'],
  ['2027-03-26', 'Good Friday', 'regular'],
  ['2027-03-27', 'Black Saturday', 'special-non-working'],
  ['2027-04-09', 'Araw ng Kagitingan', 'regular'],
  ['2027-05-01', 'Labor Day', 'regular'],
  ['2027-06-12', 'Independence Day', 'regular'],
  ['2027-08-21', 'Ninoy Aquino Day', 'special-non-working'],
  ['2027-08-30', 'National Heroes Day', 'regular'],
  ['2027-11-01', "All Saints' Day", 'special-non-working'],
  ['2027-11-02', "All Souls' Day", 'special-non-working'],
  ['2027-11-30', 'Bonifacio Day', 'regular'],
  ['2027-12-08', 'Feast of the Immaculate Conception of Mary', 'special-non-working'],
  ['2027-12-24', 'Christmas Eve', 'special-non-working'],
  ['2027-12-25', 'Christmas Day', 'regular'],
  ['2027-12-30', 'Rizal Day', 'regular'],
  ['2027-12-31', 'Last Day of the Year', 'special-non-working'],
]

describe('holidays (read-only reference data)', () => {
  afterEach(() => window.history.replaceState(null, '', '/'))

  it('matches the 2026 proclamations exactly, with references in the metadata', () => {
    expect(holidayData.holidays.map((h) => [h.date, h.name, h.kind])).toEqual([
      ...PROCLAIMED_2026,
      ...PROCLAIMED_2027,
    ])
    expect(holidayData.holidays.every((h) => h.confirmed)).toBe(true)
    expect(holidayData.meta.proclamations.map((p) => p.ref)).toEqual([
      'Proclamation No. 1006, s. 2025',
      'Proclamation No. 1189, s. 2026',
      'Proclamation No. 1264, s. 2026',
      'Proclamation No. 1427, s. 2026',
    ])
    expect(holidayData.meta.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(holidayData.meta.source).not.toBe('')
  })

  it('returns only the requested range, plus the years covered and source details', async () => {
    const feed = await getHolidays('2026-12-01', '2026-12-31')
    expect(feed.holidays.map((h) => h.date)).toEqual([
      '2026-12-08',
      '2026-12-24',
      '2026-12-25',
      '2026-12-30',
      '2026-12-31',
    ])
    expect(feed.years).toEqual([2026, 2027])
    expect(feed).toMatchObject({
      lastUpdated: holidayData.meta.lastUpdated,
      source: holidayData.meta.source,
    })
  })

  it('covers 2027, so the Calendar stops warning that the year is missing', async () => {
    const feed = await getHolidays('2027-03-25', '2027-03-27')
    expect(feed.holidays.map((h) => h.name)).toEqual([
      'Maundy Thursday',
      'Good Friday',
      'Black Saturday',
    ])
    expect(feed.years).toContain(2027)
  })

  it('can be emptied with ?mockEmpty=holidays to preview the missing-year warning', async () => {
    window.history.replaceState(null, '', '/?mockEmpty=holidays')
    const feed = await getHolidays('2026-01-01', '2026-12-31')
    expect(feed.holidays).toEqual([])
    expect(feed.years).toEqual([])
  })
})
