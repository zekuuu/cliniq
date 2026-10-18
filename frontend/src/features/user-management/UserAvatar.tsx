import { cn } from '../../lib/cn'

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return (parts.length ? [parts[0], parts.at(-1)!] : ['?']).map((part) => part[0]).join('').toUpperCase()
}

/** Decorative user avatar: the adjacent account name remains the accessible label. */
export function UserAvatar({ name, picture, className }: { name: string; picture?: string | null; className?: string }) {
  return picture ? (
    <img
      src={picture}
      alt=""
      className={cn('size-9 shrink-0 rounded-full border border-border object-cover', className)}
    />
  ) : (
    <span
      aria-hidden="true"
      className={cn('inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-xs font-bold text-text-secondary', className)}
    >
      {initials(name)}
    </span>
  )
}
