import { useState, type ReactNode } from 'react'
import { BackButton, Badge, Button, Card, CardBody, CardHeader, ErrorState, Icon, Modal, PrintDocument, PrintFields, PrintNote, PrintSection, PrintSignatures, PrintTable, Select, Skeleton } from '../../components'
import { useAsyncData } from '../../hooks/useAsyncData'
import { paths } from '../../routes/paths'
import { formatDateTime } from '../../lib/dates'
import { formatItemGiven, incidentCareSummary } from '../../lib/itemsGiven'
import { formatDecimal } from '../../lib/numbers'
import { getMockSessionUser, type SessionUser } from '../../lib/mock-db'
import type { ParentNotificationOutcome } from '../../types/entities'
import { approveReport, fetchIncidentRecord, type IncidentRecord } from './api/incidentRecordApi'

/** Readable labels for the provisional `vitals` keys; unknown keys fall back to the key itself. */
const VITAL_LABELS: Record<string, { label: string; unit?: string }> = {
  temperatureC: { label: 'Temperature', unit: '°C' },
  pulseBpm: { label: 'Pulse', unit: 'bpm' },
  bloodPressure: { label: 'Blood pressure', unit: 'mmHg' },
  oxygenSaturation: { label: 'Oxygen saturation' },
}

const OUTCOME_LABELS: Record<ParentNotificationOutcome, string> = {
  reached: 'Reached',
  not_reached: 'Not reached',
  voicemail: 'Voicemail',
  left_message: 'Left message',
}

/** A vital as the screen shows it: the same rounding, with the unit unless the value already has it. */
function vitalText(key: string, value: string | number): string {
  const unit = VITAL_LABELS[key]?.unit
  return `${formatDecimal(value)}${unit && !String(value).endsWith(unit) ? ` ${unit}` : ''}`
}

const vitalEntries = (vitals: Record<string, string | number>) => Object.entries(vitals).filter(([key]) => key !== 'treatmentNotes')

/**
 * The incident report on A4 (ADR-026): one student, deliberately opened, so the full name is correct
 * (ADR-004). Ends with signature lines; a Stage 1 record prints a "Not yet completed" notice.
 */
