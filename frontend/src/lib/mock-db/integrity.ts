import { isRelativeDate, isRelativeDateTime } from './relativeDates'
import type { MockDbSeed } from './types'

/**
 * Integrity rules for `mock-db.json`. Returns one readable message per problem (empty = healthy).
 * Run by `integrity.test.ts`, and by the store on load so a bad hand-edit fails loudly.
 *
 * Checks: exact field sets per record (catches typos AND stored derived values), readable unique
 * ids, LRN format/uniqueness (ADR-028), every cross-record reference, enum values, and
 * relative-date syntax. No validation library on purpose (ADR-014): plain functions + Vitest.
 */

/** The LRN: exactly 12 digits, kept as text (ADR-028). */
export const LRN_PATTERN = /^\d{12}$/

/** Longest calendar event title, so a chip stays readable (ADR-019). */
export const CALENDAR_EVENT_TITLE_MAX = 60

const FIELDS = {
  top: ['meta', 'config', 'users', 'students', 'visits', 'incidents', 'followUps', 'inventoryItems', 'reports', 'backupLogs', 'auditLog', 'frontendOnly'],
  config: ['_note', 'frequentVisitorMinVisits', 'frequentVisitorWindowDays', 'upcomingFollowUpDays', 'expiryWarningDays', 'clusterMinCount', 'clusterRatio', 'topComplaints', 'percentMinPriorCount', 'staleBackupHours', 'vitalsWarningRanges'],
  users: ['id', 'name', 'username', 'role', 'lastLogin', 'profilePicture', 'deactivatedAt'],
  students: ['id', 'lrn', 'fullName', 'gradeLevel', 'contactInfo', 'allergies', 'medicalConditions', 'emergencyContacts', 'archived', 'sex'],
  emergencyContact: ['name', 'relationship', 'phone', 'verified'],
  visits: ['id', 'studentId', 'dateTime', 'complaint', 'treatment', 'disposition', 'loggedByUserId', 'eventTag', 'itemsGiven', 'excuseLetterDraft', 'referredTo', 'temperatureC', 'timeOut', 'assistedBy', 'parentGuardian', 'remarks'],
  excuseLetterDraft: ['excusedFrom', 'excusedUntil', 'note'],
  itemGivenLine: ['itemId', 'itemName', 'unit', 'quantity', 'instructions'],
  incidents: ['id', 'studentId', 'time', 'complaint', 'vitals', 'hospitalReferral', 'parentNotifications', 'stage', 'eventTag', 'itemsGiven'],
  hospitalReferral: ['destination', 'transportMode', 'departureTime'],
  parentNotification: ['outcome', 'timestamp'],
  followUps: ['id', 'studentId', 'relatedRecord', 'followUpDate', 'reason', 'status', 'notes', 'createdByUserId'],
  inventoryItems: ['id', 'name', 'category', 'currentStock', 'unit', 'expirationDate', 'lowStockThreshold'],
  reports: ['type', 'dateRange'],
  backupLogs: ['lastRun', 'fileSizeBytes', 'status', 'verifiedByUserId'],
  auditLog: ['userId', 'actionType', 'targetRecord', 'timestamp'],
  frontendOnly: ['_note', 'devAccounts', 'visitComplaintTypes', 'incidentComplaintTypes', 'inventoryTransactions', 'recordReviews', 'excuseLetterApprovals', 'peReferrals', 'issueReports', 'calendarEvents', 'sportsReports'],
} as const

/**
 * Values a selector computes. Named here so the failure message says *why* the field is rejected,
 * not just that it's unexpected.
 */
const DERIVED_FIELDS = new Set([
  'recordComplete', 'missingFields', 'incomplete', 'isIncomplete',
  'visitCount', 'visitsCount', 'isFrequentVisitor', 'frequentVisitor',
  'dueState', 'isOverdue', 'overdue', 'isDueToday', 'isUpcoming', 'daysFromToday',
  'flags', 'isLowStock', 'lowStock', 'nearingExpiration', 'isExpired', 'expired', 'daysUntilExpiry', 'belowZero',
  'total', 'totals', 'count', 'counts', 'data', 'needsVerification', 'backupStatus',
])

