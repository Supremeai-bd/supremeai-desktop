import { describe, it, expect } from 'vitest';
import {
  decodeBase64AttachmentText,
  DEFAULT_WORKBENCH_RUN_SETTINGS,
  estimateMessagesContextTokens,
  estimateTokenCount,
  isTextReadableMimeOrFilename,
  validateJsonSchemaInput,
} from './workbenchUtils';

describe('workbenchUtils', () => {
  it('provides clean default workbench run settings', () => {
    expect(DEFAULT_WORKBENCH_RUN_SETTINGS.thinkingLevel).toBe('HIGH');
    expect(DEFAULT_WORKBENCH_RUN_SETTINGS.responseMimeType).toBe('text/plain');
    expect(DEFAULT_WORKBENCH_RUN_SETTINGS.agentLoopEnabled).toBe(true);
  });

  it('estimates token counts for text and image/pdf/code attachments', () => {
    expect(estimateTokenCount('')).toBe(0);
    expect(estimateTokenCount('abcdabcd')).toBe(2);
    expect(
      estimateTokenCount('Describe', {
        name: 'shot.png',
        mimeType: 'image/png',
        data: 'data:image/png;base64,AAAA',
      })
    ).toBe(260);
    expect(
      estimateMessagesContextTokens(
        [{ id: '1', role: 'user', content: 'hello world!', timestamp: 1 }],
        'next turn',
        null,
        'You are helpful'
      )
    ).toBeGreaterThan(5);
  });

  it('validates optional JSON schema input strictly', () => {
    expect(validateJsonSchemaInput('')).toEqual({ valid: true });
    expect(
      validateJsonSchemaInput('{"type":"object","properties":{"ok":{"type":"boolean"}}}')
    ).toEqual({
      valid: true,
      parsed: { type: 'object', properties: { ok: { type: 'boolean' } } },
    });
    expect(validateJsonSchemaInput('[1,2,3]').valid).toBe(false);
    expect(validateJsonSchemaInput('{bad json').valid).toBe(false);
  });

  it('detects text-readable MIME types / extensions and decodes base64 safely', () => {
    expect(isTextReadableMimeOrFilename('application/json', 'config.json')).toBe(true);
    expect(isTextReadableMimeOrFilename('application/octet-stream', 'app.py')).toBe(true);
    expect(isTextReadableMimeOrFilename('image/png', 'photo.png')).toBe(false);

    const encoded = Buffer.from('print("hello workbench")', 'utf-8').toString('base64');
    expect(decodeBase64AttachmentText(`data:text/x-python;base64,${encoded}`)).toBe(
      'print("hello workbench")'
    );
    expect(decodeBase64AttachmentText('print("plain source code")')).toBe(
      'print("plain source code")'
    );
  });
});
