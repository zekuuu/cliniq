import { useState } from 'react'
import {
  BackButton,
  Button,
  Card,
  CardBody,
  CardHeader,
  ErrorState,
  Icon,
  type IconName,
  Modal,
  Select,
} from '../../components'
import {
  STAFF_IMPORT_FIELDS,
  guessStaffMapping,
  mapStaffRows,
  missingStaffImportFields,
  parseCsv,
  staffNamesFromOneColumn,
  type StaffImportFieldKey,
  type StaffImportMapping,
  type StaffImportRow,
} from '../../lib/staffImport'
import {
  applyStaffImport,
  getMockSessionUser,
  previewStaffImport,
  type SessionUser,
  type StaffImportPreview,
  type StaffImportResult,
} from '../../lib/mock-db'
import { paths } from '../../routes/paths'

const staff = (count: number) => `${count} staff ${count === 1 ? 'record' : 'records'}`

/** A later step shown empty from the start, so the clinician sees how many steps there are (as on the student import). */
function EmptyStep({
  id,
  title,
  icon,
  waiting,
}: {
  id: string
  title: string
  icon: IconName
  waiting: string
}) {
  return (
    <Card aria-labelledby={id} className="opacity-70">
      <CardHeader titleId={id} title={title} icon={<Icon name={icon} />} />
      <CardBody>
        <p className="text-sm text-text-secondary">{waiting}</p>
      </CardBody>
    </Card>
  )
}

/**
 * Import Staff List (ADR-069): file, column mapping, reviewed preview, then apply, like the student
 * import. Adds and updates only: staff missing from the file are left alone, so there is no archive step.
 */
