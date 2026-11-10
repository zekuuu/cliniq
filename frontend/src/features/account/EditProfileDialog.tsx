import { useRef, useState, type FormEvent } from 'react'
import { Button, Input, Modal } from '../../components'
import { formatDateTime } from '../../lib/dates'
import { ROLE_LABELS, updateOwnProfile, USER_NAME_MAX, type OwnAccount } from '../../lib/mock-db'
import {
  PROFILE_PICTURE_ACCEPT,
  profilePictureError,
  resizeProfilePicture,
} from '../user-management/profilePicture'
import { UserAvatar } from '../user-management/UserAvatar'

/**
 * Edit profile (ADR-066): a dialog over the current screen, never a page or a route (Zean, Thursday,
 * November 5, 2026). The signed-in user changes their own display name and picture; the username and
 * role stay with the Admin, and the password has its own page. Closing it with unsaved changes asks
 * first, in ADR-021's words.
 */
export function EditProfileDialog({
  open,
  account,
  onClose,
  onSaved,
}: {
  open: boolean
  account: OwnAccount | null
  onClose: () => void
  onSaved: () => void
}) {
  // Mounted only while open, so each opening starts from the stored account.
  if (!open || !account) return null
  return <EditProfileBody account={account} onClose={onClose} onSaved={onSaved} />
}

function EditProfileBody({
  account,
  onClose,
  onSaved,
}: {
  account: OwnAccount
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(account.name)
  const [picture, setPicture] = useState<string | null>(account.profilePicture)
  const [nameError, setNameError] = useState('')
  const [pictureError, setPictureError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)
  const [asking, setAsking] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const dirty = name !== account.name || picture !== account.profilePicture

  function requestClose() {
    if (dirty) setAsking(true)
    else onClose()
  }

  async function choosePicture(file: File | undefined) {
    if (!file) return
    const invalid = profilePictureError(file)
    if (invalid) return setPictureError(invalid)
    try {
      setPicture(await resizeProfilePicture(file))
      setPictureError('')
    } catch (cause) {
      setPictureError(
        cause instanceof Error
          ? cause.message
          : 'The image could not be read. Choose another file.',
      )
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) return setNameError('Enter your full name.')
    setSaving(true)
    setSaveError('')
    try {
      await updateOwnProfile({ name, profilePicture: picture })
      onSaved()
    } catch (cause) {
      setSaveError(
        cause instanceof Error ? cause.message : 'Your profile could not be saved. Try again.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      title={asking ? 'Discard unsaved changes?' : 'Edit profile'}
      onClose={asking ? () => setAsking(false) : requestClose}
      className="max-sm:min-h-[calc(100dvh-2rem)]"
    >
      {asking ? (
        <>
          <p className="text-sm text-text-secondary">
            What you entered on this form hasn&apos;t been saved. If you leave now, it will be lost.
          </p>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Button variant="neutral" data-autofocus onClick={() => setAsking(false)}>
              Keep Editing
            </Button>
            <Button variant="primary" onClick={onClose}>
              Discard Changes
            </Button>
          </div>
        </>
      ) : (
        <form noValidate onSubmit={(event) => void save(event)} className="flex flex-col gap-4">
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-sm">
            <dt className="text-text-secondary">Username</dt>
            <dd className="truncate font-semibold text-text-primary">{account.username}</dd>
            <dt className="text-text-secondary">Role</dt>
            <dd className="font-semibold text-text-primary">{ROLE_LABELS[account.role]}</dd>
            <dt className="text-text-secondary">Last sign-in</dt>
            <dd className="text-text-primary">
              {account.lastLogin ? formatDateTime(account.lastLogin) : 'Not recorded'}
            </dd>
          </dl>
          <p className="-mt-2 text-xs text-text-secondary">
            The username and role are managed by the Admin.
          </p>
          <Input
            label="Full name"
            required
            data-autofocus
            value={name}
            maxLength={USER_NAME_MAX}
            error={nameError}
            onChange={(event) => {
              setName(event.target.value)
              setNameError('')
            }}
          />
          <section aria-labelledby="edit-profile-picture-title" className="flex flex-col gap-2">
            <h3 id="edit-profile-picture-title" className="text-sm font-semibold text-text-primary">
              Profile picture
            </h3>
            <div className="flex flex-wrap items-center gap-3">
              <UserAvatar name={name || account.name} picture={picture} className="size-14" />
              <input
                ref={fileRef}
                type="file"
                accept={PROFILE_PICTURE_ACCEPT}
                className="sr-only"
                tabIndex={-1}
                aria-label="Choose profile picture"
                onChange={(event) => {
                  void choosePicture(event.target.files?.[0])
                  event.target.value = ''
                }}
              />
              <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()}>
                Change picture
              </Button>
              {picture && (
                <Button size="sm" variant="neutral" onClick={() => setPicture(null)}>
                  Remove picture
                </Button>
              )}
            </div>
            <p className="text-xs text-text-secondary">
              A square photo works best. JPEG, PNG or WebP, up to 2 MB.
            </p>
            {pictureError && (
              <p role="alert" className="text-xs font-semibold text-error">
                {pictureError}
              </p>
            )}
          </section>
          <p className="text-sm text-text-secondary">
            To change your password, use Change password in the menu.
          </p>
          {saveError && (
            <p role="alert" className="text-sm font-semibold text-error">
              {saveError}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
            <Button variant="neutral" onClick={requestClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={!dirty} loading={saving}>
              Save changes
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
