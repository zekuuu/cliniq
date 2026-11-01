import { useState, type ChangeEvent } from 'react'
import { BackButton, Button, Card, CardBody, CardHeader, ErrorState, Icon, Modal, Select } from '../../components'
import { IMPORT_FIELDS, guessMapping, mapRows, parseCsv, type ImportFieldKey, type ImportMapping, type ImportRow } from '../../lib/studentImport'
import { applyStudentImport, getMockSessionUser, previewStudentImport, type SessionUser, type StudentImportPreview, type StudentImportResult } from '../../lib/mock-db'
import { paths } from '../../routes/paths'

const fieldsMissing = (mapping: ImportMapping) => IMPORT_FIELDS.filter((field) => field.required && mapping[field.key] < 0).map((field) => field.label)

/** Import the yearly student list (ADR-047): file, column mapping, reviewed preview, then apply. Staff only. */
export function StudentImportPage({ viewer = getMockSessionUser() }: { viewer?: SessionUser }) {
  const [fileName, setFileName] = useState('')
  const [csv, setCsv] = useState<string[][] | null>(null)
  const [mapping, setMapping] = useState<ImportMapping | null>(null)
  const [rows, setRows] = useState<ImportRow[]>([])
  const [preview, setPreview] = useState<StudentImportPreview | null>(null)
  const [archiveIds, setArchiveIds] = useState<string[]>([])
  const [confirming, setConfirming] = useState(false)
  const [applying, setApplying] = useState(false)
  const [result, setResult] = useState<StudentImportResult | null>(null)
  const [error, setError] = useState('')

  const shell = 'mx-auto flex max-w-page-narrow flex-col gap-4 px-4 pt-10 pb-8 sm:px-8'
  const back = <BackButton fallback={paths.students} />
  if (viewer.role !== 'staff') return <div className={shell}><ErrorState asPageTitle title="Staff access required." /></div>

  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
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

  const columnOptions = [{ value: '-1', label: 'Not in this file' }, ...(csv?.[0] ?? []).map((header, index) => ({ value: String(index), label: header || `Column ${index + 1}` }))]
  const missingFields = mapping ? fieldsMissing(mapping) : []
  const toggle = (id: string) => setArchiveIds((current) => (current.includes(id) ? current.filter((other) => other !== id) : [...current, id]))

  return (
    <div className={shell}>
      {back}
      <Card className="p-5">
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Import Student List</h1>
        <p className="mt-1 text-sm text-text-secondary">Update the list from the registrar's yearly CSV. Nothing changes until you apply it.</p>
      </Card>
      {result && (
        <p role="status" className="rounded-md border border-success bg-success/10 px-4 py-3 text-sm font-semibold text-text-primary">
          {result.created || result.updated || result.archived
            ? `List applied: ${result.created} added, ${result.updated} updated, ${result.archived} archived, ${result.flagged} left out.`
            : 'Nothing to change. The student records already match this list.'}
        </p>
      )}
      <Card aria-labelledby="import-file-title">
        <CardHeader titleId="import-file-title" title="1. Choose the file" icon={<Icon name="fileText" />} />
        <CardBody className="flex flex-col gap-2">
          <label className="flex flex-col gap-1 text-sm font-semibold text-text-primary">
            Student list (CSV)
            <input type="file" accept=".csv,text/csv" onChange={(event) => void chooseFile(event)} className="cursor-pointer text-sm font-normal text-text-secondary" />
          </label>
          {error && <p role="alert" className="text-sm font-semibold text-error">{error}</p>}
        </CardBody>
      </Card>
      {mapping && (
        <Card aria-labelledby="import-columns-title">
          <CardHeader titleId="import-columns-title" title="2. Match the columns" description={`${(csv?.length ?? 1) - 1} rows in ${fileName}`} icon={<Icon name="clipboardList" />} />
          <CardBody className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {IMPORT_FIELDS.map((field) => (
                <Select
                  key={field.key}
                  label={field.label}
                  required={field.required}
                  value={String(mapping[field.key])}
                  options={columnOptions}
                  onChange={(value) => {
                    setPreview(null)
                    setMapping({ ...mapping, [field.key as ImportFieldKey]: Number(value) })
                  }}
                />
              ))}
            </div>
            {missingFields.length > 0 && <p role="status" className="text-sm text-text-secondary">Still to match: {missingFields.join(', ')}.</p>}
            <div><Button variant="secondary" disabled={missingFields.length > 0} onClick={() => void showPreview()}>Preview</Button></div>
          </CardBody>
        </Card>
      )}
      {preview && (
        <Card aria-labelledby="import-review-title">
          <CardHeader titleId="import-review-title" title="3. Review before applying" icon={<Icon name="checkCircle" />} />
          <CardBody className="flex flex-col gap-4">
            <ul className="text-sm text-text-primary">
              <li>{preview.newCount} new</li>
              <li>{preview.continuingCount} continuing, {preview.changedCount} with a new grade or section</li>
              <li>{preview.missing.length} missing from the new list</li>
              <li>{preview.problems.length} with a problem, left out</li>
            </ul>
            {preview.problems.length > 0 && (
              <section aria-labelledby="import-problems-title">
                <h2 id="import-problems-title" className="text-sm font-bold text-text-primary">Rows with a problem</h2>
                <ul className="mt-1 divide-y divide-border rounded-md border border-border text-sm">
                  {preview.problems.map((row) => <li key={row.line} className="px-3 py-2">Row {row.line}{row.lrn ? ` · ${row.lrn}` : ''}: {row.problem}</li>)}
                </ul>
              </section>
            )}
            {preview.missing.length > 0 && (
              <fieldset className="flex flex-col gap-1">
                <legend className="text-sm font-bold text-text-primary">Tick the missing students to archive</legend>
                <p className="text-xs text-text-secondary">Leave a student unticked if they are still enrolled, such as a row with a problem above.</p>
                <div className="mt-1 max-h-72 overflow-y-auto rounded-md border border-border">
                  {preview.missing.map((student) => (
                    <label key={student.id} className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-background">
                      <input type="checkbox" className="size-4 cursor-pointer accent-brand-green-dark" checked={archiveIds.includes(student.id)} onChange={() => toggle(student.id)} />
                      {student.fullName} · {student.lrn} · {student.gradeLevel}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            <div><Button variant="primary" icon="checkCircle" onClick={() => setConfirming(true)}>Apply List</Button></div>
          </CardBody>
        </Card>
      )}
      <Modal open={confirming} title="Apply this student list?" onClose={() => setConfirming(false)}>
        <p className="text-sm text-text-secondary">
          {preview?.newCount ?? 0} students are added, {preview?.changedCount ?? 0} updated, and {archiveIds.length} archived. The import is recorded in the audit log.
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="neutral" data-autofocus onClick={() => setConfirming(false)}>Cancel</Button>
          <Button variant="primary" loading={applying} onClick={() => void apply()}>Apply List</Button>
        </div>
      </Modal>
    </div>
  )
}
