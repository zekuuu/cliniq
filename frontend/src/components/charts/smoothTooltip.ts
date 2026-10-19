import type { Chart, ChartType, TooltipModel } from 'chart.js'

/**
 * Chart.js `external` tooltip: a themed card that glides between points. `durationMs` sets how long
 * each glide and fade takes (reduced motion turns it off).
 */
export function smoothTooltip<TType extends ChartType>(
  {
    chart,
    tooltip,
  }: {
    chart: Chart<TType>
    tooltip: TooltipModel<TType>
  },
  durationMs = 150,
) {
  const parent = chart.canvas.parentElement
  if (!parent) return

  const tooltipClasses =
    'pointer-events-none absolute top-0 left-0 z-10 max-w-72 rounded-md border border-border bg-background px-3 py-2 text-xs text-text-primary shadow-card transition-[opacity,transform] ease-in-out motion-reduce:transition-none'
  const x = chart.canvas.offsetLeft + tooltip.caretX
  const y = chart.canvas.offsetTop + tooltip.caretY
  const transform = (offset: string, scale: string) =>
    `translate3d(${x}px, ${y}px, 0) translate(-50%, ${offset}) scale(${scale})`

  let tooltipElement = parent.querySelector<HTMLDivElement>('[data-chart-tooltip]')
  if (!tooltipElement) {
    tooltipElement = document.createElement('div')
    tooltipElement.dataset.chartTooltip = 'true'
    tooltipElement.setAttribute('aria-hidden', 'true')
    // Start hidden at the first point, so the first hover fades in there instead of flying in
    // from the card's top-left corner.
    tooltipElement.style.opacity = '0'
    tooltipElement.style.transform = transform('calc(-100% - 4px)', '0.96')
    parent.append(tooltipElement)
    void tooltipElement.offsetWidth
  }
  tooltipElement.className = tooltipClasses
  tooltipElement.style.transitionDuration = `${durationMs}ms`

  if (tooltip.opacity === 0) {
    tooltipElement.style.opacity = '0'
    tooltipElement.style.transform = transform('calc(-100% - 4px)', '0.96')
    return
  }

  const title = document.createElement('p')
  title.className = 'font-semibold'
  title.textContent = tooltip.title.join(' ')
  const body = document.createElement('p')
  body.className = 'mt-0.5 text-text-secondary'
  body.textContent = tooltip.body.flatMap((item) => item.lines).join(' · ')
  // Text from the afterLabel/afterBody callbacks (cluster notes, busiest dates), one line each.
  const extra = [
    ...tooltip.beforeBody,
    ...tooltip.body.flatMap((item) => [...item.before, ...item.after]),
    ...tooltip.afterBody,
    ...tooltip.footer,
  ]
    .filter(Boolean)
    .map((line) => {
      const p = document.createElement('p')
      p.className = 'mt-1 text-text-secondary'
      p.textContent = line
      return p
    })
  tooltipElement.replaceChildren(title, body, ...extra)
  tooltipElement.style.opacity = '1'
  tooltipElement.style.transform = transform('calc(-100% - 10px)', '1')
}
