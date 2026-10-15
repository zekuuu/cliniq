import { fireEvent, render, screen } from '@testing-library/react'
import { useLocation } from 'react-router'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { KeyboardShortcuts } from './KeyboardShortcuts'

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="location">{location.pathname}{location.search}</output>
}

function renderShortcuts(initialEntry = '/') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <KeyboardShortcuts />
      <LocationProbe />
      <Routes><Route path="*" element={null} /></Routes>
    </MemoryRouter>,
  )
}

describe('KeyboardShortcuts', () => {
  it('shows discoverable help and navigates with desktop accelerators', () => {
    renderShortcuts()

    fireEvent.keyDown(window, { key: '?' })
    expect(screen.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'n', altKey: true })
    expect(screen.getByTestId('location')).toHaveTextContent('/visits/new')

    fireEvent.keyDown(window, { key: 'i', altKey: true })
    expect(screen.getByTestId('location')).toHaveTextContent('/incidents/new')
  })

  it('dispatches save-and-new only from the visit form', () => {
    const listener = vi.fn()
    window.addEventListener('cliniq:save-and-new', listener)
    renderShortcuts('/visits/new')

    fireEvent.keyDown(window, { key: 'N', altKey: true, shiftKey: true })

    expect(listener).toHaveBeenCalledTimes(1)
    window.removeEventListener('cliniq:save-and-new', listener)
  })
})