const ENUMS = {
  role: ['staff', 'admin'],
  disposition: ['returned_to_class', 'sent_home', 'referred_to_hospital', 'resting_in_clinic'],
  stage: [1, 2],
  followUpStatus: ['pending', 'completed', 'missed', 'cancelled'],
  relatedType: ['visit', 'incident'],
  category: ['medicine', 'supply'],
  reportType: ['monthly', 'incident', 'health_summary'],
  backupStatus: ['ok', 'failed'],
  actionType: ['login', 'logout', 'submit', 'approve', 'create', 'update', 'delete', 'archive', 'print'],
  outcome: ['reached', 'no_answer', 'left_message_or_voicemail', 'wrong_number'],
  sex: ['male', 'female'],
  transactionType: ['dispense', 'restock', 'adjustment'],
  adjustmentReason: ['visit_edited', 'expired_disposed', 'damaged_spilled', 'miscount_correction', 'other'],
} as const

const ID_PATTERNS: Record<string, RegExp> = {
  users: /^user-(staff|admin)-\d{2}$/,
  students: /^student-\d{4}$/,
  visits: /^visit-\d{4}$/,
  incidents: /^incident-\d{4}$/,
  followUps: /^followup-\d{4}$/,
  inventoryItems: /^item-\d{4}$/,
}

type Rec = Record<string, unknown>

