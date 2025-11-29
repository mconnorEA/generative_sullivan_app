import {
  Path,
  OrnamentNode,
  identityTransform,
  moveTo,
  lineTo,
  closePath,
} from '../model/types';

export interface LeafProfile {
  /** Identifier for the profile (e.g., 'ovate'). */
  id: string;
  /** Control widths at different normalized positions along the leaf (0 = base, 1 = tip). */
  widths: Array<{ t: number; width: number }>;
  /** How strongly the base pinches inwards (0..1). */
  basePull: number;
  /** How pointy the tip is (0..1). */
  tipPull: number;
}

export interface LeafShapeParams {
  /** Normalized length of the leaf (1.0 works well with transforms). */
  length?: number;
  /** Maximum half-width multiplier. */
  maxWidth?: number;
  /** Midrib curvature; negative bends left, positive bends right. */
  curvature?: number;
  /**
   * How much to bias toward the profile's base/tip pulls (0..1).
   * Higher values pinch base and sharpen tip.
   */
  pullBias?: number;
  /** Number of segments used to approximate curves. */
  resolution?: number;
  /** Which profile to render. */
  profile?: LeafProfile;
}

export interface LeafGeometry {
  outline: Path;
  midrib: Path;
}

export interface LeafParams {
  length: number;
  width: number;
  tipSharpness: number;
  baseTaper: number;
  asymmetry: number;
  lobes: number;
  serration: number;
  curvature: number;
}

export const defaultLeafParams: LeafParams = {
  length: 0.4,
  width: 0.2,
  tipSharpness: 0.5,
  baseTaper: 0.5,
  asymmetry: 0.5,
  lobes: 0,
  serration: 0,
  curvature: 0.2,
};

const baseProfile: LeafProfile = {
  id: 'ovate',
  widths: [
    { t: 0, width: 0.15 },
    { t: 0.15, width: 0.55 },
    { t: 0.45, width: 0.75 },
    { t: 0.75, width: 0.5 },
    { t: 1, width: 0 },
  ],
  basePull: 0.35,
  tipPull: 0.45,
};

const lanceolateProfile: LeafProfile = {
  id: 'lanceolate',
  widths: [
    { t: 0, width: 0.18 },
    { t: 0.25, width: 0.48 },
    { t: 0.55, width: 0.52 },
    { t: 0.85, width: 0.32 },
    { t: 1, width: 0 },
  ],
  basePull: 0.15,
  tipPull: 0.65,
};

const cordateProfile: LeafProfile = {
  id: 'cordate',
  widths: [
    { t: 0, width: 0.22 },
    { t: 0.12, width: 0.68 },
    { t: 0.35, width: 0.8 },
    { t: 0.65, width: 0.58 },
    { t: 1, width: 0 },
  ],
  basePull: 0.6,
  tipPull: 0.35,
};

export const leafProfiles: Record<string, LeafProfile> = {
  ovate: baseProfile,
  lanceolate: lanceolateProfile,
  cordate: cordateProfile,
};

/**
 * Morph one leaf profile into another.
 * @param a source profile
 * @param b destination profile
 * @param alpha blend amount (0..1)
 */
export function morphLeaf(a: LeafProfile, b: LeafProfile, alpha: number): LeafProfile {
  const tValues = Array.from(
    new Set(
      [...a.widths, ...b.widths]
        .map((p) => clamp01(p.t))
        .map((t) => Number(t.toFixed(4)))
    )
  ).sort((x, y) => x - y);

  const widths = tValues.map((t) => {
    const wa = sampleWidthAt(a, t);
    const wb = sampleWidthAt(b, t);
    return { t, width: lerp(wa, wb, alpha) };
  });

  return {
    id: `${a.id}-to-${b.id}-${alpha.toFixed(2)}`,
    widths,
    basePull: lerp(a.basePull, b.basePull, alpha),
    tipPull: lerp(a.tipPull, b.tipPull, alpha),
  };
}

export function createLeafGeometry(params: LeafShapeParams = {}): LeafGeometry {
  const profile = params.profile ?? baseProfile;
  const length = params.length ?? 1;
  const maxWidth = params.maxWidth ?? 0.6;
  const curvature = clamp(params.curvature ?? 0, -0.85, 0.85);
  const pullBias = clamp01(params.pullBias ?? 0.6);
  const resolution = Math.max(6, Math.floor(params.resolution ?? 48));

  const outline = buildOutline({
    profile,
    length,
    maxWidth,
    curvature,
    pullBias,
    resolution,
  });

  const midrib = buildMidrib({ length, curvature, resolution });

  return { outline, midrib };
}

export function createLeafNode(params: LeafShapeParams = {}): OrnamentNode {
  const { outline, midrib } = createLeafGeometry(params);
  const profileId = (params.profile ?? baseProfile).id;

  return {
    id: `leaf-${profileId}`,
    type: 'leaf',
    plateOrigin: 2,
    stepInPlate: 2,
    role: 'leaf-outline',
    params: {
      profile: profileId,
      curvature: params.curvature ?? 0,
      length: params.length ?? 1,
      maxWidth: params.maxWidth ?? 0.6,
    },
    transform: identityTransform(),
    paths: [outline, midrib],
    children: [],
  };
}

