import { renderWithRouter } from '../../test/renderWithRouter'
import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { addDays, formatDateRange } from '../../lib/dates'
import { getMockToday } from '../../lib/mock-db'
import { StudentProfilePage } from './StudentProfilePage'

describe('Student Profile', () => {
  it('renders the full name for a deliberate single-student lookup', async () => {
    renderWithRouter(<StudentProfilePage />)

    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(/\w+ \w+/)
    expect(screen.getAllByText(/\d{4}-\d{5}/).length).toBeGreaterThan(0)
    expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument()
    expect(screen.getByText('Sex')).toBeInTheDocument()
    expect(screen.getByText(/Female|Male/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Medical History' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Visit History' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Incident History' })).toBeInTheDocument()
  })

  it('shows Staff actions, including print', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {})
    renderWithRouter(<StudentProfilePage />)

    expect(await screen.findByRole('link', { name: 'Edit' })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/students\/\d{4}-\d{5}\/edit$/),
    )
    screen.getByRole('button', { name: 'Print' }).click()
    expect(print).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: 'Archive' })).toBeInTheDocument()
  })

  it('removes action buttons for PE/Sports Instructor read-only view', async () => {
    renderWithRouter(<StudentProfilePage viewer={{ id: 'usr-pe', name: 'PE Instructor', role: 'instructor' }} />)

    expect(await screen.findByText(/read-only profile view/i)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Print' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Archive' })).not.toBeInTheDocument()
  })

  it("lists Staff the student's excused periods with a link to each visit", async () => {
    renderWithRouter(<StudentProfilePage studentNumber="2021-00002" />)

    expect(await screen.findByRole('heading', { name: 'Excuse Letters' })).toBeInTheDocument()
    const today = getMockToday()
    expect(
      screen.getByText(`${formatDateRange(addDays(today, -9), addDays(today, -7))} · Sent home`),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View visit' })).toHaveAttribute('href', '/visits/visit-0139')
  })

  it('keeps excuse letters off the PE/Sports Instructor view', async () => {
    renderWithRouter(
      <StudentProfilePage
        studentNumber="2021-00002"
        viewer={{ id: 'usr-pe', name: 'PE Instructor', role: 'instructor' }}
      />,
    )

    await screen.findByText(/read-only profile view/i)
    expect(screen.queryByRole('heading', { name: 'Excuse Letters' })).not.toBeInTheDocument()
  })

  it('lists a pending draft with a link to review its letter', async () => {
    renderWithRouter(<StudentProfilePage studentNumber="2021-00005" />)

    expect(await screen.findByRole('heading', { name: 'Excuse Letters' })).toBeInTheDocument()
    expect(screen.getByText('Pending approval')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Review letter' })).toHaveAttribute('href', '/visits/visit-0151/excuse-letter')
  })
})
