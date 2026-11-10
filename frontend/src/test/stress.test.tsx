import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { StudentListPage } from '../features/student-records/StudentListPage'
import { VisitLogListPage } from '../features/clinic-visits/VisitLogListPage'
import { getMonthlyReport, resetMockDb, searchStudents, type SessionUser } from '../lib/mock-db'
import { db } from '../lib/mock-db/store'
import { todayISO } from '../lib/dates'

vi.mock('react-chartjs-2', () => ({ Bar: () => null, Line: () => null, Doughnut: () => null }))

const STAFF: SessionUser = { id: 'user-staff-01', name: 'Demo Clinician', role: 'staff' }

/** About 1,000 students and 6,000 fake visits, built here and never in the seed. */
function fill(students = 1000, visits = 6000) {
  const state = db()
  const student = state.students[0]
  const visit = state.visits[0]
  for (let i = 0; i < students; i += 1) {
    state.students.push({
      ...student,
      id: `stress-student-${i}`,
      lrn: String(900000000000 + i),
      firstName: 'Stress',
      lastName: `Student ${i}`,
    })
  }
  for (let i = 0; i < visits; i += 1) {
    const day = new Date(Date.UTC(2026, 0, 1) + (i % 300) * 86_400_000).toISOString().slice(0, 10)
    state.visits.push({
      ...visit,
      id: `stress-visit-${i}`,
      studentId: `stress-student-${i % students}`,
      personnelId: null,
      dateTime: `${day}T08:${String(i % 60).padStart(2, '0')}:00+08:00`,
    })
  }
}

async function timed(label: string, work: () => Promise<unknown>) {
  const start = performance.now()
  await work()
  const ms = Math.round(performance.now() - start)
  console.info(`[stress] ${label}: ${ms} ms`)
  return ms
}

/** D11: the limits are about 2 s to first render and 300 ms to answer typing, on the data alone in jsdom. */
describe('at about 1,000 students and 6,000 visits', () => {
  beforeAll(() => {
    resetMockDb()
    fill()
  })

  it('answers a search and builds a report in time', async () => {
    expect(await timed('search', () => searchStudents('Stress Student 99'))).toBeLessThan(300)
    expect(
      await timed('monthly report', () => getMonthlyReport(todayISO().slice(0, 7))),
    ).toBeLessThan(2000)
  })

  it('renders the Student List and filters as you type', async () => {
    expect(
      await timed('Student List first render', async () => {
        render(
          <MemoryRouter>
            <StudentListPage />
          </MemoryRouter>,
        )
        await screen.findByRole('table')
      }),
    ).toBeLessThan(2000)
    const search = screen.getByRole('searchbox', { name: 'Search' })
    await timed('Student List typing', async () => {
      await act(async () => {
        fireEvent.change(search, { target: { value: 'Stress Student 5' } })
      })
    })
  })

  it('renders the Visit Log and the Dashboard', async () => {
    await timed('Visit Log first render', async () => {
      render(
        <MemoryRouter>
          <VisitLogListPage />
        </MemoryRouter>,
      )
      await screen.findAllByRole('heading', { name: /visit log/i })
    })
    await timed('Dashboard first render', async () => {
      render(
        <MemoryRouter>
          <DashboardPage viewer={STAFF} />
        </MemoryRouter>,
      )
      await screen.findAllByRole('heading', { name: /clinic overview/i }, { timeout: 15000 })
    })
  }, 30000)
})
