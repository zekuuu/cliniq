import { useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import {
  BackButton,
  Button,
  Card,
  CardBody,
  CardHeader,
  Combobox,
  DatePicker,
  ErrorState,
  FormSection,
  FORM_DIVIDER,
  Icon,
  Input,
  Select,
  Skeleton,
} from '../../components'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useCancelNavigation } from '../../hooks/useCancelNavigation'
import { useFocusFirstInvalid } from '../../hooks/useFocusFirstInvalid'
import { formatDate } from '../../lib/dates'
import { symptoms } from '../../lib/labels'
import { paths } from '../../routes/paths'
import {
  fetchInventoryForm,
  findDuplicateItem,
  saveInventoryItem,
  unitSuggestions,
  type InventoryFormValues,
} from './api/inventoryApi'
import { getMockToday, StockRuleError, USED_FOR_REQUIRED } from '../../lib/mock-db'

const BRAND_OPTIONS = [
  { value: '', label: 'Not specified' },
  { value: 'generic', label: 'Generic' },
  { value: 'branded', label: 'Branded' },
]

const EMPTY: InventoryFormValues = {
  name: '',
  category: 'medicine',
  currentStock: '',
  unit: '',
  expirationDate: '',
  lowStockThreshold: '',
  noExpirationConfirmed: false,
  brand: '',
  avoidIfAllergicTo: '',
  usedFor: [],
  usedForOther: null,
}

/** Stock and expiry on an existing item: shown, but changed only through the stock actions (ADR-018). */
function ReadOnlyFact({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm font-semibold text-text-primary">{label}</p>
      <p className="flex h-10 items-center rounded-md border border-border bg-surface px-3 text-sm font-semibold text-text-primary">
        {value}
      </p>
      <p className="text-xs text-text-secondary">{note}</p>
    </div>
  )
}

/**
 * "Commonly used for" (consultation, November 6, 2026): symptom options the Visit form's picker lists
 * first. Checkboxes, not a filter dropdown: it's a short fixed list on a form. Required, with "Other"
 * for symptoms not in the list, comma-separated (Zean, November 8, 2026).
 */
function UsedForField({
  options,
  value,
  other,
  error,
  onChange,
}: {
  options: string[]
  value: string[]
  other: string | null
  error: string
  onChange: (next: string[], other: string | null) => void
}) {
  const hintId = useId()
  const errorId = useId()
  const box = 'size-4 cursor-pointer accent-brand-green-dark'
  const row =
    'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-text-primary transition-colors hover:bg-surface motion-reduce:transition-none'
  return (
    <fieldset aria-describedby={error ? `${hintId} ${errorId}` : hintId} className="md:col-span-2">
      <legend className="text-sm font-semibold text-text-primary">
        Commonly used for{' '}
        <span className="text-error" aria-hidden="true">
          *
        </span>
        <span className="sr-only"> (required)</span>
      </legend>
      <p id={hintId} className="mt-1 text-xs text-text-secondary">
        {`When one of these ${symptoms} is chosen on a visit, this item is suggested first. It never hides or blocks another item.`}
      </p>
      <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((option) => (
          <label key={option} className={row}>
            <input
              type="checkbox"
              aria-invalid={error ? true : undefined}
              checked={value.includes(option)}
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? options.filter((o) => o === option || value.includes(o))
                    : value.filter((o) => o !== option),
                  other,
                )
              }
              className={box}
            />
            {option}
          </label>
        ))}
        <label className={row}>
          <input
            type="checkbox"
            checked={other !== null}
            onChange={(event) => onChange(value, event.target.checked ? '' : null)}
            className={box}
          />
          Other
        </label>
      </div>
      {other !== null && (
        <Input
          className="mt-2"
          label={`Other ${symptoms}`}
          value={other}
          maxLength={200}
          placeholder="e.g. toothache, eye irritation"
          hint="Separate with commas."
          aria-invalid={error && !value.length ? true : undefined}
          onChange={(event) => onChange(value, event.target.value)}
        />
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-2 text-xs font-semibold text-error">
          {error}
        </p>
      )}
    </fieldset>
  )
}

/** An item's saved "Other" symptoms as the field's text, or null when it has none. */
function otherOf(usedFor: string[], options: string[]): string | null {
  const other = usedFor.filter((tag) => !options.includes(tag))
  return other.length ? other.join(', ') : null
}

const hasUsedFor = (values: InventoryFormValues) =>
  values.usedFor.length > 0 || (values.usedForOther ?? '').split(',').some((word) => word.trim())

