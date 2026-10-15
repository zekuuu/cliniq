import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { Tabs } from './Tabs'

type V = 'a' | 'b' | 'c'

function Harness({ printAll }: { printAll?: boolean }) {
  const [value, setValue] = useState<V>('a')
  return (
    <>
      <button type="button">Before</button>
      <Tabs
        label="Views"
        value={value}
        onChange={setValue}
        printAll={printAll}
        tabs={[
          { value: 'a', label: 'Alpha', panel: <button type="button">Inside alpha</button> },
          { value: 'b', label: 'Beta', panel: <p>Beta content</p> },
          { value: 'c', label: 'Gamma', badge: <span>3</span>, panel: <p>Gamma content</p> },
        ]}
      />
    </>
  )
}

describe('Tabs', () => {
  it('renders an ARIA tablist with linked tabs and panels', () => {
    render(<Harness />)
    expect(screen.getByRole('tablist', { name: 'Views' })).toBeInTheDocument()
    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(3)
    const panels = screen.getAllByRole('tabpanel', { hidden: true })
    tabs.forEach((tab, i) => {
      expect(tab).toHaveAttribute('aria-controls', panels[i].id)
      expect(panels[i]).toHaveAttribute('aria-labelledby', tab.id)
    })
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true')
    expect(tabs[0]).toHaveAttribute('tabindex', '0')
    expect(tabs[1]).toHaveAttribute('aria-selected', 'false')
    expect(tabs[1]).toHaveAttribute('tabindex', '-1')
    // Only the selected panel is shown; the others stay mounted but hidden.
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName('Alpha')
    expect(panels[1]).not.toBeVisible()
    expect(panels[2]).toHaveTextContent('Gamma content')
    expect(tabs[2]).toHaveTextContent('Gamma3')
  })

  it('selects with a click, and marks selection by more than color', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('tab', { name: 'Beta' }))
    const beta = screen.getByRole('tab', { name: 'Beta' })
    expect(beta).toHaveAttribute('aria-selected', 'true')
    expect(beta).toHaveClass('font-semibold', 'ring-1', 'shadow-card', 'cursor-pointer')
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Beta content')
  })

  it('moves and selects with Arrow keys, Home, and End (wrapping), with roving tabindex', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const [alpha, beta, gamma] = screen.getAllByRole('tab')
    alpha.focus()
    await user.keyboard('{ArrowRight}')
    expect(beta).toHaveFocus()
    expect(beta).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{End}')
    expect(gamma).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(alpha).toHaveFocus()
    await user.keyboard('{ArrowLeft}')
    expect(gamma).toHaveFocus()
    await user.keyboard('{Home}')
    expect(alpha).toHaveFocus()
    expect(alpha).toHaveAttribute('tabindex', '0')
    expect(gamma).toHaveAttribute('tabindex', '-1')
  })

  it('takes one Tab stop, then Tab moves into the panel', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    screen.getByRole('button', { name: 'Before' }).focus()
    await user.tab()
    expect(screen.getByRole('tab', { name: 'Alpha' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Inside alpha' })).toHaveFocus()
  })

  it('marks panels and the tablist for print only with printAll', () => {
    const { unmount } = render(<Harness />)
    expect(screen.getByRole('tablist')).not.toHaveClass('print:hidden')
    expect(screen.getAllByRole('tabpanel', { hidden: true })[1]).not.toHaveAttribute(
      'data-print-all',
    )
    unmount()
    render(<Harness printAll />)
    expect(screen.getByRole('tablist')).toHaveClass('print:hidden')
    for (const panel of screen.getAllByRole('tabpanel', { hidden: true })) {
      expect(panel).toHaveAttribute('data-print-all', 'true')
    }
  })
})
