import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import {
  BackButton,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  ErrorState,
  Icon,
  Input,
  Modal,
  Select,
  Skeleton,
  StudentPicker,
  Textarea,
} from '../../components'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useCancelNavigation } from '../../hooks/useCancelNavigation'
import { useFocusFirstInvalid } from '../../hooks/useFocusFirstInvalid'
import {
  SPORTS_REPORT_NOTE_MAX,
  SPORTS_REPORT_TEXT_MAX,
  SPORTS_REPORT_WINDOWS,
  validateSportsReport,
  type SessionUser,
  type SportsReportDetail,
  type SportsReportErrors,
  type SportsReportStudentRow,
  type SportsReportWindow,
} from '../../lib/mock-db'
import { paths } from '../../routes/paths'
import type { StudentSearchResult } from '../../types/entities'
import {
  fetchGradeLevels,
  fetchGradeStudents,
  fetchSportsReport,
  saveSportsReport,
  searchSportsReportStudents,
} from './api/sportsReportApi'
import { windowLabel } from './sportsReportContent'

/**
 * The Sports Report builder (ADR-034): who asked, the look-back window, the students and a note per
 * student. Students are shown by full name and grade, a decided exception to the LRN-on-lists rule:
 * the instructor has to recognise them. Staff only.
 */
export function SportsReportFormPage({ reportId, viewer }: { reportId?: string; viewer: SessionUser }) {
  const { data: existing, status, reload } = useAsyncData(`sports-report|${reportId ?? 'new'}`, () =>
    reportId ? fetchSportsReport(reportId, viewer) : Promise.resolve(null),
  )
  const back = <BackButton fallback={reportId ? paths.sportsReport(reportId) : paths.sportsReports} />
  if (status === 'error')
    return (
      <div className="mx-auto flex max-w-page-narrow flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
        {back}
        <ErrorState title="Unable to load this Sports Report." onRetry={reload} />
      </div>
    )
  if (existing === undefined) return <FormSkeleton back={back} />
  return <SportsReportForm key={existing?.id ?? 'new'} reportId={reportId} initial={existing} viewer={viewer} />
}

function FormSkeleton({ back }: { back: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-page-narrow flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
      {back}
      <p className="sr-only" role="status">
        Loading Sports Report...
      </p>
      <Card aria-hidden="true" className="p-5">
        <Skeleton className="h-7 w-48" />
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="mt-4 h-12" />
        ))}
      </Card>
    </div>
  )
}

const WINDOW_OPTIONS = SPORTS_REPORT_WINDOWS.map((window) => ({ value: String(window), label: windowLabel(window) }))

function studentName(student: SportsReportStudentRow) {
  return student.fullName ?? 'a student record no longer in CLINIQ'
}