function InventoryFormSkeleton({ back }: { back: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-page-narrow flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
      {back}
      <div aria-hidden="true">
        <Card className="p-5">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="mt-2 h-4 w-96 max-w-full" />
        </Card>
        <Card className="mt-4 p-5">
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-12" />
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

export function InventoryFormPage() {
  const [search] = useSearchParams()
  const itemId = search.get('item') ?? undefined
  const { data, status, reload } = useAsyncData(itemId ?? 'new', () => fetchInventoryForm(itemId))
  const [values, setValues] = useState<InventoryFormValues | null>(null)
  const [error, setError] = useState('')
  const [usedForError, setUsedForError] = useState('')
  const [saved, setSaved] = useState('')
  const [saving, setSaving] = useState(false)
  // `values` is set only by typing; a save shows `saved` until the next change.
  const { cancel, discardDialog } = useCancelNavigation(paths.inventory, values !== null && !saved)
  const invalidRef = useRef<HTMLFormElement>(null)
  const invalid = useFocusFirstInvalid(invalidRef)
  const back = <BackButton fallback={paths.inventory} />
  if (status === 'error')
    return (
      <div className="mx-auto flex max-w-page-narrow flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
        {back}
        <ErrorState asPageTitle title="Unable to load inventory item." onRetry={reload} />
      </div>
    )
  if (!data)
    return (
      <>
        <p className="sr-only" role="status">
          Loading inventory form...
        </p>
        <InventoryFormSkeleton back={back} />
      </>
    )
  const initial =
    values ??
    (data.item
      ? {
          name: data.item.name,
          category: data.item.category,
          currentStock: String(data.item.currentStock),
          unit: data.item.unit,
          expirationDate: data.item.expirationDate ?? '',
          lowStockThreshold: String(data.item.lowStockThreshold),
          noExpirationConfirmed: false,
          brand: data.item.brand ?? '',
          avoidIfAllergicTo: (data.item.avoidIfAllergicTo ?? []).join(', '),
          usedFor: (data.item.usedFor ?? []).filter((tag) => data.symptomOptions.includes(tag)),
          usedForOther: otherOf(data.item.usedFor ?? [], data.symptomOptions),
        }
      : EMPTY)
  const duplicate = findDuplicateItem(data.items, initial.name, itemId)
  function setField<K extends keyof InventoryFormValues>(field: K, value: InventoryFormValues[K]) {
    setValues((current) => ({ ...(current ?? initial), [field]: value }))
    setError('')
    setSaved('')
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (
      !initial.name.trim() ||
      !initial.unit.trim() ||
      initial.currentStock === '' ||
      initial.lowStockThreshold === ''
    ) {
      setError('Complete the item name, unit, stock, and low-stock threshold.')
      invalid.report(
        [
          !initial.name.trim(),
          !initial.unit.trim(),
          initial.currentStock === '',
          initial.lowStockThreshold === '',
        ].filter(Boolean).length,
      )
      return
    }
    if (Number(initial.currentStock) < 0 || Number(initial.lowStockThreshold) < 0) {
      setError('Stock and threshold cannot be negative.')
      invalid.report(1)
      return
    }
    // ADR-035 on Add Item too (panel review IV-2): a date, or the explicit "no expiration" tick.
    if (!itemId && !initial.expirationDate && !initial.noExpirationConfirmed) {
      setError('Choose an expiration date, or confirm this item has no expiration date.')
      invalid.report(1)
      return
    }
    if (!hasUsedFor(initial)) {
      setUsedForError(USED_FOR_REQUIRED)
      invalid.report(1)
      return
    }
    setSaved('')
    setSaving(true)
    try {
      const item = await saveInventoryItem(initial, { itemId })
      setSaved(`${item.name} was ${itemId ? 'updated' : 'added'} successfully.`)
    } catch (caught) {
      if (!(caught instanceof StockRuleError)) throw caught
      setError(caught.message)
    } finally {
      setSaving(false)
    }
  }
  return (
    <div className="mx-auto flex max-w-page-narrow flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
      {discardDialog}
      <BackButton onBack={cancel} />
      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">
              {itemId ? 'Edit Inventory Item' : 'Add Inventory Item'}
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              Keep stock and expiry information ready for safe dispensing.
            </p>
          </div>
        </div>
      </Card>
      <Card aria-labelledby="inventory-form-title">
        <CardHeader
          titleId="inventory-form-title"
          title="Item details"
          icon={<Icon name="package" />}
        />
        <CardBody>
          <form ref={invalidRef} className="flex flex-col gap-5" onSubmit={submit} noValidate>
            <p role="status" className="sr-only">
              {invalid.announcement}
            </p>
            <FormSection
              id="item-details-title"
              title="Item"
              description="What the item is, and who should not be given it."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Item name"
                  required
                  value={initial.name}
                  onChange={(event) => setField('name', event.target.value)}
                />
                <Select
                  label="Category"
                  required
                  value={initial.category}
                  options={[
                    { value: 'medicine', label: 'Medicine' },
                    { value: 'supply', label: 'Supply' },
                  ]}
                  onChange={(value) =>
                    setField('category', value as InventoryFormValues['category'])
                  }
                />
                <Select
                  label="Generic or branded"
                  value={initial.brand}
                  options={BRAND_OPTIONS}
                  hint="A student who wants the branded one pays for it."
                  onChange={(value) => setField('brand', value as InventoryFormValues['brand'])}
                />
                <Input
                  label="Avoid if allergic to"
                  value={initial.avoidIfAllergicTo}
                  maxLength={120}
                  placeholder="e.g. penicillin (optional)"
                  hint="Comma-separated. A patient whose allergies mention one gets a warning when it is given; it never blocks."
                  onChange={(event) => setField('avoidIfAllergicTo', event.target.value)}
                />
                <UsedForField
                  options={data.symptomOptions}
                  value={initial.usedFor}
                  other={initial.usedForOther}
                  error={usedForError}
                  onChange={(next, other) => {
                    setValues((current) => ({
                      ...(current ?? initial),
                      usedFor: next,
                      usedForOther: other,
                    }))
                    setUsedForError('')
                    setError('')
                    setSaved('')
                  }}
                />
              </div>
            </FormSection>
            <FormSection
              id="item-stock-title"
              title="Stock"
              description="How much is on hand, when to warn, and when it expires."
            >
              <div className="grid gap-4 md:grid-cols-2">
                {itemId ? (
                  <ReadOnlyFact
                    label="Current stock"
                    value={`${initial.currentStock} ${initial.unit}`}
                    note="Changes only through Dispense, Restock, or Adjust Stock on the Inventory list."
                  />
                ) : (
                  <Input
                    label="Current stock"
                    required
                    type="number"
                    min="0"
                    value={initial.currentStock}
                    onChange={(event) => setField('currentStock', event.target.value)}
                  />
                )}
                <Combobox
                  label="Unit"
                  required
                  placeholder="tablets, bottles, pieces"
                  value={initial.unit}
                  onValueChange={(value) => setField('unit', value)}
                  options={unitSuggestions(data.items)}
                  optionKey={(option) => option}
                  optionLabel={(option) => option}
                  allowFreeText
                  openOnFocus
                  noMatchesText={null}
                  maxLength={40}
                />
                <Input
                  label="Low-stock threshold"
                  required
                  type="number"
                  min="0"
                  value={initial.lowStockThreshold}
                  onChange={(event) => setField('lowStockThreshold', event.target.value)}
                />
                {itemId ? (
                  <ReadOnlyFact
                    label="Expiration date"
                    value={
                      initial.expirationDate ? formatDate(initial.expirationDate) : 'No expiration'
                    }
                    note="Changes only through Restock on the Inventory list."
                  />
                ) : (
                  <div className="flex flex-col gap-2">
                    <DatePicker
                      label="Expiration date"
                      min={getMockToday()}
                      required={!initial.noExpirationConfirmed}
                      disabled={initial.noExpirationConfirmed}
                      value={initial.expirationDate}
                      onChange={(next) => setField('expirationDate', next)}
                      hint={
                        initial.noExpirationConfirmed
                          ? 'Recorded as no expiration date.'
                          : undefined
                      }
                    />
                    <label className="flex cursor-pointer items-start gap-2 rounded-md border border-border bg-surface px-3 py-2.5 text-sm text-text-primary transition-colors hover:bg-background motion-reduce:transition-none">
                      <input
                        type="checkbox"
                        checked={initial.noExpirationConfirmed}
                        onChange={(event) => {
                          setValues((current) => ({
                            ...(current ?? initial),
                            noExpirationConfirmed: event.target.checked,
                            expirationDate: event.target.checked
                              ? ''
                              : (current ?? initial).expirationDate,
                          }))
                          setError('')
                          setSaved('')
                        }}
                        className="mt-0.5 size-4 cursor-pointer accent-brand-green-dark"
                      />
                      <span>
                        <span className="block font-semibold">
                          This item has no expiration date
                        </span>
                        <span className="block text-xs text-text-secondary">
                          Select only for items with no manufacturer expiration date.
                        </span>
                      </span>
                    </label>
                  </div>
                )}
              </div>
            </FormSection>
            {duplicate && !saved && (
              <p
                role="status"
                className="flex flex-wrap items-center gap-2 rounded-md border border-warning bg-warning-fill px-3 py-2 text-sm text-text-primary"
              >
                {duplicate.name} ({duplicate.unit}) already exists. Restock it instead?
                <Link
                  to={`${paths.inventory}?search=${encodeURIComponent(duplicate.name)}`}
                  className="font-semibold text-brand-green-dark underline underline-offset-2"
                >
                  Go to {duplicate.name}
                </Link>
              </p>
            )}
            {error && (
              <p role="alert" className="text-sm font-semibold text-error">
                {error}
              </p>
            )}
            {saved && (
              <p role="status" className="text-sm font-semibold text-success">
                {saved}
              </p>
            )}
            <div className={`flex flex-wrap justify-end gap-2 pt-4 ${FORM_DIVIDER}`}>
              <Button variant="neutral" onClick={cancel}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                icon="checkCircle"
                loading={saving}
                done={Boolean(saved)}
              >
                {itemId ? 'Save Changes' : 'Add Item'}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  )
}
