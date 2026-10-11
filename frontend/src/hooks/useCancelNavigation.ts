import { useLocation, useNavigate } from 'react-router'

/**
 * Cancel for an entry or edit form. It never saves or submits: it returns to the screen the user came
 * from, or to `fallback` when the form was the first screen opened (a bookmark or a new tab), so Cancel
 * never leaves the app.
 */
export function useCancelNavigation(fallback: string): () => void {
  const navigate = useNavigate()
  // React Router gives the first entry of a fresh history the key "default".
  const { key } = useLocation()
  return () => {
    if (key === 'default') void navigate(fallback)
    else void navigate(-1)
  }
}
