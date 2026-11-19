export type VisionErrorCategory =
  | 'quota_rate_limit'
  | 'auth_forbidden'
  | 'model_not_found'
  | 'bad_request'
  | 'timeout'
  | 'gateway_unavailable'
  | 'unknown';

export type VisionProviderId = 'gemini' | 'groq' | 'openrouter' | 'cloudflare';

export interface VisionCandidate {
  id: string;
  provider: VisionProviderId;
  model: string;
  maxImages: number;
  freeTierOnly: boolean;
}

export interface ClassifiedVisionError {
  category: VisionErrorCategory;
  status?: number;
  retryAfterSeconds?: number;
  provider?: string;
  model?: string;
  safeSummary: string;
  ocrSuggested: boolean;
}

export interface VisionCooldownEntry {
  untilMs: number;
  reason: VisionErrorCategory;
}

/**
 * Strip base64 data URLs and secret API key patterns before logging or showing errors in UI.
 */
export function sanitizeVisionErrorMessage(raw: string): string {
  const cleaned = String(raw || '')
    .replace(/data:image\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]+/gi, '[image-data-redacted]')
    .replace(/\bAIza[0-9A-Za-z\-_]{16,}\b/g, '[redacted-key]')
    .replace(/\bgsk_[0-9A-Za-z]{16,}\b/g, '[redacted-key]')
    .replace(/\bsk-(?:or-)?[0-9A-Za-z\-_]{16,}\b/g, '[redacted-key]')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return 'Unknown vision error';
  return cleaned.length > 320 ? `${cleaned.slice(0, 317)}...` : cleaned;
}

export function parseRetryAfterSeconds(
  headerValue?: string | null,
  messageHint?: string
): number | undefined {
  if (headerValue) {
    const trimmed = headerValue.trim();
    const numeric = Number(trimmed);
    if (Number.isFinite(numeric) && numeric > 0) {
      return Math.min(3600, Math.max(1, Math.ceil(numeric)));
    }
    const parsedDate = Date.parse(trimmed);
    if (Number.isFinite(parsedDate)) {
      const diffSec = Math.ceil((parsedDate - Date.now()) / 1000);
      if (diffSec > 0) return Math.min(3600, diffSec);
    }
  }

  if (messageHint) {
    const secMatch = messageHint.match(
      /retry(?:\s+after|\s+in)?\s+(\d+(?:\.\d+)?)\s*(?:s|sec|second)/i
    );
    if (secMatch) {
      const val = Math.ceil(Number(secMatch[1]));
      if (Number.isFinite(val) && val > 0) return Math.min(3600, val);
    }
  }

  return undefined;
}

export function classifyVisionHttpError(input: {
  status?: number;
  message?: string;
  retryAfterHeader?: string | null;
  provider?: string;
  model?: string;
}): ClassifiedVisionError {
  const status = typeof input.status === 'number' && input.status > 0 ? input.status : undefined;
  const rawMessage = String(input.message || '');
  const safeSummary = sanitizeVisionErrorMessage(rawMessage);
  const retryAfterSeconds = parseRetryAfterSeconds(input.retryAfterHeader, safeSummary);

  let category: VisionErrorCategory = 'unknown';

  if (
    status === 429 ||
    /\b429\b|quota|rate[_\s-]?limit|resource[_\s-]?exhausted|too\s+many\s+requests/i.test(
      safeSummary
    )
  ) {
    category = 'quota_rate_limit';
  } else if (
    status === 401 ||
    status === 403 ||
    /\b40[13]\b|unauthori[sz]ed|forbidden|invalid\s+api\s+key|permission\s+denied|billing/i.test(
      safeSummary
    )
  ) {
    category = 'auth_forbidden';
  } else if (
    status === 404 ||
    /\b404\b|not\s+found|model[^\n]*not\s+(?:found|supported|available)|unknown\s+model/i.test(
      safeSummary
    )
  ) {
    category = 'model_not_found';
  } else if (
    status === 400 ||
    status === 413 ||
    status === 422 ||
    /\b4(?:00|13|22)\b|bad\s+request|invalid\s+argument|unsupported\s+(?:image|mime)|too\s+many\s+images/i.test(
      safeSummary
    )
  ) {
    category = 'bad_request';
  } else if (
    status === 408 ||
    status === 504 ||
    /timed?\s*out|deadline\s+exceeded|abort/i.test(safeSummary)
  ) {
    category = 'timeout';
  } else if (
    status === 500 ||
    status === 502 ||
    status === 503 ||
    /\b50[023]\b|unavailable|bad\s+gateway|service\s+unavailable|overloaded/i.test(safeSummary)
  ) {
    category = 'gateway_unavailable';
  }

  return {
    category,
    ...(status ? { status } : {}),
    ...(retryAfterSeconds ? { retryAfterSeconds } : {}),
    ...(input.provider ? { provider: input.provider } : {}),
    ...(input.model ? { model: input.model } : {}),
    safeSummary,
    ocrSuggested:
      category !== 'bad_request' || /too\s+many\s+images|unsupported/i.test(safeSummary),
  };
}

