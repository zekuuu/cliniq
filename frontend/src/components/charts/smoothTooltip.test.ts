import type { Chart, TooltipModel } from 'chart.js'
import { describe, expect, it } from 'vitest'
import { smoothTooltip } from './smoothTooltip'

function call(parent: HTMLElement, tooltip: Partial<TooltipModel<'bar'>>) {
  const canvas = parent.querySelector('canvas') ?? parent.appendChild(document.createElement('canvas'))
  smoothTooltip(
    {
      chart: { canvas } as unknown as Chart<'bar'>,
      tooltip: {
        caretX: 40,
        caretY: 60,
        opacity: 1,
        title: ['Monday'],
        beforeBody: [],
        body: [{ before: [], lines: ['October 2026: 4'], after: ['Possible cluster: Fever (3)'] }],
        afterBody: ['October 2026: busiest Oct 5, 2026 (2).'],
        footer: [],
        ...tooltip,
      } as TooltipModel<'bar'>,
    },
    320,
  )
  return parent.querySelector<HTMLDivElement>('[data-chart-tooltip]')!
}

describe('smoothTooltip', () => {
  it('first appears at the hovered point, not the corner, so it fades in place', () => {
    const parent = document.createElement('div')
    const tooltip = call(parent, { opacity: 0 })
    expect(tooltip.style.transform).toContain('translate3d(40px, 60px, 0)')
  })

  it('glides to the next point and keeps afterLabel and afterBody text', () => {
    const parent = document.createElement('div')
    call(parent, {})
    const tooltip = call(parent, { caretX: 90 })
    expect(tooltip.style.transform).toContain('translate3d(90px, 60px, 0)')
    expect(tooltip.style.transitionDuration).toBe('320ms')
    expect(tooltip.textContent).toContain('Possible cluster: Fever (3)')
    expect(tooltip.textContent).toContain('busiest Oct 5, 2026 (2).')
  })
})
