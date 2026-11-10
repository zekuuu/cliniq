import { beforeEach, describe, expect, it } from 'vitest'
import {
  CalendarEventValidationError,
  createCalendarEvent,
  deleteCalendarEvent,
  getCalendarDays,
  getRecordedAuditEntries,
  resetMockDb,
  setMockToday,
  updateCalendarEvent,
  validateCalendarEvent,
} from '.'

const staff = { id: 'user-staff-01', name: 'Staff', role: 'staff' as const }

describe('calendar events', () => {
  beforeEach(() => {
    setMockToday('2026-10-07')
    resetMockDb()
  })

  it('validates title, dates, and order', () => {
    expect(validateCalendarEvent({ title: ' ', startDate: '', endDate: '' })).toEqual({
      title: 'Enter a title for the event.',
      startDate: 'Choose the date the event starts.',
    })
    expect(
      validateCalendarEvent({
        title: 'x'.repeat(61),
        startDate: '2026-10-07',
        endDate: '2026-10-06',
      }),
    ).toEqual({
      title: 'Keep the title to 60 characters or fewer.',
      endDate: "The end date can't be before the start date.",
    })
    expect(
      validateCalendarEvent({ title: 'x'.repeat(60), startDate: '2026-02-30', endDate: null }),
    ).toEqual({
      startDate: 'Enter a valid start date.',
    })
    expect(
      validateCalendarEvent({
        title: 'Sports fest',
        startDate: '2026-10-07',
        endDate: '2026-10-09',
      }),
    ).toEqual({})
  })

  it('creates, edits, and deletes an event on a future day, auditing each write', async () => {
    const created = await createCalendarEvent(
      { title: '  Sports fest ', startDate: '2026-11-20', endDate: '2026-11-21' },
      staff,
    )
    expect(created).toMatchObject({
      title: 'Sports fest',
      startDate: '2026-11-20',
      endDate: '2026-11-21',
      createdByUserId: staff.id,
    })
    let days = await getCalendarDays('2026-11-20', '2026-11-22')
    expect(days.map((d) => d.events.length)).toEqual([1, 1, 0])

    // An end date equal to the start date is stored as a one-day event.
    const edited = await updateCalendarEvent(
      created.id,
      { title: 'Sports fest', startDate: '2026-11-22', endDate: '2026-11-22' },
      staff,
    )
    expect(edited.endDate).toBeNull()
    days = await getCalendarDays('2026-11-20', '2026-11-22')
    expect(days.map((d) => d.events.length)).toEqual([0, 0, 1])

    await deleteCalendarEvent(created.id, staff)
    days = await getCalendarDays('2026-11-20', '2026-11-22')
    expect(days.every((d) => d.events.length === 0)).toBe(true)

    expect(getRecordedAuditEntries()).toEqual([
      expect.objectContaining({
        userId: staff.id,
        actionType: 'create',
        targetRecord: { type: 'calendar-event', id: created.id },
      }),
      expect.objectContaining({
        actionType: 'update',
        targetRecord: { type: 'calendar-event', id: created.id },
        summary: 'Updated start date and end date',
      }),
      expect.objectContaining({
        actionType: 'delete',
        targetRecord: { type: 'calendar-event', id: created.id },
      }),
    ])
  })

  it('rejects an invalid write without changing anything', async () => {
    await expect(
      createCalendarEvent({ title: '', startDate: '2026-10-07', endDate: null }, staff),
    ).rejects.toBeInstanceOf(CalendarEventValidationError)
    expect(getRecordedAuditEntries()).toEqual([])
  })
})
