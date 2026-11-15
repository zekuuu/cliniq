import { afterEach, describe, expect, it, vi } from 'vitest'
import { IncidentApprovedError, StockRuleError } from '../../mock-db'
import * as data from '../../data'
import { ok, stubApi } from './testFetch'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

const staff = { id: '1', name: 'Nurse', role: 'staff' as const }

describe('INCIDENTS in API mode (S4)', () => {
  it('reads the log, one record, its trail and the approved ids', async () => {
    const calls = stubApi(() => ok([]))
    await data.listIncidents({ from: '2026-11-01', to: '2026-11-15' }, staff)
    await data.getIncident('4', staff)
    await data.getIncidentTrail('4')
    await data.listApprovedIncidentReportIds()
    expect(calls.map((c) => c.url)).toEqual([
      '/api/incidents?from=2026-11-01&to=2026-11-15',
      '/api/incidents/4',
      '/api/incidents/4/trail',
      '/api/incidents/approved-ids',
    ])
  })

  it('sends Stage 2 to its record without the id in the body, and maps its refusals', async () => {
    const calls = stubApi((url) =>
      url.endsWith('/stage-two')
        ? {
            status: 409,
            body: { code: 'rule_violated', rule: 'incident_approved', message: 'Approved.' },
          }
        : {
            status: 422,
            body: { code: 'validation_failed', message: 'Enter the complaint.', errors: {} },
          },
    )
    const stageTwo = await data
      .completeIncidentStageTwo({ incidentId: '4', careGiven: 'Ice' } as never, staff)
      .catch((e: unknown) => e)
    expect(stageTwo).toBeInstanceOf(IncidentApprovedError)
    expect(calls[0]).toEqual({
      url: '/api/incidents/4/stage-two',
      method: 'PUT',
      body: { careGiven: 'Ice' },
    })
    const stageOne = await data.saveIncidentStageOne({} as never, staff).catch((e: unknown) => e)
    expect(stageOne).toBeInstanceOf(StockRuleError)
    expect((stageOne as Error).message).toBe('Enter the complaint.')
  })

  it('records a parent call and approves', async () => {
    const calls = stubApi(() => ok({}))
    await data.addParentNotification('4', 'reached', staff, { name: 'Ana', phone: '0900' } as never)
    await data.approveIncidentReport('4', staff)
    expect(calls.map((c) => [c.method, c.url, c.body])).toEqual([
      [
        'POST',
        '/api/incidents/4/parent-notifications',
        { outcome: 'reached', calledContact: { name: 'Ana', phone: '0900' } },
      ],
      ['POST', '/api/incidents/4/approve', undefined],
    ])
  })
})
