import { render, screen, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { useState } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import { InventoryItemPicker, type PickableItem } from '../../components/forms/InventoryItemPicker'
import { ItemsGivenField, type ItemLineDraft } from '../../components/forms/ItemsGivenField'
import {
  getInventoryItem,
  getRecordedAuditEntries,
  resetMockDb,
  saveInventoryItem,
} from '../../lib/mock-db'
import { checkSeedIntegrity } from '../../lib/mock-db/integrity'
import { seed } from '../../lib/mock-db/seed'
import { pickStudent } from '../../test/pickStudent'
import { renderWithRouter } from '../../test/renderWithRouter'
import { selectOption } from '../../test/selectOption'
import { InventoryFormPage } from '../inventory/InventoryFormPage'
import { NewVisitEntryPage } from './NewVisitEntryPage'

/**
 * Suggested medicines (professor's consultation, Friday, November 6, 2026; Zean, Saturday, November 7,
 * 2026 — 04:18 PHT): items tagged "Commonly used for" a chosen symptom come first; the rest are one
 * "Show all medicines" away, always searchable, never hidden or blocked.
 */

const item = (id: string, name: string, extra: Partial<PickableItem> = {}): PickableItem => ({
  id,
  name,
  category: 'medicine',
  currentStock: 20,
  unit: 'tablets',
  flags: [],
  daysUntilExpiry: null,
  ...extra,
})
const ITEMS: PickableItem[] = [
  item('a', 'Paracetamol 500mg', { usedFor: ['Fever', 'Headache'] }),
  item('b', 'Loperamide 2mg', { usedFor: ['Stomachache'] }),
  item('c', 'Cetirizine 10mg', { usedFor: ['Allergic reaction'] }),
  item('d', 'Gauze Pads', { category: 'supply' }),
]

const optionNames = () => screen.queryAllByRole('option').map((option) => option.textContent ?? '')
const groupNames = () =>
  screen
    .queryAllByRole('group')
    .map(
      (group) =>
        group.getAttribute('aria-labelledby') &&
        document.getElementById(group.getAttribute('aria-labelledby')!)?.textContent,
    )

async function openPicker(user: UserEvent, symptoms?: string[]) {
  render(<InventoryItemPicker items={ITEMS} onPick={() => {}} symptoms={symptoms} />)
  await user.click(screen.getByRole('combobox', { name: 'Add medicine or supply' }))
}

describe('the medicine picker with symptoms', () => {
  it('lists every item as before when no symptom is chosen', async () => {
    const user = userEvent.setup()
    await openPicker(user, [])
    expect(groupNames()).toEqual(['Medicines', 'Supplies'])
    expect(optionNames()).toHaveLength(4)
    expect(screen.queryByText(/Show all medicines/)).not.toBeInTheDocument()
  })

  it('puts the tagged item first for one symptom, with the rest behind "Show all medicines"', async () => {
    const user = userEvent.setup()
    await openPicker(user, ['fever'])
    expect(groupNames()).toEqual(['Suggested for these symptoms'])
    expect(
      screen.getByText('Suggestions come from the tags set on each item. The clinician decides.'),
    ).toBeInTheDocument()
    expect(optionNames()).toEqual([
      expect.stringContaining('Paracetamol 500mg'),
      'Show all medicines (3 more)',
    ])
    // Keyboard: the toggle is the last option; Enter opens the rest without picking anything.
    await user.keyboard('{ArrowUp}{Enter}')
    expect(groupNames()).toEqual(['Suggested for these symptoms', 'Medicines', 'Supplies'])
    expect(optionNames()).toHaveLength(5)
    expect(screen.getByRole('option', { name: 'Show suggested only' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  })

  it('suggests for several symptoms at once', async () => {
    const user = userEvent.setup()
    await openPicker(user, ['Headache', 'Stomachache'])
    const suggested = screen.getByRole('group', { name: 'Suggested for these symptoms' })
    expect(
      within(suggested)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual([
      expect.stringContaining('Loperamide 2mg'),
      expect.stringContaining('Paracetamol 500mg'),
    ])
  })

  it('never excludes an item: a search finds untagged items while collapsed', async () => {
    const user = userEvent.setup()
    await openPicker(user, ['Fever'])
    await user.type(screen.getByRole('combobox'), 'gauze')
    expect(screen.getByRole('option', { name: /Gauze Pads/ })).not.toHaveAttribute('aria-disabled')
    await user.clear(screen.getByRole('combobox'))
    await user.type(screen.getByRole('combobox'), 'cetir')
    expect(screen.getByRole('option', { name: /Cetirizine 10mg/ })).toBeInTheDocument()
  })

  it('suggests nothing when no item carries a chosen symptom', async () => {
    const user = userEvent.setup()
    await openPicker(user, ['Toothache'])
    expect(groupNames()).toEqual(['Medicines', 'Supplies'])
  })
})

describe('allergy warnings are the same on suggested and other items (ADR-049)', () => {
  function Field({ symptoms }: { symptoms: string[] }) {
    const [lines, setLines] = useState<ItemLineDraft[]>([])
    const items = [
      item('a', 'Paracetamol 500mg', { usedFor: ['Fever'], avoidIfAllergicTo: ['paracetamol'] }),
      item('e', 'Amoxicillin 500mg', { avoidIfAllergicTo: ['penicillin'] }),
    ]
    return (
      <ItemsGivenField
        items={items}
        lines={lines}
        onChange={setLines}
        allergies={['Paracetamol', 'Penicillin']}
        symptoms={symptoms}
      />
    )
  }

  it('warns for a suggested item and for one picked from "Show all medicines", and adds both', async () => {
    const user = userEvent.setup()
    render(<Field symptoms={['Fever']} />)
    const picker = screen.getByRole('combobox', { name: 'Add medicine or supply' })
    await user.click(picker)
    await user.click(screen.getByRole('option', { name: /Paracetamol 500mg/ }))
    expect(
      screen.getByText('Avoid if allergic to paracetamol: this patient lists paracetamol.'),
    ).toBeInTheDocument()
    await user.click(picker)
    await user.click(screen.getByRole('option', { name: /Show all medicines/ }))
    await user.click(screen.getByRole('option', { name: /Amoxicillin 500mg/ }))
    expect(
      screen.getByText('Avoid if allergic to penicillin: this patient lists penicillin.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Increase Paracetamol 500mg' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Increase Amoxicillin 500mg' })).toBeEnabled()
  })
})

describe('"Commonly used for" on the item form (Staff)', () => {
  beforeEach(() => resetMockDb())

  it('saves the tags in the list order and audits the field name only', async () => {
    const user = userEvent.setup()
    renderWithRouter(<InventoryFormPage />, { route: '/inventory/new?item=item-0003' })
    const group = await screen.findByRole('group', { name: /^Commonly used for/ })
    await user.click(within(group).getByRole('checkbox', { name: 'Fever' }))
    await user.click(within(group).getByRole('checkbox', { name: 'Allergic reaction' }))
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))
    expect(await screen.findByText(/updated successfully/)).toBeInTheDocument()
    expect((await getInventoryItem('item-0003')).usedFor).toEqual(['Fever', 'Allergic reaction'])
    const entry = getRecordedAuditEntries().at(-1)!
    expect(entry).toMatchObject({ actionType: 'update', summary: 'Updated commonly used for' })
    expect(JSON.stringify(entry)).not.toMatch(/Fever|Allergic/)
  })

  it('keeps the tags when a save leaves them out', async () => {
    const before = await getInventoryItem('item-0001')
    const { name, category, unit, lowStockThreshold, brand, currentStock, expirationDate } = before
    await saveInventoryItem(
      { name, category, unit, lowStockThreshold, brand, currentStock, expirationDate },
      { itemId: 'item-0001' },
    )
    expect((await getInventoryItem('item-0001')).usedFor).toEqual(['Headache', 'Fever'])
  })

  it('shows the starter tags on a seeded item', async () => {
    renderWithRouter(<InventoryFormPage />, { route: '/inventory/new?item=item-0001' })
    const group = await screen.findByRole('group', { name: /^Commonly used for/ })
    expect(within(group).getByRole('checkbox', { name: 'Fever' })).toBeChecked()
    expect(within(group).getByRole('checkbox', { name: 'Headache' })).toBeChecked()
    expect(within(group).getByRole('checkbox', { name: 'Toothache' })).not.toBeChecked()
  })
})

describe('New Visit suggests from the chosen symptoms', () => {
  beforeEach(() => resetMockDb())

  it('lists Paracetamol first once Fever is the symptom', async () => {
    const user = userEvent.setup({ delay: null })
    renderWithRouter(<NewVisitEntryPage />)
    await pickStudent(user, '000000260001')
    await screen.findByRole('heading', { name: 'New Visit' })
    expect(
      screen.getByText(/^What symptoms is the patient feeling\? Choose all that apply\./),
    ).toBeInTheDocument()
    await selectOption(user, screen.getByLabelText(/^symptom/i), 'Fever')
    await user.click(screen.getByRole('combobox', { name: 'Add medicine or supply' }))
    const suggested = screen.getByRole('group', { name: 'Suggested for these symptoms' })
    expect(within(suggested).getByRole('option', { name: /Paracetamol 500mg/ })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /^Show all medicines/ })).toBeInTheDocument()
  })
})

describe('seed integrity for "Commonly used for"', () => {
  const broken = (mutate: (items: Array<Record<string, unknown>>) => void) => {
    const copy = structuredClone(seed) as unknown as {
      inventoryItems: Array<Record<string, unknown>>
    }
    mutate(copy.inventoryItems)
    return checkSeedIntegrity(copy as never).join('\n')
  }

  it('accepts the seed and an "Other" word, and rejects a blank, a repeat or the wrong order', () => {
    expect(checkSeedIntegrity(seed)).toEqual([])
    expect(broken((items) => (items[0].usedFor = ['Fever', 'Sore eyes']))).toBe('')
    expect(broken((items) => (items[0].usedFor = ['Sore eyes', 'Fever']))).toMatch(
      /visitComplaintTypes order/,
    )
    expect(broken((items) => (items[0].usedFor = [' ']))).toMatch(
      /must be a symptom option or a typed word/,
    )
    expect(broken((items) => (items[0].usedFor = ['Fever', 'Fever']))).toMatch(
      /lists a symptom twice/,
    )
    expect(broken((items) => (items[0].usedFor = ['Fever', 'Headache']))).toMatch(
      /visitComplaintTypes order/,
    )
  })
})
