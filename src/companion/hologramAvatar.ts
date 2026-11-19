import maleHologramImg from '../assets/images/avatar_hologram_male_1794610533388.jpg';
import { HOLO_AVATAR_CORTANA } from './avatarAssets';
import { detectClientFaceInCanvas, type NormalizedFaceBox } from './clientFaceDetection';

export type LiveSessionStatus = 'idle' | 'connecting' | 'listening' | 'speaking' | 'muted' | 'error';
export type LiveVoiceName = 'Zephyr' | 'Puck' | 'Kore' | 'Charon' | 'Fenrir';

export interface LiveVoiceOption {
  id: LiveVoiceName;
  label: string;
  tone: string;
}

export const LIVE_VOICE_OPTIONS: LiveVoiceOption[] = [
  { id: 'Zephyr', label: 'Zephyr', tone: 'Warm · Balanced' },
  { id: 'Kore', label: 'Kore', tone: 'Clear · Studio' },
  { id: 'Puck', label: 'Puck', tone: 'Bright · Expressive' },
  { id: 'Charon', label: 'Charon', tone: 'Deep · Calm' },
  { id: 'Fenrir', label: 'Fenrir', tone: 'Resonant · Bold' },
];

export type AvatarPresetId = 'female' | 'male' | 'custom';

export interface CustomFaceTraits {
  skinHex?: string;
  hairHex?: string;
  eyeHex?: string;
  lipHex?: string;
  genderCue?: 'female' | 'male';
  hairStyle?: 'short' | 'medium' | 'long';
  hasGlasses?: boolean;
  faceFound?: boolean;
}

export interface AvatarPreference {
  preset: AvatarPresetId;
  customImageDataUrl: string | null;
  customImageName?: string;
  customTraits?: CustomFaceTraits;
}

export interface AvatarPresetMeta {
  id: Exclude<AvatarPresetId, 'custom'>;
  label: string;
  subtitle: string;
  imageSrc: string;
}

export const AVATAR_PRESETS: AvatarPresetMeta[] = [
  {
    id: 'female',
    label: 'Aria (Female)',
    subtitle: '3D avatar with eye gaze, blinking & lip sync',
    imageSrc: HOLO_AVATAR_CORTANA,
  },
  {
    id: 'male',
    label: 'Orion (Male)',
    subtitle: '3D avatar with eye gaze, blinking & lip sync',
    imageSrc: maleHologramImg,
  },
];

const STORAGE_KEY = 'supremeai_voice_avatar_pref_v1';
const VOICE_STORAGE_KEY = 'supremeai_live_voice_name_v1';
const MIC_GAIN_STORAGE_KEY = 'supremeai_mic_input_gain_v1';
const VOICE_PITCH_STORAGE_KEY = 'supremeai_voice_pitch_v1';
export const VOICE_AVATAR_SYNC_EVENT = 'supremeai:voice-avatar-updated';

export const MIN_MIC_INPUT_GAIN = 0.5;
export const MAX_MIC_INPUT_GAIN = 2.0;
export const DEFAULT_MIC_INPUT_GAIN = 1.0;

export const MIN_VOICE_PITCH = 0.85;
export const MAX_VOICE_PITCH = 1.25;
export const DEFAULT_VOICE_PITCH = 1.0;

const VALID_VOICES: LiveVoiceName[] = ['Zephyr', 'Puck', 'Kore', 'Charon', 'Fenrir'];

export function loadVoicePreference(): LiveVoiceName {
  try {
    const raw = localStorage.getItem(VOICE_STORAGE_KEY) as LiveVoiceName | null;
    if (raw && VALID_VOICES.includes(raw)) return raw;
  } catch {
    // Ignore storage issues
  }
  return 'Zephyr';
}

export function saveVoicePreference(voice: LiveVoiceName): void {
  try {
    localStorage.setItem(VOICE_STORAGE_KEY, voice);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(VOICE_AVATAR_SYNC_EVENT));
    }
  } catch {
    // Ignore storage issues
  }
}

