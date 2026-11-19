import { describe, expect, it } from 'vitest';
import {
  buildFreeVisionCandidates,
  classifyVisionHttpError,
  isStrictFreeOpenRouterModel,
  parseRetryAfterSeconds,
  sanitizeVisionErrorMessage,
  VisionCooldownRegistry,
} from './visionRouting';
import { buildOcrExplanationPrompt, normalizeExtractedOcrText } from '../utils/browserOcr';
import { prepareConversationMessagesForGateway } from '../services/chatService';
import type { ChatMessage } from '../types';

describe('visionRouting', () => {
  it('redacts base64 image payloads and API keys from error messages', () => {
    const dirty =
      'Failed AIzaSyDummyKey1234567890ABCD and gsk_1234567890abcdef123456 with sk-or-v1-1234567890abcdef1234 payload data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==';
    const clean = sanitizeVisionErrorMessage(dirty);

    expect(clean).not.toContain('AIzaSyDummyKey1234567890ABCD');
    expect(clean).not.toContain('gsk_1234567890abcdef123456');
    expect(clean).not.toContain('sk-or-v1-1234567890abcdef1234');
    expect(clean).not.toContain('iVBORw0KGgoAAAANSUhEUg==');
    expect(clean).toContain('[redacted-key]');
    expect(clean).toContain('[image-data-redacted]');
  });

  it('classifies HTTP 429, 401/403, 404, 400, 504, and 503 with Retry-After support', () => {
    const rateLimited = classifyVisionHttpError({
      status: 429,
      message: 'RESOURCE_EXHAUSTED',
      retryAfterHeader: '45',
      provider: 'gemini',
      model: 'gemini-2.5-flash',
    });
    expect(rateLimited.category).toBe('quota_rate_limit');
    expect(rateLimited.retryAfterSeconds).toBe(45);
    expect(rateLimited.ocrSuggested).toBe(true);

    const authErr = classifyVisionHttpError({ status: 403, message: 'Invalid API key' });
    expect(authErr.category).toBe('auth_forbidden');

    const modelErr = classifyVisionHttpError({ status: 404, message: 'Model not found' });
    expect(modelErr.category).toBe('model_not_found');

    const badReq = classifyVisionHttpError({ status: 400, message: 'Invalid argument' });
    expect(badReq.category).toBe('bad_request');
    expect(badReq.ocrSuggested).toBe(false);

    const timeout = classifyVisionHttpError({ status: 504, message: 'Request timed out' });
    expect(timeout.category).toBe('timeout');

    const unavailable = classifyVisionHttpError({ status: 503, message: 'Service unavailable' });
    expect(unavailable.category).toBe('gateway_unavailable');

    expect(parseRetryAfterSeconds(null, 'Please retry after 18s')).toBe(18);
  });

  it('enforces strict :free suffix on OpenRouter models', () => {
    expect(isStrictFreeOpenRouterModel('google/gemma-3-27b-it:free')).toBe(true);
    expect(isStrictFreeOpenRouterModel('qwen/qwen2.5-vl-72b-instruct:free')).toBe(true);
    expect(isStrictFreeOpenRouterModel('openai/gpt-4o')).toBe(false);
    expect(isStrictFreeOpenRouterModel('google/gemma-3-27b-it')).toBe(false);
  });

  it('builds free-only capability-filtered candidates respecting image count limits', () => {
    const envCfg = {
      geminiApiKey: 'real-gemini-key',
      geminiVisionModel: 'gemini-4-hydrogen',
      geminiFallbackVisionModel: 'gemini-2.5-flash',
      groqApiKey: 'real-groq-key',
      openrouterApiKey: 'real-or-key',
      openrouterVisionModel: 'google/gemma-3-27b-it:free',
      cloudflareAccountId: 'acct-1',
      cloudflareApiToken: 'cf-token',
    };

    const singleImg = buildFreeVisionCandidates(envCfg, 1);
    expect(singleImg.map((c) => c.id)).toEqual([
      'gemini:gemini-4-hydrogen',
      'gemini:gemini-2.5-flash',
      'groq:meta-llama/llama-4-scout-17b-16e-instruct',
      'openrouter:google/gemma-3-27b-it:free',
      'cloudflare:@cf/meta/llama-3.2-11b-vision-instruct',
    ]);

    // 2 images excludes Cloudflare (maxImages: 1)
    const twoImgs = buildFreeVisionCandidates(envCfg, 2);
    expect(twoImgs.some((c) => c.provider === 'cloudflare')).toBe(false);
    expect(twoImgs.some((c) => c.provider === 'groq')).toBe(true);

    // 4 images excludes Groq (maxImages: 3) and Cloudflare (maxImages: 1)
    const fourImgs = buildFreeVisionCandidates(envCfg, 4);
    expect(fourImgs.some((c) => c.provider === 'groq')).toBe(false);
    expect(fourImgs.some((c) => c.provider === 'cloudflare')).toBe(false);
    expect(fourImgs.some((c) => c.provider === 'openrouter')).toBe(true);

    // Paid OpenRouter model is rejected silently
    const paidOrRejected = buildFreeVisionCandidates(
      {
        openrouterApiKey: 'real-or-key',
        openrouterVisionModel: 'anthropic/claude-3.5-sonnet',
      },
      1
    );
    expect(paidOrRejected).toHaveLength(0);
  });

  it('tracks provider cooldowns based on error category and Retry-After', () => {
    const registry = new VisionCooldownRegistry();
    const t0 = 1_000_000;

    const cd1 = registry.markFailure(
      'gemini:gemini-2.5-flash',
      {
        category: 'quota_rate_limit',
        retryAfterSeconds: 30,
        safeSummary: '429',
        ocrSuggested: true,
      },
      t0
    );
    expect(cd1).toBe(30);
    expect(registry.isCoolingDown('gemini:gemini-2.5-flash', t0 + 10_000)).toBe(true);
    expect(registry.isCoolingDown('gemini:gemini-2.5-flash', t0 + 31_000)).toBe(false);

    // 400 bad_request should not put healthy provider into cooldown
    const cdBad = registry.markFailure(
      'groq:llama',
      { category: 'bad_request', safeSummary: '400', ocrSuggested: false },
      t0
    );
    expect(cdBad).toBe(0);
    expect(registry.isCoolingDown('groq:llama', t0 + 1_000)).toBe(false);
  });
});

