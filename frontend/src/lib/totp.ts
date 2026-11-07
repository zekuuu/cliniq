/**
 * Authenticator-app codes (RFC 6238 TOTP over RFC 4226 HOTP): HMAC-SHA1, 30-second steps, 6 digits.
 * The phone computes the code from the shared secret and its own clock, so neither the phone nor the
 * clinic computer needs the internet, and nothing goes to Google (ADR-072). Web Crypto only.
 */

export const TOTP_STEP_SECONDS = 30
export const TOTP_DIGITS = 6
/** Codes one step before or after are accepted, for a phone clock a little off. */
export const TOTP_DRIFT_STEPS = 1

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function base32Encode(bytes: Uint8Array): string {
  let bits = 0
  let value = 0
  let out = ''
  for (const byte of bytes) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31]
  return out
}

/** Reads a key typed by hand too: case, spaces and "=" padding are ignored. Throws on other letters. */
export function base32Decode(text: string): Uint8Array {
  const clean = text.toUpperCase().replace(/[\s=]/g, '')
  let bits = 0
  let value = 0
  const out: number[] = []
  for (const char of clean) {
    const index = BASE32.indexOf(char)
    if (index < 0) throw new Error('Not a base32 key.')
    value = (value << 5) | index
    bits += 5
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  return new Uint8Array(out)
}

/** A random 160-bit secret, base32 (the length RFC 4226 recommends). */
export function generateTotpSecret(): string {
  return base32Encode(crypto.getRandomValues(new Uint8Array(20)))
}

async function hmacSha1(key: Uint8Array, message: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey('raw', key as BufferSource, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign'])
  return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, message as BufferSource))
}

/** RFC 4226: the code for one counter value. */
export async function hotp(key: Uint8Array, counter: number, digits = TOTP_DIGITS): Promise<string> {
  const message = new Uint8Array(8)
  let rest = counter
  for (let i = 7; i >= 0; i -= 1) {
    message[i] = rest % 256
    rest = Math.floor(rest / 256)
  }
  const hash = await hmacSha1(key, message)
  const offset = hash[hash.length - 1] & 15
  const binary = ((hash[offset] & 127) << 24) | (hash[offset + 1] << 16) | (hash[offset + 2] << 8) | hash[offset + 3]
  return String(binary % 10 ** digits).padStart(digits, '0')
}

/** RFC 6238: the code at a moment (milliseconds since 1970). */
export function totp(key: Uint8Array, atMs: number, digits = TOTP_DIGITS): Promise<string> {
  return hotp(key, Math.floor(atMs / 1000 / TOTP_STEP_SECONDS), digits)
}

/** True when `code` is the code now, one step before, or one step after. */
export async function verifyTotp(secret: string, code: string, atMs: number): Promise<boolean> {
  const typed = code.replace(/\s/g, '')
  if (!/^\d{6}$/.test(typed)) return false
  const key = base32Decode(secret)
  const step = Math.floor(atMs / 1000 / TOTP_STEP_SECONDS)
  for (let drift = -TOTP_DRIFT_STEPS; drift <= TOTP_DRIFT_STEPS; drift += 1) if ((await hotp(key, step + drift)) === typed) return true
  return false
}

/** The link an authenticator app reads from the QR code. */
export function otpauthUri(username: string, secret: string): string {
  const label = encodeURIComponent(`CLINIQ:${username}`)
  return `otpauth://totp/${label}?secret=${secret}&issuer=CLINIQ&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_STEP_SECONDS}`
}

/** Eight one-time recovery codes, "XXXX-XXXX" from the base32 letters (no 0/O or 1/I mix-ups). */
export function generateRecoveryCodes(count = 8): string[] {
  return Array.from({ length: count }, () => {
    const raw = base32Encode(crypto.getRandomValues(new Uint8Array(5)))
    return `${raw.slice(0, 4)}-${raw.slice(4, 8)}`
  })
}

/** SHA-256 hex of a recovery code as typed (case and dashes ignored). The mock never stores a code in plain text. */
export async function hashRecoveryCode(code: string): Promise<string> {
  const normalized = code.toUpperCase().replace(/[^A-Z2-7]/g, '')
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalized))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}
