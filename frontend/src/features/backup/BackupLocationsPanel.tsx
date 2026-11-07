import { useEffect, useState, type FormEvent } from 'react'
import { Badge, Button, Card, CardBody, CardHeader, Combobox, Icon, Modal } from '../../components'
import { formatDateTime } from '../../lib/dates'
import { useSaveFeedback } from '../../hooks/useSaveFeedback'
import { SaveFeedback } from '../../components/forms/SaveFeedback'
import type { BackupLocation, BackupLocationSettings, SessionUser } from '../../lib/mock-db'
import { fetchBackupFolders, saveLocation, setLocationEnabled, type BackupDrive } from './api/backupApi'

const STATUS = {
  found: { label: 'Found', tone: 'success' },
  not_found: { label: 'Not found', tone: 'error' },
  not_writable: { label: 'Not writable', tone: 'error' },
} as const

const LABEL_SUGGESTIONS = ['Internal drive', 'External drive']

/** What the backend creates on each location (ADR-052). Shown as a preview; a browser can't write to a drive. */
const BACKUP_FOLDERS = [
  { name: 'Backups', path: '.cliniq\\backups\\YYYY\\MM\\cliniq-YYYY-MM-DD_HHmm.zip', holds: 'Database, uploaded files, and a manifest with a checksum' },
  { name: 'Marker file', path: '.cliniq\\cliniq.json', holds: 'App, school, structure version, and date created' },
  { name: 'Logs', path: '.cliniq\\logs\\backup-YYYY-MM.log', holds: 'One log for each month' },
]

