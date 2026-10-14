const decimal = new Intl.NumberFormat('en-PH', { maximumFractionDigits: 2, useGrouping: false })

/**
 * Shows a reading with at most 2 decimal places ("36.912" -> "36.91", "104" -> "104").
 * Non-numeric text such as a blood pressure "120/80" is returned unchanged.
 */
export function formatDecimal(value: string | number): string {
  const text = String(value).trim()
  const number = Number(text)
  return text !== '' && Number.isFinite(number) ? decimal.format(number) : text
}
