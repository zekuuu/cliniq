import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { usePrinting } from '../../hooks/usePrinting'
import { cn } from '../../lib/cn'
import { formatDateTime } from '../../lib/dates'
import { getMockSessionUser, ROLE_LABELS, type PrintAuditRecord, type SessionUser } from '../../lib/mock-db'

/*
 * Purpose-built printouts (ADR-026, `.claude/skills/cliniq-print-patterns`). A printout is its own
 * A4 document, not the screen with the buttons hidden: a letterhead, a "what is this" line, the
 * content in reading order, and a printed-by footer on every page.
 *
 * `PrintDocument` mounts only while the browser prints (`usePrinting`) and renders into `document.body`
 * as `[data-print-document]`; `index.css` then hides the app for that print. So the screen pays nothing
 * for it and it must render from data the screen already loaded: printing never fetches.
 */

const LOGO_SRC = '/MCA_Logo.png'
// Warm the cache so the letterhead logo is ready when the print tree mounts mid-print.
if (typeof window !== 'undefined' && typeof Image !== 'undefined') new Image().src = LOGO_SRC

export const CONFIDENTIALITY_LINE =
  "Confidential: contains student health information. Handle according to the school's Data Privacy policy."

const FOOTER_FONT = `font-family: 'Inter Variable', 'Segoe UI', Arial, sans-serif; font-size: 7.5pt; line-height: 1.35; color: #1a1a1a; vertical-align: top; padding-top: 3mm;`

/** A CSS string literal; `\A` is a line break inside generated content. */
function cssString(text: string): string {
  return `"${text.replace(/[\\"]/g, '\\$&').replace(/[\r\n]+/g, '\\A ')}"`
}

/**
 * The footer lives in the page's bottom margin (CSS `@page` margin boxes), so it repeats on every page
 * without ever overlapping the content. The text depends on who prints and when, so it is generated here.
 */
function footerCss(printedBy: string, confidentiality: string): string {
  return `@page {
  @bottom-left { content: ${cssString(`${printedBy}\n${confidentiality}`)}; white-space: pre-wrap; ${FOOTER_FONT} }
  @bottom-right { content: "Page " counter(page) " of " counter(pages); white-space: nowrap; text-align: right; ${FOOTER_FONT} }
}`
}

function printedByLine(printedAt: string, viewer: SessionUser): string {
  return `Printed ${formatDateTime(printedAt)} (Philippine time) by ${viewer.name}, ${ROLE_LABELS[viewer.role]}`
}

export interface PrintDocumentProps {
  /** Document title under the letterhead, e.g. "Clinic Overview Report". */
  title: string
  /** The "what is this" line, in plain words: the period, month, filters, or student it covers. */
  scope: ReactNode
  children: ReactNode
  /** Only for a table that can't be read in portrait (`@page landscape` in `index.css`). */
  landscape?: boolean
  viewer?: SessionUser
  /** The footer's confidentiality line, when a document needs its own (the Sports Report). */
  confidentiality?: string
  /** Makes the print's audit entry name this record instead of the title (`usePrinting`). */
  auditRecord?: PrintAuditRecord
}

export function PrintDocument({
  title,
  scope,
  children,
  landscape = false,
  viewer = getMockSessionUser(),
  confidentiality = CONFIDENTIALITY_LINE,
  auditRecord,
}: PrintDocumentProps) {
  const printedAt = usePrinting(title, viewer, auditRecord)
  if (!printedAt) return null
  return createPortal(
    <div
      data-print-document
      className={cn(
        'hidden text-[10pt] leading-snug text-text-primary print:block',
        landscape && '[page:landscape]',
      )}
    >
      <style>{footerCss(printedByLine(printedAt, viewer), confidentiality)}</style>
      <header className="flex items-center gap-[4mm] border-b-2 border-text-primary pb-[3mm]">
        <img src={LOGO_SRC} alt="" className="size-[15mm] shrink-0 object-contain" />
        <div className="min-w-0">
          <p className="text-[10.5pt] font-semibold">Mendez Christian Academy — School Clinic</p>
          <h1 className="text-[16pt] leading-tight font-bold">{title}</h1>
        </div>
      </header>
      <p data-print-scope className="mt-[2.5mm] text-[10.5pt]">
        {scope}
      </p>
      <div className="mt-[4mm]">{children}</div>
    </div>,
    document.body,
  )
}

export function PrintSection({
  title,
  children,
  className,
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('mt-[5mm] first:mt-0', className)}>
      <h2 className="mb-[2mm] break-after-avoid border-b border-text-primary pb-[0.5mm] text-[12pt] font-bold">
        {title}
      </h2>
      {children}
    </section>
  )
}

/** A plain line of text inside a section, e.g. an empty group or a note under a table. */
export function PrintNote({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('mt-[1.5mm] text-[9.5pt] text-text-secondary', className)}>{children}</p>
}

export interface PrintColumn<T> {
  header: string
  cell: (row: T) => ReactNode
  align?: 'right'
  /** A `col` width, e.g. "30%". */
  width?: string
}

