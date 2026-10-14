import { useLocation, useNavigate } from 'react-router'

/**
 * Router state a drill-through link passes (the shared `TitleLink` and `ListItemLink`, the Dashboard
 * calendar's "View visits"), so the top-level list it opens shows Back (`cliniq-back-navigation-patterns`).
 */
export const DRILL_THROUGH_STATE = { drillThrough: true } as const

/** True when this screen was opened by a drill-through link rather than the sidebar or a URL. */
export function useIsDrillThrough(): boolean {
  const state = useLocation().state as { drillThrough?: boolean } | null
  return state?.drillThrough === true
}

/**
 * Goes back to the screen the user came from, or to `fallback` when this screen was the first one
 * opened (a bookmark, a new tab, a refreshed direct link), so leaving never exits the app. Shared by
 * `BackButton` and the forms' Cancel (`useCancelNavigation`).
 */
export function useGoBack(fallback: string): () => void {
  const navigate = useNavigate()
  // React Router gives the first entry of a fresh history the key "default".
  const { key } = useLocation()
  return () => {
    if (key === 'default') void navigate(fallback)
    else void navigate(-1)
  }
}
