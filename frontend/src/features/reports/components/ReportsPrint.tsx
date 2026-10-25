import {
  followUpStatusMap,
  PrintBars,
  PrintDocument,
  PrintNote,
  PrintSection,
  PrintSignatures,
  PrintTable,
} from '../../../components'
import { formatDateTime } from '../../../lib/dates'
import { ROLE_LABELS, type ComplaintCount, type SessionUser } from '../../../lib/mock-db'
import { DISPOSITION_LABELS } from '../../../lib/dispositions'
import type { MonthlyReportData } from '../api/reportsApi'
import { maskPatientNumber } from '../../../lib/patients'

/*
 * Reports printouts (ADR-026): the tab on screen prints as its own formal document, with its own
 * title. Multi-student documents, so masked LRNs only and never names (ADR-004, ADR-028). Every figure is
 * the screen's own report data for the month.
 */

export type ReportView = 'monthly' | 'incidents' | 'health'
type ArchiveRow = MonthlyReportData['incidents'][number]


const share = (count: number, total: number) =>
  total ? `${Math.round((count / total) * 100)}%` : '—'
const change = (now: number, before: number) =>
  now === before ? 'No change' : now > before ? `Up ${now - before}` : `Down ${before - now}`
const stageText = (incident: ArchiveRow) =>
  incident.stage === 1 ? 'Stage 1, needs completion' : 'Stage 2, complete'

function ComplaintBreakdown({ rows, empty }: { rows: ComplaintCount[]; empty: string }) {
  const total = rows.reduce((sum, row) => sum + row.count, 0)
  if (!rows.length) return <PrintNote className="text-text-primary">{empty}</PrintNote>
  return (
    <div className="grid grid-cols-2 items-start gap-[6mm]">
      <PrintBars
        caption="Clinic visits by complaint"
        rows={rows.map((row) => ({ label: row.complaint, value: row.count }))}
      />
      <PrintTable
        caption="Clinic visits by complaint, with share"
        rows={rows}
        rowKey={(row) => row.complaint}
        empty=""
        columns={[
          { header: 'Complaint', cell: (row) => row.complaint },
          { header: 'Visits', width: '20%', align: 'right', cell: (row) => row.count },
          { header: 'Share', width: '20%', align: 'right', cell: (row) => share(row.count, total) },
        ]}
      />
    </div>
  )
}

function IncidentTable({ rows }: { rows: ArchiveRow[] }) {
  return (
    <PrintTable
      caption="Incidents"
      rows={rows}
      rowKey={(row) => row.id}
      empty="No incidents were recorded this month."
      columns={[
        { header: 'LRN or Staff No.', width: '18%', cell: (row) => maskPatientNumber(row.patient) },
        { header: 'Date and time', width: '26%', cell: (row) => formatDateTime(row.time) },
        { header: 'Complaint', cell: (row) => row.complaint },
        { header: 'Stage and status', width: '26%', cell: stageText },
      ]}
    />
  )
}