function IncidentReportPrint({ record }: { record: IncidentRecord }) {
  const { incident, student, approved, trail } = record
  const referral = incident.hospitalReferral
  const notes = String(incident.vitals.treatmentNotes ?? '').trim()
  const vitals = vitalEntries(incident.vitals)
  const signed = (step: { by: string; at: string } | null) => (step ? `${step.by}, ${formatDateTime(step.at)}` : 'Not recorded')
  return (
    <PrintDocument
      title="Incident Report"
      scope={`${student.fullName} (${student.studentNumber}), ${student.gradeLevel}. Incident recorded ${formatDateTime(incident.time)}.`}
    >
      {incident.stage === 1 && (
        <p className="mb-[4mm] border-2 border-text-primary px-[3mm] py-[2mm] text-[11pt] font-bold">
          Not yet completed. Only the Stage 1 fast-capture details are recorded; Stage 2 is still due.
        </p>
      )}
      <div className="text-[11pt]">
        <PrintSection title="Incident">
          <PrintFields
            columns={3}
            fields={[
              { label: 'Student', value: `${student.fullName} · ${student.studentNumber}` },
              { label: 'Grade level', value: student.gradeLevel },
              { label: 'Date and time', value: formatDateTime(incident.time) },
              { label: 'Complaint', value: incident.complaint },
              { label: 'Record status', value: incident.stage === 1 ? 'Stage 1, needs completion' : 'Stage 2, complete' },
              { label: 'Sign-off', value: approved ? 'Approved' : 'Pending sign-off' },
              ...(incident.generalNotes ? [{ label: 'Additional notes', value: incident.generalNotes, wide: true }] : []),
            ]}
          />
        </PrintSection>
        <PrintSection title="Vitals">
          {vitals.length ? (
            <PrintFields columns={4} fields={vitals.map(([key, value]) => ({ label: VITAL_LABELS[key]?.label ?? key, value: vitalText(key, value) }))} />
          ) : (
            <PrintNote className="text-text-primary">No vitals recorded.</PrintNote>
          )}
        </PrintSection>
        <PrintSection title="Treatment">
          {!notes && !incident.itemsGiven.length ? (
            <p>No treatment recorded.</p>
          ) : (
            <>
              {notes && <p className="whitespace-pre-line">{notes}</p>}
              {incident.itemsGiven.length > 0 && (
                <>
                  <p className="mt-[2mm] font-semibold">Medicines and supplies given</p>
                  <ul className="list-disc pl-[5mm]">
                    {incident.itemsGiven.map((line) => (
                      <li key={line.itemId}>{formatItemGiven(line)}</li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </PrintSection>
        <PrintSection title="Hospital referral">
          {referral ? (
            <PrintFields
              columns={3}
              fields={[
                { label: 'Destination', value: referral.destination },
                { label: 'Transport', value: referral.transportMode },
                { label: 'Departure', value: formatDateTime(referral.departureTime) },
              ]}
            />
          ) : (
            <p>No hospital referral was recorded for this incident.</p>
          )}
        </PrintSection>
        <PrintSection title="Parent or guardian notification">
          <PrintTable
            caption="Parent notification attempts"
            rows={incident.parentNotifications}
            rowKey={(attempt, index) => `${attempt.timestamp}|${index}`}
            empty="No parent notification attempts were logged for this incident."
            columns={[
              { header: 'Date and time', width: '45%', cell: (attempt) => formatDateTime(attempt.timestamp) },
              { header: 'Outcome', cell: (attempt) => OUTCOME_LABELS[attempt.outcome] },
            ]}
          />
        </PrintSection>
        <PrintSection title="Record">
          <PrintFields
            columns={3}
            fields={[
              { label: 'Recorded by', value: signed(trail.recorded) },
              { label: 'Completed by', value: incident.stage === 1 ? 'Not yet completed' : signed(trail.completed) },
              { label: 'Approved by', value: approved ? signed(trail.approved) : 'Not yet approved' },
            ]}
          />
        </PrintSection>
      </div>
      <PrintSignatures
        lines={[{ label: 'School nurse' }, { label: 'Parent or guardian informed' }, { label: 'Principal (if applicable)' }]}
      />
    </PrintDocument>
  )
}

function ReportSkeleton({ back }: { back: ReactNode }) {
  return <div className="mx-auto flex flex max-w-page-narrow flex-col gap-4 flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">{back}<div aria-hidden="true"><Card className="p-5"><Skeleton className="h-7 w-52" /><Skeleton className="mt-2 h-4 w-80 max-w-full" /></Card><Card className="p-5"><Skeleton className="h-10 w-72 max-w-full" /><div className="mt-5 grid gap-4 sm:grid-cols-2">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-10" />)}</div><div className="mt-5 grid gap-3 sm:grid-cols-3">{Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-16" />)}</div></Card></div></div>
}

function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-xs font-semibold text-text-secondary">{label}</dt>
      <dd className="text-sm text-text-primary">{children}</dd>
    </div>
  )
}

export function IncidentReportPage({ viewer = getMockSessionUser(), incidentId }: { viewer?: SessionUser; incidentId?: string }) {
  const [selectedId, setSelectedId] = useState(incidentId)
  const { data, status, reload } = useAsyncData(`incident-report|${selectedId ?? 'default'}`, () => fetchIncidentRecord(selectedId))
  const [justApproved, setJustApproved] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [approving, setApproving] = useState(false)

  const back = <BackButton fallback={paths.incidents} />
  if (status === 'error') return <div className="mx-auto flex max-w-page-narrow flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">{back}<ErrorState title="Unable to load the incident report." onRetry={reload} /></div>
  if (data === undefined) return <><p className="sr-only" role="status">Loading incident report...</p><ReportSkeleton back={back} /></>
  if (data === null) return <div className="mx-auto flex max-w-page-narrow flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">{back}<Card><CardBody>No incident report is pending sign-off.</CardBody></Card></div>

  const { incident, student, options, approved } = data
  const referral = incident.hospitalReferral
  const hasTreatment = incidentCareSummary(incident) !== 'No treatment recorded'

  async function approve() {
    setApproving(true)
    try {
      await approveReport(incident.id, viewer)
      // Stay on the signed record and drop it from the pending list.
      setSelectedId(incident.id)
      setJustApproved(true)
      setConfirming(false)
      reload()
    } finally {
      setApproving(false)
    }
  }

  function selectIncident(id: string) {
    setJustApproved(false)
    setSelectedId(id)
  }

  return (
    <div className="mx-auto flex max-w-page-narrow flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
      {back}
      <Card className="p-5 print:hidden">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">Incident Report</h1>
            <p className="mt-1 text-sm text-text-secondary">Review, approve, and print one incident report.</p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" icon="printer" onClick={() => window.print()}>Print / Save as PDF</Button>
            <Button variant="primary" onClick={() => setConfirming(true)} disabled={approved}>{approved ? 'Approved' : 'Approve Report'}</Button>
          </div>
        </div>
        {!approved && !hasTreatment && (
          <p role="status" className="mt-4 rounded-md border border-warning bg-warning/10 px-3 py-2 text-sm font-semibold text-text-primary">
            No treatment recorded. Check this is correct before approving.
          </p>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Incident summary"
          icon={<Icon name="fileText" />}
          actions={<Badge tone={incident.stage === 1 ? 'warning' : 'success'} variant="soft">{incident.stage === 1 ? 'Needs completion' : 'Complete'}</Badge>}
        />
        <CardBody className="flex flex-col gap-5">
          <div className="print:hidden">
            <Select
              className="sm:max-w-md"
              label="Report pending sign-off"
              hint="Only incident reports that have not been approved yet are listed."
              value={incident.id}
              options={options}
              onChange={selectIncident}
            />
          </div>

          <dl className="grid gap-4 sm:grid-cols-2">
            <Field label="Student"><span className="font-semibold">{student.fullName} · {student.studentNumber}</span></Field>
            <Field label="Recorded">{formatDateTime(incident.time)}</Field>
            <Field label="Complaint">{incident.complaint}</Field>
            <Field label="Sign-off">{approved ? 'Approved' : 'Pending sign-off'}</Field>
            {incident.generalNotes && (
              <Field label="Additional notes" className="sm:col-span-2">
                <span className="whitespace-pre-line">{incident.generalNotes}</span>
              </Field>
            )}
          </dl>

          <section className="border-t border-border pt-4">
            <h2 className="text-sm font-semibold text-text-primary">Vitals and response</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {vitalEntries(incident.vitals).map(([key, value]) => (
                <div key={key} className="rounded-md border border-border bg-surface p-3">
                  <p className="text-xs text-text-secondary">{VITAL_LABELS[key]?.label ?? key}</p>
                  <p className="mt-1 text-sm font-semibold text-text-primary">{vitalText(key, value)}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="border-t border-border pt-4" aria-labelledby="report-treatment-title">
            <h2 id="report-treatment-title" className="text-sm font-semibold text-text-primary">Treatment</h2>
            <p className="mt-2 text-sm text-text-primary">{incidentCareSummary(incident)}</p>
          </section>

          <section className="border-t border-border pt-4" aria-labelledby="report-referral-title">
            <h2 id="report-referral-title" className="text-sm font-semibold text-text-primary">Hospital referral</h2>
            {referral ? (
              <dl className="mt-3 grid gap-4 sm:grid-cols-3">
                <Field label="Destination">{referral.destination}</Field>
                <Field label="Transport">{referral.transportMode}</Field>
                <Field label="Departure">{formatDateTime(referral.departureTime)}</Field>
              </dl>
            ) : (
              <p className="mt-2 text-sm text-text-secondary">No hospital referral was recorded for this incident.</p>
            )}
          </section>

          <section className="border-t border-border pt-4" aria-labelledby="report-notifications-title">
            <h2 id="report-notifications-title" className="text-sm font-semibold text-text-primary">Parent notification attempts</h2>
            {incident.parentNotifications.length ? (
              <ol className="mt-3 divide-y divide-border rounded-md border border-border">
                {incident.parentNotifications.map((attempt, index) => (
                  <li key={`${attempt.timestamp}-${index}`} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                    <span className="text-sm font-semibold text-text-primary">{OUTCOME_LABELS[attempt.outcome]}</span>
                    <span className="text-sm text-text-secondary">{formatDateTime(attempt.timestamp)}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-2 text-sm text-text-secondary">No parent notification attempts were logged for this incident.</p>
            )}
          </section>

          {justApproved && approved && (
            <p role="status" className="rounded-md border border-success bg-success/10 px-3 py-2 text-sm font-semibold text-text-primary">
              Report approved and logged.
            </p>
          )}
        </CardBody>
      </Card>

      <Modal open={confirming} title="Approve this incident report?" onClose={() => setConfirming(false)}>
        <p className="text-sm text-text-secondary">
          Approving signs off the report for {student.studentNumber} ({incident.complaint}, {formatDateTime(incident.time)}) and records it in the audit log. It can't be un-approved from this screen.
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="neutral" data-autofocus onClick={() => setConfirming(false)}>Cancel</Button>
          <Button variant="primary" loading={approving} onClick={approve}>Approve Report</Button>
        </div>
      </Modal>
      <IncidentReportPrint record={data} />
    </div>
  )
}
