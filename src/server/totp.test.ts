import { describe, it, expect } from 'vitest';
import {
  buildOtpAuthUri,
  decodeBase32,
  encodeBase32,
  generateHotpFromKey,
  generateTotpSecret,
  generateTotpToken,
  verifyTotpToken,
} from './totp';

describe('RFC 6238 Real TOTP Engine', () => {
  it('encodes and decodes Base32 secrets accurately', () => {
    const raw = Buffer.from('12345678901234567890', 'ascii');
    const b32 = encodeBase32(raw);
    expect(b32).toBe('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
    expect(decodeBase32(b32).toString('ascii')).toBe('12345678901234567890');
  });

  it('matches official RFC 6238 SHA-1 test vectors', () => {
    // Official RFC 6238 Appendix B test vector key: ASCII "12345678901234567890"
    const key = Buffer.from('12345678901234567890', 'ascii');
    const secret = encodeBase32(key);

    // t = 59s -> step = 1 -> 8-digit 94287082 -> 6-digit 287082
    expect(generateHotpFromKey(key, Math.floor(59 / 30), 8, 'sha1')).toBe('94287082');
    expect(generateTotpToken(secret, 59 * 1000)).toBe('287082');

    // t = 1111111109s -> 8-digit 07081804 -> 6-digit 081804
    expect(generateHotpFromKey(key, Math.floor(1111111109 / 30), 8, 'sha1')).toBe('07081804');
    expect(generateTotpToken(secret, 1111111109 * 1000)).toBe('081804');
  });

  it('verifies live tokens within clock-skew window and rejects wrong or replayed tokens', () => {
    const secret = generateTotpSecret(20);
    const nowMs = 1_760_000_000_000;
    const validCode = generateTotpToken(secret, nowMs);

    // Valid live code passes
    const ok = verifyTotpToken(secret, validCode, { timestampMs: nowMs });
    expect(ok.valid).toBe(true);
    expect(ok.matchedStep).toBe(Math.floor(nowMs / 1000 / 30));

    // Replaying the same step is rejected
    const replay = verifyTotpToken(secret, validCode, {
      timestampMs: nowMs,
      lastAcceptedStep: ok.matchedStep,
    });
    expect(replay.valid).toBe(false);
    expect(replay.reason).toBe('replayed_step');

    // Hardcoded demo code like 849201 or arbitrary 6 digits is rejected unless it matches HMAC
    const wrongCode = validCode === '849201' ? '000000' : '849201';
    const fail = verifyTotpToken(secret, wrongCode, { timestampMs: nowMs });
    expect(fail.valid).toBe(false);
    expect(fail.reason).toBe('mismatch');

    // Malformed codes rejected
    expect(verifyTotpToken(secret, '12345', { timestampMs: nowMs }).reason).toBe('invalid_format');
    expect(verifyTotpToken(secret, 'abcdef', { timestampMs: nowMs }).reason).toBe('invalid_format');
  });

  it('builds a valid otpauth:// URI for Authenticator apps', () => {
    const uri = buildOtpAuthUri({
      secret: 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ',
      accountName: 'admin@supremeai.bd',
      issuer: 'SupremeAI Studio',
    });
    expect(uri.startsWith('otpauth://totp/')).toBe(true);
    expect(uri).toContain('secret=GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
    expect(uri).toContain('digits=6');
    expect(uri).toContain('period=30');
  });
});
