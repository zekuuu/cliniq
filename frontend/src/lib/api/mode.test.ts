import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiMode, modeProblems } from './mode'

afterEach(() => vi.unstubAllEnvs())

describe('apiMode precedence (ADR-080)', () => {
  it.each([
    ['', '', 'mock'],
    ['', 'mock', 'mock'],
    ['', 'api', 'api'],
    ['mock', '', 'mock'],
    ['mock', 'mock', 'mock'],
    ['mock', 'api', 'mock'],
    ['api', '', 'api'],
    ['api', 'mock', 'api'],
    ['api', 'api', 'api'],
  ])('global %j, module %j gives %s', (global, module, expected) => {
    vi.stubEnv('VITE_API_MODE', global)
    vi.stubEnv('VITE_API_MODE_STUDENTS', module)
    expect(apiMode('STUDENTS')).toBe(expected)
  })

  it('ignores case and spaces, and treats an unknown value as unset', () => {
    vi.stubEnv('VITE_API_MODE', ' API ')
    expect(apiMode('USERS')).toBe('api')
    vi.stubEnv('VITE_API_MODE', 'sometimes')
    vi.stubEnv('VITE_API_MODE_USERS', 'api')
    expect(apiMode('USERS')).toBe('api')
  })
})

describe('modeProblems', () => {
  it('has none with no setting, or with the global switch either way', () => {
    expect(modeProblems()).toEqual([])
    vi.stubEnv('VITE_API_MODE', 'api')
    expect(modeProblems()).toEqual([])
    vi.stubEnv('VITE_API_MODE', 'mock')
    vi.stubEnv('VITE_API_MODE_VISITS', 'api')
    expect(modeProblems()).toEqual([])
  })

  it('names a module on the API whose sign-in or records are still mock', () => {
    vi.stubEnv('VITE_API_MODE_STUDENTS', 'api')
    expect(modeProblems()).toEqual([{ module: 'STUDENTS', needs: 'AUTH' }])
    vi.stubEnv('VITE_API_MODE_AUTH', 'api')
    vi.stubEnv('VITE_API_MODE_VISITS', 'api')
    expect(modeProblems()).toEqual([
      { module: 'VISITS', needs: 'STAFF_PATIENTS' },
      { module: 'VISITS', needs: 'INVENTORY' },
      { module: 'VISITS', needs: 'USERS' },
    ])
  })
})
