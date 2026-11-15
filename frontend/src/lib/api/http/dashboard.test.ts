import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  CalendarEventValidationError,
  SportsReportPermissionError,
  SportsReportValidationError,
} from '../../mock-db'
import * as data from '../../data'
import { ok, stubApi } from './testFetch'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

const staff = { id: '1', name: 'Nurse', role: 'staff' as const }
const invalid = (errors: Record<string, string[]>) => ({
  status: 422,
  body: { code: 'validation_failed', message: 'Check the fields.', errors },
})

describe('DASHBOARD and REPORTS in API mode (S6)', () => {
  it('asks the summary for the range and the trend filters', async () => {
    const calls = stubApi(() => ok({}))
    await data.getDashboardSummary(
      {
        range: { preset: 'last7', from: '2026-11-09', to: '2026-11-15' },
        sex: 'female',
        gradeLevel: null,
      },
      staff,
    )
    expect(calls[0].url).toBe(
      '/api/dashboard/summary?preset=last7&from=2026-11-09&to=2026-11-15&sex=female',
    )
  })

  it('reads the latest report month as a plain YYYY-MM', async () => {
    stubApi(() => ok({ month: '2025-10' }))
    await expect(data.getLatestRecordedMonth()).resolves.toBe('2025-10')
  })

  it('gives the calendar form one message per field', async () => {
    stubApi(() => invalid({ title: ['Enter a title.'], endDate: ['End after start.', 'x'] }))
    const error = await data.createCalendarEvent({} as never, staff).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(CalendarEventValidationError)
    expect((error as CalendarEventValidationError).errors).toEqual({
      title: 'Enter a title.',
      endDate: 'End after start.',
    })
  })

  it('keeps the Sports Report errors: the Admin 403 and the field errors', async () => {
    stubApi((url) =>
      url === '/api/sports-reports'
        ? {
            status: 403,
            body: { code: 'forbidden', message: 'Only the clinic staff can open Sports Reports.' },
          }
        : invalid({ name: ['Enter a name.'] }),
    )
    await expect(data.listSportsReports({ ...staff, role: 'admin' })).rejects.toBeInstanceOf(
      SportsReportPermissionError,
    )
    const error = await data.updateSportsReport('3', {} as never, staff).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(SportsReportValidationError)
    expect((error as SportsReportValidationError).errors).toEqual({ name: 'Enter a name.' })
  })
})

describe('AUDIT in API mode (S6, S7)', () => {
  it('sends the filters, lists repeated as key[]', async () => {
    const calls = stubApi(() => ok({ rows: [], users: [] }))
    await data.listAuditLog({
      from: '2026-11-01',
      to: '2026-11-15',
      userId: '',
      actionTypes: ['create', 'print'],
      targetTypes: ['student'],
    })
    expect(decodeURIComponent(calls[0].url)).toBe(
      '/api/audit-log?from=2026-11-01&to=2026-11-15&actionTypes[]=create&actionTypes[]=print&targetTypes[]=student',
    )
  })

  it('turns a print title into the fixed document key and month', async () => {
    const calls = stubApi()
    await data.recordPrint('Incident register — November 2026', staff)
    await data.recordPrint('Sports Report', staff, { type: 'sports-report', id: '4' })
    expect(calls.map((c) => c.body)).toEqual([
      { document: 'incident-register', month: '2026-11' },
      { document: 'sports-report', record: { type: 'sports-report', id: 4 } },
    ])
  })

  it('fetches the full LRN for the Print button, and that request is the only print entry', async () => {
    const calls = stubApi(() => ok({ month: '2026-11', incidents: [] }))
    await data.getMonthlyReportForPrint('2026-11')
    await data.recordPrint('Monthly Clinic Report — November 2026', staff)
    await data.recordPrint('Monthly Clinic Report — November 2026', staff)
    expect(calls.map((c) => c.url)).toEqual([
      '/api/reports/monthly?month=2026-11&fullLrn=1',
      '/api/audit/prints',
    ])
  })

  it('records a profile view once with the numeric id', async () => {
    const calls = stubApi()
    await data.recordView({ type: 'student', id: '12' }, staff)
    expect(calls[0]).toEqual({
      url: '/api/audit/views',
      method: 'POST',
      body: { type: 'student', id: 12 },
    })
  })
})
