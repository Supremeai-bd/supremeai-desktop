import type { ChatAttachment } from '../types';
import { isImageAttachment } from './imageAttachmentUtils';

export interface OcrProgressUpdate {
  status: string;
  progress: number; // 0..100
  currentImage: number;
  totalImages: number;
}

export interface BrowserOcrResult {
  text: string;
  confidence: number;
  languageUsed: 'ben+eng' | 'eng';
  hasReadableText: boolean;
  imageCount: number;
}

/**
 * Clean up common OCR whitespace artifacts without altering actual text characters.
 */
export function normalizeExtractedOcrText(raw: string): string {
  return String(raw || '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Build an explicit, honest prompt when the user consents to send extracted OCR text
 * to a Free Text-Only AI model. Never attaches raw image pixels or pretends full vision occurred.
 */
export function buildOcrExplanationPrompt(
  ocrText: string,
  originalUserQuestion?: string,
  preferredLanguage: 'en' | 'bn' = 'en'
): string {
  const cleanOcr = normalizeExtractedOcrText(ocrText);
  const cleanQuestion = String(originalUserQuestion || '').trim();

  if (preferredLanguage === 'bn') {
    return [
      '[ব্রাউজার OCR টেক্সট — দৃশ্যমান ছবি নয়, কেবল ছবি থেকে পড়া লেখা]',
      cleanQuestion
        ? `মূল প্রশ্ন: ${cleanQuestion}`
        : 'অনুগ্রহ করে এই OCR থেকে পাওয়া লেখাটি ব্যাখ্যা/সমাধান করুন:',
      '',
      '```text',
      cleanOcr,
      '```',
      '',
      'দ্রষ্টব্য: এটি কেবল OCR দিয়ে পাওয়া লেখা; ছবির পূর্ণ দৃশ্য বা ভিজ্যুয়াল লেআউট এতে নেই। যে অংশ স্পষ্ট বোঝা যায় না তা অনুমান করবেন না।',
    ].join('\n');
  }

  return [
    '[Browser OCR Text — Extracted Text Only, Full Visual Scene Not Analyzed]',
    cleanQuestion
      ? `Original question: ${cleanQuestion}`
      : 'Please analyze, translate, or explain this extracted text:',
    '',
    '```text',
    cleanOcr,
    '```',
    '',
    'Note: Only text extracted via browser OCR is included; visual layout/scene details are unavailable. Do not guess missing parts.',
  ].join('\n');
}

/**
 * Extract readable Bengali + English text locally in the browser using Tesseract.js WASM.
 * Zero API keys or server calls required for text extraction.
 */
export async function extractTextFromImages(
  attachments: ChatAttachment[],
  onProgress?: (update: OcrProgressUpdate) => void
): Promise<BrowserOcrResult> {
  const images = attachments.filter((att) => isImageAttachment(att) && Boolean(att.data));
  if (images.length === 0) {
    return {
      text: '',
      confidence: 0,
      languageUsed: 'ben+eng',
      hasReadableText: false,
      imageCount: 0,
    };
  }

  const tesseract = await import('tesseract.js');
  const createWorker = tesseract.createWorker;

  let languageUsed: 'ben+eng' | 'eng' = 'ben+eng';
  let activeImageIdx = 0;

  const workerLogger = (msg: { status?: string; progress?: number }) => {
    if (!onProgress) return;
    const rawPct = typeof msg?.progress === 'number' ? msg.progress : 0;
    const overallPct = Math.min(
      99,
      Math.max(1, Math.round(((activeImageIdx + rawPct) / images.length) * 100))
    );
    onProgress({
      status: String(msg?.status || 'recognizing'),
      progress: overallPct,
      currentImage: activeImageIdx + 1,
      totalImages: images.length,
    });
  };

  let worker: Awaited<ReturnType<typeof createWorker>>;
  try {
    worker = await createWorker('ben+eng', 1, { logger: workerLogger });
  } catch {
    languageUsed = 'eng';
    worker = await createWorker('eng', 1, { logger: workerLogger });
  }

  try {
    const blocks: string[] = [];
    let totalConfidence = 0;

    for (let i = 0; i < images.length; i++) {
      activeImageIdx = i;
      const img = images[i];
      const result = await worker.recognize(img.data);
      const text = normalizeExtractedOcrText(result?.data?.text || '');
      const conf = typeof result?.data?.confidence === 'number' ? result.data.confidence : 0;
      totalConfidence += conf;

      if (text) {
        if (images.length > 1) {
          blocks.push(`--- ${img.name || `Image ${i + 1}`} ---\n${text}`);
        } else {
          blocks.push(text);
        }
      }
    }

    onProgress?.({
      status: 'complete',
      progress: 100,
      currentImage: images.length,
      totalImages: images.length,
    });

    const combined = normalizeExtractedOcrText(blocks.join('\n\n'));
    return {
      text: combined,
      confidence: images.length > 0 ? Math.round(totalConfidence / images.length) : 0,
      languageUsed,
      hasReadableText: combined.length > 0,
      imageCount: images.length,
    };
  } finally {
    await worker.terminate().catch(() => {});
  }
}
