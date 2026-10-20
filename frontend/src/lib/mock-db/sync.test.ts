import { screen, within } from '@testing-library/react'
import { createElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithRouter } from '../../test/renderWithRouter'
import { rangeForPreset } from '../dateRange'
import { todayISO } from '../dates'
import { findVisitStudent, submitNewVisit } from '../../features/clinic-visits/api/newVisitApi'
import { fetchVisitLog, defaultVisitLogRange } from '../../features/clinic-visits/api/visitLogApi'
import { fetchDashboardSummary } from '../../features/dashboard/api/dashboardApi'
import { fetchIncidentLog } from '../../features/emergency-response/api/incidentLogApi'
import { fetchInventory } from '../../features/inventory/api/inventoryApi'
import { InventoryListPage } from '../../features/inventory/InventoryListPage'
import { fetchStudentList } from '../../features/student-records/api/studentListApi'
import { fetchStudentProfile } from '../../features/student-records/api/studentProfileApi'
import { StudentProfilePage } from '../../features/student-records/StudentProfilePage'
import { getMockSessionUser } from './session'
import type { MockDbSeed } from './types'

/**
 * SYNC BY CONSTRUCTION, demonstrated. The JSON module itself is replaced with a hand-edited copy
 * (exactly what a person editing mock-db.json does), then every screen's data source and two real
 * pages are checked. Nothing below knows the edited values except through the data layer.
 *
 * Edit 1: one student gets a new name and grade.   Edit 2: one item's stock drops below threshold.
 */
const EDITED_NAME = 'Renamed Synthetic Student'
const EDITED_GRADE = 'Grade 12'
const EDITED_ITEM = 'Mefenamic Acid 250mg'

vi.mock('./mock-db.json', async (importOriginal) => {
  const original = ((await importOriginal()) as { default: MockDbSeed }).default
  const seed = structuredClone(original)
  // The student with the most visits in the last 30 days: they appear on the most screens.
  const recent = seed.visits.filter((v) => 'daysAgo' in v.dateTime && v.dateTime.daysAgo <= 29)
  const counts = new Map<string, number>()
  for (const v of recent) counts.set(v.studentNumber, (counts.get(v.studentNumber) ?? 0) + 1)
  const [target] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
  const student = seed.students.find((s) => s.studentNumber === target)!
  student.fullName = 'Renamed Synthetic Student'
  student.gradeLevel = 'Grade 12'
  const item = seed.inventoryItems.find((i) => i.name === 'Mefenamic Acid 250mg')!
  item.currentStock = item.lowStockThreshold - 1
  return { default: seed }
})

async function editedStudent() {
  const [student] = await fetchStudentList({ search: EDITED_NAME, gradeLevel: '', includeArchived: false })
  return student
}

