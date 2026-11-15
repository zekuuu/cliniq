import { afterEach, describe, expect, it, vi } from 'vitest'
import { StockRuleError } from '../../mock-db'
import * as data from '../../data'
import { ok, stubApi } from './testFetch'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

const staff = { id: '1', name: 'Nurse', role: 'staff' as const }

describe('VISITS in API mode (S3)', () => {
  it('reads the log by date range, entered-in-error only when asked', async () => {
    const calls = stubApi(() => ok([]))
    await data.listVisits({ from: '2026-11-01', to: '2026-11-15' })
    await data.listVisits({ from: '2026-11-01', to: '2026-11-15' }, { includeEnteredInError: true })
    expect(calls.map((c) => c.url)).toEqual([
      '/api/visits?from=2026-11-01&to=2026-11-15',
      '/api/visits?from=2026-11-01&to=2026-11-15&includeEnteredInError=1',
    ])
  })

  it('records and edits a visit, and shows a refused line as the stock rule error', async () => {
    const calls = stubApi((_url, method) =>
      method === 'POST'
        ? { status: 409, body: { code: 'rule_violated', rule: 'stock_rule', message: 'Expired.' } }
        : {
            status: 422,
            body: { code: 'validation_failed', message: 'Whole numbers.', errors: {} },
          },
    )
    const input = { studentId: '3', complaint: 'Fever' } as never
    await expect(data.recordVisit(input, staff)).rejects.toBeInstanceOf(StockRuleError)
    const edit = await data.updateVisit('5', { treatment: 'Rest' } as never, staff).catch((e) => e)
    expect(edit).toBeInstanceOf(StockRuleError)
    expect((edit as Error).message).toBe('Whole numbers.')
    expect(calls.map((c) => [c.method, c.url])).toEqual([
      ['POST', '/api/visits'],
      ['PUT', '/api/visits/5'],
    ])
    expect(calls[0].body).toEqual(input)
  })

  it('runs the excuse-letter steps on their routes', async () => {
    const calls = stubApi(() => ok(null))
    await data.getExcuseLetterApproval('5')
    await data.approveExcuseLetter('5', { excusedFrom: '2026-11-15' } as never, staff)
    await data.issueReplacementExcuseLetter('5', 'Wrong dates', staff)
    await data.markVisitEnteredInError('5', 'Wrong student', staff)
    expect(calls.map((c) => [c.method, c.url, c.body])).toEqual([
      ['GET', '/api/visits/5/excuse-letter', undefined],
      ['POST', '/api/visits/5/excuse-letter/approve', { excusedFrom: '2026-11-15' }],
      ['POST', '/api/visits/5/excuse-letter/replacement', { reason: 'Wrong dates' }],
      ['POST', '/api/visits/5/entered-in-error', { reason: 'Wrong student' }],
    ])
  })

  it('changes and reschedules follow-ups', async () => {
    const calls = stubApi(() => ok({}))
    await data.listFollowUps({ status: 'pending' })
    await data.setFollowUpStatus('9', 'missed', staff, 'Absent')
    await data.rescheduleFollowUp('9', '2026-11-20', staff)
    expect(calls.map((c) => [c.method, c.url, c.body])).toEqual([
      ['GET', '/api/follow-ups?status=pending', undefined],
      ['PUT', '/api/follow-ups/9/status', { status: 'missed', reason: 'Absent' }],
      ['POST', '/api/follow-ups/9/reschedule', { followUpDate: '2026-11-20' }],
    ])
  })
})