/**
 * Backup locations (ADR-052): the clinician chooses and adds where backups go; a location is never
 * deleted, only disabled, and never edited (professor's consultation, November 6, 2026): to change
 * one, add a new location and disable the old one. Every change is audited by the data layer.
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
  const [adding, setAdding] = useState(false)
  const [label, setLabel] = useState('')
  const [path, setPath] = useState('')
  const [error, setError] = useState('')
  const feedback = useSaveFeedback()
  const enabled = settings.locations.filter((location) => location.enabled)

  function open() {
    setAdding(true)
    setLabel('')
    setPath('')
    setError('')
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!label.trim() || !path.trim()) {
      setError('Enter a label and choose a drive or folder.')
      return
    }
    const result = await feedback.run(() => saveLocation({ label, path }, { actor: viewer }), { saved: `${label.trim()} added. Backups now go there too.` })
    if (!result.ok) return
    setAdding(false)
    onChanged()
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
        description="Each backup is written to every enabled location. To change a location, add a new one and disable the old one; old backups stay where they were."
        icon={<Icon name="package" />}
        actions={canManage && <Button variant="secondary" size="sm" onClick={open}>Add location</Button>}
      />
      <CardBody className="flex flex-col gap-4">
        {/* The modal closes on success, so the confirmation shows here; a failure shows in the modal. */}
        {!adding && <SaveFeedback result={feedback.result} />}
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
                {/* Under the text, not beside the buttons, so the row keeps its layout (Zean, November 5, 2026). */}
                {canManage && location.enabled && enabled.length === 1 && (
                  <p id={`last-location-${location.id}`} className="mt-1 text-xs text-text-secondary">
                    The only enabled location. Enable another one first.
                  </p>
                )}
              </div>
              {canManage && (
                <div className="flex shrink-0 gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="min-w-20"
                    aria-label={`${location.enabled ? 'Disable' : 'Enable'} ${location.label}`}
                    // R32: the last enabled location can't be disabled; the data layer refuses it too.
                    disabled={location.enabled && enabled.length === 1}
                    aria-describedby={location.enabled && enabled.length === 1 ? `last-location-${location.id}` : undefined}
                    onClick={() => void toggle(location)}
                  >
                    {location.enabled ? 'Disable' : 'Enable'}
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
        <section aria-labelledby="backup-folders-title" className="rounded-md border border-border bg-surface p-4">
          <h2 id="backup-folders-title" className="text-sm font-semibold text-text-primary">Folders created on each location</h2>
          <dl className="mt-3 flex flex-col gap-3">
            {BACKUP_FOLDERS.map((folder) => (
              <div key={folder.name}>
                <dt className="text-sm font-semibold text-text-primary">{folder.name}</dt>
                <dd className="text-sm text-text-secondary">{folder.holds}</dd>
                <dd className="mt-0.5 font-mono text-xs break-all text-text-secondary">{folder.path}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-sm text-text-secondary">Keeps the latest {settings.keepLast} backups per location; older ones are removed.</p>
        </section>
      </CardBody>
      <Modal open={adding} title="Add a backup location" onClose={() => setAdding(false)}>
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
          <FolderPicker value={path} onChange={setPath} error={error && !path.trim() ? 'Choose a drive or folder.' : undefined} />
          {feedback.result?.kind === 'failed' && <SaveFeedback result={feedback.result} />}
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="neutral" data-autofocus onClick={() => setAdding(false)}>Cancel</Button>
            <Button type="submit" variant="primary" loading={feedback.saving}>Save location</Button>
          </div>
        </form>
      </Modal>
    </Card>
  )
}

/** Joins a folder name onto a path: `E:\` + `Backups` is `E:\Backups`. */
function joinPath(path: string, name: string) {
  return path.endsWith('\\') ? `${path}${name}` : `${path}\\${name}`
}

/**
 * Where a location writes (Zean, November 5, 2026: "should be actually choosing a drive, or folder"):
 * pick a drive, then open folders inside it; the folder that is open is the location. Nothing is typed.
 * The drives and folders come from the data layer (ADR-052: the backend lists them; the mock's list is
 * provisional). The breadcrumb goes back up.
 */
function FolderPicker({ value, onChange, error }: { value: string; onChange: (path: string) => void; error?: string }) {
  const [drives, setDrives] = useState<BackupDrive[]>([])
  const [folders, setFolders] = useState<string[]>([])
  useEffect(() => {
    let stale = false
    void fetchBackupFolders(value).then((result) => {
      if (stale) return
      setDrives(result.drives)
      setFolders(result.folders)
    })
    return () => {
      stale = true
    }
  }, [value])
  const drive = drives.find((item) => value.startsWith(item.root))
  // The breadcrumb: the drive root, then each folder below it.
  const crumbs = drive ? value.slice(drive.root.length).split('\\').filter(Boolean) : []
  const crumbPath = (index: number) => crumbs.slice(0, index + 1).reduce(joinPath, drive!.root)
  return (
    <fieldset className="flex flex-col gap-3" aria-invalid={error ? true : undefined}>
      <legend className="mb-1 text-sm font-semibold text-text-primary">
        Drive or folder <span className="text-error" aria-hidden="true">*</span>
      </legend>
      <div role="radiogroup" aria-label="Drive" className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {drives.map((item) => {
          const chosen = drive?.root === item.root
          return (
            <button
              key={item.root}
              type="button"
              role="radio"
              aria-checked={chosen}
              onClick={() => onChange(item.root)}
              className={`flex cursor-pointer flex-col items-start gap-0.5 rounded-md border px-3 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green motion-reduce:transition-none ${chosen ? 'border-brand-green-dark bg-brand-green-fill' : 'border-border bg-background hover:border-brand-green hover:bg-surface'}`}
            >
              <span className="text-sm font-semibold text-text-primary">
                {item.name} ({item.root.slice(0, 2)})
              </span>
              <span className="text-xs text-text-secondary">
                {item.kind === 'removable' ? 'Removable' : 'Internal'} · {item.freeSpace}
              </span>
            </button>
          )
        })}
      </div>
      {drive && (
        <div className="rounded-md border border-border">
          <nav aria-label="Folder path" className="flex flex-wrap items-center gap-1 border-b border-border bg-surface px-3 py-2 text-sm">
            <button type="button" onClick={() => onChange(drive.root)} className="cursor-pointer rounded-sm font-semibold text-brand-green-dark hover:underline focus-visible:outline-2 focus-visible:outline-brand-green">
              {drive.root.slice(0, 2)}
            </button>
            {crumbs.map((name, index) => (
              <span key={index} className="flex items-center gap-1">
                <Icon name="chevronRight" size={14} className="text-text-secondary" />
                {index === crumbs.length - 1 ? (
                  <span aria-current="location" className="font-semibold text-text-primary">{name}</span>
                ) : (
                  <button type="button" onClick={() => onChange(crumbPath(index))} className="cursor-pointer rounded-sm font-semibold text-brand-green-dark hover:underline focus-visible:outline-2 focus-visible:outline-brand-green">
                    {name}
                  </button>
                )}
              </span>
            ))}
          </nav>
          {folders.length ? (
            <ul aria-label="Folders" className="max-h-48 divide-y divide-border overflow-y-auto">
              {folders.map((name) => (
                <li key={name}>
                  <button
                    type="button"
                    onClick={() => onChange(joinPath(value, name))}
                    className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm text-text-primary transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-green motion-reduce:transition-none"
                  >
                    <Icon name="folder" size={16} className="shrink-0 text-brand-green-dark" />
                    {name}
                    <Icon name="chevronRight" size={14} className="ml-auto text-text-secondary" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3 py-2 text-sm text-text-secondary">No folders inside. Backups can go here.</p>
          )}
        </div>
      )}
      <p className="text-xs text-text-secondary" aria-live="polite">
        {value ? (
          <>
            Backups will be saved in <span className="font-mono break-all text-text-primary">{joinPath(value, '.cliniq')}</span>
          </>
        ) : (
          'Choose a drive, then open a folder if you want one.'
        )}
      </p>
      {error && <p role="alert" className="text-xs font-semibold text-error">{error}</p>}
    </fieldset>
  )
}
