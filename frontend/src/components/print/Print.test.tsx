import { act, render, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { getRecordedAuditEntries } from '../../lib/mock-db'
import { PrintDocument } from './Print'

describe('PrintDocument', () => {
  it('writes the printed-by footer as a safe CSS string, whatever the name holds', () => {
    render(
      <PrintDocument
        title="Test"
        scope="Scope"
        viewer={{ id: 'u', name: 'Ana "Q" \\ O’Neil\n}', role: 'staff' }}
      >
        Body
      </PrintDocument>,
    )
    act(() => {
      window.dispatchEvent(new Event('beforeprint'))
    })
    const css = document.querySelector('[data-print-document] style')?.textContent ?? ''
    expect(css).toContain('by Ana \\"Q\\" \\\\ O’Neil\\A }, School Clinician')
    act(() => {
      window.dispatchEvent(new Event('afterprint'))
    })
    expect(document.querySelector('[data-print-document]')).toBeNull()
  })

  it('writes one print audit entry with the signed-in user and document title', async () => {
    render(<PrintDocument title="Student profile" scope="Scope" viewer={{ id: 'user-staff-01', name: 'Jennesse Baas', role: 'staff' }}>Body</PrintDocument>)

    act(() => {
      window.dispatchEvent(new Event('beforeprint'))
      window.dispatchEvent(new Event('beforeprint'))
    })

    await waitFor(() => expect(getRecordedAuditEntries()).toEqual([
      expect.objectContaining({
        userId: 'user-staff-01',
        actionType: 'print',
        targetRecord: { type: 'print-document', id: 'Student profile' },
      }),
    ]))
    act(() => window.dispatchEvent(new Event('afterprint')))
  })

  it('does not write an audit entry until printing starts', () => {
    render(<PrintDocument title="Student profile" scope="Scope" viewer={{ id: 'user-staff-01', name: 'Jennesse Baas', role: 'staff' }}>Body</PrintDocument>)
    expect(getRecordedAuditEntries()).toEqual([])
  })
})
