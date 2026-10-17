import rawSeed from './mock-db.json'
import type { ISODate } from '../../types/entities'
import { resolveDate, resolveDateTime } from './relativeDates'
import type { DbState, MockDbSeed } from './types'

/**
 * The ONLY module that imports `mock-db.json`. Pages and feature `api/` modules never do; they go
 * through the data layer (`lib/mock-db/index.ts`).
 */

/**
 * JSON imports are typed with widened literals (`"staff"` becomes `string`), so the seed is checked
 * against the same types with their literal unions widened. That still fails the build on a
 * missing field, a renamed field, or a wrong primitive type. Enum values (role, stage, status,
 * disposition...) are checked at test time by `integrity.test.ts`.
 */
type Widen<T> = T extends string
  ? string
  : T extends number
    ? number
    : T extends boolean
      ? boolean
      : T extends null | undefined
        ? T
        : T extends Array<infer U>
          ? Array<Widen<U>>
          : T extends object
            ? string extends keyof T
              ? Record<string, unknown> // free-form maps (Incident.vitals): values checked in integrity.ts
              : { [K in keyof T]: Widen<T[K]> }
            : T

const shapeChecked: Widen<MockDbSeed> = rawSeed

export const seed = shapeChecked as unknown as MockDbSeed

/** Resolves every relative date and every Student Number reference into the in-memory store. */
export function resolveSeed(source: MockDbSeed, today: ISODate): DbState {
  const idByNumber = new Map(source.students.map((s) => [s.studentNumber, s.id]))
  const studentId = (studentNumber: string) => idByNumber.get(studentNumber) ?? `missing:${studentNumber}`
  const config = { ...source.config }
  delete config._note
  const fo = source.frontendOnly

  return structuredClone({
    today,
    config,
    users: source.users.map((u) => ({
      ...u,
      lastLogin: u.lastLogin ? resolveDateTime(u.lastLogin, today) : null,
    })),
    // Seed records written before Part 3B have no Sex value. This deterministic alternating value
    // is explicitly synthetic and keeps every loaded mock record valid until real master-list data
    // replaces it; new/edit forms always require the explicit field.
    students: source.students.map((student, index) => ({
      ...student,
      sex: student.sex ?? (index % 2 === 0 ? 'female' : 'male'),
    })),
    visits: source.visits.map(({ studentNumber, ...v }) => ({
      ...v,
      studentId: studentId(studentNumber),
      dateTime: resolveDateTime(v.dateTime, today),
      excuseLetterDraft: v.excuseLetterDraft
        ? {
            ...v.excuseLetterDraft,
            excusedFrom: resolveDate(v.excuseLetterDraft.excusedFrom, today),
            excusedUntil: resolveDate(v.excuseLetterDraft.excusedUntil, today),
          }
        : null,
    })),
    incidents: source.incidents.map(({ studentNumber, ...i }) => ({
      ...i,
      studentId: studentId(studentNumber),
      time: resolveDateTime(i.time, today),
      hospitalReferral: i.hospitalReferral
        ? {
            ...i.hospitalReferral,
            departureTime: resolveDateTime(i.hospitalReferral.departureTime, today),
          }
        : null,
      parentNotifications: i.parentNotifications.map((n) => ({
        ...n,
        timestamp: resolveDateTime(n.timestamp, today),
      })),
    })),
    followUps: source.followUps.map(({ studentNumber, ...f }) => ({
      ...f,
      studentId: studentId(studentNumber),
      followUpDate: resolveDate(f.followUpDate, today),
    })),
    inventoryItems: source.inventoryItems.map(({ currentStock, expirationDate, ...item }) => ({
      ...item,
      batches: [{
        id: `${item.id}-batch-0001`,
        quantity: currentStock,
        expirationDate: expirationDate ? resolveDate(expirationDate, today) : null,
        receivedDate: today,
      }],
    })),
    reports: source.reports.map((r) => ({
      ...r,
      dateRange: { from: resolveDate(r.dateRange.from, today), to: resolveDate(r.dateRange.to, today) },
    })),
    backupLogs: source.backupLogs.map((b) => ({ ...b, lastRun: resolveDateTime(b.lastRun, today) })),
    auditLog: source.auditLog.map((a) => ({ ...a, timestamp: resolveDateTime(a.timestamp, today) })),
    frontendOnly: {
      devAccounts: fo.devAccounts,
      visitComplaintTypes: fo.visitComplaintTypes,
      incidentComplaintTypes: fo.incidentComplaintTypes,
      inventoryTransactions: fo.inventoryTransactions.map((t) => ({
        ...t,
        timestamp: resolveDateTime(t.timestamp, today),
      })),
      recordReviews: fo.recordReviews.map((r) => ({
        ...r,
        importedAt: resolveDate(r.importedAt, today),
        resolvedAt: r.resolvedAt ? resolveDateTime(r.resolvedAt, today) : null,
      })),
      excuseLetterApprovals: fo.excuseLetterApprovals.map((a) => ({
        ...a,
        approvedAt: resolveDateTime(a.approvedAt, today),
        excusedFrom: resolveDate(a.excusedFrom, today),
        excusedUntil: resolveDate(a.excusedUntil, today),
      })),
      peReferrals: fo.peReferrals.map((p) => ({ ...p, createdAt: resolveDateTime(p.createdAt, today) })),
      issueReports: fo.issueReports.map((r) => ({ ...r, createdAt: resolveDateTime(r.createdAt, today) })),
      calendarEvents: fo.calendarEvents.map((e) => ({
        ...e,
        startDate: resolveDate(e.startDate, today),
        endDate: e.endDate ? resolveDate(e.endDate, today) : null,
        createdAt: resolveDateTime(e.createdAt, today),
        updatedAt: resolveDateTime(e.updatedAt, today),
      })),
    },
  })
}