export function ReportsPrint({
  view,
  data,
  month,
  previousMonth,
  archiveRows,
  archiveOrder,
  viewer,
}: {
  view: ReportView
  data: MonthlyReportData
  /** "October 2026". */
  month: string
  previousMonth: string
  /** The archive rows in the order the screen shows them. */
  archiveRows: ArchiveRow[]
  /** How the archive is sorted, in words, e.g. "date, newest first". */
  archiveOrder: string
  viewer: SessionUser
}) {
  const totalVisits = data.complaintCounts.reduce((sum, row) => sum + row.count, 0)

  if (view === 'incidents')
    return (
      <PrintDocument
        viewer={viewer}
        title={`Incident register — ${month}`}
        scope={`Incidents recorded in ${month}: ${data.incidents.length} ${data.incidents.length === 1 ? 'incident' : 'incidents'}, sorted by ${archiveOrder}. Students are identified by the last four digits of the LRN only.`}
      >
        <IncidentTable rows={archiveRows} />
      </PrintDocument>
    )

  if (view === 'health')
    return (
      <PrintDocument
        viewer={viewer}
        title={`Complaint summary — ${month}`}
        scope={`Clinic visits per complaint in ${month}: ${totalVisits} ${totalVisits === 1 ? 'visit' : 'visits'} across ${data.complaintCounts.length} complaint ${data.complaintCounts.length === 1 ? 'type' : 'types'}.`}
      >
        <ComplaintBreakdown
          rows={data.complaintCounts}
          empty="No clinic visits were recorded this month."
        />
        <PrintNote>
          Aggregated counts only. No student is identified in this summary; individual names stay
          inside a deliberately opened student profile.
        </PrintNote>
      </PrintDocument>
    )

  const totals = [
    { label: 'Clinic visits', now: data.counts.visits, before: data.previousCounts.visits },
    { label: 'Incidents', now: data.counts.incidents, before: data.previousCounts.incidents },
    {
      label: 'Follow-ups scheduled',
      now: data.counts.followUps,
      before: data.previousCounts.followUps,
    },
  ]
  const dispositionTotal = data.dispositions.reduce((sum, row) => sum + row.count, 0)
  const followUpTotal = data.followUpsByStatus.reduce((sum, row) => sum + row.count, 0)
  return (
    <PrintDocument
      viewer={viewer}
      title={`Monthly Clinic Report — ${month}`}
      scope={`Clinic visits, incidents, and follow-ups dated in ${month}, with ${previousMonth} beside the totals. Totals and masked LRNs only; no student is named.`}
    >
      <PrintSection title="Totals">
        <PrintTable
          caption="Monthly totals compared with the previous month"
          rows={totals}
          rowKey={(row) => row.label}
          empty=""
          columns={[
            { header: 'Measure', cell: (row) => row.label },
            { header: month, width: '20%', align: 'right', cell: (row) => row.now },
            { header: previousMonth, width: '20%', align: 'right', cell: (row) => row.before },
            {
              header: 'Change',
              width: '20%',
              align: 'right',
              cell: (row) => change(row.now, row.before),
            },
          ]}
        />
      </PrintSection>

      <PrintSection title="Complaints">
        <ComplaintBreakdown
          rows={data.complaintCounts}
          empty="No clinic visits were recorded this month."
        />
      </PrintSection>

      <div className="grid grid-cols-2 items-start gap-[6mm]">
        <PrintSection title="After the visit">
          <PrintTable
            caption="Visits by disposition"
            rows={data.dispositions}
            rowKey={(row) => row.disposition}
            empty=""
            columns={[
              { header: 'Disposition', cell: (row) => DISPOSITION_LABELS[row.disposition] },
              { header: 'Visits', width: '22%', align: 'right', cell: (row) => row.count },
              {
                header: 'Share',
                width: '22%',
                align: 'right',
                cell: (row) => share(row.count, dispositionTotal),
              },
            ]}
          />
        </PrintSection>
        <PrintSection title="Follow-ups by status">
          <PrintTable
            caption="Follow-ups dated this month, by status"
            rows={data.followUpsByStatus}
            rowKey={(row) => row.status}
            empty=""
            columns={[
              { header: 'Status', cell: (row) => followUpStatusMap[row.status].label },
              { header: 'Follow-ups', width: '30%', align: 'right', cell: (row) => row.count },
            ]}
          />
          {followUpTotal === 0 && <PrintNote>No follow-ups were scheduled this month.</PrintNote>}
        </PrintSection>
      </div>

      <PrintSection title="Medicines and supplies given">
        <PrintTable
          caption="Medicines and supplies given this month"
          rows={data.itemsGiven}
          rowKey={(row) => row.itemName}
          empty="No medicines or supplies were given this month."
          columns={[
            { header: 'Item', cell: (row) => row.itemName },
            { header: 'Quantity given', width: '20%', align: 'right', cell: (row) => row.quantity },
            { header: 'Unit', width: '20%', cell: (row) => row.unit },
          ]}
        />
        {data.itemsGiven.length > 0 && (
          <PrintNote>From the recorded stock movements, after any visit corrections.</PrintNote>
        )}
      </PrintSection>

      <PrintSection title="Incidents">
        <IncidentTable rows={data.incidents} />
      </PrintSection>

      <p className="mt-[6mm] break-inside-avoid">
        Prepared by {viewer.name}, {ROLE_LABELS[viewer.role]}.
      </p>
      <PrintSignatures
        lines={[{ label: `Prepared by (${ROLE_LABELS.staff})` }, { label: 'Reviewed by (Principal)' }]}
      />
    </PrintDocument>
  )
}
