import { useState } from 'react'
import { cn } from '../../lib/cn'

/**
 * TEMPORARY / PLACEHOLDER: `frontend/public/brand/login-backdrop.jpg` currently holds a frame from a
 * campus drone video, standing in until an official photo of Mendez Christian Academy is available.
 * Swap the file, not this constant; the blur is applied here, so a new photo needs no editing. If
 * the file is ever missing, the brand-green fallback below shows.
 */
export const LOGIN_BACKDROP_SRC = '/brand/login-backdrop.jpg'

/**
 * Full-bleed Login backdrop. The brand-green gradient is always underneath, so it is what shows while
 * the photo loads and whenever the file is missing; a failed photo is removed so no broken-image
 * icon can appear. Full-viewport by default (Force Password Change); Login passes `absolute inset-0` to
 * fill only its photo region.
 */
export function LoginBackdrop({ className = 'fixed inset-0' }: { className?: string }) {
  const [failed, setFailed] = useState(false)
  return (
    <div
      aria-hidden="true"
      data-testid="login-backdrop"
      className={cn(
        'pointer-events-none -z-10 overflow-hidden bg-brand-green-dark bg-linear-to-br from-brand-green-dark to-brand-green print:hidden',
        className,
      )}
    >
      {/* Scaled past the edges so the blur doesn't fade into a fringe of the fallback at the viewport edge.
          3px keeps the building recognizable while hiding the stand-in's video softness at up to 1.5x (2560px). */}
      {!failed && <img src={LOGIN_BACKDROP_SRC} alt="" className="size-full scale-105 object-cover object-[50%_40%] blur-[3px]" onError={() => setFailed(true)} />}
      {/* Darker at the bottom, lighter at the top: depth instead of a flat tint, and the white Login panel
          and Force Password Change card still stand apart. The fallback gradient is already dark. */}
      {!failed && <div className="absolute inset-0 bg-linear-to-t from-brand-green-dark/75 via-brand-green-dark/35 via-55% to-brand-green-dark/20" />}
    </div>
  )
}
