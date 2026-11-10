import { render, screen, waitFor, within } from '@testing-library/react'
import { recordedWrites } from '../../test/recordedWrites'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { getPersonnel, type SessionUser } from '../../lib/mock-db'
import { AppRoutes } from '../../routes/AppRoutes'
import { selectOption } from '../../test/selectOption'

/** Staff screens (ADR-043 part 2): list, profile, add, edit, archive. */

const STAFF: SessionUser = { id: 'user-staff-01', name: 'Demo Clinician', role: 'staff' }

function renderAt(route: string, user: SessionUser = STAFF) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AppRoutes user={user} onLogout={() => {}} />
    </MemoryRouter>,
  )
}

describe('Staff List', () => {
  it('lists active staff with Name, Staff No., Type and Department, searchable and filterable', async () => {
    const user = userEvent.setup()
    renderAt('/staff')
    const table = await screen.findByRole('table', { name: 'Staff masterlist' })
    expect(within(table).getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Full name', 'Staff No.', 'Type', 'Department or role', 'Record status', 'Actions'])
    expect(screen.getByText('11 results shown')).toBeInTheDocument()
    // Nothing medical inline.
    expect(screen.queryByText('Penicillin')).not.toBeInTheDocument()

    await user.type(screen.getByLabelText('Search'), 'STF-0002')
    expect(await screen.findByText('1 result shown')).toBeInTheDocument()
    expect(screen.getByRole('rowheader', { name: 'Dindo Arcega' })).toBeInTheDocument()

    await user.clear(screen.getByLabelText('Search'))
    await selectOption(user, screen.getByLabelText('Type'), 'Utility worker')
    expect(await screen.findByText('3 results shown')).toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: 'Show archived' }))
    expect(await screen.findByText('4 results shown')).toBeInTheDocument()
    expect(screen.getByText('Archived')).toBeInTheDocument()
  })

  it('opens the staff Incomplete Records page, and a completed record returns there resolved (ADR-067)', async () => {
    const user = userEvent.setup()
    renderAt('/staff')
    await user.click(await screen.findByRole('link', { name: 'Incomplete records (2)' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Incomplete Staff Records' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Open' })).toHaveAttribute('aria-checked', 'true')
    const table = screen.getByRole('table', { name: 'Incomplete staff records' })
    expect(within(table).getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Staff', 'Staff No.', 'Type', 'Missing fields', 'Resolution', 'Actions'])
    expect(within(table).getAllByText('Emergency contact')).toHaveLength(2)

    await user.click(within(table).getAllByRole('link', { name: /^Edit Record for / })[0])
    const name = await screen.findByLabelText('Primary emergency contact name')
    await waitFor(() => expect(name).toHaveFocus())
    expect(name).toHaveAttribute('aria-invalid', 'true')
    await user.type(name, 'Rosa Cruz')
    await user.type(screen.getByLabelText('Primary emergency contact relationship'), 'Sister')
    await user.type(screen.getByLabelText('Primary emergency contact phone'), '0917-333-4444')
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Incomplete Staff Records' })).toBeInTheDocument()
    expect(await screen.findByText('1 resolved')).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'Resolved' }))
    expect(within(screen.getByRole('table', { name: 'Incomplete staff records' })).getByText('Resolved')).toBeInTheDocument()
  })
})

describe('Staff Profile', () => {
  it('shows the record, the allergy alert and the history, with Record a visit and Record an incident', async () => {
    renderAt('/staff/personnel-0009')
    expect(await screen.findByRole('heading', { level: 1, name: 'Edgar Malonzo' })).toBeInTheDocument()
    expect(screen.getByText('STF-0009 · Utility worker · Maintenance')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Record a visit' })).toHaveAttribute('href', '/visits/new?staff=personnel-0009')
    expect(screen.getByRole('link', { name: 'Record an incident' })).toHaveAttribute('href', '/incidents/new?staff=personnel-0009')
    expect(within(screen.getByRole('region', { name: 'Incident History' })).getByText('Fall injury')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Follow-Ups' })).getByText('Check the bruised forearm')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Allergies and medical conditions' })).not.toBeInTheDocument()
  })

  it('shows the allergy alert when one is recorded', async () => {
    renderAt('/staff/personnel-0002')
    expect(await screen.findByRole('region', { name: 'Allergies and medical conditions' })).toHaveTextContent('Allergies: Penicillin')
  })

  it('archives after a confirmation and logs it', async () => {
    const user = userEvent.setup()
    renderAt('/staff/personnel-0003')
    await user.click(await screen.findByRole('button', { name: 'Archive' }))
    const dialog = screen.getByRole('dialog', { name: 'Archive this staff record?' })
    // "Other" asks which reason, and the typed one is stored.
    await selectOption(user, within(dialog).getByLabelText(/^Reason/), 'Other (type your own)')
    await user.type(within(dialog).getByLabelText(/^Specify the reason/), 'Moved to the main campus')
    await user.click(within(dialog).getByRole('button', { name: 'Archive Record' }))
    await waitFor(async () => expect((await getPersonnel('personnel-0003')).archived).toBe(true))
    expect((await getPersonnel('personnel-0003')).archiveReason).toBe('Moved to the main campus')
    expect(recordedWrites().at(-1)).toMatchObject({ actionType: 'archive', targetRecord: { type: 'staff', id: 'personnel-0003' } })
  })
})

