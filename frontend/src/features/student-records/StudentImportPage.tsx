import { useState } from 'react'
import {
  BackButton,
  Button,
  Card,
  CardBody,
  CardHeader,
  ErrorState,
  Icon,
  Input,
  MaskedLrn,
  type IconName,
  Modal,
  Select,
} from '../../components'
import {
  IMPORT_FIELDS,
  guessMapping,
  mapRows,
  missingImportFields,
  namesFromOneColumn,
  parseCsv,
  type ImportFieldKey,
  type ImportMapping,
  type ImportRow,
} from '../../lib/studentImport'
import {
  applyStudentImport,
  getMockSessionUser,
  previewStudentImport,
  type SessionUser,
  type StudentImportPreview,
  type StudentImportResult,
} from '../../lib/mock-db'
import { paths } from '../../routes/paths'
import { nameMatches } from '../../lib/personName'

/** Import the yearly student list (ADR-047): file, column mapping, reviewed preview, then apply. Staff only. */
const students = (count: number) => `${count} ${count === 1 ? 'student' : 'students'}`

/** A later step shown empty from the start, so the clinician sees how many steps there are (Zean, November 3, 2026). */
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

export function StudentImportPage({ viewer = getMockSessionUser() }: { viewer?: SessionUser }) {
  const [fileName, setFileName] = useState('')
  const [dragging, setDragging] = useState(false)
  const [csv, setCsv] = useState<string[][] | null>(null)
  const [mapping, setMapping] = useState<ImportMapping | null>(null)
  const [rows, setRows] = useState<ImportRow[]>([])
  const [preview, setPreview] = useState<StudentImportPreview | null>(null)
  const [archiveIds, setArchiveIds] = useState<string[]>([])
  const [find, setFind] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [applying, setApplying] = useState(false)
  const [result, setResult] = useState<StudentImportResult | null>(null)
  const [error, setError] = useState('')

  const shell = 'mx-auto flex max-w-page-narrow flex-col gap-4 px-4 pt-10 pb-8 sm:px-8'
  const back = <BackButton fallback={paths.students} />
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
      setError('This file has no student rows.')
      return
    }
    setError('')
    setCsv(parsed)
    setMapping(guessMapping(parsed[0]))
  }

  async function showPreview() {
    if (!csv || !mapping) return
    const mapped = mapRows(csv.slice(1), mapping)
    setRows(mapped)
    setArchiveIds([])
    setPreview(await previewStudentImport(mapped, viewer))
  }

  async function apply() {
    setApplying(true)
    try {
      setResult(await applyStudentImport(rows, { fileName, archiveIds, actor: viewer }))
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
  const missingFields = mapping ? missingImportFields(mapping) : []
  const oneColumn = mapping ? namesFromOneColumn(mapping) : false
  const checked = new Set(archiveIds)
  // The previewed rows, numbered as in the file (the header is row 1), when the names came from one column.
  const splitRows = preview && oneColumn ? rows.map((row, index) => ({ line: index + 2, row })) : []
  // The search field itself waits until typing stops (Input, type="search").
  const term = find.trim().toLowerCase()
  const shownMissing = (preview?.missing ?? []).filter(
    (student) =>
      !term ||
      nameMatches(student.fullName, term) ||
      student.gradeLevel.toLowerCase().includes(term),
  )
  const toggle = (id: string) =>
    setArchiveIds((current) =>
      current.includes(id) ? current.filter((other) => other !== id) : [...current, id],
    )

  return (
    <div className={shell}>
      {back}
      <Card className="p-5">
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Import Student List</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Update the list from the registrar's yearly CSV. Nothing changes until you apply it.
        </p>
      </Card>
      {result && (
        <p
          role="status"
          className="rounded-md border border-success bg-success/10 px-4 py-3 text-sm font-semibold text-text-primary"
        >
          {result.created || result.updated || result.archived
            ? `List applied: ${result.created} added, ${result.updated} updated, ${result.archived} archived, ${result.flagged} left out.`
            : 'Nothing to change. The student records already match this list.'}
        </p>
      )}
      <Card aria-labelledby="import-file-title">
        <CardHeader
          titleId="import-file-title"
          title="1. Choose the file"
          icon={<Icon name="fileText" />}
        />
        <CardBody className="flex flex-col gap-2">
          {/* A drop zone (Zean, November 3, 2026): drop the file, or click anywhere in it to browse. The input stays
              in the label, visually hidden, so Tab reaches it; its aria-label names it. */}
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
              aria-label="Student list (CSV)"
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
        <Card aria-labelledby="import-columns-title">
          <CardHeader
            titleId="import-columns-title"
            title="2. Match the columns"
            description={`${(csv?.length ?? 1) - 1} rows in ${fileName}`}
            icon={<Icon name="clipboardList" />}
          />
          <CardBody className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {IMPORT_FIELDS.map((field) => (
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
                    setMapping({ ...mapping, [field.key as ImportFieldKey]: Number(value) })
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
          id="import-columns-title"
          title="2. Match the columns"
          icon="clipboardList"
          waiting="Choose a file first."
        />
      )}
      {preview ? (
        <Card aria-labelledby="import-review-title">
          <CardHeader
            titleId="import-review-title"
            title="3. Review before applying"
            icon={<Icon name="checkCircle" />}
          />
          <CardBody className="flex flex-col gap-4">
            {/* What applying will do, as four plain figures (Zean, November 3, 2026: "this part are confusing"). */}
            <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                {
                  label: 'New students',
                  value: preview.newCount,
                  note: preview.newCount
                    ? 'Will be added to the Student List'
                    : 'No one new to add',
                },
                {
                  label: 'Already in the Student List',
                  value: preview.continuingCount,
                  note: preview.changedCount
                    ? `Grade or section updated for ${preview.changedCount}`
                    : 'No grade or section changes',
                },
                {
                  label: 'Not in this file',
                  value: preview.missing.length,
                  note: preview.missing.length
                    ? 'Check below the ones who have left'
                    : 'Everyone is in this file',
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
            {/* One full-name column (ADR-064): every split is shown, so the registrar can correct the file. */}
            {splitRows.length > 0 && (
              <section aria-labelledby="import-split-title" className="flex flex-col gap-1">
                <h2 id="import-split-title" className="text-sm font-bold text-text-primary">
                  Names split from one column
                </h2>
                <p className="text-sm text-text-secondary">
                  The last word is the last name, unless the name is written "Surname, First
                  Middle". If a name is split wrongly, correct the file and preview it again.
                </p>
                <div
                  className="max-h-60 overflow-y-auto rounded-md border border-border"
                  tabIndex={0}
                  role="region"
                  aria-label="Names split from one column, scrollable"
                >
                  <table className="w-full border-collapse text-sm">
                    <caption className="sr-only">Names split from one column</caption>
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-text-secondary">
                        <th
                          scope="col"
                          className="sticky top-0 bg-background px-3 py-1.5 font-semibold"
                        >
                          Row
                        </th>
                        <th
                          scope="col"
                          className="sticky top-0 bg-background px-3 py-1.5 font-semibold"
                        >
                          Last name
                        </th>
                        <th
                          scope="col"
                          className="sticky top-0 bg-background px-3 py-1.5 font-semibold"
                        >
                          First name
                        </th>
                        <th
                          scope="col"
                          className="sticky top-0 bg-background px-3 py-1.5 font-semibold"
                        >
                          Middle name
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {splitRows.map(({ line, row }) => (
                        <tr key={line} className="border-b border-border last:border-b-0">
                          <td className="px-3 py-1.5 tabular-nums text-text-secondary">{line}</td>
                          <td className="px-3 py-1.5 font-semibold text-text-primary">
                            {row.lastName}
                          </td>
                          <td className="px-3 py-1.5 text-text-primary">{row.firstName}</td>
                          <td className="px-3 py-1.5 text-text-primary">
                            {row.middleName || 'None'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
            {preview.problems.length > 0 && (
              <section aria-labelledby="import-problems-title">
                <h2 id="import-problems-title" className="text-sm font-bold text-text-primary">
                  Rows with a problem
                </h2>
                <ul className="mt-1 max-h-60 divide-y divide-border overflow-y-auto rounded-md border border-border text-sm">
                  {preview.problems.map((row) => (
                    <li key={row.line} className="px-3 py-2">
                      Row {row.line}
                      {row.lrn ? ` · ${row.lrn}` : ''}: {row.problem}
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {preview.missing.length > 0 && (
              <fieldset className="flex flex-col gap-1">
                <legend className="text-sm font-bold text-text-primary">
                  In the Student List but not in this file ({preview.missing.length})
                </legend>
                <p className="text-sm text-text-secondary">
                  Check the students who have left the school. Checked students are archived, not
                  deleted. Leave a student unchecked if they are still enrolled.
                </p>
                {/* Scales to a year's leavers (hundreds of rows): search narrows the list; Check all acts on what is shown. */}
                <Input
                  type="search"
                  label="Find a student"
                  placeholder="Name or grade"
                  className="mt-2 sm:max-w-xs"
                  value={find}
                  onChange={(event) => setFind(event.target.value)}
                />
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-text-primary tabular-nums">
                    {archiveIds.length} of {preview.missing.length} checked
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        setArchiveIds([
                          ...new Set([...archiveIds, ...shownMissing.map((student) => student.id)]),
                        ])
                      }
                    >
                      Check all
                    </Button>
                    <Button
                      size="sm"
                      variant="neutral"
                      onClick={() =>
                        setArchiveIds(
                          archiveIds.filter(
                            (id) => !shownMissing.some((student) => student.id === id),
                          ),
                        )
                      }
                    >
                      Uncheck all
                    </Button>
                  </div>
                </div>
                <div className="mt-1 max-h-72 divide-y divide-border overflow-y-auto rounded-md border border-border">
                  {shownMissing.length === 0 && (
                    <p className="px-3 py-2 text-sm text-text-secondary">No student matches.</p>
                  )}
                  {shownMissing.map((student) => (
                    <label
                      key={student.id}
                      className="grid cursor-pointer grid-cols-[auto_minmax(0,1fr)_6rem_8rem] items-center gap-3 px-3 py-2 text-sm text-text-primary transition-colors hover:bg-surface motion-reduce:transition-none"
                    >
                      <input
                        type="checkbox"
                        className="size-4 cursor-pointer accent-brand-green-dark"
                        checked={checked.has(student.id)}
                        onChange={() => toggle(student.id)}
                      />
                      <span className="font-semibold">{student.fullName}</span>
                      <span className="text-text-secondary">{student.gradeLevel}</span>
                      <span className="text-text-secondary">
                        <MaskedLrn lrn={student.lrn} />
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            <div>
              <Button variant="primary" icon="checkCircle" onClick={() => setConfirming(true)}>
                Apply List
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : (
        <EmptyStep
          id="import-review-title"
          title="3. Review before applying"
          icon="checkCircle"
          waiting="Match the columns and press Preview first."
        />
      )}
      <Modal
        open={confirming}
        title="Apply this student list?"
        onClose={() => setConfirming(false)}
      >
        <p className="text-sm text-text-secondary">
          Adds {students(preview?.newCount ?? 0)}, updates the grade or section of{' '}
          {students(preview?.changedCount ?? 0)}, and archives {students(archiveIds.length)}. The
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
