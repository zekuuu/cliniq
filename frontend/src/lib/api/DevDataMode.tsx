import { API_MODULES, apiMode, globalApiMode, modeProblems } from './mode'

/**
 * Development only (ADR-080): a small line showing each module's data source, and a banner when a
 * per-module combination cannot work. Production builds and tests render nothing.
 */
export function DevDataMode() {
  if (!import.meta.env.DEV || import.meta.env.MODE === 'test') return null
  const problems = modeProblems()
  const global = globalApiMode()
  const apiCount = API_MODULES.filter((module) => apiMode(module) === 'api').length
  const summary = global
    ? `Data: ${global} (all)`
    : `Data: ${apiCount} api, ${API_MODULES.length - apiCount} mock`
  return (
    <>
      {problems.length > 0 && (
        <div
          role="alert"
          className="fixed inset-x-0 top-0 z-[100] border-b border-error bg-error-fill px-4 py-2 text-sm text-error-text"
        >
          <strong>Data mode cannot work:</strong>{' '}
          {problems
            .map((p) => `${p.module} is on the API but needs ${p.needs} on the API too`)
            .join('; ')}
          . Set <code>VITE_API_MODE_{problems[0].needs}=api</code> or use <code>VITE_API_MODE</code>
          .
        </div>
      )}
      <details className="fixed right-2 bottom-2 z-[100] rounded border border-border bg-background px-2 py-1 text-xs text-text-secondary print:hidden">
        <summary className="cursor-pointer">{summary}</summary>
        <ul className="mt-1">
          {API_MODULES.map((module) => (
            <li key={module}>
              {module}: {apiMode(module)}
            </li>
          ))}
        </ul>
      </details>
    </>
  )
}
