/**
 * Speech helpers — ported from the web workspace
 * (supremeai-frontend/src/utils/speechUtils.ts) so desktop speaks with the same
 * rules as web/mobile.
 *
 * The important behaviours carried over:
 *  * markdown/code/URL stripping before anything is spoken;
 *  * one unified voice per *message* (segments split only at sentence
 *    boundaries) so inline English words inside a Bengali sentence don't cause
 *    mid-sentence male/female voice ping-pong;
 *  * chunking at punctuation boundaries so the first audio starts quickly;
 *  * the exact Edge neural voice table the gateway's `/api/tts/edge` accepts.
 */

export type VoicePersona = 'Zephyr' | 'Puck' | 'Kore' | 'Charon' | 'Fenrir';
export type BanglaAccent = 'bn-bd' | 'bn-in';
export type SpeechLocale = 'en-US' | 'bn-BD' | 'bn-IN';

export const VOICE_PERSONAS: VoicePersona[] = ['Zephyr', 'Kore', 'Puck', 'Charon', 'Fenrir'];

// Male personas map to the male neural voices, matching the web app.
const MALE_PERSONAS: VoicePersona[] = ['Puck', 'Charon', 'Fenrir'];

/** Voices the gateway's edge-tts bridge is allowed to select (mirrors src-tauri/src/speech.rs). */
export const EDGE_VOICES = [
  'bn-BD-NabanitaNeural',
  'bn-BD-PradeepNeural',
  'bn-IN-TanishaaNeural',
  'bn-IN-BashkarNeural',
  'en-US-AvaMultilingualNeural',
  'en-US-AndrewMultilingualNeural',
] as const;

const BANGLISH_MARKER_REGEX = /\b(kemon|kmn|acho|aso|accho|tumi|apni|tui|amake|tomake|apnake|kothay|kivabe|kibhabe|bhalo|valo|dhonnobad|nomoshkar|korbo|korte|korchi|koro|parbo|parchi|parce|parbe|hocche|hobe|hoye|geche|amader|tomader|apnar|tomar|bolen|bolun|bolte|bolchi|likho|lekho|shuno|janau|jano|lagbe|parina|janina|bujhi|bujhte|achha|accha|khobor|obostha|bangla|bengali|banglate|banglay|banglai)\b/i;

export function hasBengaliScript(text: string): boolean {
  return /[\u0980-\u09FF]/.test(text);
}

export function detectBengaliOrBanglish(text: string): boolean {
  return hasBengaliScript(text) || BANGLISH_MARKER_REGEX.test(text);
}

