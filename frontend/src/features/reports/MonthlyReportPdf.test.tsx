import { act, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetMockDb, type SessionUser } from '../../lib/mock-db'
import { todayISO } from '../../lib/dates'
import { ReportsPage } from './ReportsPage'

vi.mock('react-chartjs-2', () => {
  const Stub = (props: { 'aria-label'?: string }) => (
    <div role="img" aria-label={props['aria-label']} />
  )
  return { Bar: Stub, Line: Stub, Doughnut: Stub }
})

const STAFF: SessionUser = { id: 'user-staff-01', name: 'Jennesse Baas', role: 'staff' }

/** ADR-079: the Principal receives the Monthly Report as a PDF the clinician prints or saves. */
describe('Monthly Report as a PDF for the Principal (ADR-079)', () => {
  beforeEach(() => resetMockDb())

  it('tells Staff how to send the report to the Principal', async () => {
    render(
      <MemoryRouter>
        <ReportsPage viewer={STAFF} />
      </MemoryRouter>,
    )
    expect(
      await screen.findByText(
        'To send this to the Principal, print it or choose Save as PDF in the print window.',
      ),
    ).toBeInTheDocument()
  })

  it('names the saved file "CLINIQ Monthly Report, <Month Year>" while printing, then restores the tab title', async () => {
    render(
      <MemoryRouter>
        <ReportsPage viewer={STAFF} />
      </MemoryRouter>,
    )
    await screen.findByRole('heading', { name: 'Monthly Report' })
    document.title = 'CLINIQ — Reports'
    const month = new Date(`${todayISO().slice(0, 7)}-01T00:00:00`).toLocaleDateString('en-PH', {
      month: 'long',
      year: 'numeric',
    })
    await waitFor(() => {
      act(() => {
        window.dispatchEvent(new Event('beforeprint'))
      })
      expect(document.body.querySelector('[data-print-document]')).not.toBeNull()
    })
    expect(document.title).toBe(`CLINIQ Monthly Report, ${month}`)
    expect(document.title).toMatch(/^CLINIQ Monthly Report, [A-Z][a-z]+ \d{4}$/)
    act(() => {
      window.dispatchEvent(new Event('afterprint'))
    })
    expect(document.title).toBe('CLINIQ — Reports')
  })
})
