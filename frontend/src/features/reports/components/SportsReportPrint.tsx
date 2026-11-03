import { PrintDocument, PrintNote, PrintSignatures, PrintTable } from '../../../components'
import { formatDateRange, formatDateTime } from '../../../lib/dates'
import { ROLE_LABELS, type SessionUser, type SportsReportContent } from '../../../lib/mock-db'
import { leftOutText, sportsReportColumns } from '../sportsReportContent'

/** The A4 Sports Report (ADR-026, ADR-034): mounts only while printing, from the content the screen loaded. */
export function SportsReportPrint({ content, viewer }: { content: SportsReportContent; viewer: SessionUser }) {
  const { report } = content
  const leftOut = leftOutText(content)
  return (
    <PrintDocument
      title="Sports Report"
      viewer={viewer}
      auditRecord={{ type: 'sports-report', id: report.id, summary: `Printed for ${content.rows.length} student${content.rows.length === 1 ? '' : 's'}` }}
      scope={
        // The title centred, then who asked on the left and when on the right (Zean, November 3, 2026).
        <>
          <span data-sports-title className="block text-center text-[12pt] font-bold">{report.title}</span>
          <span data-sports-meta className="mt-[2mm] grid grid-cols-[1fr_auto] gap-[6mm]">
            <span className="block">
              {report.activity && <span className="block">Activity: {report.activity}</span>}
              <span className="block">Requested by: {report.requestedBy}</span>
              <span className="block">Printed by: {viewer.name}</span>
            </span>
            <span className="block text-right whitespace-nowrap">
              <span className="block">As of {formatDateTime(content.asOf)}</span>
              <span className="block">Visits and incidents: {formatDateRange(content.from, content.to)}</span>
            </span>
          </span>
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
      <PrintSignatures lines={[{ heading: 'Released by:', name: viewer.name, position: ROLE_LABELS.staff }, { heading: 'Received by:', name: report.requestedBy, position: 'PE/Sports Instructor' }]} />
    </PrintDocument>
  )
}
