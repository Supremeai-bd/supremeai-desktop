import React, { useEffect, useRef, useState } from 'react';
import { AudioLines, Mic, RotateCcw } from 'lucide-react';
import { LiveSessionStatus, LiveVoiceName } from '../../hooks/useLiveVoiceSession';
import { LiveVoiceAvatarCanvas } from './LiveVoiceAvatarCanvas';
import { useThemeStore } from '../../stores/useThemeStore';
import { useChatStore } from '../../stores/useChatStore';
import { useAvatarExpression } from '../../hooks/useAvatarExpression';
import {
  AvatarPreference,
  loadAvatarPreference,
  resolveAvatarSource,
  VOICE_AVATAR_SYNC_EVENT,
} from '../../utils/hologramAvatar';
import {
  clampMicInputGain,
  clampVoicePitch,
  DEFAULT_VOICE_PITCH,
  loadMicInputGainPreference,
  loadVoicePitchPreference,
  MAX_MIC_INPUT_GAIN,
  MAX_VOICE_PITCH,
  MIN_MIC_INPUT_GAIN,
  MIN_VOICE_PITCH,
  saveMicInputGainPreference,
} from '../../utils/speechUtils';
import { ttsService } from '../../services/ttsService';
import { useI18n } from '../../utils/i18n';

interface LiveVoicePanelProps {
  isOpen: boolean;
  status: LiveSessionStatus;
  voiceName: LiveVoiceName;
  liveModelText: string;
  levelsRef: React.MutableRefObject<{ input: number; output: number }>;
  inputGain?: number;
  onChangeInputGain?: (nextGain: number) => void;
  voicePitch?: number;
  onChangeVoicePitch?: (nextPitch: number) => void;
}

