import { useState, type FormEvent } from 'react'
import { useLocation } from 'react-router'
import { Button, Modal, Textarea } from '../../components'
import { ROLE_LABELS, type SessionUser } from '../../lib/mock-db'
import { createIssueReport, type IssueReportInput } from './api/issueReportApi'
import { ISSUE_REPORT_RECIPIENT } from './reportIssueConfig'

function pageNameFromTitle(pathname: string): string {
  const title = document.title.replace(/^CLINIQ\s+—\s+/, '').trim()
  return title || pathname
}

export function buildIssueMailto(report: {
  description: string
  pageName: string
  route: string
  role: string
  createdAt: string
}): string {
  const subject = `[CLINIQ] Issue on ${report.pageName}`
  const body = [
    `Page: ${report.pageName}`,
    `Route: ${report.route}`,
    `Role: ${report.role}`,
    `Timestamp: ${report.createdAt}`,
    '',
    'Description:',
    report.description,
  ].join('\n')
  const params = new URLSearchParams({ subject, body })
  return `mailto:${ISSUE_REPORT_RECIPIENT}?${params.toString()}`
}

export function ReportIssueModal({
  open,
  user,
  onClose,
  onSubmitted,
}: {
  open: boolean
  user: SessionUser
  onClose: () => void
  onSubmitted: (mailtoOpened: boolean) => void
}) {
  // The form mounts only while the Modal is open, so each open starts with empty state.
  return (
    <Modal open={open} title="Report an Issue" onClose={onClose}>
      <ReportIssueForm user={user} onClose={onClose} onSubmitted={onSubmitted} />
    </Modal>
  )
}

function ReportIssueForm({
  user,
  onClose,
  onSubmitted,
}: {
  user: SessionUser
  onClose: () => void
  onSubmitted: (mailtoOpened: boolean) => void
}) {
  const location = useLocation()
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)
  const pageName = pageNameFromTitle(location.pathname)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = description.trim()
    if (!trimmed) {
      setError('Describe the issue before submitting.')
      return
    }

    setSaving(true)
    try {
      const input: IssueReportInput = {
        description: trimmed,
        route: location.pathname,
        pageName,
      }
      const report = await createIssueReport(input, user)
      const mailtoOpened = Boolean(
        window.open(
          buildIssueMailto({ ...report, role: ROLE_LABELS[report.role] }),
          '_blank',
          'noopener,noreferrer',
        ),
      )
      onSubmitted(mailtoOpened)
      onClose()
    } catch {
      setError('The issue could not be saved. Try again.')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)}>
      <p className="text-sm leading-6 text-text-secondary">
        We&apos;ll save this report with the page and role context captured automatically. An email
        draft will also open as a fallback.
      </p>

      <dl className="mt-4 grid gap-2 rounded-md bg-surface px-3 py-3 text-xs leading-5">
        <div className="flex gap-2">
          <dt className="font-semibold text-text-secondary">Page</dt>
          <dd className="text-text-primary">{pageName}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="font-semibold text-text-secondary">Route</dt>
          <dd className="text-text-primary">{location.pathname}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="font-semibold text-text-secondary">Role</dt>
          <dd className="text-text-primary">{ROLE_LABELS[user.role]}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="font-semibold text-text-secondary">Timestamp</dt>
          <dd className="text-text-primary">Captured when submitted</dd>
        </div>
      </dl>

      <Textarea
        label="What went wrong?"
        value={description}
        onChange={setDescription}
        error={error}
        required
        rows={5}
        data-autofocus
        className="mt-5"
        placeholder="Describe what you expected and what happened."
      />

      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <Button variant="neutral" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={saving}>
          Submit report
        </Button>
      </div>
    </form>
  )
}
