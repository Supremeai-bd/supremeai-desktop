import { ChatAttachment, ChatMessage, WorkbenchRunSettings } from '../types';

export const DEFAULT_WORKBENCH_RUN_SETTINGS: WorkbenchRunSettings = {
  thinkingLevel: 'HIGH',
  enableSearchGrounding: false,
  responseMimeType: 'text/plain',
  jsonSchemaText: '',
  agentLoopEnabled: true,
  thinkingMode: 'auto',
  searchMode: 'auto',
};

export function estimateTokenCount(text: string, attachment?: ChatAttachment | null): number {
  const clean = (text || '').trim();
  let tokens = clean ? Math.max(1, Math.ceil(clean.length / 4)) : 0;

  if (attachment) {
    if (attachment.mimeType.startsWith('image/')) {
      tokens += 258;
    } else if (attachment.mimeType === 'application/pdf') {
      tokens += 512;
    } else {
      const approxRawBytes = Math.round((attachment.data?.length || 0) * 0.75);
      tokens += Math.min(4096, Math.max(64, Math.ceil(approxRawBytes / 4)));
    }
  }

  return tokens;
}

export function estimateMessagesContextTokens(
  messages: ChatMessage[],
  draftText: string,
  attachment?: ChatAttachment | ChatAttachment[] | null,
  systemInstruction?: string
): number {
  let total = systemInstruction?.trim() ? Math.ceil(systemInstruction.trim().length / 4) : 0;
  for (const m of messages) {
    const msgAtts =
      Array.isArray(m.attachments) && m.attachments.length > 0
        ? m.attachments
        : m.attachment
          ? [m.attachment]
          : [];
    if (msgAtts.length === 0) {
      total += estimateTokenCount(m.content || '', null);
    } else {
      total += estimateTokenCount(m.content || '', msgAtts[0]);
      for (let i = 1; i < msgAtts.length; i++) {
        total += estimateTokenCount('', msgAtts[i]);
      }
    }
  }
  const draftAtts = Array.isArray(attachment) ? attachment : attachment ? [attachment] : [];
  if (draftAtts.length === 0) {
    total += estimateTokenCount(draftText, null);
  } else {
    total += estimateTokenCount(draftText, draftAtts[0]);
    for (let i = 1; i < draftAtts.length; i++) {
      total += estimateTokenCount('', draftAtts[i]);
    }
  }
  return total;
}

export function validateJsonSchemaInput(raw: string): {
  valid: boolean;
  parsed?: Record<string, unknown>;
  error?: string;
} {
  const trimmed = (raw || '').trim();
  if (!trimmed) {
    return { valid: true };
  }
  try {
    const parsed = JSON.parse(trimmed);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { valid: false, error: 'Schema must be a JSON object.' };
    }
    return { valid: true, parsed: parsed as Record<string, unknown> };
  } catch (err: unknown) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : 'Invalid JSON schema.',
    };
  }
}

export function isTextReadableMimeOrFilename(mimeType?: string, fileName?: string): boolean {
  const mime = (mimeType || '').toLowerCase();
  const name = (fileName || '').toLowerCase();
  if (
    mime.startsWith('text/') ||
    mime === 'application/json' ||
    mime === 'application/javascript' ||
    mime === 'application/typescript' ||
    mime === 'application/xml'
  ) {
    return true;
  }
  return /\.(txt|md|json|ts|tsx|js|jsx|py|php|css|html|xml|yml|yaml|csv|sql|sh|env)$/i.test(name);
}

export function decodeBase64AttachmentText(
  dataUrlOrBase64: string,
  maxChars: number = 24000
): string {
  const raw = (dataUrlOrBase64 || '').trim();
  if (!raw) return '';
  const truncate = (text: string) =>
    text.length > maxChars ? `${text.slice(0, maxChars)}\n... [truncated]` : text;

  const isDataUrl = raw.startsWith('data:');
  if (!isDataUrl) {
    const looksLikeStrictBase64 =
      raw.length >= 8 && raw.length % 4 === 0 && /^[A-Za-z0-9+/=]+$/.test(raw);
    if (!looksLikeStrictBase64) {
      return truncate(raw);
    }
  }

  const base64Part = isDataUrl ? raw.split(',')[1] || '' : raw;
  try {
    if (typeof Buffer !== 'undefined') {
      const decoded = Buffer.from(base64Part, 'base64').toString('utf-8');
      if (!isDataUrl && decoded.includes('\uFFFD')) {
        return truncate(raw);
      }
      return truncate(decoded);
    }
    const binary = atob(base64Part);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const decoded = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    if (!isDataUrl && decoded.includes('\uFFFD')) {
      return truncate(raw);
    }
    return truncate(decoded);
  } catch {
    return isDataUrl ? '' : truncate(raw);
  }
}