export const LiveVoicePanel: React.FC<LiveVoicePanelProps> = ({
  isOpen,
  status,
  voiceName,
  liveModelText,
  levelsRef,
  inputGain,
  onChangeInputGain,
  voicePitch,
  onChangeVoicePitch,
}) => {
  const [avatarPref, setAvatarPref] = useState<AvatarPreference>(() => loadAvatarPreference());
  const [localGain, setLocalGain] = useState<number>(() =>
    inputGain !== undefined ? clampMicInputGain(inputGain) : loadMicInputGainPreference()
  );
  const [localPitch, setLocalPitch] = useState<number>(() =>
    voicePitch !== undefined ? clampVoicePitch(voicePitch) : loadVoicePitchPreference()
  );
  const panelRef = useRef<HTMLElement | null>(null);
  const { t } = useI18n();

  const effectiveGain =
    inputGain !== undefined ? clampMicInputGain(inputGain) : clampMicInputGain(localGain);
  const effectivePitch =
    voicePitch !== undefined ? clampVoicePitch(voicePitch) : clampVoicePitch(localPitch);

  const handleGainChange = (nextVal: number) => {
    const safe = clampMicInputGain(nextVal);
    setLocalGain(safe);
    if (onChangeInputGain) {
      onChangeInputGain(safe);
    } else {
      saveMicInputGainPreference(safe);
    }
  };

  const handlePitchChange = (nextVal: number) => {
    const safe = clampVoicePitch(nextVal);
    setLocalPitch(safe);
    if (onChangeVoicePitch) {
      onChangeVoicePitch(safe);
    } else {
      ttsService.setPitch(safe);
    }
  };

  const isStreaming = useChatStore((s) => s.isStreaming);
  const streamingContent = useChatStore((s) => s.streamingContent);
  const latestAssistantContent = useChatStore((s) => {
    const session = s.sessions.find((sess) => sess.id === s.activeSessionId);
    if (!session || session.messages.length === 0) return '';
    for (let i = session.messages.length - 1; i >= 0; i--) {
      if (session.messages[i].role === 'assistant' && session.messages[i].content.trim()) {
        return session.messages[i].content;
      }
    }
    return '';
  });
  const resolvedScheme = useThemeStore((s) => s.resolvedScheme);
  const isDark = resolvedScheme === 'dark';

  const activeAvatarSource = resolveAvatarSource(avatarPref);

  useEffect(() => {
    const handleSync = () => {
      setAvatarPref(loadAvatarPreference());
      if (inputGain === undefined) {
        setLocalGain(loadMicInputGainPreference());
      }
      if (voicePitch === undefined) {
        setLocalPitch(loadVoicePitchPreference());
      }
    };
    window.addEventListener(VOICE_AVATAR_SYNC_EVENT, handleSync);
    return () => window.removeEventListener(VOICE_AVATAR_SYNC_EVENT, handleSync);
  }, [inputGain, voicePitch]);

  // Stream real-time microphone RMS & voice output amplitude into CSS custom properties
  // directly on the panel node without triggering 60fps React re-renders.
  useEffect(() => {
    if (!isOpen) return;
    let rafId: number | null = null;
    let smoothedMic = 0;
    let smoothedOut = 0;

    const tick = () => {
      if (document.visibilityState === 'hidden') {
        rafId = null;
        return;
      }
      const el = panelRef.current;
      if (el) {
        const rawMic = Math.max(0, Math.min(1, levelsRef.current.input || 0));
        const rawOut = Math.max(0, Math.min(1, levelsRef.current.output || 0));
        smoothedMic += (rawMic - smoothedMic) * (rawMic > smoothedMic ? 0.52 : 0.24);
        smoothedOut += (rawOut - smoothedOut) * (rawOut > smoothedOut ? 0.52 : 0.24);

        el.style.setProperty('--avatar-mic-rms', smoothedMic.toFixed(3));
        el.style.setProperty('--avatar-audio-level', smoothedOut.toFixed(3));

        const isSpeechActive = smoothedMic > 0.03 || smoothedOut > 0.03 || status === 'speaking';
        el.classList.toggle('avatar-speech-active', isSpeechActive);
      }
      rafId = requestAnimationFrame(tick);
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && rafId === null) {
        rafId = requestAnimationFrame(tick);
      }
    };

    if (document.visibilityState === 'visible') {
      rafId = requestAnimationFrame(tick);
    }
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [isOpen, levelsRef, status]);

  const { expression, expressionClass, intensity } = useAvatarExpression({
    streamingContent,
    isStreaming,
    voiceText: liveModelText,
    latestAssistantContent,
    isConnecting: status === 'connecting',
  });

  if (!isOpen) return null;

  const statusWhisper =
    status === 'connecting'
      ? t.voiceStatusConnecting
      : status === 'speaking'
        ? `${t.voiceStatusSpeaking} · ${voiceName}`
        : status === 'listening'
          ? t.voiceStatusListening
          : status === 'muted'
            ? t.voiceStatusMuted
            : `${t.voiceStatusReady} · ${voiceName}`;

  return (
    <aside
      ref={panelRef}
      data-testid="live-voice-panel"
      aria-label="3D Real-time Voice Companion"
      data-expression={expression}
      className={`${expressionClass} hidden sm:flex sm:w-[230px] md:w-[300px] lg:w-[350px] xl:w-[400px] shrink-0 h-full bg-transparent border-0 flex-col overflow-hidden relative select-none`}
    >
      <div className="flex-1 w-full h-full min-h-[240px] relative bg-transparent overflow-hidden">
        <LiveVoiceAvatarCanvas
          status={status}
          voiceName={voiceName}
          levelsRef={levelsRef}
          avatarSrc={activeAvatarSource.src}
          isPrestyledHologram={activeAvatarSource.isPrestyledHologram}
          avatarPreset={avatarPref.preset}
          customTraits={avatarPref.customTraits}
          expression={expression}
          expressionIntensity={intensity}
          isStreaming={isStreaming}
          isDark={isDark}
        />
      </div>

      <div className="pb-4 px-3 flex flex-col items-center gap-2">
        <div className="w-full max-w-[244px] rounded-xl px-2.5 py-2 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/75 dark:border-cyan-500/20 shadow-xs space-y-2">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <label
                htmlFor="live-voice-mic-sensitivity"
                className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-wide text-slate-700 dark:text-cyan-100/90"
              >
                <Mic className="w-3 h-3 text-cyan-500 dark:text-cyan-400 shrink-0" />
                <span>{t.micSensitivity}</span>
              </label>
              <span className="text-[10px] font-mono tabular-nums text-slate-500 dark:text-cyan-300/90">
                {effectiveGain.toFixed(2)}×
              </span>
            </div>
            <input
              id="live-voice-mic-sensitivity"
              data-testid="mic-sensitivity-slider"
              type="range"
              min={MIN_MIC_INPUT_GAIN}
              max={MAX_MIC_INPUT_GAIN}
              step={0.05}
              value={effectiveGain}
              aria-label={t.micSensitivity}
              onChange={(e) => handleGainChange(Number.parseFloat(e.target.value))}
              className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-slate-200/90 dark:bg-slate-700/80 accent-cyan-500"
            />
          </div>

          <div className="pt-1.5 border-t border-slate-200/60 dark:border-cyan-500/15">
            <div className="flex items-center justify-between gap-2 mb-1">
              <label
                htmlFor="live-voice-pitch-control"
                className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-wide text-slate-700 dark:text-cyan-100/90"
              >
                <AudioLines className="w-3 h-3 text-cyan-500 dark:text-cyan-400 shrink-0" />
                <span>{t.voicePitchLabel}</span>
              </label>
              <div className="inline-flex items-center gap-1">
                {Math.abs(effectivePitch - DEFAULT_VOICE_PITCH) > 0.01 && (
                  <button
                    type="button"
                    onClick={() => handlePitchChange(DEFAULT_VOICE_PITCH)}
                    aria-label={t.resetPitchBtn}
                    title={t.resetPitchBtn}
                    className="p-0.5 rounded text-slate-400 hover:text-cyan-500 dark:hover:text-cyan-300 cursor-pointer"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                  </button>
                )}
                <span
                  data-testid="live-voice-pitch-value"
                  className="text-[10px] font-mono tabular-nums text-slate-500 dark:text-cyan-300/90"
                >
                  {effectivePitch.toFixed(2)}×
                </span>
              </div>
            </div>
            <input
              id="live-voice-pitch-control"
              data-testid="live-voice-pitch-slider"
              type="range"
              min={MIN_VOICE_PITCH}
              max={MAX_VOICE_PITCH}
              step={0.05}
              value={effectivePitch}
              aria-label={t.voicePitchLabel}
              onChange={(e) => handlePitchChange(Number.parseFloat(e.target.value))}
              className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-slate-200/90 dark:bg-slate-700/80 accent-cyan-500"
            />
          </div>
        </div>

        <div className="pointer-events-none inline-flex items-center gap-2 text-[11px] font-medium tracking-wide text-slate-600/90 dark:text-cyan-200/80 drop-shadow-[0_1px_6px_rgba(255,255,255,0.65)] dark:drop-shadow-[0_1px_8px_rgba(0,0,0,0.8)] whitespace-nowrap">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              status === 'speaking'
                ? 'bg-emerald-400 animate-ping'
                : status === 'listening'
                  ? 'bg-cyan-400 animate-pulse'
                  : status === 'connecting'
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-slate-400'
            }`}
          />
          <span
            aria-hidden="true"
            className="avatar-mouth-sim inline-block w-3.5 h-1 rounded-full bg-cyan-500/85 dark:bg-cyan-300/90"
          />
          <span>{statusWhisper}</span>
        </div>
      </div>
    </aside>
  );
};
