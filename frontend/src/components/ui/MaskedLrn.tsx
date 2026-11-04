import { lrnLabel, maskLrn } from '../../lib/lrn'

/** A masked LRN that screen readers announce as "LRN ending in 1234" instead of eight bullets. */
export function MaskedLrn({ lrn }: { lrn: string }) {
  return (
    // `relative` holds the screen-reader text (absolute) inside a scrolling list; without it, rows hidden in
    // the list stretched the page below the footer.
    <span className="relative">
      {/* Eight drawn dots centred on the digits (a text bullet sits at lowercase height, below them). The
          hidden copy keeps the mask one piece of text for lookups; screen readers get the label below. */}
      <span aria-hidden="true" className="whitespace-nowrap">
        <span className="hidden">{maskLrn(lrn)}</span>
        {/* One SVG for all eight dots, so they share one pixel offset and render alike. */}
        <svg data-lrn-dots width="61" height="5" viewBox="0 0 61 5" className="mr-[3px] inline-block align-[3px]">
          {Array.from({ length: 8 }, (_, index) => (<circle key={index} cx={2.5 + index * 8} cy={2.5} r={2.5} fill="currentColor" />))}
        </svg>
        {lrn.slice(-4)}
      </span>
      <span className="sr-only">{lrnLabel(lrn)}</span>
    </span>
  )
}