describe('Staff Form', () => {
  it('requires only the name, sex and type, saves, assigns a Staff No. and logs it', async () => {
    const user = userEvent.setup()
    renderAt('/staff/new')
    await screen.findByRole('heading', { level: 1, name: 'Add Staff' })
    await user.click(screen.getByRole('button', { name: 'Save Staff' }))
    expect(await screen.findByText("Enter the staff member's first name.")).toBeInTheDocument()
    expect(screen.getByText("Enter the staff member's last name.")).toBeInTheDocument()
    expect(screen.getByText('Select the staff type.')).toBeInTheDocument()
    expect(screen.getByLabelText(/^First name/)).toHaveFocus()
    // The same three name fields as a student (Zean, November 4, 2026; ADR-064).
    expect(screen.getByLabelText('Middle name')).not.toBeRequired()

    await user.type(screen.getByLabelText(/^First name/), 'Ana')
    await user.type(screen.getByLabelText(/^Last name/), 'Test')
    await user.click(screen.getByRole('radio', { name: 'Female' }))
    await selectOption(user, screen.getByLabelText(/^Type/), 'Teacher')
    await user.type(screen.getByRole('combobox', { name: /^Allergies/ }), 'None')
    // Department or role: a value in use, or Other (specify) to type a new one (D4, review round 2 R19).
    await user.click(screen.getByRole('combobox', { name: /^Department or role/ }))
    // Only departments in use for the chosen type (Zean, November 5, 2026).
    expect(screen.getByRole('option', { name: 'Grade 4 adviser' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Canteen' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('option', { name: 'Other (specify)' }))
    await user.type(screen.getByLabelText(/^Specify other department or role/), 'Guidance office')
    await user.click(screen.getByRole('button', { name: 'Save Staff' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Ana Test' })).toBeInTheDocument()
    expect(screen.getByText('Staff record created for Ana Test.')).toBeInTheDocument()
    expect(screen.getByText('STF-0013 · Teacher · Guidance office')).toBeInTheDocument()
    // "None" stores no allergy, as on the student form.
    expect(screen.queryByRole('region', { name: 'Allergies and medical conditions' })).not.toBeInTheDocument()
    expect(recordedWrites().at(-1)).toMatchObject({ actionType: 'create', targetRecord: { type: 'staff', id: 'personnel-0013' } })
  })

  it('edits a record, shows the Staff No. read only, and checks a started emergency contact', async () => {
    const user = userEvent.setup()
    renderAt('/staff/personnel-0005/edit')
    await screen.findByRole('heading', { level: 1, name: 'Edit Staff' })
    expect(screen.getByLabelText('Staff No.')).toHaveAttribute('readonly')
    expect(screen.getByLabelText('Staff No.')).toHaveValue('STF-0005')
    await user.type(screen.getByLabelText('Primary emergency contact name'), 'Rico Pangilinan')
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))
    expect(await screen.findByText('Enter the emergency contact phone.')).toBeInTheDocument()

    await user.clear(screen.getByLabelText('Primary emergency contact name'))
    await user.clear(screen.getByRole('combobox', { name: /^Medical conditions/ }))
    await user.type(screen.getByRole('combobox', { name: /^Medical conditions/ }), 'Migraine')
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))
    expect(await screen.findByText('Staff record updated for Liza Pangilinan.')).toBeInTheDocument()
    expect((await getPersonnel('personnel-0005')).medicalConditions).toEqual(['Migraine'])
    expect(recordedWrites().at(-1)).toMatchObject({ actionType: 'update', summary: 'Updated medical conditions' })
  })
})
