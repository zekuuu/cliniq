import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { apiMode, logModes } from './lib/api/mode'
import { bootstrapApiSession } from './lib/api/http/auth'

logModes()

// Chrome leaves a keyboard-focused element where it is when it is already partly visible (a table
// cell past a horizontal scroller's edge, a tall textarea at the fold), so its focus ring is cut
// off. Reveal it fully; `scroll-padding` on each scroller keeps room for the ring.
document.addEventListener('focusin', (event) => {
  const target = event.target
  if (target instanceof Element && target.matches(':focus-visible')) {
    target.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
  }
})

// API mode: restore the session from the server's cookie before the first screen (ADR-080). A
// server that does not answer leaves nobody signed in; Login then says it cannot reach it.
const ready = apiMode('AUTH') === 'api' ? bootstrapApiSession().catch(() => undefined) : null

void Promise.resolve(ready).then(() =>
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  ),
)