/** Removes markdown, code fences and URLs so code is never read out loud. */
export function sanitizeSpeechText(raw: string): string {
  return raw
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[#*_>~|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface SpeechSegment {
  text: string;
  lang: 'bn-BD' | 'en-US';
}

/**
 * Segments speech strictly at sentence/paragraph boundaries so inline English
 * technical identifiers inside a Bengali sentence stay on one unified voice.
 */
export function splitByScriptSegments(text: string): SpeechSegment[] {
  const clean = text.trim();
  if (!clean) return [];

  if (!detectBengaliOrBanglish(clean)) {
    return [{ text: clean, lang: 'en-US' }];
  }

  const sentences = clean
    .split(/\n+|(?<=[।.!?])\s+/g)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  const segments: SpeechSegment[] = [];
  for (const sentence of sentences) {
    const sentenceHasBengali = detectBengaliOrBanglish(sentence);
    const latinWordsCount = (sentence.match(/[A-Za-z]{2,}/g) || []).length;
    const isLongPureEnglishParagraph = !sentenceHasBengali && sentence.length >= 100 && latinWordsCount >= 12;
    const lang: 'bn-BD' | 'en-US' = isLongPureEnglishParagraph ? 'en-US' : 'bn-BD';
    const prev = segments[segments.length - 1];
    if (prev && prev.lang === lang) {
      prev.text = `${prev.text} ${sentence}`;
    } else {
      segments.push({ text: sentence, lang });
    }
  }

  return segments.length > 0 ? segments : [{ text: clean, lang: 'bn-BD' }];
}

/** Splits a segment at punctuation boundaries so playback can start early. */
export function chunkSpeechSegment(text: string, maxChars = 220): string[] {
  const clean = text.trim();
  if (!clean) return [];
  if (clean.length <= maxChars) return [clean];

  const chunks: string[] = [];
  let remaining = clean;
  while (remaining.length > maxChars) {
    const slice = remaining.slice(0, maxChars);
    let splitAt = Math.max(
      slice.lastIndexOf('।'),
      slice.lastIndexOf('. '),
      slice.lastIndexOf('! '),
      slice.lastIndexOf('? '),
      slice.lastIndexOf(', '),
    );
    if (splitAt < maxChars * 0.4) splitAt = slice.lastIndexOf(' ');
    if (splitAt <= 0) splitAt = maxChars;
    else splitAt += 1;
    const piece = remaining.slice(0, splitAt).trim();
    if (piece) chunks.push(piece);
    remaining = remaining.slice(splitAt).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

/** Mirrors the web's resolveEdgeNeuralVoice() so both platforms sound identical. */
export function resolveEdgeVoice(
  text: string,
  language: 'en' | 'bn',
  persona: VoicePersona,
  accent: BanglaAccent,
): { voice: string; lang: SpeechLocale } {
  const preferMale = MALE_PERSONAS.includes(persona);
  const isBengali = hasBengaliScript(text) || detectBengaliOrBanglish(text);
  const bengaliExpected = isBengali || (language === 'bn' && !/[A-Za-z]{2,}/.test(text));

  if (bengaliExpected) {
    if (accent === 'bn-in') {
      return { voice: preferMale ? 'bn-IN-BashkarNeural' : 'bn-IN-TanishaaNeural', lang: 'bn-IN' };
    }
    return { voice: preferMale ? 'bn-BD-PradeepNeural' : 'bn-BD-NabanitaNeural', lang: 'bn-BD' };
  }

  return {
    voice: preferMale ? 'en-US-AndrewMultilingualNeural' : 'en-US-AvaMultilingualNeural',
    lang: 'en-US',
  };
}

export interface MinimalSpeechVoice {
  name: string;
  lang: string;
}

/**
 * Picks an installed OS voice for the native fallback. Returns undefined when
 * no voice for that language exists, so Bengali is never read by an English
 * voice (the web behaves the same way).
 */
export function pickNativeSpeechVoice<T extends MinimalSpeechVoice>(
  voices: T[],
  targetLang: 'bn-BD' | 'en-US',
  persona: VoicePersona,
  accent: BanglaAccent,
): T | undefined {
  if (!voices || voices.length === 0) return undefined;
  const preferMale = MALE_PERSONAS.includes(persona);
  const normalize = (lang: string) => lang.toLowerCase().replace(/_/g, '-');

  if (targetLang === 'bn-BD') {
    const bnVoices = voices.filter((voice) => normalize(voice.lang).startsWith('bn'));
    if (bnVoices.length === 0) return undefined;
    const genderRegex = preferMale ? /(pradeep|tanmoy|bashkar|male|man)/i : /(nabanita|tanishaa|female|woman)/i;
    const primaryPrefix = accent === 'bn-in' ? 'bn-in' : 'bn-bd';
    const secondaryPrefix = accent === 'bn-in' ? 'bn-bd' : 'bn-in';
    return (
      bnVoices.find((voice) => normalize(voice.lang).startsWith(primaryPrefix) && genderRegex.test(voice.name)) ||
      bnVoices.find((voice) => normalize(voice.lang).startsWith(primaryPrefix)) ||
      bnVoices.find((voice) => normalize(voice.lang).startsWith(secondaryPrefix) && genderRegex.test(voice.name)) ||
      bnVoices.find((voice) => normalize(voice.lang).startsWith(secondaryPrefix)) ||
      bnVoices[0]
    );
  }

  const enVoices = voices.filter((voice) => normalize(voice.lang).startsWith('en'));
  if (enVoices.length === 0) return undefined;
  const genderRegex = preferMale
    ? /(andrew|guy|david|mark|daniel|ryan|chris|male)/i
    : /(ava|aria|jenny|samantha|zira|emma|female)/i;
  return (
    enVoices.find((voice) => normalize(voice.lang).startsWith('en-us') && genderRegex.test(voice.name)) ||
    enVoices.find((voice) => normalize(voice.lang).startsWith('en-us')) ||
    enVoices.find((voice) => genderRegex.test(voice.name)) ||
    enVoices[0]
  );
}
