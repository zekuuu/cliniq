// Spaces, dashes, dots, and parentheses are only formatting: "0917 123 4567", "(02) 8123-4567".
const SEPARATORS = /[\s().-]/g

/**
 * A Philippine phone number: a mobile number (0917 123 4567 or +63 917 123 4567), a landline with
 * its area code (02 8123 4567, 032 234 5678, or +63 2 8123 4567), or a 7- or 8-digit local landline.
 */
const PHILIPPINE_PHONE = /^(?:09\d{9}|\+?639\d{9}|0[2-8]\d{8}|\+?63[2-8]\d{8}|\d{7,8})$/

export function isPhilippinePhone(value: string): boolean {
  return PHILIPPINE_PHONE.test(value.trim().replace(SEPARATORS, ''))
}

export const PHONE_ERROR =
  'Enter a Philippine mobile number (like 0917 123 4567) or a landline number (like 02 8123 4567).'
