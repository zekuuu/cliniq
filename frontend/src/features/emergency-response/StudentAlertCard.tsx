import type { ReactNode } from 'react'
import { Badge, Icon } from '../../components'
import type { Student } from '../../types/entities'

/** An empty list reads "None recorded", never "No allergies": an empty field can also mean "never asked". */
function Chips({ items }: { items: string[] }) {
  if (!items.length) return <span className="text-text-secondary">None recorded</span>
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <li key={item}>
          <Badge tone="warning" variant="soft" icon={null}>
            {item}
          </Badge>
        </li>
      ))}
    </ul>
  )
}

/** Label above its value, so each fact reads as one block instead of a label/value run-on. */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold text-text-secondary">{label}</dt>
      <dd className="mt-1 text-sm text-text-primary">{children}</dd>
    </div>
  )
}

/**
 * Read-only safety facts for the student in Stage 1 (panel review IN-1): allergies, conditions and
 * emergency contacts in their saved order. It adds no input, so fast
 * capture stays fast. A single-student screen, so the full name is shown elsewhere on the form (ADR-004).
 */
export function StudentAlertCard({ student }: { student: Student }) {
  return (
    <section aria-labelledby="student-alert-title" className="rounded-md border border-warning bg-warning/10 p-3">
      <h2 id="student-alert-title" className="flex items-center gap-1.5 text-sm font-semibold text-text-primary">
        <Icon name="alertTriangle" size={16} className="text-warning" />
        Check before treating
      </h2>
      <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-3">
        <Field label="Allergies">
          <Chips items={student.allergies} />
        </Field>
        <Field label="Medical conditions">
          <Chips items={student.medicalConditions} />
        </Field>
        <Field label="Emergency contacts">
          {student.emergencyContacts.length ? (
            <ol className="flex flex-col gap-2">
              {student.emergencyContacts.map((contact, index) => (
                <li key={`${contact.name}-${contact.phone}-${index}`}>
                  <span className="block font-semibold">{contact.name}</span>
                  <span className="block text-text-secondary">{contact.relationship}</span>
                  <span className="block tabular-nums">
                    <span className="sr-only">Phone: </span>
                    {contact.phone}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <span className="text-text-secondary">None recorded</span>
          )}
        </Field>
      </dl>
    </section>
  )
}