export function loadMicInputGainPreference(): number {
  try {
    const raw = Number(localStorage.getItem(MIC_GAIN_STORAGE_KEY));
    if (Number.isFinite(raw)) {
      return Math.min(MAX_MIC_INPUT_GAIN, Math.max(MIN_MIC_INPUT_GAIN, raw));
    }
  } catch {
    // ignore
  }
  return DEFAULT_MIC_INPUT_GAIN;
}

export function saveMicInputGainPreference(gain: number): void {
  const clamped = Math.min(MAX_MIC_INPUT_GAIN, Math.max(MIN_MIC_INPUT_GAIN, gain));
  try {
    localStorage.setItem(MIC_GAIN_STORAGE_KEY, clamped.toFixed(2));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(VOICE_AVATAR_SYNC_EVENT));
    }
  } catch {
    // ignore
  }
}

export function loadVoicePitchPreference(): number {
  try {
    const raw = Number(localStorage.getItem(VOICE_PITCH_STORAGE_KEY));
    if (Number.isFinite(raw)) {
      return Math.min(MAX_VOICE_PITCH, Math.max(MIN_VOICE_PITCH, raw));
    }
  } catch {
    // ignore
  }
  return DEFAULT_VOICE_PITCH;
}

export function saveVoicePitchPreference(pitch: number): void {
  const clamped = Math.min(MAX_VOICE_PITCH, Math.max(MIN_VOICE_PITCH, pitch));
  try {
    localStorage.setItem(VOICE_PITCH_STORAGE_KEY, clamped.toFixed(2));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(VOICE_AVATAR_SYNC_EVENT));
    }
  } catch {
    // ignore
  }
}

export function loadAvatarPreference(): AvatarPreference {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { preset: 'female', customImageDataUrl: null };
    }
    const parsed = JSON.parse(raw) as Partial<AvatarPreference>;
    const preset: AvatarPresetId =
      parsed.preset === 'male' || parsed.preset === 'custom' || parsed.preset === 'female'
        ? parsed.preset
        : 'female';
    const customImageDataUrl =
      typeof parsed.customImageDataUrl === 'string' &&
      parsed.customImageDataUrl.startsWith('data:image/')
        ? parsed.customImageDataUrl
        : null;
    if (preset === 'custom' && !customImageDataUrl) {
      return { preset: 'female', customImageDataUrl: null };
    }
    return {
      preset,
      customImageDataUrl,
      customImageName:
        typeof parsed.customImageName === 'string' ? parsed.customImageName : undefined,
      customTraits: parsed.customTraits,
    };
  } catch {
    return { preset: 'female', customImageDataUrl: null };
  }
}

export function saveAvatarPreference(pref: AvatarPreference): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pref));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(VOICE_AVATAR_SYNC_EVENT));
    }
  } catch {
    // Ignore storage quota issues gracefully
  }
}

export function resolveAvatarSource(pref: AvatarPreference): {
  src: string;
  isPrestyledHologram: boolean;
  traits?: CustomFaceTraits;
} {
  if (pref.preset === 'custom' && pref.customImageDataUrl) {
    return {
      src: pref.customImageDataUrl,
      isPrestyledHologram: false,
      traits: pref.customTraits,
    };
  }
  const preset = AVATAR_PRESETS.find((p) => p.id === pref.preset) || AVATAR_PRESETS[0];
  return { src: preset.imageSrc, isPrestyledHologram: true };
}

function readImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please select a PNG, JPG, or WebP image file.'));
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      reject(new Error('Image must be smaller than 12 MB.'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid or unsupported image format.'));
      img.onload = () => resolve(img);
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}

function sampleRegionHex(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
): string | undefined {
  try {
    const sample = ctx.getImageData(Math.max(0, x), Math.max(0, y), Math.max(1, w), Math.max(1, h)).data;
    let sr = 0;
    let sg = 0;
    let sb = 0;
    const pixels = sample.length / 4;
    for (let i = 0; i < sample.length; i += 4) {
      sr += sample[i];
      sg += sample[i + 1];
      sb += sample[i + 2];
    }
    if (pixels <= 0) return undefined;
    const toHex = (n: number) =>
      Math.max(0, Math.min(255, Math.round(n)))
        .toString(16)
        .padStart(2, '0');
    return `#${toHex(sr / pixels)}${toHex(sg / pixels)}${toHex(sb / pixels)}`;
  } catch {
    return undefined;
  }
}

/**
 * Crops an uploaded portrait cleanly around the face (using client FaceDetector when
 * supported, or portrait-centered framing otherwise) and samples skin/hair tones for
 * matching the 3D articulated avatar rig.
 */
export async function processCustomFaceUpload(file: File): Promise<{
  dataUrl: string;
  traits: CustomFaceTraits;
  faceDetected: boolean;
}> {
  const img = await readImageFromFile(file);

  const maxSide = 800;
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const aw = Math.max(64, Math.round(img.naturalWidth * scale));
  const ah = Math.max(64, Math.round(img.naturalHeight * scale));
  const analysisCanvas = document.createElement('canvas');
  analysisCanvas.width = aw;
  analysisCanvas.height = ah;
  const aCtx = analysisCanvas.getContext('2d');
  if (!aCtx) {
    throw new Error('2D canvas unavailable.');
  }
  aCtx.drawImage(img, 0, 0, aw, ah);

  const clientCheck = await detectClientFaceInCanvas(analysisCanvas);
  const detectedBox: NormalizedFaceBox = clientCheck.detected && clientCheck.box
    ? clientCheck.box
    : { x: 0.18, y: 0.12, width: 0.64, height: 0.64 };

  const boxCx = (detectedBox.x + detectedBox.width * 0.5) * img.naturalWidth;
  const boxCy = (detectedBox.y + detectedBox.height * 0.5) * img.naturalHeight;
  const faceMaxDim = Math.max(
    detectedBox.width * img.naturalWidth,
    detectedBox.height * img.naturalHeight,
  );
  const cropSide = Math.max(
    96,
    Math.min(Math.min(img.naturalWidth, img.naturalHeight), faceMaxDim * 1.28),
  );
  const sx = Math.max(0, Math.min(img.naturalWidth - cropSide, boxCx - cropSide * 0.5));
  const sy = Math.max(0, Math.min(img.naturalHeight - cropSide, boxCy - cropSide * 0.5));

  const outSize = 512;
  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = outSize;
  cropCanvas.height = outSize;
  const cCtx = cropCanvas.getContext('2d');
  if (!cCtx) {
    return {
      dataUrl: analysisCanvas.toDataURL('image/jpeg', 0.9),
      traits: { genderCue: 'female', hairStyle: 'medium', faceFound: true },
      faceDetected: true,
    };
  }
  cCtx.drawImage(img, sx, sy, cropSide, cropSide, 0, 0, outSize, outSize);

  const skinHex = sampleRegionHex(
    cCtx,
    Math.round(outSize * 0.38),
    Math.round(outSize * 0.54),
    16,
    16,
  );
  const hairHex = sampleRegionHex(
    cCtx,
    Math.round(outSize * 0.44),
    Math.round(outSize * 0.1),
    18,
    14,
  );

  const traits: CustomFaceTraits = {
    skinHex,
    hairHex,
    genderCue: 'female',
    hairStyle: 'medium',
    hasGlasses: false,
    faceFound: true,
  };

  return {
    dataUrl: cropCanvas.toDataURL('image/jpeg', 0.92),
    traits,
    faceDetected: true,
  };
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / Math.max(1e-5, edge1 - edge0));
  return t * t * (3 - 2 * t);
}

export interface HologramTexturePair {
  colorCanvas: HTMLCanvasElement;
  depthCanvas: HTMLCanvasElement;
}

/**
 * Converts either a pre-styled holographic portrait OR a user-uploaded photo
 * into a luminous hologram texture and grayscale 3D relief depth map.
 */