function SportsReportForm({ reportId, initial, viewer }: { reportId?: string; initial: SportsReportDetail | null; viewer: SessionUser }) {
  const navigate = useNavigate()
  const [title, setTitle] = useState(initial?.title ?? '')
  const [activity, setActivity] = useState(initial?.activity ?? '')
  const [requestedBy, setRequestedBy] = useState(initial?.requestedBy ?? '')
  const [lookBack, setLookBack] = useState<SportsReportWindow>(initial?.window ?? 90)
  const [includeConditions, setIncludeConditions] = useState(initial?.includeConditions ?? false)
  const [students, setStudents] = useState<SportsReportStudentRow[]>(initial?.students ?? [])
  const [errors, setErrors] = useState<SportsReportErrors>({})
  const [studentNotice, setStudentNotice] = useState('')
  const [grade, setGrade] = useState('')
  const [gradeError, setGradeError] = useState<string>()
  const [gradeConfirm, setGradeConfirm] = useState<{ grade: string; toAdd: StudentSearchResult[]; skipped: number } | null>(null)
  const [saving, setSaving] = useState(false)
  const { data: grades } = useAsyncData('grade-levels', fetchGradeLevels)
  const studentsHeading = useRef<HTMLHeadingElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const invalid = useFocusFirstInvalid(formRef)

  const values = { title, activity, requestedBy, window: lookBack, includeConditions, students: students.map(({ studentId, note }) => ({ studentId, note: note ?? '' })) }
  const initialValues = {
    title: initial?.title ?? '',
    activity: initial?.activity ?? '',
    requestedBy: initial?.requestedBy ?? '',
    window: initial?.window ?? 90,
    includeConditions: initial?.includeConditions ?? false,
    students: (initial?.students ?? []).map(({ studentId, note }) => ({ studentId, note: note ?? '' })),
  }
  const dirty = JSON.stringify(values) !== JSON.stringify(initialValues)
  const { cancel, discardDialog } = useCancelNavigation(reportId ? paths.sportsReport(reportId) : paths.sportsReports, dirty)

  function addStudents(picked: StudentSearchResult[]) {
    const known = new Set(students.map((student) => student.studentId))
    const fresh = picked.filter((student) => !known.has(student.id))
    setStudents((current) => [
      ...current,
      ...fresh.map((student) => ({ studentId: student.id, note: null, fullName: student.fullName, gradeLevel: student.gradeLevel, status: 'active' as const })),
    ])
    return fresh.length
  }
  function pickStudent(student: StudentSearchResult) {
    if (!addStudents([student])) setStudentNotice(`${student.fullName} is already on this report.`)
    else setStudentNotice(`Added ${student.fullName}.`)
  }
  async function askAddGrade() {
    if (!grade) return setGradeError('Choose a grade level first.')
    setGradeError(undefined)
    const inGrade = await fetchGradeStudents(grade)
    const known = new Set(students.map((student) => student.studentId))
    const toAdd = inGrade.filter((student) => !known.has(student.id))
    if (!toAdd.length) {
      setStudentNotice(inGrade.length ? `Every active student in ${grade} is already on this report.` : `${grade} has no active students.`)
      return
    }
    setGradeConfirm({ grade, toAdd, skipped: inGrade.length - toAdd.length })
  }
  function confirmAddGrade() {
    if (!gradeConfirm) return
    const added = addStudents(gradeConfirm.toAdd)
    setStudentNotice(`Added ${added} student${added === 1 ? '' : 's'} from ${gradeConfirm.grade}.`)
    setGradeConfirm(null)
  }
  function remove(student: SportsReportStudentRow) {
    setStudents((current) => current.filter((candidate) => candidate.studentId !== student.studentId))
    setStudentNotice(`Removed ${studentName(student)}.`)
    // The removed row held focus; keep the keyboard in the student section.
    studentsHeading.current?.focus()
  }
  function setNote(studentId: string, note: string) {
    setStudents((current) => current.map((student) => (student.studentId === studentId ? { ...student, note } : student)))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const found = validateSportsReport(values)
    setErrors(found)
    invalid.report(Object.keys(found).length)
    if (Object.keys(found).length) return
    setSaving(true)
    try {
      const saved = await saveSportsReport(values, { reportId, viewer })
      navigate(paths.sportsReport(saved.id), { replace: !reportId })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-page-narrow flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
      {discardDialog}
      <BackButton onBack={cancel} />
      <Card className="p-5">
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">{reportId ? 'Edit Sports Report' : 'New Sports Report'}</h1>
        <p className="mt-1 text-sm text-text-secondary">
          List the students an instructor asked about. The printout shows their recent visits and incidents and your note;
          it is read from the records each time you print, so nothing medical is saved with the list.
        </p>
      </Card>
      <form ref={formRef} className="flex flex-col gap-4" onSubmit={submit} noValidate>
        <p role="status" className="sr-only">
          {invalid.announcement}
        </p>
        <Card>
          <CardHeader title="Report details" icon={<Icon name="clipboardList" />} />
          <CardBody className="flex flex-col gap-4">
            <Input label="Title" required value={title} maxLength={SPORTS_REPORT_TEXT_MAX} error={errors.title} onChange={(event) => setTitle(event.target.value)} />
            <Input
              label="Activity"
              value={activity}
              maxLength={SPORTS_REPORT_TEXT_MAX}
              error={errors.activity}
              hint="Optional, for example “Palaro 2026, Boys Basketball”."
              onChange={(event) => setActivity(event.target.value)}
            />
            <Input
              label="Requested by"
              required
              value={requestedBy}
              maxLength={SPORTS_REPORT_TEXT_MAX}
              error={errors.requestedBy}
              hint="The PE or sports instructor who asked for the report."
              onChange={(event) => setRequestedBy(event.target.value)}
            />
            <Select
              label="Look-back window"
              value={String(lookBack)}
              options={WINDOW_OPTIONS}
              clearable={false}
              error={errors.window}
              hint="Visits and incidents in this period are printed."
              onChange={(value) => setLookBack(value === 'school_year' ? 'school_year' : (Number(value) as SportsReportWindow))}
            />
            <label className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-surface motion-reduce:transition-none">
              <input
                type="checkbox"
                checked={includeConditions}
                onChange={(event) => setIncludeConditions(event.target.checked)}
                className="mt-0.5 size-4 cursor-pointer accent-brand-green-dark"
              />
              <span>
                <span className="block text-sm font-semibold text-text-primary">Include recorded conditions and allergies</span>
                <span className="block text-xs text-text-secondary">Off unless you tick it. Adds a column with each student's recorded conditions and allergies.</span>
              </span>
            </label>
          </CardBody>
        </Card>
        <Card aria-labelledby="sports-report-students">
          <CardHeader
            titleId="sports-report-students"
            title="Students"
            description={`${students.length} student${students.length === 1 ? '' : 's'} on this report`}
            icon={<Icon name="users" />}
          />
          <CardBody className="flex flex-col gap-4">
            <StudentPicker
              label="Add a student"
              hint="Type a name or LRN, then pick the student. Repeat for each student."
              required={false}
              search={searchSportsReportStudents}
              onSelect={pickStudent}
            />
            <div className="flex flex-wrap items-end gap-2">
              <Select
                label="Or add a whole grade level"
                value={grade}
                options={(grades ?? []).map((level) => ({ value: level, label: level }))}
                placeholder="Choose a grade level"
                error={gradeError}
                className="w-full sm:w-64"
                onChange={setGrade}
              />
              <Button type="button" variant="secondary" onClick={() => void askAddGrade()}>
                Add Grade
              </Button>
            </div>
            <p role="status" className="text-sm text-text-secondary empty:hidden">
              {studentNotice}
            </p>
            <h3 ref={studentsHeading} tabIndex={-1} className="text-sm font-semibold text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green">
              On this report
            </h3>
            {errors.students && (
              <p role="alert" className="text-sm font-semibold text-error">
                {errors.students}
              </p>
            )}
            {students.length ? (
              <ul className="flex flex-col gap-3">
                {students.map((student) => (
                  <li key={student.studentId} className="flex flex-col gap-2 rounded-md border border-border p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold wrap-break-word text-text-primary">{student.fullName ?? 'Student record not found'}</p>
                        {student.gradeLevel && <p className="text-sm text-text-secondary">{student.gradeLevel}</p>}
                        {student.status !== 'active' && (
                          <Badge tone="warning" variant="soft" className="mt-1">
                            {student.status === 'archived' ? 'Archived: left out of the printout' : 'No longer in CLINIQ: left out of the printout'}
                          </Badge>
                        )}
                      </div>
                      <Button type="button" size="sm" variant="neutral" onClick={() => remove(student)} aria-label={`Remove ${studentName(student)} from this report`}>
                        Remove
                      </Button>
                    </div>
                    <Textarea
                      label={`Note for ${studentName(student)}`}
                      rows={2}
                      maxLength={SPORTS_REPORT_NOTE_MAX}
                      value={student.note ?? ''}
                      onChange={(note) => setNote(student.studentId, note)}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-text-secondary">No students yet. Add them above; a report needs at least one student before it can be printed.</p>
            )}
          </CardBody>
        </Card>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="neutral" onClick={cancel}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={saving}>
            {reportId ? 'Save Changes' : 'Create Report'}
          </Button>
        </div>
      </form>
      <Modal open={Boolean(gradeConfirm)} title={`Add ${gradeConfirm?.toAdd.length ?? 0} student${gradeConfirm?.toAdd.length === 1 ? '' : 's'} from ${gradeConfirm?.grade ?? ''}?`} onClose={() => setGradeConfirm(null)}>
        <p className="text-sm text-text-secondary">
          Every active student in {gradeConfirm?.grade} is added with their full name and grade level.
          {gradeConfirm?.skipped ? ` ${gradeConfirm.skipped} already on this report will be skipped.` : ''}
        </p>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button variant="neutral" onClick={() => setGradeConfirm(null)} data-autofocus>
            Cancel
          </Button>
          <Button variant="primary" onClick={confirmAddGrade}>
            Add {gradeConfirm?.toAdd.length === 1 ? '1 Student' : `${gradeConfirm?.toAdd.length ?? 0} Students`}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