/**
 * Linearly blend two simplified parameter sets to drive stem leaves.
 */
export function morphLeafParams(a: LeafParams, b: LeafParams, alpha: number): LeafParams {
  const t = clamp01(alpha);
  return {
    length: lerp(a.length, b.length, t),
    width: lerp(a.width, b.width, t),
    tipSharpness: lerp(a.tipSharpness, b.tipSharpness, t),
    baseTaper: lerp(a.baseTaper, b.baseTaper, t),
    asymmetry: lerp(a.asymmetry, b.asymmetry, t),
    lobes: lerp(a.lobes, b.lobes, t),
    serration: lerp(a.serration, b.serration, t),
    curvature: lerp(a.curvature, b.curvature, t),
  };
}

/**
 * Convenience helper that converts a simplified parameter set into a renderable Path.
 */
export function leafToPath(params: LeafParams): Path {
  const shapeParams = leafParamsToShapeParams(params);
  const { outline } = createLeafGeometry(shapeParams);
  return outline;
}

function buildOutline(config: {
  profile: LeafProfile;
  length: number;
  maxWidth: number;
  curvature: number;
  pullBias: number;
  resolution: number;
}): Path {
  const { profile, length, maxWidth, curvature, pullBias, resolution } = config;

  const leftSide: { x: number; y: number }[] = [];
  const rightSide: { x: number; y: number }[] = [];

  for (let i = 0; i <= resolution; i++) {
    const t = i / resolution;
    const width = sampleWidthAt(profile, t);
    const pinch = shapePinch(t, profile.basePull, profile.tipPull, pullBias);
    const adjustedWidth = maxWidth * width * pinch;
    const y = length * t;
    const midX = spineOffset(t, curvature, length);

    leftSide.push({ x: midX - adjustedWidth, y });
    rightSide.push({ x: midX + adjustedWidth, y });
  }

  const cmds: Path['commands'] = [];
  cmds.push(moveTo(leftSide[0].x, leftSide[0].y));

  for (let i = 1; i < leftSide.length; i++) {
    const p = leftSide[i];
    cmds.push(lineTo(p.x, p.y));
  }

  for (let i = rightSide.length - 1; i >= 0; i--) {
    const p = rightSide[i];
    cmds.push(lineTo(p.x, p.y));
  }

  cmds.push(closePath());

  return { commands: cmds, closed: true };
}

function buildMidrib(config: { length: number; curvature: number; resolution: number }): Path {
  const { length, curvature, resolution } = config;
  const cmds: Path['commands'] = [];

  cmds.push(moveTo(spineOffset(0, curvature, length), 0));
  for (let i = 1; i <= resolution; i++) {
    const t = i / resolution;
    cmds.push(lineTo(spineOffset(t, curvature, length), length * t));
  }

  return { commands: cmds, closed: false };
}

function sampleWidthAt(profile: LeafProfile, t: number): number {
  const clampedT = clamp01(t);
  const points = profile.widths
    .slice()
    .sort((a, b) => a.t - b.t);

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (clampedT >= a.t && clampedT <= b.t) {
      const localT = (clampedT - a.t) / (b.t - a.t || 1);
      return lerp(a.width, b.width, localT);
    }
  }

  return points[points.length - 1]?.width ?? 0;
}

function spineOffset(t: number, curvature: number, length: number): number {
  const centeredT = t - t * t; // bumps near middle, 0 at ends
  return curvature * centeredT * length;
}

function shapePinch(t: number, basePull: number, tipPull: number, bias: number): number {
  const base = 1 - Math.pow(1 - clamp01(basePull), bias + 0.5) * (1 - t) * 0.35;
  const tip = 1 - Math.pow(1 - clamp01(tipPull), bias + 0.5) * t * 0.55;
  return Math.max(0.1, base * tip);
}

function leafParamsToShapeParams(params: LeafParams): LeafShapeParams {
  const length = clamp(params.length, 0.1, 1.5);
  const maxWidth = clamp(params.width, 0.05, 0.8);
  const curvature = clamp(
    params.curvature + (clamp01(params.asymmetry) - 0.5) * 0.25,
    -0.85,
    0.85
  );
  const pullBias = clamp01(0.35 + params.tipSharpness * 0.4 - params.baseTaper * 0.25);
  const serrationSteps = clamp01(params.serration);
  return {
    profile: selectProfileFromParams(params),
    length,
    maxWidth,
    curvature,
    pullBias,
    resolution: 48 + Math.round(serrationSteps * 24),
  };
}

function selectProfileFromParams(params: LeafParams): LeafProfile {
  if (params.lobes > 0.65) {
    return leafProfiles.cordate;
  }
  if (params.tipSharpness > 0.6) {
    return leafProfiles.lanceolate;
  }
  return leafProfiles.ovate;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}
