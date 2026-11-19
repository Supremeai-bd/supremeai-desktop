import { describe, it, expect } from 'vitest';
import {
  getMessageAttachments,
  isImageAttachment,
  MAX_CHAT_ATTACHMENTS,
  MAX_RAW_IMAGE_BYTES,
  normalizeAttachmentPayload,
  processSelectedFiles,
  pruneSessionsForStorage,
} from './imageAttachmentUtils';
import type { ChatSession } from '../types';

describe('imageAttachmentUtils', () => {
  it('detects image attachments by mimeType or data URL prefix', () => {
    expect(isImageAttachment({ mimeType: 'image/png', data: 'abc' })).toBe(true);
    expect(
      isImageAttachment({
        mimeType: 'application/octet-stream',
        data: 'data:image/jpeg;base64,abc',
      })
    ).toBe(true);
    expect(
      isImageAttachment({ mimeType: 'application/pdf', data: 'data:application/pdf;base64,abc' })
    ).toBe(false);
    expect(isImageAttachment(null)).toBe(false);
  });

  it('unifies and deduplicates single attachment and attachments array cleanly', () => {
    const img1 = { name: 'a.png', mimeType: 'image/png', data: 'data:image/png;base64,AAA=' };
    const img2 = { name: 'b.jpg', mimeType: 'image/jpeg', data: 'data:image/jpeg;base64,BBB=' };

    expect(getMessageAttachments({ attachment: img1 })).toEqual([img1]);
    expect(getMessageAttachments({ attachment: img1, attachments: [img1, img2] })).toEqual([
      img1,
      img2,
    ]);

    expect(normalizeAttachmentPayload([img1])).toEqual({ attachment: img1 });
    expect(normalizeAttachmentPayload([img1, img2])).toEqual({
      attachment: img1,
      attachments: [img1, img2],
    });
  });

  it('enforces attachment count and oversized file limits gracefully', async () => {
    const huge = new File(['x'], 'huge.png', { type: 'image/png' });
    Object.defineProperty(huge, 'size', { value: MAX_RAW_IMAGE_BYTES + 1024 });

    const resHuge = await processSelectedFiles([huge], 0);
    expect(resHuge.attachments).toHaveLength(0);
    expect(resHuge.errors[0]).toContain('20 MB');

    const smallFiles = Array.from({ length: MAX_CHAT_ATTACHMENTS + 2 }, (_, i) => {
      return new File(['hello'], `note-${i}.txt`, { type: 'text/plain' });
    });
    const resLimit = await processSelectedFiles(smallFiles, 0);
    expect(resLimit.attachments).toHaveLength(MAX_CHAT_ATTACHMENTS);
    expect(resLimit.errors[0]).toContain(`${MAX_CHAT_ATTACHMENTS}`);
  });

  it('prunes bulky base64 blobs only from older messages on quota fallback', () => {
    const largeBlob = 'data:image/png;base64,' + 'A'.repeat(4096);
    const sessions: ChatSession[] = [
      {
        id: 's1',
        title: 'Test',
        createdAt: 1,
        updatedAt: 2,
        model: 'supreme-core',
        roleId: 'default',
        messages: [
          {
            id: 'm1',
            role: 'user',
            content: 'old image',
            timestamp: 1,
            attachment: { name: 'old.png', mimeType: 'image/png', data: largeBlob },
          },
          { id: 'm2', role: 'assistant', content: 'old reply', timestamp: 2 },
          {
            id: 'm3',
            role: 'user',
            content: 'recent image',
            timestamp: 3,
            attachment: { name: 'recent.png', mimeType: 'image/png', data: largeBlob },
          },
        ],
      },
    ];

    const pruned = pruneSessionsForStorage(sessions);
    expect(pruned[0].messages[0].attachment?.data).toBe('');
    expect(pruned[0].messages[0].attachment?.name).toBe('old.png');
    expect(pruned[0].messages[2].attachment?.data).toBe(largeBlob);
  });
});