export function checkSeedIntegrity(seed: MockDbSeed): string[] {
  const problems: string[] = []
  const fail = (message: string) => problems.push(message)
  const s = seed as unknown as Rec

  const checkFields = (where: string, record: unknown, allowed: readonly string[], optional: readonly string[] = []) => {
    if (!record || typeof record !== 'object') return fail(`${where}: expected an object`)
    const keys = Object.keys(record)
    for (const key of keys) {
      if (DERIVED_FIELDS.has(key))
        fail(`${where}: "${key}" is a derived value. Selectors compute it; don't store it in the JSON.`)
      else if (!allowed.includes(key) && !optional.includes(key)) fail(`${where}: unexpected field "${key}"`)
    }
    for (const key of allowed)
      if (!key.startsWith('_') && !optional.includes(key) && !keys.includes(key))
        fail(`${where}: missing field "${key}"`)
  }
  const oneOf = (where: string, value: unknown, allowed: readonly unknown[]) => {
    if (!allowed.includes(value)) fail(`${where}: "${String(value)}" is not one of ${allowed.join(', ')}`)
  }
  const relDate = (where: string, value: unknown, nullable = false) => {
    if (nullable && value === null) return
    if (!isRelativeDate(value) || 'time' in (value as object))
      fail(`${where}: expected {"daysAgo": n} or {"daysFromNow": n}`)
  }
  const relDateTime = (where: string, value: unknown, nullable = false) => {
    if (nullable && value === null) return
    if (!isRelativeDateTime(value)) fail(`${where}: expected {"daysAgo"|"daysFromNow": n, "time": "HH:MM"}`)
  }
  // Signed day offset of a relative date (NaN when malformed, so comparisons simply fail to match).
  const relDays = (value: unknown) => {
    const r = (value ?? {}) as Rec
    return 'daysFromNow' in r ? Number(r.daysFromNow) : -Number(r.daysAgo)
  }
  const list = (key: string): Rec[] => (Array.isArray(s[key]) ? (s[key] as Rec[]) : [])

  checkFields('top level', s, FIELDS.top)
  checkFields('config', s.config, FIELDS.config)
  for (const [key, value] of Object.entries((s.config ?? {}) as Rec)) {
    if (key === 'vitalsWarningRanges') {
      checkFields('config.vitalsWarningRanges', value, ['_note', 'temperatureC', 'pulseBpm', 'oxygenSaturationPct', 'feverFromC'])
      const fever = ((value ?? {}) as Rec).feverFromC
      if (!(typeof fever === 'number' && fever > 0)) fail('config.vitalsWarningRanges.feverFromC: must be a positive number')
      for (const vital of ['temperatureC', 'pulseBpm', 'oxygenSaturationPct']) {
        const range = ((value ?? {}) as Rec)[vital] as Rec | null | undefined
        // The oximeter has no range until the clinician gives one.
        if (vital === 'oxygenSaturationPct' && range === null) continue
        const { min, max } = range ?? {}
        if (!(typeof min === 'number' && typeof max === 'number' && min > 0 && min < max))
          fail(`config.vitalsWarningRanges.${vital}: needs positive numbers with min < max`)
      }
    } else if (!key.startsWith('_') && !(typeof value === 'number' && value > 0)) fail(`config.${key}: must be a positive number`)
  }
  if (!/synthetic/i.test(String((s.meta as Rec | undefined)?.notice ?? '')))
    fail('meta.notice: must state that the data is synthetic (RA 10173; public repository)')

  // Unique, readable ids.
  const ids: Record<string, Set<string>> = {}
  for (const [collection, pattern] of Object.entries(ID_PATTERNS)) {
    ids[collection] = new Set()
    for (const record of list(collection)) {
      const id = String(record.id)
      if (!pattern.test(id)) fail(`${collection}: id "${id}" doesn't match ${pattern}`)
      if (ids[collection].has(id)) fail(`${collection}: duplicate id "${id}"`)
      ids[collection].add(id)
    }
  }
  const userRole = new Map(list('users').map((u) => [String(u.id), u.role]))
  const userRef = (where: string, id: unknown, nullable = false) => {
    if (nullable && id === null) return
    if (!userRole.has(String(id))) fail(`${where}: user "${String(id)}" doesn't exist`)
  }

  // Users.
  list('users').forEach((u, i) => {
    const w = `users[${i}] (${String(u.id)})`
    checkFields(w, u, FIELDS.users, ['profilePicture', 'deactivatedAt'])
    oneOf(`${w}.role`, u.role, ENUMS.role)
    relDateTime(`${w}.lastLogin`, u.lastLogin, true)
  })
  for (const role of ENUMS.role)
    if (![...userRole.values()].includes(role)) fail(`users: need at least one "${role}" account`)
  const usernames = list('users').map((u) => u.username)
  if (new Set(usernames).size !== usernames.length) fail('users: duplicate username')

  // Students.
  const studentIds = new Set<string>()
  const lrns = new Set<string>()
  list('students').forEach((st, i) => {
    const w = `students[${i}] (${String(st.id)})`
    // Pre-Part 3B seed exports omit Sex; `resolveSeed` supplies a clearly synthetic migration value.
    checkFields(w, st, FIELDS.students, ['sex'])
    const lrn = String(st.lrn)
    if (!LRN_PATTERN.test(lrn)) fail(`${w}.lrn: "${lrn}" isn't 12 digits (ADR-028)`)
    if (lrns.has(lrn)) fail(`${w}.lrn: duplicate "${lrn}"`)
    lrns.add(lrn)
    studentIds.add(String(st.id))
    if (!Array.isArray(st.allergies) || !Array.isArray(st.medicalConditions))
      fail(`${w}: allergies and medicalConditions must be arrays`)
    if (!Array.isArray(st.emergencyContacts)) fail(`${w}.emergencyContacts: must be an array`)
    else st.emergencyContacts.forEach((contact, contactIndex) => checkFields(`${w}.emergencyContacts[${contactIndex}]`, contact, FIELDS.emergencyContact))
    if (typeof st.archived !== 'boolean') fail(`${w}.archived: must be true or false`)
    if (st.sex !== undefined) oneOf(`${w}.sex`, st.sex, ENUMS.sex)
  })
  const studentRef = (where: string, id: unknown, nullable = false) => {
    if (nullable && id === null) return
    if (!studentIds.has(String(id))) fail(`${where}: student "${String(id)}" doesn't exist`)
  }

  // Complaint vocabularies (frontendOnly) that visit/incident complaints must come from.
  const fo = (s.frontendOnly ?? {}) as Rec
  const visitComplaints = new Set(((fo.visitComplaintTypes ?? []) as Rec[]).map((c) => String(c.label)))
  const incidentComplaints = new Set((fo.incidentComplaintTypes ?? []) as string[])

  /** "recordId|itemId" -> quantity on a visit's or incident's line; checked against the transactions below. */
  const givenOnRecord = new Map<string, number>()
  /** Medicine lines (ADR-018), the same rules on visits and incidents. Returns how many there are. */
  const checkLines = (w: string, record: Rec): number => {
    if (!Array.isArray(record.itemsGiven)) {
      fail(`${w}.itemsGiven: must be an array`)
      return 0
    }
    const lines = record.itemsGiven as Rec[]
    const lineItems = new Set<string>()
    lines.forEach((line, k) => {
      const lw = `${w}.itemsGiven[${k}]`
      checkFields(lw, line, FIELDS.itemGivenLine)
      if (!ids.inventoryItems?.has(String(line.itemId))) fail(`${lw}.itemId: "${String(line.itemId)}" doesn't exist`)
      if (lineItems.has(String(line.itemId))) fail(`${lw}.itemId: "${String(line.itemId)}" is already on another line`)
      lineItems.add(String(line.itemId))
      if (!Number.isInteger(line.quantity) || (line.quantity as number) < 1) fail(`${lw}.quantity: must be a whole number ≥ 1`)
      if (!String(line.itemName ?? '').trim() || !String(line.unit ?? '').trim()) fail(`${lw}: itemName and unit snapshots must not be empty`)
      if (line.instructions !== null && (typeof line.instructions !== 'string' || line.instructions.length > 120))
        fail(`${lw}.instructions: must be null or text of at most 120 characters`)
      givenOnRecord.set(`${String(record.id)}|${String(line.itemId)}`, Number(line.quantity))
    })
    return lines.length
  }

  // Visits.
  const visitStudent = new Map<string, string>()
  const draftVisits = new Set<string>()
  list('visits').forEach((v, i) => {
    const w = `visits[${i}] (${String(v.id)})`
    checkFields(w, v, FIELDS.visits)
    studentRef(`${w}.studentId`, v.studentId)
    relDateTime(`${w}.dateTime`, v.dateTime)
    oneOf(`${w}.disposition`, v.disposition, ENUMS.disposition)
    userRef(`${w}.loggedByUserId`, v.loggedByUserId)
    if (userRole.has(String(v.loggedByUserId)) && userRole.get(String(v.loggedByUserId)) !== 'staff')
      fail(`${w}.loggedByUserId: only Staff log visits`)
    if (!visitComplaints.has(String(v.complaint))) fail(`${w}.complaint: "${String(v.complaint)}" isn't in frontendOnly.visitComplaintTypes`)
    visitStudent.set(String(v.id), String(v.studentId))
    if (v.excuseLetterDraft !== null) draftVisits.add(String(v.id))
    // Treatment notes and items given are both optional (a visit may record no treatment).
    checkLines(w, v)
    if (typeof v.treatment !== 'string') fail(`${w}.treatment: must be text (empty is allowed)`)
    const draft = v.excuseLetterDraft as Rec | null
    if (draft !== null) {
      if (v.disposition === 'returned_to_class') fail(`${w}.excuseLetterDraft: only a Sent home or Referred visit has an excuse-letter draft`)
      checkFields(`${w}.excuseLetterDraft`, draft, FIELDS.excuseLetterDraft)
      relDate(`${w}.excuseLetterDraft.excusedFrom`, draft?.excusedFrom)
      relDate(`${w}.excuseLetterDraft.excusedUntil`, draft?.excusedUntil)
      if (relDays(draft?.excusedUntil) < relDays(draft?.excusedFrom)) fail(`${w}.excuseLetterDraft.excusedUntil: can't be before excusedFrom`)
      if (draft?.note !== null && typeof draft?.note !== 'string') fail(`${w}.excuseLetterDraft.note: must be null or text`)
    }
    if (v.referredTo !== null) {
      if (v.disposition !== 'referred_to_hospital') fail(`${w}.referredTo: only a Referred to hospital visit has one`)
      if (typeof v.referredTo !== 'string' || !v.referredTo.trim()) fail(`${w}.referredTo: must be null or non-empty text`)
    }
    // The optional logbook fields.
    if (v.temperatureC !== null && typeof v.temperatureC !== 'number') fail(`${w}.temperatureC: must be null or a number`)
    if (v.timeOut !== null && !(typeof v.timeOut === 'string' && /^\d{2}:\d{2}$/.test(v.timeOut) && v.timeOut >= String((v.dateTime as Rec | null)?.time)))
      fail(`${w}.timeOut: must be null or "HH:MM", not earlier than the visit's time`)
    for (const key of ['assistedBy', 'parentGuardian', 'remarks'])
      if (v[key] !== null && (typeof v[key] !== 'string' || !String(v[key]).trim())) fail(`${w}.${key}: must be null or non-empty text`)
  })

  // Incidents.
  const incidentStudent = new Map<string, string>()
  list('incidents').forEach((inc, i) => {
    const w = `incidents[${i}] (${String(inc.id)})`
    checkFields(w, inc, FIELDS.incidents)
    studentRef(`${w}.studentId`, inc.studentId)
    relDateTime(`${w}.time`, inc.time)
    oneOf(`${w}.stage`, inc.stage, ENUMS.stage)
    if (!incidentComplaints.has(String(inc.complaint))) fail(`${w}.complaint: "${String(inc.complaint)}" isn't in frontendOnly.incidentComplaintTypes`)
    if (!inc.vitals || typeof inc.vitals !== 'object') fail(`${w}.vitals: must be an object`)
    else
      for (const [key, value] of Object.entries(inc.vitals as Rec)) {
        if (DERIVED_FIELDS.has(key)) fail(`${w}.vitals.${key}: "${key}" is a derived value`)
        if (typeof value !== 'string' && typeof value !== 'number') fail(`${w}.vitals.${key}: must be text or a number`)
      }
    if (inc.hospitalReferral !== null) {
      checkFields(`${w}.hospitalReferral`, inc.hospitalReferral, FIELDS.hospitalReferral)
      relDateTime(`${w}.hospitalReferral.departureTime`, (inc.hospitalReferral as Rec)?.departureTime)
    }
    ;((inc.parentNotifications ?? []) as Rec[]).forEach((n, k) => {
      checkFields(`${w}.parentNotifications[${k}]`, n, FIELDS.parentNotification)
      oneOf(`${w}.parentNotifications[${k}].outcome`, n.outcome, ENUMS.outcome)
      relDateTime(`${w}.parentNotifications[${k}].timestamp`, n.timestamp)
    })
    incidentStudent.set(String(inc.id), String(inc.studentId))
    if (checkLines(w, inc) && inc.stage === 1) fail(`${w}.itemsGiven: Stage 1 stays fast; medicines are recorded at Stage 2`)
  })

  // Follow-ups: must point at a real visit/incident belonging to the same student.
  list('followUps').forEach((f, i) => {
    const w = `followUps[${i}] (${String(f.id)})`
    checkFields(w, f, FIELDS.followUps)
    studentRef(`${w}.studentId`, f.studentId)
    relDate(`${w}.followUpDate`, f.followUpDate)
    oneOf(`${w}.status`, f.status, ENUMS.followUpStatus)
    userRef(`${w}.createdByUserId`, f.createdByUserId)
    const related = (f.relatedRecord ?? {}) as Rec
    checkFields(`${w}.relatedRecord`, related, ['type', 'id'])
    oneOf(`${w}.relatedRecord.type`, related.type, ENUMS.relatedType)
    const owners = related.type === 'incident' ? incidentStudent : visitStudent
    const owner = owners.get(String(related.id))
    if (!owner) fail(`${w}.relatedRecord: ${String(related.type)} "${String(related.id)}" doesn't exist`)
    else if (owner !== f.studentId)
      fail(`${w}: student ${String(f.studentId)} doesn't match its ${String(related.type)}'s student ${owner}`)
  })

  // Inventory.
  list('inventoryItems').forEach((item, i) => {
    const w = `inventoryItems[${i}] (${String(item.id)})`
    checkFields(w, item, FIELDS.inventoryItems)
    oneOf(`${w}.category`, item.category, ENUMS.category)
    if (!Number.isInteger(item.currentStock)) fail(`${w}.currentStock: must be a whole number`)
    // Below zero happens only at runtime, through the warn-only dispense path (Module 8).
    else if ((item.currentStock as number) < 0) fail(`${w}.currentStock: the seed can't start below 0`)
    if (!Number.isInteger(item.lowStockThreshold) || (item.lowStockThreshold as number) < 0)
      fail(`${w}.lowStockThreshold: must be a whole number ≥ 0`)
    relDate(`${w}.expirationDate`, item.expirationDate, true)
  })

  list('reports').forEach((r, i) => {
    checkFields(`reports[${i}]`, r, FIELDS.reports)
    oneOf(`reports[${i}].type`, r.type, ENUMS.reportType)
    relDate(`reports[${i}].dateRange.from`, (r.dateRange as Rec | undefined)?.from)
    relDate(`reports[${i}].dateRange.to`, (r.dateRange as Rec | undefined)?.to)
  })

  list('backupLogs').forEach((b, i) => {
    const w = `backupLogs[${i}]`
    checkFields(w, b, FIELDS.backupLogs)
    relDateTime(`${w}.lastRun`, b.lastRun)
    oneOf(`${w}.status`, b.status, ENUMS.backupStatus)
    userRef(`${w}.verifiedByUserId`, b.verifiedByUserId, true)
  })

  list('auditLog').forEach((a, i) => {
    const w = `auditLog[${i}]`
    checkFields(w, a, FIELDS.auditLog, ['summary'])
    if (a.summary !== undefined && (typeof a.summary !== 'string' || !a.summary.trim())) fail(`${w}.summary: expected a non-empty string when present`)
    userRef(`${w}.userId`, a.userId)
    oneOf(`${w}.actionType`, a.actionType, ENUMS.actionType)
    relDateTime(`${w}.timestamp`, a.timestamp)
  })

  // frontendOnly (mock-only data; still referentially sound).
  checkFields('frontendOnly', fo, FIELDS.frontendOnly)
  const accounts = (fo.devAccounts ?? []) as Rec[]
  accounts.forEach((d, i) => userRef(`frontendOnly.devAccounts[${i}].userId`, d.userId))
  if (!accounts.some((d) => d.mustChangePassword === true))
    fail('frontendOnly.devAccounts: need one account with mustChangePassword: true (Force Password Change, #2)')
  if (accounts.some((d) => !/^(?:dev-only-|demo-)/i.test(String(d.password))))
    fail('frontendOnly.devAccounts: passwords must be obviously fake (start with "dev-only-" or "demo-")')
  /** Net amount given per "visitId|itemId": dispensed minus returned by `visit_edited` adjustments. */
  const netGiven = new Map<string, number>()
  const txnIds = new Set<string>()
  ;((fo.inventoryTransactions ?? []) as Rec[]).forEach((t, i) => {
    const w = `frontendOnly.inventoryTransactions[${i}] (${String(t.id)})`
    if (!/^txn-\d{4}$/.test(String(t.id))) fail(`${w}.id: doesn't match /^txn-\\d{4}$/`)
    if (txnIds.has(String(t.id))) fail(`${w}.id: duplicate`)
    txnIds.add(String(t.id))
    if (!ids.inventoryItems?.has(String(t.itemId))) fail(`${w}.itemId: "${String(t.itemId)}" doesn't exist`)
    oneOf(`${w}.type`, t.type, ENUMS.transactionType)
    userRef(`${w}.userId`, t.userId)
    studentRef(`${w}.studentId`, t.studentId, true)
    const linked: Array<[string, Map<string, string>, unknown]> = [
      ['visit', visitStudent, t.visitId],
      ['incident', incidentStudent, t.incidentId ?? null],
    ]
    for (const [kind, owners, id] of linked) {
      if (id === null) continue
      const owner = owners.get(String(id))
      if (!owner) fail(`${w}.${kind}Id: "${String(id)}" doesn't exist`)
      else if (t.studentId !== owner) fail(`${w}.studentId: must match ${kind} ${String(id)}'s student ${owner}`)
    }
    if (t.visitId !== null && t.incidentId != null) fail(`${w}: links both a visit and an incident`)
    relDateTime(`${w}.timestamp`, t.timestamp)
    const quantity = t.quantity as number
    if (t.type === 'adjustment') {
      checkFields(w, t, ['id', 'itemId', 'type', 'quantity', 'timestamp', 'userId', 'studentId', 'visitId', 'reason', 'note'])
      oneOf(`${w}.reason`, t.reason, ENUMS.adjustmentReason)
      if (!Number.isInteger(quantity) || quantity === 0) fail(`${w}.quantity: an adjustment is a whole number other than 0`)
      if (t.reason === 'other' && !String(t.note ?? '').trim()) fail(`${w}.note: required when the reason is "other"`)
      if ((t.reason === 'visit_edited') !== (t.visitId !== null)) fail(`${w}: a "visit_edited" adjustment, and only that, links a visit`)
    } else {
      checkFields(w, t, ['id', 'itemId', 'type', 'quantity', 'timestamp', 'userId', 'studentId', 'visitId'], ['incidentId'])
      if (!Number.isInteger(quantity) || quantity < 1) fail(`${w}.quantity: must be a whole number ≥ 1`)
      if (t.type === 'restock' && (t.studentId !== null || t.visitId !== null || t.incidentId != null))
        fail(`${w}: a restock links no student, visit, or incident`)
    }
    const recordId = t.visitId ?? t.incidentId ?? null
    if (recordId !== null) {
      const key = `${String(recordId)}|${String(t.itemId)}`
      const signed = t.type === 'dispense' ? quantity : -quantity
      netGiven.set(key, (netGiven.get(key) ?? 0) + signed)
    }
  })
  // Every line is backed by its transactions, and no transaction moves stock for a line that isn't there.
  for (const key of new Set([...givenOnRecord.keys(), ...netGiven.keys()])) {
    const [visitId, itemId] = key.split('|')
    const onLine = givenOnRecord.get(key) ?? 0
    const net = netGiven.get(key) ?? 0
    if (onLine !== net)
      fail(`${visitId}: ${itemId} shows ${onLine} given, but its transactions net to ${net}`)
  }
  ;((fo.recordReviews ?? []) as Rec[]).forEach((r, i) => {
    const w = `frontendOnly.recordReviews[${i}]`
    studentRef(`${w}.studentId`, r.studentId)
    relDate(`${w}.importedAt`, r.importedAt)
    userRef(`${w}.resolvedByUserId`, r.resolvedByUserId, true)
    relDateTime(`${w}.resolvedAt`, r.resolvedAt, true)
  })
  ;((fo.excuseLetterApprovals ?? []) as Rec[]).forEach((a, i) => {
    const w = `frontendOnly.excuseLetterApprovals[${i}]`
    if (!visitStudent.has(String(a.visitId))) fail(`${w}.visitId: "${String(a.visitId)}" doesn't exist`)
    userRef(`${w}.approvedByUserId`, a.approvedByUserId)
    relDateTime(`${w}.approvedAt`, a.approvedAt)
    relDate(`${w}.excusedFrom`, a.excusedFrom)
    relDate(`${w}.excusedUntil`, a.excusedUntil)
    if (relDays(a.excusedUntil) < relDays(a.excusedFrom)) fail(`${w}.excusedUntil: can't be before excusedFrom`)
    if (a.note !== null && typeof a.note !== 'string') fail(`${w}.note: must be null or text`)
    // One source of truth: approval moves the draft onto the letter, so both never exist at once.
    if (draftVisits.has(String(a.visitId))) fail(`${w}: visit "${String(a.visitId)}" still has an excuse-letter draft; approval clears it`)
  })
  ;((fo.peReferrals ?? []) as Rec[]).forEach((p, i) => {
    const w = `frontendOnly.peReferrals[${i}]`
    studentRef(`${w}.studentId`, p.studentId)
    if (typeof p.referredBy !== 'string' || !p.referredBy.trim()) fail(`${w}.referredBy: must be the referrer's name`)
    oneOf(`${w}.disposition`, p.disposition, ENUMS.disposition)
    relDateTime(`${w}.createdAt`, p.createdAt)
  })
  ;((fo.issueReports ?? []) as Rec[]).forEach((r, i) => {
    const w = `frontendOnly.issueReports[${i}]`
    checkFields(w, r, ['id', 'description', 'route', 'pageName', 'role', 'reportedByUserId', 'createdAt'])
    if (!String(r.description).trim()) fail(`${w}.description: must not be empty`)
    if (!String(r.route).trim()) fail(`${w}.route: must not be empty`)
    if (!String(r.pageName).trim()) fail(`${w}.pageName: must not be empty`)
    oneOf(`${w}.role`, r.role, ENUMS.role)
    userRef(`${w}.reportedByUserId`, r.reportedByUserId)
    relDateTime(`${w}.createdAt`, r.createdAt)
  })
  const eventIds = new Set<string>()
  ;((fo.calendarEvents ?? []) as Rec[]).forEach((e, i) => {
    const w = `frontendOnly.calendarEvents[${i}]`
    checkFields(w, e, ['id', 'title', 'startDate', 'endDate', 'createdByUserId', 'createdAt', 'updatedAt'])
    if (!/^calendar-event-\d{4}$/.test(String(e.id))) fail(`${w}.id: "${String(e.id)}" should look like calendar-event-0001`)
    if (eventIds.has(String(e.id))) fail(`${w}.id: duplicate "${String(e.id)}"`)
    eventIds.add(String(e.id))
    const title = String(e.title ?? '').trim()
    if (!title) fail(`${w}.title: must not be empty`)
    if (title.length > CALENDAR_EVENT_TITLE_MAX) fail(`${w}.title: longer than ${CALENDAR_EVENT_TITLE_MAX} characters`)
    relDate(`${w}.startDate`, e.startDate)
    if (e.endDate !== null) {
      relDate(`${w}.endDate`, e.endDate)
      if (relDays(e.endDate) < relDays(e.startDate)) fail(`${w}.endDate: can't be before startDate`)
    }
    userRef(`${w}.createdByUserId`, e.createdByUserId)
    relDateTime(`${w}.createdAt`, e.createdAt)
    relDateTime(`${w}.updatedAt`, e.updatedAt)
  })
  // Sports Reports (ADR-034): the list and notes only, never a copy of medical content.
  const sportsReportIds = new Set<string>()
  ;((fo.sportsReports ?? []) as Rec[]).forEach((r, i) => {
    const w = `frontendOnly.sportsReports[${i}]`
    checkFields(w, r, ['id', 'title', 'activity', 'requestedBy', 'window', 'includeConditions', 'students', 'archived', 'createdByUserId', 'createdAt', 'updatedAt'])
    if (!/^sports-report-\d{4}$/.test(String(r.id))) fail(`${w}.id: "${String(r.id)}" should look like sports-report-0001`)
    if (sportsReportIds.has(String(r.id))) fail(`${w}.id: duplicate "${String(r.id)}"`)
    sportsReportIds.add(String(r.id))
    if (!String(r.title ?? '').trim()) fail(`${w}.title: must not be empty`)
    if (!String(r.requestedBy ?? '').trim()) fail(`${w}.requestedBy: must not be empty`)
    oneOf(`${w}.window`, r.window, [30, 60, 90, 'school_year'])
    const listed = new Set<string>()
    ;((r.students ?? []) as Rec[]).forEach((s, j) => {
      checkFields(`${w}.students[${j}]`, s, ['studentId', 'note'])
      studentRef(`${w}.students[${j}].studentId`, s.studentId)
      if (listed.has(String(s.studentId))) fail(`${w}.students[${j}].studentId: listed twice`)
      listed.add(String(s.studentId))
    })
    userRef(`${w}.createdByUserId`, r.createdByUserId)
    relDateTime(`${w}.createdAt`, r.createdAt)
    relDateTime(`${w}.updatedAt`, r.updatedAt)
  })

  return problems
}
