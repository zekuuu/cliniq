import {
  BarController,
  BarElement,
  ArcElement,
  CategoryScale,
  Chart,
  Filler,
  LinearScale,
  LineController,
  LineElement,
  Legend,
  PointElement,
  Tooltip,
} from 'chart.js'

/**
 * Registers only the Chart.js pieces CLINIQ uses (tree-shaken, since bundle size matters on the 4GB
 * target). Import this module once from any file that renders a chart.
 */
Chart.register(
  BarController,
  BarElement,
  ArcElement,
  LineController,
  LineElement,
  PointElement,
  Legend,
  Filler,
  CategoryScale,
  LinearScale,
  Tooltip,
)

/** Shared defaults: no animation (Design-System.md: motion only when it aids usability). */
Chart.defaults.animation = false
Chart.defaults.font.family = getComputedStyle(document.documentElement).fontFamily || 'system-ui'
Chart.defaults.font.size = 11

export { Chart }
