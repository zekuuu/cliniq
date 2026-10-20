import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Chrome leaves a keyboard-focused element where it is when it is already partly visible (a table
// cell past a horizontal scroller's edge, a tall textarea at the fold), so its focus ring is cut
// off. Reveal it fully; `scroll-padding` on each scroller keeps room for the ring.
document.addEventListener('focusin', (event) => {
  const target = event.target
  if (target instanceof Element && target.matches(':focus-visible')) {
    target.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
