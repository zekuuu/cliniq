/**
 * DEV ONLY (panel review part 7, item 5.6): grows a saved CLINIQ mock state to about 600 students and
 * five years of visits, incidents and stock movements, in the same shape as the seed, so the screens
 * can be measured at the school's real scale. Not imported by the app, never bundled, and synthetic
 * only: every name and LRN is invented.
 *
 * Usage, in a dev build (the result is about 7 MB, too large for localStorage, so it is loaded in memory):
 *   const big = expandState({ state: window.cliniqMockDb.snapshot(), seedAuditLength: 0 })
 *   window.cliniqMockDb.load(big.state)
 * then move between screens without reloading (a reload returns to the normal seed).
 */

const FIRST = ['Aira', 'Ben', 'Carla', 'Dante', 'Ella', 'Felix', 'Gwen', 'Hugo', 'Ivy', 'Jomar', 'Kyla', 'Leo', 'Mika', 'Nico', 'Olga', 'Paolo', 'Rina', 'Sean', 'Tess', 'Vince']
const LAST = ['Abad', 'Bautista', 'Castro', 'Dizon', 'Estrada', 'Flores', 'Garcia', 'Herrera', 'Ibarra', 'Jimenez', 'Lopez', 'Mendoza', 'Navarro', 'Ocampo', 'Perez', 'Ramos', 'Santos', 'Torres', 'Uy', 'Villanueva']
const GRADES = ['Kinder', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']
const DISPOSITIONS = ['returned_to_class', 'returned_to_class', 'returned_to_class', 'returned_to_class', 'sent_home', 'resting_in_clinic', 'referred_to_hospital']

/** Deterministic, so two runs measure the same data. */
function random(seed) {
  let x = seed
  return () => {
    x = (x * 1103515245 + 12345) % 2147483648
    return x / 2147483648
  }
}

const pad = (n, width = 2) => String(n).padStart(width, '0')
const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** Every school day (Monday to Friday) from `years` before `today` up to yesterday. */
function schoolDays(today, years) {
  const end = new Date(`${today}T00:00:00`)
  const day = new Date(end)
  day.setFullYear(day.getFullYear() - years)
  const days = []
  for (; day < end; day.setDate(day.getDate() + 1)) if (day.getDay() !== 0 && day.getDay() !== 6) days.push(isoDate(day))
  return days
}

export function expandState(saved, { students = 600, years = 5, visitsPerDay = 9, incidentsPerWeek = 1, seed = 42 } = {}) {
  const next = structuredClone(saved)
  const s = next.state
  const rand = random(seed)
  const pick = (list) => list[Math.floor(rand() * list.length)]

  for (let i = s.students.length; i < students; i += 1) {
    const last = pick(LAST)
    s.students.push({
      id: `student-load-${pad(i, 4)}`,
      lrn: `9${pad(i, 11)}`,
      fullName: `${pick(FIRST)} ${last}`,
      gradeLevel: pick(GRADES),
      sex: i % 2 ? 'male' : 'female',
      birthDate: null,
      allergies: rand() < 0.08 ? ['Peanuts'] : [],
      medicalConditions: rand() < 0.06 ? ['Asthma'] : [],
      emergencyContacts: [{ name: `${pick(FIRST)} ${last}`, relationship: 'Mother', phone: `0918-${pad(i % 1000, 3)}-${pad(i, 4)}`, verified: true }],
      archived: false,
    })
  }

  const complaints = s.frontendOnly.visitComplaintTypes.map((type) => type.label)
  const incidentTypes = s.frontendOnly.incidentComplaintTypes
  const items = s.inventoryItems
  let visitN = 0
  let incidentN = 0
  let txnN = 0
  const days = schoolDays(s.today, years)
  for (const [index, date] of days.entries()) {
    const count = Math.max(0, Math.round(visitsPerDay + (rand() - 0.5) * 6))
    for (let k = 0; k < count; k += 1) {
      const student = pick(s.students)
      const minute = 450 + Math.floor(rand() * 540)
      const dateTime = `${date}T${pad(Math.floor(minute / 60))}:${pad(minute % 60)}:00+08:00`
      const id = `visit-load-${pad((visitN += 1), 6)}`
      const item = rand() < 0.3 ? pick(items) : null
      s.visits.push({
        id, studentId: student.id, dateTime, complaint: pick(complaints), treatment: '', disposition: pick(DISPOSITIONS),
        loggedByUserId: 'user-staff-01', eventTag: null,
        itemsGiven: item ? [{ itemId: item.id, itemName: item.name, unit: item.unit, quantity: 1, instructions: null }] : [],
        excuseLetterDraft: null, referredTo: null, temperatureC: null, timeOut: null, assistedBy: null, parentGuardian: null, remarks: null,
      })
      s.auditLog.push({ userId: 'user-staff-01', actionType: 'submit', targetRecord: { type: 'visit', id }, timestamp: dateTime })
      if (item)
        s.frontendOnly.inventoryTransactions.push({ id: `txn-load-${pad((txnN += 1), 6)}`, itemId: item.id, type: 'dispense', quantity: -1, timestamp: dateTime, userId: 'user-staff-01', studentId: student.id, visitId: id })
    }
    if (index % 5 === 0 && rand() < incidentsPerWeek) {
      const student = pick(s.students)
      const time = `${date}T${pad(9 + Math.floor(rand() * 7))}:${pad(Math.floor(rand() * 60))}:00+08:00`
      const id = `incident-load-${pad((incidentN += 1), 5)}`
      s.incidents.push({
        id, studentId: student.id, time, complaint: pick(incidentTypes), vitals: { treatmentNotes: 'Observed in clinic' }, hospitalReferral: null,
        parentNotifications: [{ outcome: 'reached', timestamp: time }], stage: 2, eventTag: null, itemsGiven: [],
      })
      s.auditLog.push({ userId: 'user-staff-01', actionType: 'submit', targetRecord: { type: 'incident-stage-1', id }, timestamp: time })
    }
  }
  return next
}