export function buildHologramTextures(
  imageSrc: string,
  isPrestyledHologram: boolean,
): Promise<HologramTexturePair> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onerror = () => reject(new Error('Unable to load avatar texture source.'));
    img.onload = () => {
      const size = 512;
      const srcCanvas = document.createElement('canvas');
      srcCanvas.width = size;
      srcCanvas.height = size;
      const srcCtx = srcCanvas.getContext('2d');
      if (!srcCtx) {
        reject(new Error('2D canvas unavailable.'));
        return;
      }

      const imgAspect = img.naturalWidth / Math.max(1, img.naturalHeight);
      let sx = 0;
      let sy = 0;
      let sw = img.naturalWidth;
      let sh = img.naturalHeight;
      if (imgAspect > 1) {
        sw = img.naturalHeight;
        sx = (img.naturalWidth - sw) * 0.5;
      } else if (imgAspect < 1) {
        sh = img.naturalWidth;
        sy = (img.naturalHeight - sh) * 0.22;
      }
      srcCtx.drawImage(img, sx, sy, sw, sh, 0, 0, size, size);

      const srcData = srcCtx.getImageData(0, 0, size, size);
      const pixels = srcData.data;

      const colorCanvas = document.createElement('canvas');
      colorCanvas.width = size;
      colorCanvas.height = size;
      const colorCtx = colorCanvas.getContext('2d')!;
      const colorOut = colorCtx.createImageData(size, size);

      const depthCanvas = document.createElement('canvas');
      depthCanvas.width = size;
      depthCanvas.height = size;
      const depthCtx = depthCanvas.getContext('2d')!;
      const depthOut = depthCtx.createImageData(size, size);

      let bgR = 0;
      let bgG = 0;
      let bgB = 0;
      let bgSamples = 0;
      if (!isPrestyledHologram) {
        for (let y = 0; y < size; y += 4) {
          for (let x = 0; x < size; x += 4) {
            const isTopBand = y < size * 0.1;
            const isSideCorner = y < size * 0.62 && (x < size * 0.08 || x > size * 0.92);
            if (!isTopBand && !isSideCorner) continue;
            const idx = (y * size + x) * 4;
            bgR += pixels[idx];
            bgG += pixels[idx + 1];
            bgB += pixels[idx + 2];
            bgSamples++;
          }
        }
        if (bgSamples > 0) {
          bgR /= bgSamples * 255;
          bgG /= bgSamples * 255;
          bgB /= bgSamples * 255;
        }
      }

      const gray = new Float32Array(size * size);
      for (let i = 0; i < size * size; i++) {
        const p = i * 4;
        gray[i] = (0.2126 * pixels[p] + 0.7152 * pixels[p + 1] + 0.0722 * pixels[p + 2]) / 255;
      }

      for (let y = 0; y < size; y++) {
        const ny = y / (size - 1);
        for (let x = 0; x < size; x++) {
          const nx = x / (size - 1);
          const i = y * size + x;
          const p = i * 4;

          const r = pixels[p] / 255;
          const g = pixels[p + 1] / 255;
          const b = pixels[p + 2] / 255;
          const lum = gray[i];
          const maxCh = Math.max(r, g, b);

          const shoulderFlare = ny > 0.62 ? (ny - 0.62) * 0.65 : 0;
          const rx = 0.34 + shoulderFlare;
          const dx = (nx - 0.5) / rx;
          const dy = (ny - 0.48) / 0.45;
          const ovalR = Math.sqrt(dx * dx + dy * dy);
          const bottomFade = 1 - smoothstep(0.84, 0.99, ny);
          const topFade = 1 - smoothstep(0.95, 1.32, ovalR);

          if (isPrestyledHologram) {
            const keyStrength = smoothstep(0.055, 0.34, maxCh);
            const outerSilhouette = 1 - smoothstep(0.88, 1.38, ovalR);
            const alpha = clamp01(keyStrength * (0.28 + 0.72 * outerSilhouette) * bottomFade);
            const boost = 1.08;
            colorOut.data[p] = Math.min(255, Math.round(pixels[p] * boost));
            colorOut.data[p + 1] = Math.min(255, Math.round(pixels[p + 1] * boost));
            colorOut.data[p + 2] = Math.min(255, Math.round(pixels[p + 2] * boost));
            colorOut.data[p + 3] = Math.round(alpha * 255);

            const faceDome = Math.exp(
              -(((nx - 0.5) * (nx - 0.5)) / 0.085 + ((ny - 0.44) * (ny - 0.44)) / 0.11),
            );
            const depthVal = clamp01((0.55 * faceDome + 0.45 * maxCh) * (0.25 + 0.75 * alpha));
            const dByte = Math.round(depthVal * 255);
            depthOut.data[p] = dByte;
            depthOut.data[p + 1] = dByte;
            depthOut.data[p + 2] = dByte;
            depthOut.data[p + 3] = 255;
          } else {
            const xL = Math.max(0, x - 1);
            const xR = Math.min(size - 1, x + 1);
            const yU = Math.max(0, y - 1);
            const yD = Math.min(size - 1, y + 1);

            const gx =
              -gray[yU * size + xL] +
              gray[yU * size + xR] +
              -2 * gray[y * size + xL] +
              2 * gray[y * size + xR] +
              -gray[yD * size + xL] +
              gray[yD * size + xR];
            const gy =
              -gray[yU * size + xL] -
              2 * gray[yU * size + x] -
              gray[yU * size + xR] +
              gray[yD * size + xL] +
              2 * gray[yD * size + x] +
              gray[yD * size + xR];
            const edge = clamp01(Math.sqrt(gx * gx + gy * gy) * 1.45);

            const dr = r - bgR;
            const dg = g - bgG;
            const db = b - bgB;
            const bgDist = Math.sqrt(dr * dr + dg * dg + db * db) / 1.732;
            const fgFromBg = smoothstep(0.08, 0.3, bgDist);

            const innerCore = 1 - smoothstep(0.58, 0.96, ovalR);
            const subjectMatte = clamp01(
              Math.max(innerCore * 0.94, fgFromBg * topFade) * topFade * bottomFade,
            );

            const scanline = 0.88 + 0.12 * Math.sin(y * 1.05);
            const holoSignal = clamp01((lum * 0.72 + edge * 0.78) * scanline);

            let outR: number;
            let outG: number;
            let outB: number;
            if (holoSignal < 0.45) {
              const t = holoSignal / 0.45;
              outR = 12 + t * 24 + edge * 55;
              outG = 58 + t * 142;
              outB = 185 + t * 70;
            } else {
              const t = (holoSignal - 0.45) / 0.55;
              outR = 36 + t * 195 + edge * 35;
              outG = 200 + t * 52;
              outB = 255;
            }

            const alpha = clamp01(
              subjectMatte * (0.28 + 0.72 * smoothstep(0.06, 0.55, holoSignal)),
            );

            colorOut.data[p] = Math.min(255, Math.round(outR));
            colorOut.data[p + 1] = Math.min(255, Math.round(outG));
            colorOut.data[p + 2] = Math.min(255, Math.round(outB));
            colorOut.data[p + 3] = Math.round(alpha * 255);

            const faceDome = Math.exp(
              -(((nx - 0.5) * (nx - 0.5)) / 0.09 + ((ny - 0.44) * (ny - 0.44)) / 0.12),
            );
            const depthVal = clamp01((0.5 * faceDome + 0.35 * lum + 0.15 * edge) * subjectMatte);
            const dByte = Math.round(depthVal * 255);
            depthOut.data[p] = dByte;
            depthOut.data[p + 1] = dByte;
            depthOut.data[p + 2] = dByte;
            depthOut.data[p + 3] = 255;
          }
        }
      }

      colorCtx.putImageData(colorOut, 0, 0);
      depthCtx.putImageData(depthOut, 0, 0);
      resolve({ colorCanvas, depthCanvas });
    };
    img.src = imageSrc;
  });
}
