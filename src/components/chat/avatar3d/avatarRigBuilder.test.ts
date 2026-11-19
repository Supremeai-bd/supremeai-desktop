import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { createArticulatedAvatarRig } from './avatarRigBuilder';

function createMockCanvasDocument() {
  const noopGrad = () => ({ addColorStop: () => {} });
  const mockCtx = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    fillRect: () => {},
    clearRect: () => {},
    beginPath: () => {},
    arc: () => {},
    ellipse: () => {},
    moveTo: () => {},
    lineTo: () => {},
    fill: () => {},
    stroke: () => {},
    save: () => {},
    restore: () => {},
    translate: () => {},
    scale: () => {},
    drawImage: () => {},
    createLinearGradient: noopGrad,
    createRadialGradient: noopGrad,
  };
  return {
    createElement: (tag: string) => {
      if (tag === 'canvas') {
        return {
          width: 512,
          height: 512,
          getContext: () => mockCtx,
        };
      }
      return {};
    },
  };
}

describe('avatarRigBuilder 3D head morph target integrity', () => {
  const originalDocument = (globalThis as unknown as { document?: unknown }).document;

  beforeEach(() => {
    (globalThis as unknown as { document: unknown }).document = createMockCanvasDocument();
  });

  afterEach(() => {
    if (originalDocument === undefined) {
      delete (globalThis as unknown as { document?: unknown }).document;
    } else {
      (globalThis as unknown as { document: unknown }).document = originalDocument;
    }
  });

  it('uses morphTargetsRelative = true with bounded delta offsets so speaking never shrinks the skull', () => {
    const rig = createArticulatedAvatarRig({ isFemale: true, maxAnisotropy: 1 });

    // Locate the sculpted head mesh containing the 3 facial morph targets (jaw, smile, oh)
    let headMesh: THREE.Mesh | null = null;
    rig.root.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry.morphAttributes.position?.length === 3) {
          headMesh = mesh;
        }
      }
    });

    expect(headMesh).not.toBeNull();
    const headGeo = headMesh!.geometry;
    expect(headGeo.morphTargetsRelative).toBe(true);

    const morphPositions = headGeo.morphAttributes.position;
    expect(morphPositions).toBeDefined();
    const pos = headGeo.getAttribute('position') as THREE.BufferAttribute;
    const jawDelta = morphPositions![0] as THREE.BufferAttribute;
    const smileDelta = morphPositions![1] as THREE.BufferAttribute;
    const ohDelta = morphPositions![2] as THREE.BufferAttribute;

    // Ensure zero NaN values and verify relative deltas stay small (<= 0.05m) rather than full world positions
    let maxJawMag = 0;
    let maxSmileMag = 0;
    let maxOhMag = 0;
    for (let i = 0; i < pos.count; i++) {
      const px = pos.getX(i);
      const py = pos.getY(i);
      const pz = pos.getZ(i);
      expect(Number.isFinite(px) && Number.isFinite(py) && Number.isFinite(pz)).toBe(true);

      maxJawMag = Math.max(
        maxJawMag,
        Math.hypot(jawDelta.getX(i), jawDelta.getY(i), jawDelta.getZ(i))
      );
      maxSmileMag = Math.max(
        maxSmileMag,
        Math.hypot(smileDelta.getX(i), smileDelta.getY(i), smileDelta.getZ(i))
      );
      maxOhMag = Math.max(maxOhMag, Math.hypot(ohDelta.getX(i), ohDelta.getY(i), ohDelta.getZ(i)));
    }

    expect(maxJawMag).toBeGreaterThan(0.01);
    expect(maxJawMag).toBeLessThan(0.05);
    expect(maxSmileMag).toBeGreaterThan(0.01);
    expect(maxSmileMag).toBeLessThan(0.05);
    expect(maxOhMag).toBe(0);

    // Apply strong speaking pose and confirm skull morphTargetInfluences update safely
    rig.applyPose({
      elapsed: 1.5,
      dt: 0.016,
      speakEnergy: 0.85,
      listenEnergy: 0,
      lookX: 0,
      lookY: 0,
      blinkAmount: 0,
      jawOpen: 0.62,
      visemeOh: 0.52,
      smileAmount: 0.4,
      browRaise: 0.2,
      browAsym: 0.1,
      headYaw: 0,
      headPitch: 0,
      headRoll: 0,
      bodyBreath: 0,
      accentColor: new THREE.Color(0x22d3ee),
      isMuted: false,
      isConnecting: false,
    });

    expect(headMesh!.morphTargetInfluences?.[0]).toBeCloseTo(0.62, 5);
    expect(headMesh!.morphTargetInfluences?.[1]).toBeCloseTo(0.4, 5);
    expect(headMesh!.morphTargetInfluences?.[2]).toBeCloseTo(0.52, 5);

    rig.dispose();
  });
});
