import { useState } from 'react'

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
 * icon can appear.
 */
export function LoginBackdrop() {
  const [failed, setFailed] = useState(false)
  return (
    <div
      aria-hidden="true"
      data-testid="login-backdrop"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-brand-green-dark bg-linear-to-br from-brand-green-dark to-brand-green print:hidden"
    >
      {/* Scaled past the edges so the blur doesn't fade into a fringe of the fallback at the viewport edge. */}
      {!failed && <img src={LOGIN_BACKDROP_SRC} alt="" className="size-full scale-110 object-cover blur-sm" onError={() => setFailed(true)} />}
      {/* Darkens the photo so the white card stands apart from it; the fallback gradient is already dark. */}
      {!failed && <div className="absolute inset-0 bg-brand-green-dark/45" />}
    </div>
  )
}
