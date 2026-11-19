import { synthesizeSpeechAudio } from '../bridge/desktopBridge';
import {
  type BanglaAccent,
  type VoicePersona,
  VOICE_PERSONAS,
  chunkSpeechSegment,
  pickNativeSpeechVoice,
  resolveEdgeVoice,
  sanitizeSpeechText,
  splitByScriptSegments,
} from './speechUtils';

/**
 * Desktop text-to-speech controller.
 *
 * Playback order mirrors the web app's fallback ladder:
 *   1. neural voices from the gateway (`POST /api/tts/edge`, edge-tts) — this is
 *      what makes desktop sound like web instead of like a 1990s screen reader;
 *   2. the OS voices through `speechSynthesis`, language-matched, only when the
 *      gateway path fails and an appropriate voice is installed.
 *
 * Unlike the old `speakText()` helper this queues every chunk instead of
 * cancelling itself, strips markdown/code, keeps one voice per message, and can
 * be interrupted (`stop()`) or superseded (each `speak()` bumps a generation id
 * so stale audio never plays over newer audio).
 */

export const TTS_CONFIG_STORAGE_KEY = 'supremeai.desktop.tts.v1';

export interface TtsConfig {
  persona: VoicePersona;
  accent: BanglaAccent;
  /** Playback speed multiplier, 0.85 – 1.25. */
  speed: number;
  /** Read new assistant replies out loud automatically. */
  autoSpeak: boolean;
}

export const MIN_SPEED = 0.85;
export const MAX_SPEED = 1.25;
export const DEFAULT_TTS_CONFIG: TtsConfig = {
  persona: 'Zephyr',
  accent: 'bn-bd',
  speed: 1,
  autoSpeak: false,
};

type Listener = (state: { speaking: boolean; config: TtsConfig }) => void;

const CHUNK_CHARS = 220;

export function clampSpeed(speed: number): number {
  if (!Number.isFinite(speed)) return DEFAULT_TTS_CONFIG.speed;
  return Math.min(MAX_SPEED, Math.max(MIN_SPEED, Math.round(speed * 100) / 100));
}

function normalizePersona(raw: unknown): VoicePersona {
  return typeof raw === 'string' && (VOICE_PERSONAS as string[]).includes(raw)
    ? (raw as VoicePersona)
    : DEFAULT_TTS_CONFIG.persona;
}

function loadConfig(): TtsConfig {
  try {
    const raw = localStorage.getItem(TTS_CONFIG_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_TTS_CONFIG };
    const parsed = JSON.parse(raw) as Partial<TtsConfig>;
    return {
      persona: normalizePersona(parsed.persona),
      accent: parsed.accent === 'bn-in' ? 'bn-in' : 'bn-bd',
      speed: clampSpeed(typeof parsed.speed === 'number' ? parsed.speed : DEFAULT_TTS_CONFIG.speed),
      autoSpeak: parsed.autoSpeak === true,
    };
  } catch {
    return { ...DEFAULT_TTS_CONFIG };
  }
}

export interface SpeechAudio {
  audioBase64: string;
  mimeType: string;
}

function base64ToBlobUrl(base64: string, mimeType: string): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return URL.createObjectURL(new Blob([bytes], { type: mimeType || 'audio/mpeg' }));
}

class TtsController {
  private config: TtsConfig = loadConfig();
  private listeners = new Set<Listener>();
  private generation = 0;
  private audio: HTMLAudioElement | null = null;
  private speaking = false;

  getConfig(): TtsConfig {
    return { ...this.config };
  }

