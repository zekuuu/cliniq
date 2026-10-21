import { PrintDocument, PrintNote, PrintSignatures, PrintTable } from '../../../components'
import { formatDateTime } from '../../../lib/dates'
import type { SessionUser, SportsReportContent } from '../../../lib/mock-db'
import { SPORTS_REPORT_CONFIDENTIALITY, leftOutText, sportsReportColumns, windowRange } from '../sportsReportContent'

/** The A4 Sports Report (ADR-026, ADR-034): mounts only while printing, from the content the screen loaded. */
export function SportsReportPrint({ content, viewer }: { content: SportsReportContent; viewer: SessionUser }) {
  const { report } = content
  const leftOut = leftOutText(content)
  return (
    <PrintDocument
      title="Sports Report"
      viewer={viewer}
      confidentiality={SPORTS_REPORT_CONFIDENTIALITY}
      auditRecord={{ type: 'sports-report', id: report.id, summary: `Printed for ${content.rows.length} student${content.rows.length === 1 ? '' : 's'}` }}
      scope={
        <>
          <span className="block text-[12pt] font-bold">{report.title}</span>
          {report.activity && <span className="block">Activity: {report.activity}</span>}
          <span className="block">Requested by: {report.requestedBy}</span>
          <span className="block">As of {formatDateTime(content.asOf)} (Philippine time)</span>
          <span className="block">{windowRange(content)}</span>
          <span className="block">Printed by: {viewer.name}</span>
        </>
      }
    >
      <PrintTable
        caption="Sports Report"
        columns={sportsReportColumns(report.includeConditions)}
        rows={content.rows}
        rowKey={(row) => row.studentId}
        empty="No students on this report."
      />
      {leftOut && <PrintNote>{leftOut}</PrintNote>}
      <PrintSignatures lines={[{ label: 'Released by (clinician)' }, { label: 'Received by (instructor)' }]} />
    </PrintDocument>
  )
}
