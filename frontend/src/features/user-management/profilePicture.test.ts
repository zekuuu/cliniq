import { beforeEach, describe, expect, it } from 'vitest'
import { getRecordedAuditEntries, getUser, resetMockDb, saveUser } from '../../lib/mock-db'
import { PROFILE_PICTURE_MAX_BYTES, profilePictureError } from './profilePicture'

describe('profilePictureError', () => {
  it('accepts JPEG, PNG, and WebP files up to 2 MB', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp']) {
      expect(profilePictureError(new File(['image'], 'portrait', { type }))).toBeUndefined()
    }
  })

  it('rejects unsupported types and files over 2 MB', () => {
    expect(profilePictureError(new File(['text'], 'portrait.txt', { type: 'text/plain' }))).toBe(
      'Choose a JPEG, PNG, or WebP image.',
    )
    expect(profilePictureError(new File([new Uint8Array(PROFILE_PICTURE_MAX_BYTES + 1)], 'portrait.png', { type: 'image/png' }))).toBe(
      'Choose an image no larger than 2 MB.',
    )
  })
})

describe('mock user profile pictures', () => {
  beforeEach(() => resetMockDb())

  it('stores a picture and audits its change without image data', async () => {
    const picture = 'data:image/webp;base64,small-resized-picture'
    const existing = await getUser('user-staff-01')
    await saveUser(
      { name: existing.name, username: existing.username, role: existing.role, profilePicture: picture },
      { userId: 'user-staff-01' },
    )

    expect((await getUser('user-staff-01')).profilePicture).toBe(picture)
    expect(getRecordedAuditEntries()).toMatchObject([
      { actionType: 'update', targetRecord: { type: 'user', id: 'user-staff-01' }, summary: 'Updated profile picture' },
    ])
    expect(JSON.stringify(getRecordedAuditEntries())).not.toContain(picture)
  })
})
