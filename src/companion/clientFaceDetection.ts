export interface NormalizedFaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ClientFaceDetectionResult {
  detected: boolean;
  unavailable?: boolean;
  box: NormalizedFaceBox | null;
  landmarksCount: number;
  faceCount: number;
  source: 'browser-face-detector' | 'unavailable';
  reason?: string;
}

function validateFaceGeometry(
  box: NormalizedFaceBox,
): { valid: boolean; reason?: string } {
  const minRatio = Math.min(box.width, box.height);
  const maxRatio = Math.max(box.width, box.height);

  if (!Number.isFinite(minRatio) || minRatio < 0.06 || maxRatio < 0.07) {
    return {
      valid: false,
      reason:
        'Detected face is too small in the frame. Please upload a closer portrait where the face is clearly visible.',
    };
  }

  const aspect = box.width / Math.max(1e-4, box.height);
  if (aspect < 0.42 || aspect > 2.1) {
    return {
      valid: false,
      reason:
        'Face proportions appear distorted or heavily occluded. Please upload an unobstructed portrait.',
    };
  }

  return { valid: true };
}

/**
 * Client-side face detection using native Chromium/Edge FaceDetector when available,
 * falling back gracefully to centered portrait framing on platforms without Shape Detection.
 */
export async function detectClientFaceInCanvas(
  canvas: HTMLCanvasElement,
): Promise<ClientFaceDetectionResult> {
  const width = Math.max(1, canvas.width);
  const height = Math.max(1, canvas.height);

  const BrowserFaceDetector = (window as unknown as { FaceDetector?: new (opts: Record<string, unknown>) => { detect: (source: HTMLCanvasElement) => Promise<Array<{ boundingBox?: { x?: number; y?: number; width?: number; height?: number } }>> } }).FaceDetector;

  if (typeof BrowserFaceDetector === 'function') {
    try {
      const detector = new BrowserFaceDetector({ fastMode: false, maxDetectedFaces: 3 });
      const faces = await detector.detect(canvas);
      if (Array.isArray(faces) && faces.length > 0) {
        const primary = [...faces].sort((a, b) => {
          const areaA = (a.boundingBox?.width || 0) * (a.boundingBox?.height || 0);
          const areaB = (b.boundingBox?.width || 0) * (b.boundingBox?.height || 0);
          return areaB - areaA;
        })[0];

        const b = primary.boundingBox;
        const normalizedBox: NormalizedFaceBox = {
          x: Math.max(0, Math.min(1, (b?.x || 0) / width)),
          y: Math.max(0, Math.min(1, (b?.y || 0) / height)),
          width: Math.max(0, Math.min(1, (b?.width || 0) / width)),
          height: Math.max(0, Math.min(1, (b?.height || 0) / height)),
        };

        const geometryCheck = validateFaceGeometry(normalizedBox);
        if (geometryCheck.valid) {
          return {
            detected: true,
            box: normalizedBox,
            landmarksCount: 0,
            faceCount: faces.length,
            source: 'browser-face-detector',
          };
        }
      }
    } catch {
      // Fall through to graceful portrait crop fallback
    }
  }

  return {
    detected: false,
    unavailable: true,
    box: null,
    landmarksCount: 0,
    faceCount: 0,
    source: 'unavailable',
  };
}
