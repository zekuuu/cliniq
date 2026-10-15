import { act, render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
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
})
