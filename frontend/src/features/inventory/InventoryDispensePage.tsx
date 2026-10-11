import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, ErrorState, Icon, Input, InventoryItemPicker, Select, Skeleton, StudentNumberField } from '../../components'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useCancelNavigation } from '../../hooks/useCancelNavigation'
import { formatDateTime } from '../../lib/dates'
import { StockRuleError } from '../../lib/mock-db'
import { isStudentNumber, normalizeStudentNumber } from '../../lib/studentNumber'
import { paths } from '../../routes/paths'
import { dispenseInventoryItem, fetchInventory, findDispenseStudent } from './api/inventoryApi'

type Recipient = '' | 'student' | 'general'

const recipientOptions = [
  { value: 'student', label: 'A student' },
  { value: 'general', label: 'Not for a student (general use)' },
]

function DispenseSkeleton() {
  return <div aria-hidden="true" className="mx-auto flex max-w-page-narrow flex-col gap-4 px-4 pt-10 pb-8 sm:px-8"><Card className="p-5"><Skeleton className="h-7 w-64" /><Skeleton className="mt-2 h-4 w-80 max-w-full" /></Card><Card className="p-5"><Skeleton className="h-12" /><Skeleton className="mt-4 h-12" /><div className="mt-4 flex justify-end gap-2"><Skeleton className="h-10 w-24" /><Skeleton className="h-10 w-44" /></div></Card></div>
}

/**
 * Standalone Dispense (#30), for medicine or supplies given outside a visit. It must name a student
 * or say it's general use. When the student already has a visit today, a notice links to that visit
 * so the medicine is added there instead of being recorded twice (ADR-018). Expired items can't be
 * dispensed, here or in the data layer.
 */