describe('editing mock-db.json changes every screen consistently', () => {
  it('a renamed, regraded student shows the new values on every screen that displays them', async () => {
    const student = await editedStudent()
    expect(student).toMatchObject({ fullName: EDITED_NAME, gradeLevel: EDITED_GRADE })

    // Student List: found by the new name and filtered under the new grade.
    const grade12 = await fetchStudentList({ search: '', gradeLevel: EDITED_GRADE, includeArchived: false })
    expect(grade12.map((s) => s.studentNumber)).toContain(student.studentNumber)

    // Student Profile + its visit history.
    const profile = await fetchStudentProfile(student.studentNumber)
    expect(profile.student).toMatchObject({ fullName: EDITED_NAME, gradeLevel: EDITED_GRADE })
    expect(profile.visits.length).toBeGreaterThan(0)

    // Visit Log List: every row for this student carries the new grade (and never the name).
    const visitRows = (await fetchVisitLog({ ...defaultVisitLogRange(), search: student.studentNumber, disposition: 'all' }))
    expect(visitRows.length).toBeGreaterThan(0)
    expect(new Set(visitRows.map((r) => r.gradeLevel))).toEqual(new Set([EDITED_GRADE]))
    expect(JSON.stringify(visitRows)).not.toContain(EDITED_NAME)

    // Incident Log List: same rule for any incidents this student has.
    const incidentRows = await fetchIncidentLog({ from: '2000-01-01', to: todayISO(), search: student.studentNumber, completion: 'all' })
    for (const row of incidentRows) expect(row.gradeLevel).toBe(EDITED_GRADE)

    // New Visit Entry: the picked student is loaded with the edited name.
    expect((await findVisitStudent(student.studentNumber)).fullName).toBe(EDITED_NAME)

    // Dashboard: they're a frequent visitor, shown by Student Number only (ADR-004).
    const dash = await fetchDashboardSummary({ range: rangeForPreset('last30', todayISO()) })
    expect(dash.frequentVisitors.map((f) => f.student.studentNumber)).toContain(student.studentNumber)
    expect(JSON.stringify(dash)).not.toContain(EDITED_NAME)
  })

  it('renders the edited student on the real Student Profile page', async () => {
    const student = await editedStudent()
    renderWithRouter(createElement(StudentProfilePage, { studentNumber: student.studentNumber }))
    expect(await screen.findByRole('heading', { name: EDITED_NAME })).toBeInTheDocument()
    expect(screen.getAllByText(new RegExp(EDITED_GRADE)).length).toBeGreaterThan(0)
  })

  it('an item pushed below its threshold is flagged on Inventory and counted on the Dashboard', async () => {
    const [item] = await fetchInventory({ search: EDITED_ITEM, category: '' })
    expect(item.currentStock).toBeLessThan(item.lowStockThreshold)
    expect(item.flags).toContain('low_stock')

    const dash = await fetchDashboardSummary({ range: rangeForPreset('last30', todayISO()) })
    const alert = dash.inventoryAlerts.find((a) => a.item.name === EDITED_ITEM)
    expect(alert?.flags).toContain('low_stock')
    const lowStockItems = (await fetchInventory({ search: '', category: '' })).filter((i) => i.flags.includes('low_stock'))
    expect(dash.counts.lowStockItems).toBe(lowStockItems.length)

    renderWithRouter(createElement(InventoryListPage))
    const row = await screen.findByRole('row', { name: new RegExp(EDITED_ITEM) })
    expect(within(row).getByText('Low stock')).toBeInTheDocument()
  })
})

describe('writing through the layer updates every screen together', () => {
  it('a new visit moves the Dashboard counts and the student history in one step', async () => {
    const student = await editedStudent()
    const query = { range: rangeForPreset('today', todayISO()) }
    const before = await fetchDashboardSummary(query)
    const historyBefore = await fetchStudentProfile(student.studentNumber)
    const logBefore = await fetchVisitLog({ from: todayISO(), to: todayISO(), search: '', disposition: 'all' })

    const { visit, followUp } = await submitNewVisit(
      {
        studentId: student.id,
        complaint: 'Headache',
        treatment: 'Rested in clinic',
        disposition: 'returned_to_class',
        triageStepsCompleted: [],
        followUp: { followUpDate: todayISO(), reason: 'Recheck after lunch', notes: null },
      },
      getMockSessionUser(),
    )

    const after = await fetchDashboardSummary(query)
    expect(after.counts.visits).toBe(before.counts.visits + 1)
    expect(after.dueFollowUps.map((row) => row.followUp.id)).toContain(followUp!.id)
    expect(after.dueFollowUps.find((row) => row.followUp.id === followUp!.id)?.dueState).toBe('due_today')

    const historyAfter = await fetchStudentProfile(student.studentNumber)
    expect(historyAfter.visits[0].id).toBe(visit.id)
    expect(historyAfter.visits.map((v) => v.id)).not.toEqual(historyBefore.visits.map((v) => v.id))

    const logAfter = await fetchVisitLog({ from: todayISO(), to: todayISO(), search: '', disposition: 'all' })
    expect(logAfter.length).toBe(logBefore.length + 1)
    expect(logAfter.find((row) => row.id === visit.id)?.studentNumber).toBe(student.studentNumber)
  })
})
