import { describe, expect, it } from 'vitest'
import {
  base32Decode,
  base32Encode,
  generateRecoveryCodes,
  generateTotpSecret,
  hashRecoveryCode,
  hotp,
  otpauthUri,
  totp,
  verifyTotp,
} from './totp'

// RFC 6238 Appendix B: the SHA-1 key is the ASCII "12345678901234567890"; frozen clock values, no real time.
const RFC_KEY = new TextEncoder().encode('12345678901234567890')
const RFC_VECTORS: Array<[number, string]> = [
  [59, '94287082'],
  [1111111109, '07081804'],
  [1111111111, '14050471'],
  [1234567890, '89005924'],
  [2000000000, '69279037'],
  [20000000000, '65353130'],
]

describe('TOTP (RFC 6238)', () => {
  it.each(RFC_VECTORS)('matches the RFC test vector at %i seconds', async (seconds, code) => {
    expect(await totp(RFC_KEY, seconds * 1000, 8)).toBe(code)
  })

  it('matches the RFC 4226 HOTP vectors', async () => {
    const expected = [
      '755224',
      '287082',
      '359152',
      '969429',
      '338314',
      '254676',
      '287922',
      '162583',
      '399871',
      '520489',
    ]
    for (const [counter, code] of expected.entries())
      expect(await hotp(RFC_KEY, counter)).toBe(code)
  })

  it('accepts one step of clock drift either way, and nothing further or wrong', async () => {
    const secret = base32Encode(RFC_KEY)
    const at = 1234567890 * 1000
    const now = await totp(RFC_KEY, at)
    expect(await verifyTotp(secret, now, at)).toBe(true)
    expect(await verifyTotp(secret, await totp(RFC_KEY, at - 30_000), at)).toBe(true)
    expect(await verifyTotp(secret, await totp(RFC_KEY, at + 30_000), at)).toBe(true)
    expect(await verifyTotp(secret, await totp(RFC_KEY, at - 60_000), at)).toBe(false)
    expect(await verifyTotp(secret, '000000', at)).toBe(now === '000000')
    expect(await verifyTotp(secret, '12345', at)).toBe(false)
  })

  it('round-trips base32, reads a hand-typed key, and makes 160-bit secrets', () => {
    expect(base32Encode(RFC_KEY)).toBe('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ')
    expect([...base32Decode('gezd gnbv gy3t qojq gezd gnbv gy3t qojq')]).toEqual([...RFC_KEY])
    expect(base32Decode(generateTotpSecret())).toHaveLength(20)
    expect(() => base32Decode('NOT-BASE32!')).toThrow()
  })

  it('builds the standard otpauth link', () => {
    expect(otpauthUri('demo.nurse', 'ABC')).toBe(
      'otpauth://totp/CLINIQ%3Ademo.nurse?secret=ABC&issuer=CLINIQ&algorithm=SHA1&digits=6&period=30',
    )
  })

  it('makes 8 distinct recovery codes and hashes them, ignoring case and dashes', async () => {
    const codes = generateRecoveryCodes()
    expect(new Set(codes).size).toBe(8)
    expect(codes[0]).toMatch(/^[A-Z2-7]{4}-[A-Z2-7]{4}$/)
    const hash = await hashRecoveryCode(codes[0])
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
    expect(await hashRecoveryCode(codes[0].toLowerCase().replace('-', ''))).toBe(hash)
    expect(hash).not.toContain(codes[0])
  })
})
