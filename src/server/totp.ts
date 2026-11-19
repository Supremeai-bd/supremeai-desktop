import crypto from 'crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function encodeBase32(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

export function decodeBase32(input: string): Buffer {
  const normalized = String(input || '')
    .toUpperCase()
    .replace(/[\s-]+/g, '')
    .replace(/=+$/, '');

  if (!normalized) {
    throw new Error('TOTP secret cannot be empty.');
  }

  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < normalized.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(normalized[i]);
    if (idx === -1) {
      throw new Error(`Invalid Base32 character in TOTP secret: ${normalized[i]}`);
    }
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

export function generateTotpSecret(byteLength = 20): string {
  return encodeBase32(crypto.randomBytes(byteLength));
}

export function generateHotpFromKey(
  keyBuffer: Buffer,
  counter: number,
  digits = 6,
  algorithm: 'sha1' | 'sha256' | 'sha512' = 'sha1'
): string {
  const msg = Buffer.alloc(8);
  let remaining = BigInt(counter);
  for (let i = 7; i >= 0; i--) {
    msg[i] = Number(remaining & 0xffn);
    remaining >>= 8n;
  }

  const hmac = crypto.createHmac(algorithm, keyBuffer).update(msg).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const mod = 10 ** digits;
  return String(binary % mod).padStart(digits, '0');
}

export function generateTotpToken(
  base32Secret: string,
  timestampMs = Date.now(),
  stepSeconds = 30,
  digits = 6
): string {
  const key = decodeBase32(base32Secret);
  const step = Math.floor(timestampMs / 1000 / stepSeconds);
  return generateHotpFromKey(key, step, digits, 'sha1');
}

export interface VerifyTotpOptions {
  timestampMs?: number;
  window?: number;
  stepSeconds?: number;
  digits?: number;
  lastAcceptedStep?: number | null;
}

export interface VerifyTotpResult {
  valid: boolean;
  matchedStep: number | null;
  reason?: 'invalid_format' | 'invalid_secret' | 'replayed_step' | 'mismatch';
}

export function verifyTotpToken(
  base32Secret: string,
  token: string,
  options: VerifyTotpOptions = {}
): VerifyTotpResult {
  const {
    timestampMs = Date.now(),
    window = 1,
    stepSeconds = 30,
    digits = 6,
    lastAcceptedStep = null,
  } = options;

  const cleanToken = String(token || '').replace(/\s+/g, '');
  const digitsRegex = new RegExp(`^\\d{${digits}}$`);
  if (!digitsRegex.test(cleanToken)) {
    return { valid: false, matchedStep: null, reason: 'invalid_format' };
  }

  let key: Buffer;
  try {
    key = decodeBase32(base32Secret);
  } catch {
    return { valid: false, matchedStep: null, reason: 'invalid_secret' };
  }

  const currentStep = Math.floor(timestampMs / 1000 / stepSeconds);
  const providedBuf = Buffer.from(cleanToken, 'utf8');

  for (let delta = -window; delta <= window; delta++) {
    const candidateStep = currentStep + delta;
    if (candidateStep < 0) continue;

    const expected = generateHotpFromKey(key, candidateStep, digits, 'sha1');
    const expectedBuf = Buffer.from(expected, 'utf8');

    if (
      providedBuf.length === expectedBuf.length &&
      crypto.timingSafeEqual(providedBuf, expectedBuf)
    ) {
      if (lastAcceptedStep !== null && candidateStep <= lastAcceptedStep) {
        return { valid: false, matchedStep: candidateStep, reason: 'replayed_step' };
      }
      return { valid: true, matchedStep: candidateStep };
    }
  }

  return { valid: false, matchedStep: null, reason: 'mismatch' };
}

export function buildOtpAuthUri(params: {
  secret: string;
  accountName: string;
  issuer?: string;
}): string {
  const issuer = params.issuer || 'SupremeAI Studio';
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(params.accountName)}`;
  const query = new URLSearchParams({
    secret: params.secret.replace(/\s+/g, '').toUpperCase(),
    issuer,
    algorithm: 'SHA1',
    digits: '6',
    period: '30',
  });
  return `otpauth://totp/${label}?${query.toString()}`;
}