/** A paper table: header row repeats on every page, rows never split, and an empty table says so. */
export function PrintTable<T>({
  caption,
  columns,
  rows,
  rowKey,
  empty,
}: {
  caption: string
  columns: Array<PrintColumn<T>>
  rows: T[]
  rowKey: (row: T, index: number) => string
  empty: string
}) {
  if (!rows.length) return <PrintNote className="text-text-primary">{empty}</PrintNote>
  return (
    <table className="w-full table-fixed border-collapse text-[9pt] leading-tight">
      <caption className="sr-only">{caption}</caption>
      <colgroup>
        {columns.map((column) => (
          <col key={column.header} style={column.width ? { width: column.width } : undefined} />
        ))}
      </colgroup>
      <thead className="table-header-group">
        <tr className="border-b-[1.5px] border-text-primary">
          {columns.map((column) => (
            <th
              key={column.header}
              scope="col"
              className={cn(
                'px-[1.5mm] py-[0.8mm] text-left align-bottom font-semibold',
                column.align === 'right' && 'text-right',
              )}
            >
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={rowKey(row, index)} className="break-inside-avoid border-b border-border">
            {columns.map((column) => (
              <td
                key={column.header}
                className={cn(
                  'px-[1.5mm] py-[0.8mm] align-top wrap-break-word',
                  column.align === 'right' && 'text-right tabular-nums',
                )}
              >
                {column.cell(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export interface PrintFigure {
  label: string
  value: ReactNode
  /** Plain-words context under the value, e.g. "Oct 1 – Oct 15" or "Up from 4 last month". */
  note?: string
}

/** Key figures in a row of boxed cells with plain labels. */
export function PrintFigures({ figures }: { figures: PrintFigure[] }) {
  return (
    <dl
      className="grid break-inside-avoid gap-[2mm]"
      style={{ gridTemplateColumns: `repeat(${Math.min(figures.length, 5)}, minmax(0, 1fr))` }}
    >
      {figures.map((figure) => (
        <div
          key={figure.label}
          className="rounded-sm border border-text-secondary px-[2.5mm] py-[1.5mm]"
        >
          <dt className="text-[9pt] font-semibold">{figure.label}</dt>
          <dd className="text-[16pt] leading-tight font-bold tabular-nums">{figure.value}</dd>
          {figure.note && <dd className="text-[8.5pt] text-text-secondary">{figure.note}</dd>}
        </div>
      ))}
    </dl>
  )
}

/**
 * A grayscale-safe bar chart: each bar is labeled directly with its name and number, so it reads in
 * black and white and the table beside it is never the only place the numbers appear.
 */
export function PrintBars({
  caption,
  rows,
}: {
  caption: string
  rows: Array<{ label: string; value: number }>
}) {
  const max = Math.max(1, ...rows.map((row) => row.value))
  return (
    <figure className="break-inside-avoid">
      <figcaption className="sr-only">{caption}</figcaption>
      <div
        aria-hidden="true"
        className="grid grid-cols-[minmax(0,38%)_1fr_3.5em] items-center gap-x-[2mm] gap-y-[1mm] text-[9pt]"
      >
        {rows.map((row) => (
          <div key={row.label} className="contents">
            <span className="truncate">{row.label}</span>
            <span className="h-[3mm] border border-text-primary">
              <span
                className="block h-full bg-text-secondary"
                style={{ width: `${(row.value / max) * 100}%` }}
              />
            </span>
            <span className="text-right font-semibold tabular-nums">{row.value}</span>
          </div>
        ))}
      </div>
    </figure>
  )
}

const FIELD_COLUMNS = { 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' } as const

/** Labeled values in a grid (identity blocks, record details); `wide` spans the whole row. */
export function PrintFields({
  fields,
  columns = 2,
}: {
  fields: Array<{ label: string; value: ReactNode; wide?: boolean }>
  columns?: keyof typeof FIELD_COLUMNS
}) {
  return (
    <dl className={cn('grid gap-x-[6mm] gap-y-[2mm]', FIELD_COLUMNS[columns])}>
      {fields.map((field) => (
        <div key={field.label} className={cn('break-inside-avoid', field.wide && 'col-span-full')}>
          <dt className="text-[8.5pt] font-semibold text-text-secondary uppercase">
            {field.label}
          </dt>
          <dd className="whitespace-pre-line">{field.value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Signature lines with room for a handwritten signature above each. */
export function PrintSignatures({ lines }: { lines: Array<{ label: string; name?: string }> }) {
  return (
    <div className="mt-[8mm] grid break-inside-avoid grid-cols-3 gap-[8mm]">
      {lines.map((line) => (
        <div key={line.label} className="pt-[12mm]">
          <div className="border-t border-text-primary pt-[1mm]">
            {line.name && <p className="font-semibold">{line.name}</p>}
            <p className="text-[9pt] text-text-secondary">{line.label}</p>
            <p className="mt-[3mm] text-[9pt] text-text-secondary">Date: ____________</p>
          </div>
        </div>
      ))}
    </div>
  )
}
