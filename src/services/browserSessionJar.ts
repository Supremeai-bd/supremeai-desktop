/**
 * Per-domain live browser session cookie jar and strict-auth URL helpers.
 * Merges Set-Cookie headers across GET, POST form submits, and fetch/XHR RPC calls
 * without requiring users to manually inspect DevTools or paste cookie strings.
 */

const liveCookieJar = new Map<string, Map<string, string>>();

export function normalizeCookieDomainKey(urlOrDomain: string): string {
  const raw = (urlOrDomain || '').trim().toLowerCase();
  if (!raw) return '';
  try {
    const parsed = new URL(
      raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`
    );
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return raw.replace(/^www\./, '').split('/')[0] || '';
  }
}

export function parseCookiePairs(cookieHeader: string): Array<[string, string]> {
  const result: Array<[string, string]> = [];
  if (!cookieHeader || typeof cookieHeader !== 'string') return result;

  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx <= 0) continue;
    const name = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!name) continue;
    result.push([name, value]);
  }
  return result;
}

export function mergeCookieHeaders(...headers: Array<string | null | undefined>): string {
  const merged = new Map<string, string>();
  for (const header of headers) {
    if (!header) continue;
    for (const [name, value] of parseCookiePairs(header)) {
      if (value === 'deleted' || value === '""') {
        merged.delete(name);
      } else {
        merged.set(name, value);
      }
    }
  }
  return Array.from(merged.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
}

export function setDomainLiveCookies(
  urlOrDomain: string,
  incomingCookieHeader?: string | null
): string {
  const key = normalizeCookieDomainKey(urlOrDomain);
  if (!key) return '';
  let domainMap = liveCookieJar.get(key);
  if (!domainMap) {
    domainMap = new Map<string, string>();
    liveCookieJar.set(key, domainMap);
  }
  if (incomingCookieHeader) {
    for (const [name, value] of parseCookiePairs(incomingCookieHeader)) {
      if (value === 'deleted') {
        domainMap.delete(name);
      } else {
        domainMap.set(name, value);
      }
    }
  }
  return Array.from(domainMap.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
}

export function getDomainLiveCookies(urlOrDomain: string): string {
  const key = normalizeCookieDomainKey(urlOrDomain);
  if (!key) return '';
  const exact = liveCookieJar.get(key);
  const parts: string[] = [];

  // Include parent registrable domain cookies if subdomain matches (e.g. app.example.com -> example.com)
  const segments = key.split('.');
  if (segments.length > 2) {
    const parentKey = segments.slice(-2).join('.');
    const parentMap = liveCookieJar.get(parentKey);
    if (parentMap && parentMap.size > 0) {
      parts.push(
        Array.from(parentMap.entries())
          .map(([k, v]) => `${k}=${v}`)
          .join('; ')
      );
    }
  }

  if (exact && exact.size > 0) {
    parts.push(
      Array.from(exact.entries())
        .map(([k, v]) => `${k}=${v}`)
        .join('; ')
    );
  }

  return mergeCookieHeaders(...parts);
}

export function clearDomainLiveCookies(urlOrDomain?: string): void {
  if (!urlOrDomain) {
    liveCookieJar.clear();
    return;
  }
  const key = normalizeCookieDomainKey(urlOrDomain);
  if (key) liveCookieJar.delete(key);
}

export function isGoogleStrictAuthUrl(url: string): boolean {
  const raw = (url || '').trim();
  if (!raw) return false;
  try {
    const parsed = new URL(
      raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`
    );
    const host = parsed.hostname.toLowerCase();
    return (
      host === 'accounts.google.com' ||
      host === 'mail.google.com' ||
      host === 'gmail.com' ||
      host === 'www.gmail.com'
    );
  } catch {
    return false;
  }
}