export function StaffImportPage({ viewer = getMockSessionUser() }: { viewer?: SessionUser }) {
  const [fileName, setFileName] = useState('')
  const [dragging, setDragging] = useState(false)
  const [csv, setCsv] = useState<string[][] | null>(null)
  const [mapping, setMapping] = useState<StaffImportMapping | null>(null)
  const [rows, setRows] = useState<StaffImportRow[]>([])
  const [preview, setPreview] = useState<StaffImportPreview | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [applying, setApplying] = useState(false)
  const [result, setResult] = useState<StaffImportResult | null>(null)
  const [error, setError] = useState('')

  const shell = 'mx-auto flex max-w-page-narrow flex-col gap-4 px-4 pt-10 pb-8 sm:px-8'
  if (viewer.role !== 'staff')
    return (
      <div className={shell}>
        <ErrorState asPageTitle title="Staff access required." />
      </div>
    )

  async function chooseFile(file: File | undefined) {
    if (!file) return
    const parsed = parseCsv(await file.text())
    setFileName(file.name)
    setPreview(null)
    setResult(null)
    if (parsed.length < 2) {
      setCsv(null)
      setMapping(null)
      setError('This file has no staff rows.')
      return
    }
    setError('')
    setCsv(parsed)
    setMapping(guessStaffMapping(parsed[0]))
  }

  async function showPreview() {
    if (!csv || !mapping) return
    const mapped = mapStaffRows(csv.slice(1), mapping)
    setRows(mapped)
    setPreview(await previewStaffImport(mapped, viewer))
  }

  async function apply() {
    setApplying(true)
    try {
      setResult(await applyStaffImport(rows, { fileName, actor: viewer }))
      setPreview(null)
      setCsv(null)
      setMapping(null)
      setConfirming(false)
    } finally {
      setApplying(false)
    }
  }

  const columnOptions = [
    { value: '-1', label: 'Not in this file' },
    ...(csv?.[0] ?? []).map((header, index) => ({
      value: String(index),
      label: header || `Column ${index + 1}`,
    })),
  ]
  const missingFields = mapping ? missingStaffImportFields(mapping) : []
  const oneColumn = mapping ? staffNamesFromOneColumn(mapping) : false

  return (
    <div className={shell}>
      <BackButton fallback={paths.staff} />
      <Card className="p-5">
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Import Staff List</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Add or update staff records from the school's CSV. Staff not in the file are left as they
          are. Nothing changes until you apply it.
        </p>
      </Card>
      {result && (
        <p
          role="status"
          className="rounded-md border border-success bg-success/10 px-4 py-3 text-sm font-semibold text-text-primary"
        >
          {result.created || result.updated
            ? `List applied: ${result.created} added, ${result.updated} updated, ${result.flagged} left out.`
            : 'Nothing to change. The staff records already match this list.'}
        </p>
      )}
      <Card aria-labelledby="staff-import-file-title">
        <CardHeader
          titleId="staff-import-file-title"
          title="1. Choose the file"
          icon={<Icon name="fileText" />}
        />
        <CardBody className="flex flex-col gap-2">
          <label
            data-testid="import-drop-zone"
            onDragOver={(event) => {
              event.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault()
              setDragging(false)
              void chooseFile(event.dataTransfer.files[0])
            }}
            className={`flex cursor-pointer flex-col items-center gap-1 rounded-md border-2 border-dashed px-4 py-8 text-center transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand-green motion-reduce:transition-none ${dragging ? 'border-brand-green bg-brand-green/5' : 'border-border hover:border-brand-green hover:bg-surface'}`}
          >
            <input
              type="file"
              aria-label="Staff list (CSV)"
              accept=".csv,text/csv"
              onChange={(event) => void chooseFile(event.target.files?.[0])}
              className="sr-only"
            />
            <Icon name="upload" size={28} className="text-brand-green-dark" />
            <span className="mt-2 text-sm font-semibold text-text-primary">
              Drag and drop the CSV here
            </span>
            <span className="text-xs text-text-secondary">or</span>
            <span className="text-sm font-semibold text-brand-green-dark underline-offset-2 hover:underline">
              Browse files
            </span>
            {fileName && <span className="mt-2 text-xs text-text-secondary">{fileName}</span>}
          </label>
          <p className="text-xs text-text-secondary">Accepted file type: .csv only</p>
          {error && (
            <p role="alert" className="text-sm font-semibold text-error">
              {error}
            </p>
          )}
        </CardBody>
      </Card>
      {mapping ? (
        <Card aria-labelledby="staff-import-columns-title">
          <CardHeader
            titleId="staff-import-columns-title"
            title="2. Match the columns"
            description={`${(csv?.length ?? 1) - 1} rows in ${fileName}`}
            icon={<Icon name="clipboardList" />}
          />
          <CardBody className="flex flex-col gap-4">
            <p className="text-sm text-text-secondary">
              A row with a Staff No. updates that record. Without one, it updates the staff member
              with the same name and type, or adds a new one.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {STAFF_IMPORT_FIELDS.map((field) => (
                <Select
                  key={field.key}
                  label={field.label}
                  required={
                    field.required &&
                    !(oneColumn && (field.key === 'firstName' || field.key === 'lastName'))
                  }
                  value={String(mapping[field.key])}
                  options={columnOptions}
                  onChange={(value) => {
                    setPreview(null)
                    setMapping({ ...mapping, [field.key as StaffImportFieldKey]: Number(value) })
                  }}
                />
              ))}
            </div>
            {missingFields.length > 0 && (
              <p role="status" className="text-sm text-text-secondary">
                Still to match: {missingFields.join(', ')}.
              </p>
            )}
            <div>
              <Button
                variant="secondary"
                disabled={missingFields.length > 0}
                onClick={() => void showPreview()}
              >
                Preview
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : (
        <EmptyStep
          id="staff-import-columns-title"
          title="2. Match the columns"
          icon="clipboardList"
          waiting="Choose a file first."
        />
      )}
      {preview ? (
        <Card aria-labelledby="staff-import-review-title">
          <CardHeader
            titleId="staff-import-review-title"
            title="3. Review before applying"
            icon={<Icon name="checkCircle" />}
          />
          <CardBody className="flex flex-col gap-4">
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                {
                  label: 'New staff',
                  value: preview.newCount,
                  note: preview.newCount
                    ? 'Will be added with a new Staff No.'
                    : 'No one new to add',
                },
                {
                  label: 'Already in the Staff List',
                  value: preview.continuingCount,
                  note: preview.changedCount
                    ? `Details updated for ${preview.changedCount}`
                    : 'No changes',
                },
                {
                  label: 'Rows skipped',
                  value: preview.problems.length,
                  note: preview.problems.length
                    ? 'Listed below with what to fix'
                    : 'No problems found',
                },
              ].map((item) => (
                <div key={item.label} className="rounded-md border border-border px-3 py-2">
                  <dt className="text-xs font-semibold text-text-secondary">{item.label}</dt>
                  <dd className="text-xl font-bold text-text-primary tabular-nums">{item.value}</dd>
                  <dd className="text-xs text-text-secondary">{item.note}</dd>
                </div>
              ))}
            </dl>
            {preview.problems.length > 0 && (
              <section aria-labelledby="staff-import-problems-title">
                <h2
                  id="staff-import-problems-title"
                  className="text-sm font-bold text-text-primary"
                >
                  Rows with a problem
                </h2>
                <ul className="mt-1 max-h-60 divide-y divide-border overflow-y-auto rounded-md border border-border text-sm">
                  {preview.problems.map((row) => (
                    <li key={row.line} className="px-3 py-2">
                      Row {row.line}
                      {row.name ? ` · ${row.name}` : ''}: {row.problem}
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <div>
              <Button
                variant="primary"
                icon="checkCircle"
                disabled={!preview.newCount && !preview.changedCount}
                onClick={() => setConfirming(true)}
              >
                Apply List
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : (
        <EmptyStep
          id="staff-import-review-title"
          title="3. Review before applying"
          icon="checkCircle"
          waiting="Match the columns and press Preview first."
        />
      )}
      <Modal open={confirming} title="Apply this staff list?" onClose={() => setConfirming(false)}>
        <p className="text-sm text-text-secondary">
          Adds {staff(preview?.newCount ?? 0)} and updates {staff(preview?.changedCount ?? 0)}. The
          import is recorded in the audit log.
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="neutral" data-autofocus onClick={() => setConfirming(false)}>
            Cancel
          </Button>
          <Button variant="primary" loading={applying} onClick={() => void apply()}>
            Apply List
          </Button>
        </div>
      </Modal>
    </div>
  )
}