  updateConfig(partial: Partial<TtsConfig>): TtsConfig {
    const next: TtsConfig = {
      persona: partial.persona ? normalizePersona(partial.persona) : this.config.persona,
      accent: partial.accent === 'bn-in' || partial.accent === 'bn-bd' ? partial.accent : this.config.accent,
      speed: typeof partial.speed === 'number' ? clampSpeed(partial.speed) : this.config.speed,
      autoSpeak: typeof partial.autoSpeak === 'boolean' ? partial.autoSpeak : this.config.autoSpeak,
    };
    this.config = next;
    try {
      localStorage.setItem(TTS_CONFIG_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // The preference still applies for this session.
    }
    this.emit();
    return { ...next };
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener({ speaking: this.speaking, config: this.getConfig() });
    return () => this.listeners.delete(listener);
  }

  private emit() {
    const snapshot = { speaking: this.speaking, config: this.getConfig() };
    for (const listener of this.listeners) {
      try {
        listener(snapshot);
      } catch {
        // Isolate subscriber errors.
      }
    }
  }

  private setSpeaking(next: boolean) {
    if (this.speaking === next) return;
    this.speaking = next;
    this.emit();
  }

  private releaseAudio() {
    if (this.audio) {
      this.audio.onended = null;
      this.audio.onerror = null;
      this.audio.pause();
      this.audio.src = '';
      this.audio = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  stop(): void {
    this.generation += 1;
    this.releaseAudio();
    this.setSpeaking(false);
  }

  isSpeaking(): boolean {
    return this.speaking;
  }

  /**
   * Speaks `text` in the workspace language. Safe to call while already
   * speaking — the previous utterance is cut off.
   */
  async speak(text: string, language: 'en' | 'bn'): Promise<void> {
    const clean = sanitizeSpeechText(text);
    if (!clean) return;

    const generation = (this.generation += 1);
    this.releaseAudio();
    this.setSpeaking(true);

    const segments = splitByScriptSegments(clean);
    try {
      for (const segment of segments) {
        if (generation !== this.generation) return;
        const { voice } = resolveEdgeVoice(segment.text, language, this.config.persona, this.config.accent);
        const chunks = chunkSpeechSegment(segment.text, CHUNK_CHARS);

        for (const chunk of chunks) {
          if (generation !== this.generation) return;
          const played = await this.playRemote(chunk, voice, generation);
          if (played) continue;

          // Remote path failed for this chunk: fall back to OS voices for the
          // rest of the segment and stop trying the network.
          if (generation !== this.generation) return;
          await this.playNative(segment.text, segment.lang, generation);
          break;
        }
      }
    } finally {
      if (generation === this.generation) this.setSpeaking(false);
    }
  }

  private async playRemote(text: string, voice: string, generation: number): Promise<boolean> {
    try {
      const audio = await synthesizeSpeechAudio(text, voice);
      if (generation !== this.generation || !audio?.audioBase64) return false;
      return await this.playBase64(audio.audioBase64, audio.mimeType, generation);
    } catch {
      return false;
    }
  }

  private playBase64(audioBase64: string, mimeType: string, generation: number): Promise<boolean> {
    return new Promise((resolve) => {
      let objectUrl = '';
      try {
        objectUrl = base64ToBlobUrl(audioBase64, mimeType);
      } catch {
        resolve(false);
        return;
      }
      const audio = new Audio(objectUrl);
      this.audio = audio;
      // preservesPitch keeps voices natural when the user changes speed.
      audio.preservesPitch = true;
      audio.playbackRate = this.config.speed;

      let watcher = 0;
      const finish = (played: boolean) => {
        if (watcher) window.clearInterval(watcher);
        watcher = 0;
        URL.revokeObjectURL(objectUrl);
        if (this.audio === audio) this.audio = null;
        resolve(played);
      };

      audio.onended = () => finish(true);
      audio.onerror = () => finish(false);
      audio.play().catch(() => finish(false));

      // A newer speak()/stop() call cancels this element mid-flight.
      watcher = window.setInterval(() => {
        if (generation !== this.generation) {
          audio.pause();
          finish(false);
        }
      }, 250);
    });
  }

  private playNative(text: string, lang: 'bn-BD' | 'en-US', generation: number): Promise<void> {
    if (typeof window === 'undefined' || !window.speechSynthesis) return Promise.resolve();
    const voices = window.speechSynthesis.getVoices();
    const voice = pickNativeSpeechVoice(voices, lang, this.config.persona, this.config.accent);
    // Never read Bengali with an English voice — that is the "garbage" output
    // this rewrite exists to remove.
    if (lang === 'bn-BD' && !voice) return Promise.resolve();
    if (generation !== this.generation) return Promise.resolve();

    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = voice?.lang ?? (lang === 'bn-BD' ? 'bn-BD' : 'en-US');
      if (voice) utterance.voice = voice as SpeechSynthesisVoice;
      utterance.rate = this.config.speed;
      utterance.pitch = 1;
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      window.speechSynthesis.speak(utterance);
    });
  }
}

export const tts = new TtsController();
