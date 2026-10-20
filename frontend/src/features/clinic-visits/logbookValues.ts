import { formatTime } from '../../lib/dates'
import type { VisitLogbookFields } from '../../lib/mock-db'
import type { Visit } from '../../types/entities'

/**
 * The form values behind the visit's optional logbook fields (New Visit and the Visit Detail edit
 * form), from the clinic's daily logbook. All optional; blank text saves as null.
 */
export interface LogbookValues {
  temperatureC: string
  /** "HH:MM" from the time input. */
  timeOut: string
  assistedBy: string
  parentGuardian: string
  remarks: string
}

export interface LogbookErrors {
  timeOut?: string
}

export function emptyLogbookValues(): LogbookValues {
  return { temperatureC: '', timeOut: '', assistedBy: '', parentGuardian: '', remarks: '' }
}

export function logbookValuesFrom(visit: VisitLogbookFields): LogbookValues {
  return {
    temperatureC: visit.temperatureC === null ? '' : String(visit.temperatureC),
    timeOut: visit.timeOut ?? '',
    assistedBy: visit.assistedBy ?? '',
    parentGuardian: visit.parentGuardian ?? '',
    remarks: visit.remarks ?? '',
  }
}

/** How many of the five hold something; the closed "Show more fields" button shows it. */
export function filledLogbookCount(values: LogbookValues): number {
  return (Object.keys(emptyLogbookValues()) as Array<keyof LogbookValues>).filter((key) => values[key].trim() !== '').length
}

/** "9:05 AM" for a stored "HH:MM" on the clinic's clock. */
export function formatClock(clock: string): string {
  return formatTime(`2000-01-01T${clock}:00+08:00`)
}

/** The clinic clock now, "HH:MM": a new visit's time in is the moment it is saved. */
export function currentClock(now = new Date()): string {
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

/**
 * `timeIn` is the visit's "HH:MM" time in (on New Visit, the time it is saved). `badTimeOut` is the
 * time input's `validity.badInput`: a half-typed time leaves its value empty, so only that can tell.
 */
export function logbookErrors(values: LogbookValues, timeIn: string, badTimeOut = false): LogbookErrors {
  if (badTimeOut) return { timeOut: 'Enter the full time out, including AM or PM.' }
  if (values.timeOut && values.timeOut < timeIn)
    return { timeOut: `Time out can't be earlier than the time in (${formatClock(timeIn)}).` }
  return {}
}

export function logbookPayload(values: LogbookValues): Pick<Visit, keyof LogbookValues> {
  const text = (value: string) => value.trim() || null
  return {
    temperatureC: values.temperatureC.trim() === '' ? null : Number(values.temperatureC),
    timeOut: text(values.timeOut),
    assistedBy: text(values.assistedBy),
    parentGuardian: text(values.parentGuardian),
    remarks: text(values.remarks),
  }
}