describe('browserOcr helpers', () => {
  it('normalizes OCR whitespace and builds honest Bengali & English prompts', () => {
    expect(normalizeExtractedOcrText('  Line 1   \r\n\r\n\r\n\r\nLine 2 \t \n')).toBe(
      'Line 1\n\nLine 2'
    );

    const bnPrompt = buildOcrExplanationPrompt('কোটা শেষ (429)', 'এই এরর কী?', 'bn');
    expect(bnPrompt).toContain('কেবল ছবি থেকে পড়া লেখা');
    expect(bnPrompt).toContain('কোটা শেষ (429)');
    expect(bnPrompt).toContain('মূল প্রশ্ন: এই এরর কী?');
    expect(bnPrompt).toContain('ভিজ্যুয়াল লেআউট এতে নেই');

    const enPrompt = buildOcrExplanationPrompt('HTTP 429', 'Explain this error', 'en');
    expect(enPrompt).toContain('Extracted Text Only');
    expect(enPrompt).toContain('HTTP 429');
    expect(enPrompt).toContain('Original question: Explain this error');
  });
});

describe('chatService prepareConversationMessagesForGateway', () => {
  it('strips un-replied failed image turns when following up with OCR text', () => {
    const messages: ChatMessage[] = [
      {
        id: 'u1',
        role: 'user',
        content: '',
        timestamp: 1000,
        attachment: {
          name: 'screenshot.png',
          mimeType: 'image/png',
          data: 'data:image/png;base64,AAA=',
        },
      },
      {
        id: 'u2',
        role: 'user',
        content: '[Browser OCR Text] HTTP 429',
        timestamp: 2000,
      },
    ];

    const { preparedMessages, hasImageAttachment } =
      prepareConversationMessagesForGateway(messages);

    expect(hasImageAttachment).toBe(false);
    expect(preparedMessages[0].attachment).toBeUndefined();
    expect(preparedMessages[0].content).toContain('skipped after vision failure');
    expect(preparedMessages[1].content).toContain('[Browser OCR Text]');
  });

  it('preserves image attachments from turns that did receive an assistant reply', () => {
    const messages: ChatMessage[] = [
      {
        id: 'u1',
        role: 'user',
        content: 'Analyze this screenshot',
        timestamp: 1000,
        attachment: {
          name: 'ok.png',
          mimeType: 'image/png',
          data: 'data:image/png;base64,BBB=',
        },
      },
      {
        id: 'a1',
        role: 'assistant',
        content: 'Here is the analysis.',
        timestamp: 1500,
      },
      {
        id: 'u2',
        role: 'user',
        content: 'Follow up question',
        timestamp: 2000,
      },
    ];

    const { preparedMessages, hasImageAttachment } =
      prepareConversationMessagesForGateway(messages);

    expect(hasImageAttachment).toBe(true);
    expect(preparedMessages[0].attachment?.name).toBe('ok.png');
  });
});
