import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import { SHOW_SHORTCUTS_EVENT } from '../lib/shortcuts'

const SHORTCUTS = [
  ['Alt + N', 'Open New Visit'],
  ['Alt + I', 'Open Report Incident'],
  ['Alt + K', 'Open Student Search'],
  ['Alt + D', 'Open Dashboard'],
  ['Shift + Alt + N', 'Save current visit and prepare another'],
] as const

function isTypingTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null
  return element?.tagName === 'INPUT' || element?.tagName === 'TEXTAREA' || element?.isContentEditable === true
}

export function KeyboardShortcuts() {
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === '?' && !isTypingTarget(event.target)) {
        event.preventDefault()
        setOpen(true)
        return
      }
      if (event.altKey && event.key.toLowerCase() === 'n' && event.shiftKey) {
        event.preventDefault()
        if (location.pathname === '/visits/new') {
          window.dispatchEvent(new CustomEvent('cliniq:save-and-new'))
        } else {
          navigate('/visits/new')
        }
        return
      }
      if (event.altKey && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
        const key = event.key.toLowerCase()
        const destination = { n: '/visits/new', i: '/incidents/new', k: '/students?focus=search', d: '/' }[key]
        if (destination) {
          event.preventDefault()
          navigate(destination)
        }
      }
    }
    // The shell header's Shortcuts button asks for the list; it isn't a floating button any more,
    // because that covered the last rows of long tables.
    const onShow = () => setOpen(true)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener(SHOW_SHORTCUTS_EVENT, onShow)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener(SHOW_SHORTCUTS_EVENT, onShow)
    }
  }, [location.pathname, navigate])

  return (
    <>
      <Modal open={open} title="Keyboard shortcuts" onClose={() => setOpen(false)}>
        <p className="text-sm text-text-secondary">Shortcuts work anywhere in the desktop app. They never replace the visible navigation.</p>
        <dl className="mt-4 divide-y divide-border rounded-md border border-border">
          {SHORTCUTS.map(([keys, description]) => (
            <div key={keys} className="flex items-center justify-between gap-4 px-3 py-2.5 text-sm">
              <dt className="text-text-secondary">{description}</dt>
              <dd><kbd className="rounded border border-border bg-surface px-2 py-1 font-mono text-xs font-semibold text-text-primary">{keys}</kbd></dd>
            </div>
          ))}
        </dl>
        <div className="mt-4 flex justify-end">
          <Button variant="neutral" onClick={() => setOpen(false)}>Close</Button>
        </div>
      </Modal>
    </>
  )
}
