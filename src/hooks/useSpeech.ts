import { useCallback, useEffect, useState } from 'react';
import { tts, type TtsConfig } from '../companion/ttsService';

export interface UseSpeechReturn {
  speaking: boolean;
  config: TtsConfig;
  speak: (text: string, language: 'en' | 'bn') => Promise<void>;
  stop: () => void;
  updateConfig: (partial: Partial<TtsConfig>) => void;
}

/** Subscribes a component to the shared TTS controller (audio survives re-renders). */
export function useSpeech(): UseSpeechReturn {
  const [state, setState] = useState(() => ({ speaking: tts.isSpeaking(), config: tts.getConfig() }));

  useEffect(() => tts.subscribe(setState), []);

  const speak = useCallback((text: string, language: 'en' | 'bn') => tts.speak(text, language), []);
  const stop = useCallback(() => tts.stop(), []);
  const updateConfig = useCallback((partial: Partial<TtsConfig>) => tts.updateConfig(partial), []);

  return { speaking: state.speaking, config: state.config, speak, stop, updateConfig };
}
