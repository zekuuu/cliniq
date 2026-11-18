/**
 * Mock or real API, per module, with one global override (ADR-080).
 *
 * `VITE_API_MODE` (`mock` | `api`), when set, decides every module and overrides each module's own
 * value in both directions. When it is not set, each module reads `VITE_API_MODE_<MODULE>`; a module
 * with no value uses the mock. `apiMode()` is the only reader of these variables.
 */

export const API_MODULES = [
  'AUTH',
  'STUDENTS',
  'STAFF_PATIENTS',
  'SCHOOL_YEARS',
  'VISITS',
  'INCIDENTS',
  'INVENTORY',
  'DASHBOARD',
  'REPORTS',
  'USERS',
  'BACKUP',
  'AUDIT',
  'SETTINGS',
  'ISSUE_REPORTS',
  'REFERENCE',
] as const

export type ApiModule = (typeof API_MODULES)[number]
export type DataMode = 'mock' | 'api'

/**
 * A module in API mode needs these modules in API mode too: the API needs a session (AUTH), and
 * its records carry the API's ids of the other modules' records, which the mock cannot resolve.
 */
export const API_DEPENDENCIES: Record<ApiModule, readonly ApiModule[]> = {
  AUTH: [],
  STUDENTS: ['AUTH'],
  STAFF_PATIENTS: ['AUTH'],
  SCHOOL_YEARS: ['AUTH', 'STUDENTS', 'STAFF_PATIENTS'],
  // The logs name who logged each record from the accounts list (USERS).
  VISITS: ['AUTH', 'STUDENTS', 'STAFF_PATIENTS', 'INVENTORY', 'USERS'],
  INCIDENTS: ['AUTH', 'STUDENTS', 'STAFF_PATIENTS', 'INVENTORY', 'VISITS', 'USERS'],
  INVENTORY: ['AUTH', 'REFERENCE'],
  DASHBOARD: [
    'AUTH',
    'STUDENTS',
    'STAFF_PATIENTS',
    'VISITS',
    'INCIDENTS',
    'INVENTORY',
    'SCHOOL_YEARS',
  ],
  REPORTS: ['AUTH', 'STUDENTS', 'STAFF_PATIENTS', 'VISITS', 'INCIDENTS', 'INVENTORY'],
  USERS: ['AUTH'],
  BACKUP: ['AUTH'],
  AUDIT: ['AUTH'],
  SETTINGS: ['AUTH'],
  ISSUE_REPORTS: ['AUTH'],
  REFERENCE: ['AUTH'],
}

function readMode(value: unknown): DataMode | null {
  const text = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return text === 'api' || text === 'mock' ? text : null
}

/** Which data source module `module` uses right now. */
export function apiMode(module: ApiModule): DataMode {
  const env = import.meta.env as Record<string, unknown>
  return readMode(env.VITE_API_MODE) ?? readMode(env[`VITE_API_MODE_${module}`]) ?? 'mock'
}

/** Whether `VITE_API_MODE` overrides every module. */
export function globalApiMode(): DataMode | null {
  return readMode((import.meta.env as Record<string, unknown>).VITE_API_MODE)
}

export interface ModeProblem {
  module: ApiModule
  needs: ApiModule
}

/** Impossible combinations: a module in API mode whose dependency is in mock mode. */
export function modeProblems(): ModeProblem[] {
  const problems: ModeProblem[] = []
  for (const module of API_MODULES) {
    if (apiMode(module) !== 'api') continue
    for (const needs of API_DEPENDENCIES[module]) {
      if (apiMode(needs) !== 'api') problems.push({ module, needs })
    }
  }
  return problems
}

export function anyApiModule(): boolean {
  return API_MODULES.some((module) => apiMode(module) === 'api')
}

/** One console table at start-up, development only. */
export function logModes(): void {
  if (!import.meta.env.DEV || import.meta.env.MODE === 'test') return
  const global = globalApiMode()
  console.table(
    Object.fromEntries(
      API_MODULES.map((module) => [
        module,
        { mode: apiMode(module), source: global ? 'VITE_API_MODE' : `VITE_API_MODE_${module}` },
      ]),
    ),
  )
  const problems = modeProblems()
  if (problems.length > 0) {
    console.error('CLINIQ data mode: impossible combination')
    console.table(problems.map((p) => ({ 'in api mode': p.module, 'needs api mode': p.needs })))
  }
}
