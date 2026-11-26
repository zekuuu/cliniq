import { beforeEach, describe, expect, it } from 'vitest'
import { getRecordedAuditEntries, listIssueReports, resetMockDb } from '../../../lib/mock-db'
import { createIssueReport } from './issueReportApi'

describe('issue report API', () => {
  beforeEach(() => resetMockDb())

  it('saves an issue report and audits the create action', async () => {
    const report = await createIssueReport(
      {
        description: 'The page title overlaps the content.',
        route: '/reports',
        pageName: 'Reports',
      },
      { id: 'user-staff-01', name: 'Jennesse Baas', role: 'staff' },
    )

    expect(report).toMatchObject({
      id: 'issue-report-0001',
      description: 'The page title overlaps the content.',
      route: '/reports',
      pageName: 'Reports',
      role: 'staff',
      reportedByUserId: 'user-staff-01',
    })
    expect(report.createdAt).toContain('T')
    expect(await listIssueReports()).toEqual([report])
    expect(getRecordedAuditEntries()).toEqual([
      expect.objectContaining({
        actionType: 'create',
        targetRecord: { type: 'issue-report', id: report.id },
        userId: 'user-staff-01',
      }),
    ])
  })
})
