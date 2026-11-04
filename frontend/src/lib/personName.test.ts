import { describe, expect, it } from 'vitest'
import { cleanNamePart, compareByLastName, formatPersonName, nameKey, nameMatches, splitFullName } from './personName'

describe('person names (S4, ADR-064)', () => {
  it('builds "First Middle Last" from one, two or three parts', () => {
    expect(formatPersonName({ firstName: 'Maria Angela', middleName: 'Santos', lastName: 'Dela Cruz' })).toBe('Maria Angela Santos Dela Cruz')
    expect(formatPersonName({ firstName: 'Ana', middleName: null, lastName: 'Reyes' })).toBe('Ana Reyes')
    expect(formatPersonName({ firstName: 'Ana', middleName: '', lastName: 'Reyes' })).toBe('Ana Reyes')
    expect(formatPersonName({ firstName: 'Ana', middleName: null, lastName: '' })).toBe('Ana')
  })

  it('trims and collapses spaces in a part', () => {
    expect(cleanNamePart('  Maria   Angela ')).toBe('Maria Angela')
    expect(cleanNamePart('   ')).toBe('')
  })

  it('compares names case-, accent- and space-insensitively', () => {
    expect(nameKey('  José  Peña ')).toBe(nameKey('jose pena'))
    expect(nameKey('Ma. Angela')).not.toBe(nameKey('Maria Angela'))
  })

  it('finds a name by any part, by the full name, or by parts in another order', () => {
    const name = 'Maria Angela Santos Dela Cruz'
    for (const query of ['dela cruz', 'maria santos', 'Santos', 'angela', 'MARIA ANGELA SANTOS DELA CRUZ', 'cruz maria']) expect(nameMatches(name, query)).toBe(true)
    expect(nameMatches(name, 'maria reyes')).toBe(false)
    expect(nameMatches('José Peña', 'jose pena')).toBe(true)
  })

  it('sorts by last name, then first name, then middle name', () => {
    const people = [
      { firstName: 'Ana', middleName: null, lastName: 'Reyes' },
      { firstName: 'Maria', middleName: 'Santos', lastName: 'Dela Cruz' },
      { firstName: 'Ana', middleName: null, lastName: 'Dela Cruz' },
    ]
    expect(people.sort(compareByLastName).map(formatPersonName)).toEqual(['Ana Dela Cruz', 'Maria Santos Dela Cruz', 'Ana Reyes'])
  })

  it('splits a single full-name column: last word is the last name, or "Surname, First Middle"', () => {
    expect(splitFullName('Maria Angela Reyes')).toEqual({ firstName: 'Maria Angela', middleName: null, lastName: 'Reyes' })
    expect(splitFullName('  Ana   Reyes ')).toEqual({ firstName: 'Ana', middleName: null, lastName: 'Reyes' })
    expect(splitFullName('Dela Cruz, Maria Angela Santos')).toEqual({ firstName: 'Maria Angela', middleName: 'Santos', lastName: 'Dela Cruz' })
    expect(splitFullName('Reyes, Ana')).toEqual({ firstName: 'Ana', middleName: null, lastName: 'Reyes' })
    expect(splitFullName('Reyes')).toEqual({ firstName: '', middleName: null, lastName: 'Reyes' })
  })
})
