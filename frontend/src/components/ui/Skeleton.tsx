import type { CSSProperties } from 'react'
import { cn } from '../../lib/cn'

/**
 * Loading placeholder block (`border` gray, visible on both `background` and `surface`). Pulses
 * subtly, and stays static when reduced motion is requested. Compose these into a *shaped* skeleton
 * that mirrors the loaded layout (Design-System.md, Feedback & System States); see
 * `StatCardSkeleton` and `ListCardSkeleton`. Never use one generic block for a whole page.
 */
export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <div
      aria-hidden="true"
      data-skeleton
      style={style}
      className={cn('animate-pulse rounded-md bg-border motion-reduce:animate-none', className)}
    />
  )
}
