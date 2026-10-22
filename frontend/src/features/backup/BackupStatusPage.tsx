import { useState } from 'react'
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, ErrorState, Icon, Modal, Skeleton } from '../../components'
import { useAsyncData } from '../../hooks/useAsyncData'
import { formatDateTime } from '../../lib/dates'
import { getMockSessionUser } from '../../lib/mock-db'
import { backUpNow, fetchBackupStatus, verifyBackup, type BackupStatusView } from './api/backupApi'

function formatSize(bytes: number): string {
    return bytes >= 1_048_576 ? `${(bytes / 1_048_576).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`
}

function BackupSkeleton() {
    return (
        <div aria-hidden="true" className="mx-auto flex max-w-page-narrow flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
            <Card className="p-5">
                <Skeleton className="h-7 w-56" />
                <Skeleton className="mt-2 h-4 w-96 max-w-full" />
            </Card>
            <Card className="p-5">
                <div className="grid gap-4 sm:grid-cols-3">
                    {Array.from({ length: 3 }, (_, index) => (
                        <Skeleton key={index} className="h-10" />
                    ))}
                </div>
                <Skeleton className="mt-5 h-28" />
            </Card>
        </div>
    )
}

export function BackupStatusPage() {
    const viewer = getMockSessionUser()
    const { data, status, reload } = useAsyncData('backup-status', fetchBackupStatus)
    const [updated, setUpdated] = useState<BackupStatusView | null>(null)
    const [saving, setSaving] = useState(false)
    const [confirming, setConfirming] = useState(false)
    const [backingUp, setBackingUp] = useState(false)
    const [backedUp, setBackedUp] = useState(false)

    // Panel review BK-2: either role can start a backup here.
    async function runBackup() {
        setBackingUp(true)
        try {
            setUpdated(await backUpNow(viewer))
            setBackedUp(true)
        } finally {
            setBackingUp(false)
        }
    }
    const backUpNowButton = (
        <Button variant="secondary" icon="refresh" loading={backingUp} onClick={() => void runBackup()}>
            Back up now
        </Button>
    )

    if (status === 'error')
        return (
            <div className="mx-auto max-w-page-narrow px-4 pt-10 pb-8 sm:px-8">
                <ErrorState title="Unable to load backup status." onRetry={reload} />
            </div>
        )
    if (!data)
        return (
            <>
                <p className="sr-only" role="status">
                    Loading backup status...
                </p>
                <BackupSkeleton />
            </>
        )

    const current = updated ?? data
    const latest = current.latest
    if (!latest)
        return (
            <div className="mx-auto max-w-page-narrow px-4 pt-10 pb-8 sm:px-8">
                <EmptyState
                    icon="shieldPlus"
                    title="No backups recorded yet"
                    description="The first scheduled backup will appear here once it has run, or start one now."
                />
                <div className="mt-4 flex justify-center">{backUpNowButton}</div>
            </div>
        )
    const verified = Boolean(latest.verifiedByUserId)

    async function verify() {
        setSaving(true)
        try {
            setUpdated(await verifyBackup(viewer))
            setBackedUp(false)
            setConfirming(false)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="mx-auto flex max-w-page-narrow flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
            <Card className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-text-primary">
                            Backup Verification
                        </h1>
                        <p className="mt-1 text-sm text-text-secondary">
                            Check the latest local backup and follow the recovery steps if it needs attention.
                        </p>
                    </div>
                    <Badge
                        tone={latest.status === 'failed' ? 'error' : verified ? 'success' : 'warning'}
                        variant="soft"
                    >
                        {latest.status === 'failed' ? 'Backup failed' : verified ? 'Verified' : 'Needs verification'}
                    </Badge>
                </div>
            </Card>
            <Card>
                <CardHeader title="Latest backup" icon={<Icon name="shieldPlus" />} />
                <CardBody className="flex flex-col gap-5">
                    <dl className="grid gap-4 sm:grid-cols-3">
                        <div>
                            <dt className="text-xs font-semibold text-text-secondary">Last run</dt>
                            <dd className="text-sm font-semibold text-text-primary">
                                {formatDateTime(latest.lastRun)}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs font-semibold text-text-secondary">File size</dt>
                            <dd className="text-sm font-semibold text-text-primary">
                                {formatSize(latest.fileSizeBytes)}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs font-semibold text-text-secondary">Backup result</dt>
                            <dd className="text-sm font-semibold text-text-primary">
                                {latest.status === 'ok' ? 'Completed' : 'Failed'}
                                {verified && current.verifiedByName ? ` · verified by ${current.verifiedByName}` : ''}
                            </dd>
                        </div>
                    </dl>
                    {current.recentFailure && current.recentFailure.lastRun !== latest.lastRun && (
                        <p className="rounded-md border border-warning bg-warning/10 px-3 py-2 text-sm text-text-primary">
                            An earlier backup failed on {formatDateTime(current.recentFailure.lastRun)}. Later
                            backups completed.
                        </p>
                    )}
                    <section className="rounded-md border border-border bg-surface p-4">
                        <h2 className="text-sm font-semibold text-text-primary">Guided recovery checklist</h2>
                        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-text-secondary">
                            <li>Confirm the backup file exists on the designated external drive.</li>
                            <li>Check that the file size is plausible compared with the previous backup.</li>
                            <li>
                                Record the verification, then notify the School Clinician if anything is missing.
                            </li>
                        </ol>
                    </section>
                    <section aria-labelledby="backup-history-title">
                        <h2 id="backup-history-title" className="text-sm font-semibold text-text-primary">Recent runs</h2>
                        <ol className="mt-2 divide-y divide-border rounded-md border border-border">
                            {current.history.slice(0, 5).map((run) => (
                                <li key={run.lastRun} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                                    <span className="text-text-primary">{formatDateTime(run.lastRun)}</span>
                                    <span className={run.status === 'failed' ? 'font-semibold text-error' : 'text-text-secondary'}>
                                        {run.status === 'failed' ? 'Failed' : `Completed · ${formatSize(run.fileSizeBytes)}${run.verifiedByUserId ? ' · verified' : ''}`}
                                    </span>
                                </li>
                            ))}
                        </ol>
                    </section>
                    {backedUp && (
                        <p role="status" className="rounded-md border border-success bg-success/10 px-3 py-2 text-sm font-semibold text-text-primary">
                            Backup recorded. Check the file on the external drive, then mark it verified.
                        </p>
                    )}
                    <div className="flex flex-wrap justify-end gap-2">
                        {backUpNowButton}
                        <Button
                            variant="primary"
                            onClick={() => setConfirming(true)}
                            icon="checkCircle"
                            disabled={verified || latest.status === 'failed'}
                        >
                            {verified ? 'Verified' : 'Mark as Verified'}
                        </Button>
                    </div>
                    <Modal
                        open={confirming}
                        title="Mark this backup as verified?"
                        onClose={() => setConfirming(false)}
                    >
                        <p className="text-sm text-text-secondary">
                            This records, under your name, that you checked the backup from{' '}
                            {formatDateTime(latest.lastRun)} on the external drive. The verification is
                            permanent in the audit trail and can't be undone.
                        </p>
                        <div className="mt-5 flex flex-wrap justify-end gap-2">
                            <Button variant="neutral" data-autofocus onClick={() => setConfirming(false)}>
                                Cancel
                            </Button>
                            <Button variant="primary" loading={saving} onClick={verify}>
                                Mark as Verified
                            </Button>
                        </div>
                    </Modal>
                    {updated && !backedUp && (
                        <p
                            role="status"
                            className="rounded-md border border-success bg-success/10 px-3 py-2 text-sm font-semibold text-text-primary"
                        >
                            Verification recorded in the audit trail.
                        </p>
                    )}
                </CardBody>
            </Card>
        </div>
    )
}
