import { beforeEach, describe, expect, it } from 'vitest'
import { getOperationalSettings, OperationalSettingsError, saveOperationalSettings } from './api'
import { resetMockDb } from './store'

const staff = {
  id: 'user-staff-01',
  name: 'Jennesse Baas',
  username: 'demo.nurse',
  role: 'staff' as const,
}
const admin = {
  id: 'user-admin-01',
  name: 'Gilan Avelida',
  username: 'demo.principal',
  role: 'admin' as const,
}

describe('operational settings', () => {
  beforeEach(() => resetMockDb())

  it('validates the warning periods, saves for Staff, and can restore the prior values', async () => {
    const initial = await getOperationalSettings()
    expect(initial).toEqual({ upcomingFollowUpDays: 7, expiryWarningDays: 30 })
    await expect(
      saveOperationalSettings({ upcomingFollowUpDays: 0, expiryWarningDays: 45 }, staff),
    ).rejects.toBeInstanceOf(OperationalSettingsError)
    await expect(
      saveOperationalSettings({ upcomingFollowUpDays: 10, expiryWarningDays: 45 }, admin),
    ).rejects.toBeInstanceOf(OperationalSettingsError)
    await saveOperationalSettings({ upcomingFollowUpDays: 10, expiryWarningDays: 45 }, staff)
    expect(await getOperationalSettings()).toEqual({
      upcomingFollowUpDays: 10,
      expiryWarningDays: 45,
    })
    await saveOperationalSettings(initial, staff)
    expect(await getOperationalSettings()).toEqual(initial)
  })
})
