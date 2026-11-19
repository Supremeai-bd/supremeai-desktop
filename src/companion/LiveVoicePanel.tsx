import React, { useEffect, useRef, useState } from 'react';
import {
  AudioLines,
  ChevronDown,
  ChevronUp,
  Mic,
  MicOff,
  RotateCcw,
  Upload,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { LiveVoiceAvatarCanvas } from './LiveVoiceAvatarCanvas';
import { useAvatarExpression } from '../hooks/useAvatarExpression';
import {
  AVATAR_PRESETS,
  DEFAULT_MIC_INPUT_GAIN,
  DEFAULT_VOICE_PITCH,
  LIVE_VOICE_OPTIONS,
  MAX_MIC_INPUT_GAIN,
  MAX_VOICE_PITCH,
  MIN_MIC_INPUT_GAIN,
  MIN_VOICE_PITCH,
  VOICE_AVATAR_SYNC_EVENT,
  loadAvatarPreference,
  loadMicInputGainPreference,
  loadVoicePitchPreference,
  processCustomFaceUpload,
  resolveAvatarSource,
  saveAvatarPreference,
  saveMicInputGainPreference,
  saveVoicePitchPreference,
  saveVoicePreference,
  type AvatarPreference,
  type AvatarPresetId,
  type LiveSessionStatus,
  type LiveVoiceName,
} from './hologramAvatar';

export interface LiveVoicePanelProps {
  isOpen: boolean;
  isDark: boolean;
  voiceName: LiveVoiceName;
  isSpeaking: boolean;
  isStreaming: boolean;
  streamingContent: string;
  latestAssistantContent: string;
  onVoiceChange: (voice: LiveVoiceName) => void;
  onVoiceSpeedChange: (speed: number) => void;
  onSpeakLatest: () => void;
  onStopSpeaking: () => void;
  onClose: () => void;
}

export const LiveVoicePanel: React.FC<LiveVoicePanelProps> = ({
  isOpen,
  isDark,
  voiceName,
  isSpeaking,
  isStreaming,
  streamingContent,
  latestAssistantContent,
  onVoiceChange,
  onVoiceSpeedChange,
  onSpeakLatest,
  onStopSpeaking,
  onClose,
}) => {
  const panelRef = useRef<HTMLElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const levelsRef = useRef<{ input: number; output: number }>({ input: 0, output: 0 });
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const [avatarPref, setAvatarPref] = useState<AvatarPreference>(() => loadAvatarPreference());
  const [micGain, setMicGain] = useState<number>(() => loadMicInputGainPreference());
  const [voicePitch, setVoicePitch] = useState<number>(() => loadVoicePitchPreference());
  const [isMicListening, setIsMicListening] = useState(false);
  const [controlsExpanded, setControlsExpanded] = useState(true);
  const [resetViewCounter, setResetViewCounter] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const status: LiveSessionStatus = isSpeaking
    ? 'speaking'
    : isMicListening
      ? 'listening'
      : isStreaming
        ? 'connecting'
        : 'idle';

  const activeAvatarSource = resolveAvatarSource(avatarPref);

  // Sync avatar & voice slider preferences when changed from SettingsView
  useEffect(() => {
    const handleSync = () => {
      setAvatarPref(loadAvatarPreference());
      setMicGain(loadMicInputGainPreference());
      setVoicePitch(loadVoicePitchPreference());
    };
    window.addEventListener(VOICE_AVATAR_SYNC_EVENT, handleSync);
    return () => window.removeEventListener(VOICE_AVATAR_SYNC_EVENT, handleSync);
  }, []);

  // Optional live microphone amplitude metering when user toggles Mic Listen
  useEffect(() => {
    if (!isOpen || !isMicListening) {
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((t) => t.stop());
        micStreamRef.current = null;
      }
      if (audioCtxRef.current) {
        void audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
      analyserRef.current = null;
      return;
    }

    let cancelled = false;
    const startMic = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setIsMicListening(false);
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        micStreamRef.current = stream;
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;
      } catch {
        if (!cancelled) setIsMicListening(false);
      }
    };
    void startMic();

    return () => {
      cancelled = true;
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((t) => t.stop());
        micStreamRef.current = null;
      }
      if (audioCtxRef.current) {
        void audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
      analyserRef.current = null;
    };
  }, [isOpen, isMicListening]);

  // Feed smooth real-time input/output audio energy into levelsRef for 3D lip-sync & aura rings
  useEffect(() => {
    if (!isOpen) return;
    let rafId = 0;
    const timeData = new Uint8Array(128);
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = (now - startTime) * 0.001;

      // Mic input RMS
      if (analyserRef.current && isMicListening) {
        analyserRef.current.getByteTimeDomainData(timeData);
        let sumSq = 0;
        for (let i = 0; i < timeData.length; i++) {
          const norm = (timeData[i] - 128) / 128;
          sumSq += norm * norm;
        }
        const rms = Math.sqrt(sumSq / timeData.length) * 3.4 * micGain;
        levelsRef.current.input = Math.min(1, rms);
      } else {
        levelsRef.current.input *= 0.85;
      }

      // Speech output cadence envelope while speaking TTS
      if (isSpeaking) {
        const syllable =
          0.38 +
          0.26 * Math.sin(elapsed * 11.4) +
          0.18 * Math.sin(elapsed * 17.8 + 1.1) +
          0.14 * Math.cos(elapsed * 6.2);
        levelsRef.current.output = Math.max(0.12, Math.min(0.95, syllable));
      } else if (isStreaming) {
        levelsRef.current.output = 0.14 + 0.08 * Math.sin(elapsed * 5.2);
      } else {
        levelsRef.current.output *= 0.84;
      }

      const el = panelRef.current;
      if (el) {
        el.style.setProperty('--avatar-mic-rms', levelsRef.current.input.toFixed(3));
        el.style.setProperty('--avatar-audio-level', levelsRef.current.output.toFixed(3));
        el.classList.toggle('avatar-speech-active', isSpeaking || levelsRef.current.input > 0.05);
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isOpen, isMicListening, isSpeaking, isStreaming, micGain]);

  const { expression, expressionClass, intensity } = useAvatarExpression({
    streamingContent,
    isStreaming,
    latestAssistantContent,
    isConnecting: status === 'connecting',
  });

  if (!isOpen) return null;

  const handleSelectPreset = (preset: AvatarPresetId) => {
    setUploadError(null);
    const next: AvatarPreference = {
      ...avatarPref,
      preset,
    };
    setAvatarPref(next);
    saveAvatarPreference(next);
  };

  const handleCustomPhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploadError(null);
    setIsUploading(true);
    try {
      const processed = await processCustomFaceUpload(file);
      const next: AvatarPreference = {
        preset: 'custom',
        customImageDataUrl: processed.dataUrl,
        customImageName: file.name,
        customTraits: processed.traits,
      };
      setAvatarPref(next);
      saveAvatarPreference(next);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Unable to process photo.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleGainChange = (val: number) => {
    setMicGain(val);
    saveMicInputGainPreference(val);
  };

  const handlePitchChange = (val: number) => {
    setVoicePitch(val);
    saveVoicePitchPreference(val);
    onVoiceSpeedChange(val);
  };

  const handleVoiceSelect = (voice: LiveVoiceName) => {
    saveVoicePreference(voice);
    onVoiceChange(voice);
  };

  const statusText =
    status === 'speaking'
      ? `Speaking · ${voiceName}`
      : status === 'listening'
        ? 'Listening · Live Mic'
        : status === 'connecting'
          ? 'Thinking · Streaming'
          : `Ready · ${voiceName}`;

  const expressionLabel =
    expression === 'joyful' || expression === 'happy'
      ? 'Warm'
      : expression === 'analytical'
        ? 'Analytical'
        : expression === 'thinking'
          ? 'Focused'
          : 'Attentive';

  return (
    <aside
      ref={panelRef}
      data-testid="live-voice-panel"
      aria-label="3D Real-time Voice Companion"
      data-expression={expression}
      className={`${expressionClass} flex w-[280px] md:w-[320px] xl:w-[360px] shrink-0 h-full border-l border-black/8 dark:border-white/8 flex-col overflow-hidden relative select-none bg-slate-50/90 dark:bg-slate-950/90`}
    >
      {/* Minimal top bar (no backdrop-blur over WebGL) */}
      <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 border-b border-black/6 dark:border-white/8 bg-white/95 dark:bg-slate-950/95 shrink-0 z-10">
        <div className="min-w-0">
          <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-100 truncate">
            3D Companion
          </div>
          <div className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate">
            {statusText} · {expressionLabel}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setResetViewCounter((c) => c + 1)}
            title="Reset 3D camera"
            aria-label="Reset 3D camera"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/8 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            title="Close 3D Companion"
            aria-label="Close 3D Companion"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/8 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Unobstructed 3D WebGL Avatar Stage */}
      <div className="flex-1 w-full min-h-[260px] relative bg-transparent overflow-hidden">
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
          resetViewCounter={resetViewCounter}
        />
      </div>

      {/* Collapsible Bottom Control Dock (solid/translucent rgba without backdrop-filter over WebGL) */}
      <div className="shrink-0 border-t border-black/8 dark:border-white/10 bg-white/95 dark:bg-slate-950/95 px-3 py-2.5">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsMicListening((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                isMicListening
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {isMicListening ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
              <span>{isMicListening ? 'Mic Live' : 'Mic'}</span>
            </button>

            <button
              type="button"
              onClick={isSpeaking ? onStopSpeaking : onSpeakLatest}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                isSpeaking
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {isSpeaking ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
              <span>{isSpeaking ? 'Stop' : 'Speak'}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setControlsExpanded((prev) => !prev)}
            className="inline-flex items-center gap-1 text-[10.5px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            <span>{controlsExpanded ? 'Hide' : 'Controls'}</span>
            {controlsExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          </button>
        </div>

        {controlsExpanded && (
          <div className="space-y-2.5 pt-1">
            {/* Avatar Preset Switcher (Aria / Orion / Custom Photo) */}
            <div className="grid grid-cols-3 gap-1.5">
              {AVATAR_PRESETS.map((preset) => {
                const active = avatarPref.preset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset.id)}
                    className={`px-2 py-1.5 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                      active
                        ? 'theme-accent-active border-transparent'
                        : 'border-black/10 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  >
                    {preset.id === 'female' ? 'Aria' : 'Orion'}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className={`inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                  avatarPref.preset === 'custom'
                    ? 'theme-accent-active border-transparent'
                    : 'border-black/10 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <Upload className="w-3 h-3" />
                <span>{isUploading ? '...' : 'Photo'}</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleCustomPhotoUpload}
              />
            </div>

            {uploadError && (
              <div className="text-[10.5px] text-rose-500 dark:text-rose-400">{uploadError}</div>
            )}

            {/* Voice Persona Selector */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10.5px] font-medium text-slate-600 dark:text-slate-300">
                Voice Persona
              </span>
              <select
                value={voiceName}
                onChange={(e) => handleVoiceSelect(e.target.value as LiveVoiceName)}
                aria-label="Voice Persona"
                className="rounded-lg border border-black/10 dark:border-white/12 bg-slate-50 dark:bg-slate-900 px-2 py-1 text-[11px] text-slate-800 dark:text-slate-100 outline-none"
              >
                {LIVE_VOICE_OPTIONS.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label} ({v.tone})
                  </option>
                ))}
              </select>
            </div>

            {/* Mic Sensitivity & Voice Speed Sliders */}
            <div className="space-y-2 pt-1 border-t border-black/6 dark:border-white/8">
              <div>
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <label
                    htmlFor="desktop-mic-sensitivity"
                    className="inline-flex items-center gap-1 text-[10.5px] font-medium text-slate-600 dark:text-slate-300"
                  >
                    <Mic className="w-3 h-3 text-cyan-500 shrink-0" />
                    <span>Mic Sensitivity</span>
                  </label>
                  <span className="text-[10px] font-mono tabular-nums text-slate-500 dark:text-cyan-300">
                    {micGain.toFixed(2)}×
                  </span>
                </div>
                <input
                  id="desktop-mic-sensitivity"
                  type="range"
                  min={MIN_MIC_INPUT_GAIN}
                  max={MAX_MIC_INPUT_GAIN}
                  step={0.05}
                  value={micGain}
                  onChange={(e) => handleGainChange(Number.parseFloat(e.target.value))}
                  className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-slate-200 dark:bg-slate-800 accent-cyan-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <label
                    htmlFor="desktop-voice-pitch"
                    className="inline-flex items-center gap-1 text-[10.5px] font-medium text-slate-600 dark:text-slate-300"
                  >
                    <AudioLines className="w-3 h-3 text-cyan-500 shrink-0" />
                    <span>Voice Speed</span>
                  </label>
                  <div className="inline-flex items-center gap-1">
                    {Math.abs(voicePitch - DEFAULT_VOICE_PITCH) > 0.01 && (
                      <button
                        type="button"
                        onClick={() => handlePitchChange(DEFAULT_VOICE_PITCH)}
                        aria-label="Reset voice speed"
                        className="p-0.5 rounded text-slate-400 hover:text-cyan-500 cursor-pointer"
                      >
                        <RotateCcw className="w-2.5 h-2.5" />
                      </button>
                    )}
                    <span className="text-[10px] font-mono tabular-nums text-slate-500 dark:text-cyan-300">
                      {voicePitch.toFixed(2)}×
                    </span>
                  </div>
                </div>
                <input
                  id="desktop-voice-pitch"
                  type="range"
                  min={MIN_VOICE_PITCH}
                  max={MAX_VOICE_PITCH}
                  step={0.05}
                  value={voicePitch}
                  onChange={(e) => handlePitchChange(Number.parseFloat(e.target.value))}
                  className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-slate-200 dark:bg-slate-800 accent-cyan-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default LiveVoicePanel;
