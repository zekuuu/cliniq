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

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:gap-3">
      <dt className="text-xs font-semibold text-text-secondary sm:pt-0.5">{label}</dt>
      <dd className="min-w-0 text-sm text-text-primary">{children}</dd>
    </div>
  )
}

/**
 * Read-only safety facts for the student in Stage 1 (panel review IN-1): allergies, conditions and
 * emergency contacts in their saved order, the first being the primary. It adds no input, so fast
 * capture stays fast. A single-student screen, so the full name is shown elsewhere on the form (ADR-004).
 */
export function StudentAlertCard({ student }: { student: Student }) {
  return (
    <section aria-labelledby="student-alert-title" className="rounded-md border border-warning bg-warning/10 p-3">
      <h2 id="student-alert-title" className="flex items-center gap-1.5 text-sm font-semibold text-text-primary">
        <Icon name="alertTriangle" size={16} className="text-warning" />
        Check before treating
      </h2>
      <dl className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
        <Row label="Allergies">
          <Chips items={student.allergies} />
        </Row>
        <Row label="Medical conditions">
          <Chips items={student.medicalConditions} />
        </Row>
      </dl>
      <dl className="mt-2">
        <Row label="Emergency contacts">
          {student.emergencyContacts.length ? (
            <ol className="flex flex-col gap-0.5">
              {student.emergencyContacts.map((contact, index) => (
                <li key={`${contact.name}-${contact.phone}-${index}`} className="flex flex-wrap items-center gap-x-2">
                  <span className="font-semibold">{contact.name}</span>
                  <span className="text-text-secondary">{contact.relationship}</span>
                  <span className="tabular-nums">
                    <span className="sr-only">Phone: </span>
                    {contact.phone}
                  </span>
                  {index === 0 && (
                    <Badge tone="info" variant="soft">
                      Primary
                    </Badge>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <span className="text-text-secondary">None recorded</span>
          )}
        </Row>
      </dl>
    </section>
  )
}
