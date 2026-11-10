import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Button } from '../components'
import { busyLabel } from '../components/ui/buttonClassName'
import { focusTopMessage } from '../components/forms/ErrorSummary'
import { SaveFeedback } from '../components/forms/SaveFeedback'
import { SAVE_FAILED_MESSAGE, SAVED_MESSAGE_MS, useSaveFeedback } from '../hooks/useSaveFeedback'
import { listBackupLocations, recordBackupNow, resetMockDb, saveBackupLocation, setBackupLocationEnabled } from '../lib/mock-db'
import { renderWithRouter } from '../test/renderWithRouter'
import { BackupStatusPage } from './backup/BackupStatusPage'
import { IncidentEntryPage } from './emergency-response/IncidentEntryPage'
import { ReportsPage } from './reports/ReportsPage'

/** Professor's consultation, Friday, November 6, 2026: Part 2 of the frontend changes. */

const STAFF = { id: 'user-staff-01', name: 'Demo Clinician', role: 'staff' } as const

describe('P2.1 save buttons give clear feedback', () => {
  it('reads the action\'s "-ing" form while busy, and is disabled', () => {
    expect(busyLabel('Save Visit')).toBe('Saving…')
    expect(busyLabel('Add Item')).toBe('Adding…')
    expect(busyLabel('Complete Incident')).toBe('Completing…')
    expect(busyLabel('Mark as Missed')).toBe('Marking…')
    expect(busyLabel('Cancel')).toBeNull()
    render(<Button loading>Save Changes</Button>)
    const button = screen.getByRole('button', { name: 'Saving…' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
  })

  function Harness({ action }: { action: () => Promise<unknown> }) {
    const feedback = useSaveFeedback()
    return (
      <>
        <input aria-label="Typed value" defaultValue="kept" />
        <Button loading={feedback.saving} onClick={() => void feedback.run(action, { saved: 'Saved.' })}>Save</Button>
        <SaveFeedback result={feedback.result} />
      </>
    )
  }

  afterEach(() => vi.useRealTimers())

  it('confirms a save in a status message that clears itself, and refuses a double submit', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    let finish = () => {}
    const action = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)))
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<Harness action={action} />)
    await user.click(screen.getByRole('button', { name: 'Save' }))
    const busy = screen.getByRole('button', { name: 'Saving…' })
    // A second press while saving does nothing.
    busy.click()
    expect(action).toHaveBeenCalledTimes(1)
    await act(async () => finish())
    expect(screen.getByRole('status')).toHaveTextContent('Saved.')
    act(() => vi.advanceTimersByTime(SAVED_MESSAGE_MS + 10))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('keeps a failure on screen as an alert, and the typed input', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<Harness action={() => Promise.reject(new Error('offline'))} />)
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(SAVE_FAILED_MESSAGE)
    act(() => vi.advanceTimersByTime(SAVED_MESSAGE_MS * 3))
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByLabelText('Typed value')).toHaveValue('kept')
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled()
  })

  it('a modal (Add backup location) confirms on the page once it closes', async () => {
    resetMockDb()
    const user = userEvent.setup()
    renderWithRouter(<BackupStatusPage />)
    await user.click(await screen.findByRole('button', { name: 'Add location' }))
    const dialog = screen.getByRole('dialog', { name: 'Add a backup location' })
    await user.type(within(dialog).getByLabelText(/^Label/), 'Blue USB')
    await user.click(within(dialog).getAllByRole('radio')[0])
    await user.click(within(dialog).getByRole('button', { name: 'Save location' }))
    expect(await screen.findByText('Blue USB added. Backups now go there too.')).toHaveAttribute('role', 'status')
  })
})

describe('P2.2 incident saves go straight to the result', () => {
  beforeEach(() => resetMockDb())

  it('focuses the completed message after Complete, clear of the sticky top bar', async () => {
    const user = userEvent.setup({ delay: null })
    renderWithRouter(<IncidentEntryPage incidentId="incident-0022" />)
    await screen.findByRole('heading', { name: 'Complete Incident Record' })
    await user.click(screen.getByRole('button', { name: 'Complete Incident' }))
    const done = await screen.findByText('Incident completed. Stage 2 details are now saved.')
    const top = done.parentElement!
    expect(top).toHaveFocus()
    expect(top).toHaveClass('scroll-mt-20')
    // Saved means green (Zean, November 7, 2026).
    expect(done).toHaveClass('border-success', 'bg-success/10')
    expect(done).not.toHaveClass('border-warning')
  })

  it('jumps without a smooth scroll when motion is reduced', () => {
    const element = document.createElement('div')
    element.tabIndex = -1
    document.body.append(element)
    element.scrollIntoView = vi.fn()
    focusTopMessage(element, true)
    expect(element.scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'auto' })
    focusTopMessage(element, false)
    expect(element.scrollIntoView).toHaveBeenLastCalledWith({ block: 'start', behavior: 'smooth' })
    expect(element).toHaveFocus()
    element.remove()
  })
})

describe('P2.6 no Clinic Overview printout (ADR-074)', () => {
  beforeEach(() => resetMockDb())

  it('Reports has only the four monthly reports', async () => {
    renderWithRouter(<ReportsPage viewer={STAFF} />)
    await screen.findByRole('heading', { name: 'Monthly Report' })
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['Monthly Report', 'Incident register', 'Symptom summary', 'Inventory sheet'])
  })
})

describe('P2.7 backup locations are never edited', () => {
  beforeEach(() => resetMockDb())

  it('offers no Edit control, only Add location and Disable', async () => {
    renderWithRouter(<BackupStatusPage />)
    await screen.findByRole('button', { name: 'Add location' })
    expect(screen.queryByRole('button', { name: /^Edit /i })).not.toBeInTheDocument()
    expect(screen.getByText(/To change a location, add a new one and disable the old one/)).toBeInTheDocument()
  })

  it('keeps each run\'s location names in the history after a location is disabled', async () => {
    const added = await saveBackupLocation({ label: 'Blue USB', path: 'F:\\' }, { actor: STAFF })
    await recordBackupNow(STAFF)
    await setBackupLocationEnabled(added.id, false, STAFF)
    renderWithRouter(<BackupStatusPage />)
    const history = await screen.findByRole('heading', { name: 'Recent runs' })
    expect(history.parentElement).toHaveTextContent(/to .*Blue USB/)
    expect((await listBackupLocations()).locations.find((l) => l.id === added.id)?.enabled).toBe(false)
  })
})
