import { lrnLabel, maskLrn } from '../../lib/lrn'

/**
 * The one way CLINIQ shows an LRN (professor's consultation, November 6, 2026: it looked different on two
 * screens). Masked on lists, pickers and multi-student printouts; `full` on single-student screens and
 * printouts (ADR-040, ADR-044). Full is the 12 digits with no separators, in tabular figures, never
 * wrapped. `lrn-render.test.ts` fails if a screen renders an LRN any other way.
 */
export function Lrn({ lrn, full = false }: { lrn: string; full?: boolean }) {
  if (full)
    return (
      <span data-lrn="full" className="whitespace-nowrap tabular-nums">
        {lrn}
      </span>
    )
  return (
    // `relative` holds the screen-reader text (absolute) inside a scrolling list; without it, rows hidden in
    // the list stretched the page below the footer.
    <span data-lrn="masked" className="relative">
      {/* Eight drawn dots centred on the digits (a text bullet sits at lowercase height, below them). The
          hidden copy keeps the mask one piece of text for lookups; screen readers get the label below. */}
      <span aria-hidden="true" className="whitespace-nowrap tabular-nums">
        <span className="hidden">{maskLrn(lrn)}</span>
        {/* One SVG for all eight dots, so they share one pixel offset and render alike. */}
        <svg
          data-lrn-dots
          width="61"
          height="5"
          viewBox="0 0 61 5"
          className="mr-[3px] inline-block align-[3px]"
        >
          {Array.from({ length: 8 }, (_, index) => (
            <circle key={index} cx={2.5 + index * 8} cy={2.5} r={2.5} fill="currentColor" />
          ))}
        </svg>
        {lrn.slice(-4)}
      </span>
      <span className="sr-only">{lrnLabel(lrn)}</span>
    </span>
  )
}

/** A masked LRN that screen readers announce as "LRN ending in 1234" instead of eight bullets. */
export function MaskedLrn({ lrn }: { lrn: string }) {
  return <Lrn lrn={lrn} />
}
