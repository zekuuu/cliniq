/** The keys `components/KeyboardShortcuts.tsx` listens for, as shown in tips and `aria-keyshortcuts`. */
export const SHORTCUT_KEYS = {
  newVisit: 'Alt+N',
  newIncident: 'Alt+I',
  studentSearch: 'Alt+K',
  dashboard: 'Alt+D',
  shortcutsList: '?',
} as const

/** Window event that opens the keyboard-shortcuts list (`components/KeyboardShortcuts.tsx` listens). */
export const SHOW_SHORTCUTS_EVENT = 'cliniq:show-shortcuts'

/** Opens the shortcuts list from anywhere; the shell header's Shortcuts button uses it. */
export function showKeyboardShortcuts() {
  window.dispatchEvent(new CustomEvent(SHOW_SHORTCUTS_EVENT))
}
