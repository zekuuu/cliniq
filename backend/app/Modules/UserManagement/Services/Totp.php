<?php

declare(strict_types=1);

namespace App\Modules\UserManagement\Services;

/**
 * RFC 6238 codes: SHA-1, 30-second steps, 6 digits, one step either way (ADR-073). Same as
 * `frontend/src/lib/totp.ts`, so a secret made by either works with both.
 */
final class Totp
{
    private const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

    public const STEP_SECONDS = 30;

    /** A random 160-bit secret, base32. */
    public static function secret(): string
    {
        return self::base32(random_bytes(20));
    }

    /** Eight "XXXX-XXXX" codes from the base32 letters. */
    /** @return list<string> */
    public static function recoveryCodes(int $count = 8): array
    {
        $codes = [];
        for ($i = 0; $i < $count; $i++) {
            $raw = self::base32(random_bytes(5));
            $codes[] = substr($raw, 0, 4).'-'.substr($raw, 4, 4);
        }

        return $codes;
    }

    /** A recovery code as typed: case and dashes ignored. */
    public static function normalizeRecoveryCode(string $code): string
    {
        return (string) preg_replace('/[^A-Z2-7]/', '', strtoupper($code));
    }

    public static function uri(string $username, string $secret): string
    {
        return 'otpauth://totp/'.rawurlencode("CLINIQ:{$username}")."?secret={$secret}&issuer=CLINIQ&algorithm=SHA1&digits=6&period=".self::STEP_SECONDS;
    }

    /** The step the code matches (now, one before or one after), else null. */
    public static function matchStep(string $secret, string $code, int $now): ?int
    {
        $typed = (string) preg_replace('/\s/', '', $code);
        if (preg_match('/\A\d{6}\z/', $typed) !== 1) {
            return null;
        }
        $key = self::unbase32($secret);
        $step = intdiv($now, self::STEP_SECONDS);
        foreach ([$step - 1, $step, $step + 1] as $candidate) {
            if (hash_equals(self::hotp($key, $candidate), $typed)) {
                return $candidate;
            }
        }

        return null;
    }

    /** The code an authenticator app shows at `$now`. */
    public static function codeAt(string $secret, int $now): string
    {
        return self::hotp(self::unbase32($secret), intdiv($now, self::STEP_SECONDS));
    }

    public static function hotp(string $key, int $counter): string
    {
        $hash = hash_hmac('sha1', pack('J', $counter), $key, true);
        $offset = ord($hash[19]) & 15;
        $binary = ((ord($hash[$offset]) & 127) << 24) | (ord($hash[$offset + 1]) << 16) | (ord($hash[$offset + 2]) << 8) | ord($hash[$offset + 3]);

        return str_pad((string) ($binary % 1000000), 6, '0', STR_PAD_LEFT);
    }

    private static function base32(string $bytes): string
    {
        $bits = '';
        foreach (str_split($bytes) as $byte) {
            $bits .= str_pad(decbin(ord($byte)), 8, '0', STR_PAD_LEFT);
        }
        $out = '';
        foreach (str_split($bits, 5) as $chunk) {
            $out .= substr(self::ALPHABET, (int) bindec(str_pad($chunk, 5, '0')), 1);
        }

        return $out;
    }

    private static function unbase32(string $text): string
    {
        $bits = '';
        foreach (str_split((string) preg_replace('/[\s=]/', '', strtoupper($text))) as $char) {
            $value = strpos(self::ALPHABET, $char);
            if ($value !== false) {
                $bits .= str_pad(decbin($value), 5, '0', STR_PAD_LEFT);
            }
        }
        $out = '';
        foreach (str_split($bits, 8) as $byte) {
            if (strlen($byte) === 8) {
                $out .= chr((int) bindec($byte) & 255);
            }
        }

        return $out;
    }
}
