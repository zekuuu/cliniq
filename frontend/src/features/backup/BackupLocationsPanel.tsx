import { useState, type FormEvent } from 'react'
import { Badge, Button, Card, CardBody, CardHeader, Combobox, Icon, Input, Modal } from '../../components'
import { formatDateTime } from '../../lib/dates'
import type { BackupLocation, BackupLocationSettings, SessionUser } from '../../lib/mock-db'
import { saveLocation, setLocationEnabled } from './api/backupApi'

const STATUS = {
  found: { label: 'Found', tone: 'success' },
  not_found: { label: 'Not found', tone: 'error' },
  not_writable: { label: 'Not writable', tone: 'error' },
} as const

const LABEL_SUGGESTIONS = ['Internal drive', 'External drive']

/** The folders the backend creates on each location (ADR-052). Shown as a preview; a browser can't write to a drive. */
function folderPreview(keepLast: number) {
  return [
    '<location>\\.cliniq\\',
    '    cliniq.json                                 marker: app, school, structure version, created on',
    '    backups\\YYYY\\MM\\cliniq-YYYY-MM-DD_HHmm.zip   database, uploaded files, manifest with a checksum',
    '    logs\\backup-YYYY-MM.log',
    `Keeps the latest ${keepLast} backups per location; older ones are removed.`,
  ].join('\n')
}

/**
 * Backup locations (ADR-052): the clinician chooses, adds and edits where backups go; a location is
 * never deleted, only disabled. Every change is audited by the data layer.
 */
export function BackupLocationsPanel({
  settings,
  viewer,
  onChanged,
}: {
  settings: BackupLocationSettings
  viewer: SessionUser
  onChanged: () => void
}) {
  const canManage = viewer.role === 'staff'
  const [editing, setEditing] = useState<BackupLocation | 'new' | null>(null)
  const [label, setLabel] = useState('')
  const [path, setPath] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const enabled = settings.locations.filter((location) => location.enabled)

  function open(target: BackupLocation | 'new') {
    setEditing(target)
    setLabel(target === 'new' ? '' : target.label)
    setPath(target === 'new' ? '' : target.path)
    setError('')
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!label.trim() || !path.trim()) {
      setError('Enter a label and the folder or drive path.')
      return
    }
    setSaving(true)
    try {
      await saveLocation({ label, path }, { id: editing === 'new' || !editing ? undefined : editing.id, actor: viewer })
      setEditing(null)
      onChanged()
    } finally {
      setSaving(false)
    }
  }

  async function toggle(location: BackupLocation) {
    await setLocationEnabled(location.id, !location.enabled, viewer)
    onChanged()
  }

  const typed = label.trim().toLowerCase()
  return (
    <Card aria-labelledby="backup-locations-title">
      <CardHeader
        titleId="backup-locations-title"
        title="Backup locations"
        description="Each backup is written to every enabled location. Locations are disabled, never deleted."
        icon={<Icon name="package" />}
        actions={canManage && <Button variant="secondary" size="sm" onClick={() => open('new')}>Add location</Button>}
      />
      <CardBody className="flex flex-col gap-4">
        {!enabled.length && (
          <p role="alert" className="flex items-start gap-2 rounded-md border border-error bg-error/10 px-3 py-2 text-sm font-semibold text-text-primary">
            <Icon name="alertTriangle" size={16} className="mt-0.5 shrink-0 text-error" />
            No backup location is enabled, so no backup can run. Enable or add one.
          </p>
        )}
        <ul className="divide-y divide-border rounded-md border border-border">
          {settings.locations.map((location) => (
            <li key={location.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-text-primary">
                  {location.label}
                  <Badge tone={STATUS[location.status].tone} variant="soft">{STATUS[location.status].label}</Badge>
                  {!location.enabled && <Badge tone="neutral" variant="outline">Disabled</Badge>}
                </p>
                <p className="text-sm break-all text-text-secondary">{location.path}</p>
                <p className="text-xs text-text-secondary">
                  {location.lastBackupAt
                    ? `Last backup ${formatDateTime(location.lastBackupAt)} · ${location.lastResult === 'ok' ? 'Completed' : 'Failed'}`
                    : 'No backup written here yet'}
                </p>
              </div>
              {canManage && (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="neutral" aria-label={`Edit ${location.label}`} onClick={() => open(location)}>Edit</Button>
                  <Button size="sm" variant="secondary" aria-label={`${location.enabled ? 'Disable' : 'Enable'} ${location.label}`} onClick={() => void toggle(location)}>
                    {location.enabled ? 'Disable' : 'Enable'}
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
        <section aria-labelledby="backup-folders-title" className="rounded-md border border-border bg-surface p-4">
          <h2 id="backup-folders-title" className="text-sm font-semibold text-text-primary">Folders created on each location</h2>
          {/* Scrolls sideways on a phone, so it takes keyboard focus. */}
          <pre tabIndex={0} aria-labelledby="backup-folders-title" className="mt-2 overflow-x-auto rounded-sm text-xs whitespace-pre text-text-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green">{folderPreview(settings.keepLast)}</pre>
        </section>
      </CardBody>
      <Modal open={editing !== null} title={editing === 'new' ? 'Add a backup location' : 'Edit backup location'} onClose={() => setEditing(null)}>
        <form noValidate onSubmit={save} className="flex flex-col gap-4">
          <Combobox
            label="Label"
            required
            value={label}
            onValueChange={setLabel}
            options={LABEL_SUGGESTIONS.filter((option) => option.toLowerCase().includes(typed))}
            optionKey={(option) => option}
            optionLabel={(option) => option}
            allowFreeText
            noMatchesText={null}
            maxLength={60}
            error={error && !label.trim() ? error : undefined}
          />
          <Input label="Folder or drive path" required value={path} placeholder="E:\" maxLength={200} onChange={(event) => setPath(event.target.value)} error={error && !path.trim() ? error : undefined} />
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="neutral" data-autofocus onClick={() => setEditing(null)}>Cancel</Button>
            <Button type="submit" variant="primary" loading={saving}>Save location</Button>
          </div>
        </form>
      </Modal>
    </Card>
  )
}