/**
 * Strict Free-Only invariant: OpenRouter models MUST explicitly carry `:free` suffix.
 */
export function isStrictFreeOpenRouterModel(model: string): boolean {
  return String(model || '')
    .trim()
    .toLowerCase()
    .endsWith(':free');
}

export interface FreeVisionEnvConfig {
  geminiApiKey?: string;
  geminiVisionModel?: string;
  geminiFallbackVisionModel?: string;
  groqApiKey?: string;
  groqVisionModel?: string;
  openrouterApiKey?: string;
  openrouterVisionModel?: string;
  cloudflareAccountId?: string;
  cloudflareApiToken?: string;
  cloudflareVisionModel?: string;
}

/**
 * Build capability-filtered, free-only vision candidates in deterministic priority order.
 * Never returns paid candidates or candidates that cannot fit `imageCount`.
 */
export function buildFreeVisionCandidates(
  envCfg: FreeVisionEnvConfig,
  imageCount: number
): VisionCandidate[] {
  const count = Math.max(1, imageCount);
  const candidates: VisionCandidate[] = [];

  const geminiKey = (envCfg.geminiApiKey || '').trim();
  if (geminiKey && geminiKey !== 'MY_GEMINI_API_KEY') {
    const primaryGemini = (envCfg.geminiVisionModel || 'gemini-4-hydrogen').trim();
    const secondaryGemini = (envCfg.geminiFallbackVisionModel || 'gemini-2.5-flash').trim();
    candidates.push({
      id: `gemini:${primaryGemini}`,
      provider: 'gemini',
      model: primaryGemini,
      maxImages: 4,
      freeTierOnly: true,
    });
    if (secondaryGemini && secondaryGemini !== primaryGemini) {
      candidates.push({
        id: `gemini:${secondaryGemini}`,
        provider: 'gemini',
        model: secondaryGemini,
        maxImages: 4,
        freeTierOnly: true,
      });
    }
  }

  const groqKey = (envCfg.groqApiKey || '').trim();
  if (groqKey) {
    const groqModel = (
      envCfg.groqVisionModel || 'meta-llama/llama-4-scout-17b-16e-instruct'
    ).trim();
    candidates.push({
      id: `groq:${groqModel}`,
      provider: 'groq',
      model: groqModel,
      maxImages: 3, // Groq official vision limit per request
      freeTierOnly: true,
    });
  }

  const openrouterKey = (envCfg.openrouterApiKey || '').trim();
  if (openrouterKey) {
    const orModel = (envCfg.openrouterVisionModel || 'google/gemma-3-27b-it:free').trim();
    if (isStrictFreeOpenRouterModel(orModel)) {
      candidates.push({
        id: `openrouter:${orModel}`,
        provider: 'openrouter',
        model: orModel,
        maxImages: 4,
        freeTierOnly: true,
      });
    }
  }

  const cfAcct = (envCfg.cloudflareAccountId || '').trim();
  const cfToken = (envCfg.cloudflareApiToken || '').trim();
  if (cfAcct && cfToken) {
    const cfModel = (
      envCfg.cloudflareVisionModel || '@cf/meta/llama-3.2-11b-vision-instruct'
    ).trim();
    candidates.push({
      id: `cloudflare:${cfModel}`,
      provider: 'cloudflare',
      model: cfModel,
      maxImages: 1,
      freeTierOnly: true,
    });
  }

  return candidates.filter((c) => c.freeTierOnly && count <= c.maxImages);
}

export class VisionCooldownRegistry {
  private readonly entries = new Map<string, VisionCooldownEntry>();

  isCoolingDown(candidateId: string, nowMs: number = Date.now()): boolean {
    const entry = this.entries.get(candidateId);
    if (!entry) return false;
    if (nowMs >= entry.untilMs) {
      this.entries.delete(candidateId);
      return false;
    }
    return true;
  }

  markFailure(
    candidateId: string,
    classified: ClassifiedVisionError,
    nowMs: number = Date.now()
  ): number {
    let cooldownSec = 30;
    if (classified.category === 'quota_rate_limit') {
      cooldownSec = classified.retryAfterSeconds ?? 60;
    } else if (classified.category === 'auth_forbidden') {
      cooldownSec = 600;
    } else if (classified.category === 'model_not_found') {
      cooldownSec = 300;
    } else if (classified.category === 'bad_request') {
      cooldownSec = 0;
    }

    if (cooldownSec > 0) {
      this.entries.set(candidateId, {
        untilMs: nowMs + cooldownSec * 1000,
        reason: classified.category,
      });
    }
    return cooldownSec;
  }

  getRemainingSeconds(candidateId: string, nowMs: number = Date.now()): number {
    const entry = this.entries.get(candidateId);
    if (!entry) return 0;
    return Math.max(0, Math.ceil((entry.untilMs - nowMs) / 1000));
  }

  clear(): void {
    this.entries.clear();
  }
}
