import { describe, expect, it } from 'vitest'
import { isPhilippinePhone } from './phone'

describe('isPhilippinePhone', () => {
  it('accepts mobile and landline numbers in their usual formats', () => {
    for (const value of [
      '0917 123 4567',
      '09171234567',
      '0900-111-2000',
      '+63 917 123 4567',
      '639171234567',
      '(02) 8123-4567',
      '032 234 5678',
      '+63 2 8123 4567',
      '8123 4567',
      '234-5678',
    ]) {
      expect(isPhilippinePhone(value), value).toBe(true)
    }
  })

  it('rejects letters, short or long numbers, and a mobile number missing a digit', () => {
    for (const value of [
      '89r91r91r',
      '',
      '12345',
      '0917123456',
      '091712345678',
      '0123456789',
      'none',
    ]) {
      expect(isPhilippinePhone(value), value).toBe(false)
    }
  })
})
