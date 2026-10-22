import { lrnLabel, maskLrn } from '../../lib/lrn'

/** A masked LRN that screen readers announce as "LRN ending in 1234" instead of eight bullets. */
export function MaskedLrn({ lrn }: { lrn: string }) {
  return (
    <span>
      <span aria-hidden="true">{maskLrn(lrn)}</span>
      <span className="sr-only">{lrnLabel(lrn)}</span>
    </span>
  )
}