export function InventoryDispensePage() {
  const [search] = useSearchParams()
  const preselected = search.get('student') ?? ''
  const { data: items, status, reload } = useAsyncData('dispense-items', () => fetchInventory({ search: '', category: '' }))
  const [recipient, setRecipient] = useState<Recipient>(preselected ? 'student' : '')
  const [studentNumber, setStudentNumber] = useState(preselected)
  const [itemId, setItemId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [errors, setErrors] = useState<{ recipient?: string; student?: string; item?: string; quantity?: string; save?: string }>({})
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)
  const cancel = useCancelNavigation(paths.inventory)
  const lookupNumber = recipient === 'student' && isStudentNumber(studentNumber) ? studentNumber : ''
  const { data: lookup } = useAsyncData(`dispense-student|${lookupNumber}`, () =>
    lookupNumber ? findDispenseStudent(lookupNumber).catch(() => null) : Promise.resolve(undefined),
  )

  if (status === 'error') return <div className="mx-auto max-w-page-narrow px-4 pt-10 pb-8 sm:px-8"><ErrorState title="Unable to load inventory items." onRetry={reload} /></div>
  if (!items) return <><p className="sr-only" role="status">Loading inventory items...</p><DispenseSkeleton /></>
  if (!items.length) return <div className="mx-auto max-w-page-narrow px-4 pt-10 pb-8 sm:px-8"><EmptyState icon="package" title="No inventory items available" description="Add an item on the Inventory page before recording a dispensation." /></div>

  const item = items.find((candidate) => candidate.id === itemId)
  const amount = Number(quantity)
  const overStock = item && Number.isInteger(amount) && amount > item.currentStock

  async function submit(event: FormEvent) {
    event.preventDefault()
    const next: typeof errors = {}
    if (!recipient) next.recipient = 'Choose who this is for.'
    if (recipient === 'student' && !isStudentNumber(studentNumber)) next.student = 'Enter the Student Number (YYYY-NNNNN).'
    else if (recipient === 'student' && lookup === null) next.student = 'No student has this Student Number. Check it and try again.'
    if (!item) next.item = 'Choose an item.'
    if (!Number.isInteger(amount) || amount < 1) next.quantity = 'Enter a whole-number quantity of at least 1.'
    setErrors(next)
    if (Object.keys(next).length || !item) return
    setSaving(true)
    try {
      const result = await dispenseInventoryItem(item.id, amount, recipient === 'student' ? studentNumber : undefined)
      setSuccess(`${amount} ${result.item.unit} of ${result.item.name} recorded${recipient === 'student' ? ` for ${studentNumber}` : ' for general use'}. Remaining stock: ${result.remainingStock}.${result.belowZero ? ' Stock is now below zero; recount and restock.' : ''}`)
      setItemId('')
      setQuantity('1')
      reload()
    } catch (caught) {
      if (!(caught instanceof StockRuleError)) throw caught
      setErrors({ save: `${caught.message} Nothing was recorded.` })
      reload()
    } finally {
      setSaving(false)
    }
  }

  const clear = (field: keyof typeof errors) => {
    setErrors((current) => ({ ...current, [field]: undefined, save: undefined }))
    setSuccess('')
  }

  return (
    <div className="mx-auto flex max-w-page-narrow flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
      <Card className="p-5"><div className="flex items-start justify-between gap-3"><div><h1 className="text-2xl font-bold tracking-tight text-text-primary">Dispense Medicine or Supply</h1><p className="mt-1 text-sm text-text-secondary">For use outside a clinic visit. Medicine given during a visit belongs on that visit.</p></div><Badge tone="warning" variant="soft" icon="package">Stock action</Badge></div></Card>
      <Card aria-labelledby="dispense-title"><CardHeader titleId="dispense-title" title="Dispensation details" icon={<Icon name="package" />} /><CardBody>
        <form noValidate className="flex flex-col gap-4" onSubmit={submit}>
          <Select label="For" required value={recipient} placeholder="Choose who this is for" options={recipientOptions} error={errors.recipient} onChange={(value) => { setRecipient(value as Recipient); clear('recipient') }} />
          {recipient === 'student' && (
            <StudentNumberField value={studentNumber} error={errors.student} hint="The student who received it." onChange={(value) => { setStudentNumber(normalizeStudentNumber(value)); clear('student') }} />
          )}
          {recipient === 'student' && lookup?.todaysVisit && (
            <div role="status" className="rounded-md border border-info bg-info/10 px-4 py-3 text-sm text-text-primary">
              <p className="font-semibold">This student already has a visit today ({formatDateTime(lookup.todaysVisit.dateTime)}).</p>
              <p className="mt-1">If this medicine is part of that visit, add it there instead so it isn't recorded twice.</p>
              <Link className="mt-2 inline-flex items-center gap-1 font-semibold text-brand-green-dark underline hover:brightness-75" to={paths.visitDetail(lookup.todaysVisit.id)}>Open today’s visit<Icon name="arrowRight" size={14} /></Link>
            </div>
          )}
          {item ? (
            <div className="flex flex-col gap-1">
              <p className="text-xs font-semibold text-text-primary">Item <span className="text-error" aria-hidden="true">*</span></p>
              <div className="flex h-10 items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 text-sm">
                <span className="font-semibold text-text-primary">{item.name} <span className="font-normal text-text-secondary">· {item.currentStock} {item.unit} in stock</span></span>
                <button type="button" aria-label={`Change item (${item.name})`} onClick={() => setItemId('')} className="inline-flex cursor-pointer rounded-sm text-text-secondary transition-colors hover:text-brand-green-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green motion-reduce:transition-none"><Icon name="xCircle" /></button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <InventoryItemPicker label="Item" items={items} onPick={(id) => { setItemId(id); clear('item') }} />
              {errors.item && <p role="alert" className="text-xs font-semibold text-error">{errors.item}</p>}
            </div>
          )}
          <Input label="Quantity" required type="number" min="1" step="1" value={quantity} error={errors.quantity} hint={item ? `In ${item.unit}.` : undefined} onChange={(event) => { setQuantity(event.target.value); clear('quantity') }} />
          {overStock && <p className="flex items-start gap-1 text-xs font-semibold text-warning"><Icon name="alertTriangle" size={14} className="mt-px shrink-0" />Only {item.currentStock} {item.unit} in stock. Recording this takes stock below zero; recount and restock.</p>}
          {errors.save && <p role="alert" className="text-sm font-semibold text-error">{errors.save}</p>}
          {success && <p role="status" className="text-sm font-semibold text-success">{success}</p>}
          <div className="flex flex-wrap justify-end gap-2"><Button variant="neutral" onClick={cancel}>Cancel</Button><Button type="submit" variant="primary" icon="checkCircle" loading={saving}>Record Dispensation</Button></div>
        </form>
      </CardBody></Card>
    </div>
  )
}
