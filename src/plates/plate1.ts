import {
  Path,
  Rect,
  Vec2,
  rectPath,
  lineTo,
  moveTo,
  ellipsePath,
  OrnamentResult,
  OrnamentNode,
  identityTransform,
} from '../model/types';
import { LeafParams } from './leaf';
import { createStemWithLeaves } from './stem';

export interface Plate1Params {
  /**
   * Number of subdivisions for the grid.
   * 2..N — values outside are clamped.
   */
  subdivisions: number;

  /**
   * Step in the Plate-1 progression.
   * 0: outer container only
   * 1: + basic grid
   * 2: + diagonal & secondary axes
   * 3+: + stems + medallion
   */
  step: number;

  /**
   * Radius of the medallion relative to half the container size (0..1).
   * For container from -1..1, 0.5 means radius ~0.5.
   */
  medallionRadius: number;

  /**
   * How many interpolated axis pairs to insert between the cardinal grid and the
   * diagonals (0 disables the secondary axes entirely).
   */
  secondaryAxisPairs?: number;

  /**
   * Number of radiating stems drawn out of the central medallion (0 disables).
   */
  stemCount?: number;

  /**
   * Relative stem length compared to the half-width of the plate.
   */
  stemLength?: number;

  /**
   * Normalized bias toward asymmetry in the axes/stems (0 = perfectly mirrored).
   */
  symmetryBias?: number;
}

export interface Plate1SceneOptions extends Plate1Params {
  /**
   * Optional width of the generated scene (defaults to 800px).
   */
  width?: number;

  /**
   * Optional height of the generated scene (defaults to 800px).
   */
  height?: number;
}

/**
 * Convenience helper that mirrors the demo-style API where geometry parameters
 * are provided without explicitly passing dimensions.
 */
export function generatePlate1Scene(options: Plate1SceneOptions): OrnamentResult {
  const { width = 800, height = 800, ...plateParams } = options;
  return generatePlate1(width, height, plateParams as Plate1Params);
}

/**
 * Generate a Plate-1-inspired "inorganic" scene:
 * blank block, geometric manipulations, central medallion.
 */
export function generatePlate1(width: number, height: number, params: Plate1Params): OrnamentResult {
  const subdivisions = Math.max(2, Math.floor(params.subdivisions));
  const step = Math.max(0, Math.floor(params.step));
  const medallionRadius = Math.max(0.1, Math.min(params.medallionRadius, 0.9));
  const secondaryAxisPairs = clampInt(params.secondaryAxisPairs ?? 1, 0, 3);
  const stemCount = Math.max(0, Math.floor(params.stemCount ?? 4));
  const stemLength = clamp(params.stemLength ?? 0.85, 0.2, 1.35);
  const symmetryBias = clamp01(params.symmetryBias ?? 0);

  // Root container node
  const root: OrnamentNode = {
    id: 'root-container',
    type: 'container',
    plateOrigin: 1,
    stepInPlate: step,
    role: 'panel',
    params: {},
    transform: identityTransform(),
    paths: [],
    children: [],
  };

  // Outer container border: square in [-1,1]
  const containerPath: Path = rectPath(-1, -1, 2, 2);
  root.paths.push(containerPath);

  // Step 1+: grid
  if (step >= 1) {
    const gridNode = createGridNode(subdivisions);
    root.children.push(gridNode);
  }

  // Step 2+: axes (diagonal & secondary)
  if (step >= 2) {
    const diagNode = createDiagonalAxesNode(symmetryBias);
    root.children.push(diagNode);

    const secondaryAxes = createSecondaryAxisNode(secondaryAxisPairs, symmetryBias);
    if (secondaryAxes) {
      root.children.push(secondaryAxes);
    }
  }

  // Step 3+: stems + central medallion
  if (step >= 3) {
    const stemNode = createStemNode(stemCount, stemLength, symmetryBias);
    if (stemNode) {
      root.children.push(stemNode);
    }

    const medallionNode = createMedallionNode(medallionRadius);
    root.children.push(medallionNode);
  }

  // Scale normalized coordinates (-1..1) into requested width/height with origin at (0,0)
  root.transform = {
    tx: width / 2,
    ty: height / 2,
    rotation: 0,
    scaleX: width / 2,
    scaleY: height / 2,
  };

  const bounds: Rect = { x: 0, y: 0, width, height };

  return { root, bounds };
}

function createGridNode(subdivisions: number): OrnamentNode {
  const node: OrnamentNode = {
    id: 'grid',
    type: 'auxiliary',
    plateOrigin: 1,
    role: 'grid',
    stepInPlate: 1,
    params: { subdivisions },
    transform: identityTransform(),
    paths: [],
    children: [],
  };

  // vertical & horizontal grid lines inside [-1,1]
  for (let i = 1; i < subdivisions; i++) {
    const t = -1 + (2 * i) / subdivisions;

    // vertical line at x = t
    {
      const cmds = [
        moveTo(t, -1),
        lineTo(t, 1),
      ];
      node.paths.push({ commands: cmds, closed: false });
    }

    // horizontal line at y = t
    {
      const cmds = [
        moveTo(-1, t),
        lineTo(1, t),
      ];
      node.paths.push({ commands: cmds, closed: false });
    }
  }

  return node;
}

function createDiagonalAxesNode(symmetryBias: number): OrnamentNode {
  const node: OrnamentNode = {
    id: 'axes-diagonal',
    type: 'axis',
    plateOrigin: 1,
    role: 'diagonal-axis',
    stepInPlate: 2,
    params: { symmetryBias },
    transform: identityTransform(),
    paths: [],
    children: [],
  };

  const baseAngles = [Math.PI / 4, (3 * Math.PI) / 4];
  const twist = symmetryBias * (Math.PI / 14); // ~12.8°

  baseAngles.forEach((angle, index) => {
    const signedAngle = angle + (index % 2 === 0 ? twist : -twist);
    node.paths.push(createAxisPath(signedAngle, 1.05));
  });

  return node;
}

function createSecondaryAxisNode(pairs: number, symmetryBias: number): OrnamentNode | null {
  if (pairs <= 0) {
    return null;
  }

  const node: OrnamentNode = {
    id: 'axes-secondary',
    type: 'axis',
    plateOrigin: 1,
    role: 'secondary-axis',
    stepInPlate: 2,
    params: { pairs, symmetryBias },
    transform: identityTransform(),
    paths: [],
    children: [],
  };

  const maxOffset = Math.PI / 4;
  const skew = (Math.PI / 32) * symmetryBias;

  for (let i = 0; i < pairs; i++) {
    const offset = ((i + 1) / (pairs + 1)) * maxOffset;

    for (let orientation = 0; orientation < 2; orientation++) {
      const rotation = orientation * (Math.PI / 2);
      const adjustedAngle = offset + rotation + (orientation === 0 ? skew : -skew);
      node.paths.push(createAxisPath(adjustedAngle, 0.98));
    }
  }

  return node;
}

function createStemNode(count: number, stemLength: number, symmetryBias: number): OrnamentNode | null {
  if (count <= 0) {
    return null;
  }

  const node: OrnamentNode = {
    id: 'radiating-stems',
    type: 'stem',
    plateOrigin: 1,
    role: 'medallion-stem',
    stepInPlate: 3,
    params: { count, stemLength, symmetryBias },
    transform: identityTransform(),
    paths: [],
    children: [],
  };

  for (let i = 0; i < count; i++) {
    const baseAngle = (2 * Math.PI * i) / count;
    const alternating = i % 2 === 0 ? -1 : 1;
    const angle = baseAngle + alternating * symmetryBias * 0.2;
    const jitter = clamp(1 - symmetryBias * 0.25 + alternating * symmetryBias * 0.15, 0.35, 1.2);
    const radius = stemLength * jitter;
    const endX = Math.cos(angle) * radius;
    const endY = Math.sin(angle) * radius;

    const axisPath: Path = {
      commands: [
        moveTo(0, 0),
        lineTo(endX, endY),
      ],
      closed: false,
    };

    const axisNode: OrnamentNode = {
      id: `stem-axis-${i}`,
      type: 'axis',
      plateOrigin: 1,
      role: 'stem-axis',
      stepInPlate: 3,
      params: { angle, radius },
      transform: identityTransform(),
      paths: [axisPath],
      children: [],
    };

    const normalizedRadius = clamp01(radius);
    const leafCount = Math.max(3, Math.round(3 + normalizedRadius * 5));
    const leafBaseA = buildStemLeafParams(normalizedRadius, symmetryBias, alternating, false);
    const leafBaseB = buildStemLeafParams(normalizedRadius, symmetryBias, alternating, true);

    const curveBias = clamp01(0.25 + normalizedRadius * 0.5 + symmetryBias * 0.25);
    const curveVariation = ((i % 3) - 1) * 0.08;

    const flowingStem = createStemWithLeaves(
      `radiating-stem-${i}`,
      axisNode,
      leafBaseA,
      leafBaseB,
      leafCount,
      {
        curveAmount: clamp01(curveBias + curveVariation),
        side: (alternating >= 0 ? 1 : -1) as 1 | -1,
        leafOffset: 0.035 + normalizedRadius * 0.05,
      }
    );

    node.children.push(flowingStem);
  }

  return node;
}

function buildStemLeafParams(
  normalizedRadius: number,
  symmetryBias: number,
  side: number,
  emphasizeTip: boolean
): LeafParams {
  const lengthBase = emphasizeTip ? 0.28 : 0.18;
  const widthBase = emphasizeTip ? 0.12 : 0.09;
  const curvatureBase = emphasizeTip ? -0.05 : -0.12;
  return {
    length: clamp(lengthBase + normalizedRadius * 0.45, 0.12, 0.95),
    width: clamp(widthBase + normalizedRadius * 0.25, 0.05, 0.4),
    tipSharpness: clamp01((emphasizeTip ? 0.55 : 0.4) + symmetryBias * 0.3),
    baseTaper: clamp01((emphasizeTip ? 0.35 : 0.6) + symmetryBias * 0.15),
    asymmetry: clamp01(0.45 + side * 0.15 * symmetryBias),
    lobes: clamp01((emphasizeTip ? 0.25 : 0.1) + normalizedRadius * 0.4),
    serration: clamp01((emphasizeTip ? 0.3 : 0.12) + symmetryBias * 0.35),
    curvature: clamp(curvatureBase + side * -0.25 + symmetryBias * 0.2, -0.75, 0.75),
  };
}

function createMedallionNode(radius: number): OrnamentNode {
  const node: OrnamentNode = {
    id: 'medallion',
    type: 'medallion',
    plateOrigin: 1,
    role: 'central-medallion',
    stepInPlate: 3,
    params: { radius },
    transform: identityTransform(),
    paths: [],
    children: [],
  };

  // Central circle
  const circleRadius = radius * 0.55;
  node.paths.push(ellipsePath(circleRadius, circleRadius));

  // Four petal-like ellipses along cardinal axes
  const petalRx = radius * 0.75;
  const petalRy = radius * 0.35;

  const directions = [
    { angle: 0, arm: 'right' },                 // 0 rad
    { angle: Math.PI / 2, arm: 'top' },        // 90°
    { angle: Math.PI, arm: 'left' },           // 180°
    { angle: (3 * Math.PI) / 2, arm: 'bottom' } // 270°
  ];

  for (const { angle, arm } of directions) {
    const dx = Math.cos(angle) * radius;
    const dy = Math.sin(angle) * radius;

    const petalNode: OrnamentNode = {
      id: `medallion-petal-${arm}`,
      type: 'medallion',
      plateOrigin: 1,
      role: 'medallion-petal',
      stepInPlate: 3,
      params: { arm },
      transform: {
        tx: dx,
        ty: dy,
        rotation: angle,
        scaleX: 1,
        scaleY: 1,
      },
      paths: [ellipsePath(petalRx, petalRy)],
      children: [],
    };

    node.children.push(petalNode);
  }

  return node;
}

function createAxisPath(angle: number, reach: number): Path {
  const segment = axisSegment(angle, reach);
  return {
    commands: [
      moveTo(segment.start.x, segment.start.y),
      lineTo(segment.end.x, segment.end.y),
    ],
    closed: false,
  };
}

function axisSegment(angle: number, reach: number): { start: Vec2; end: Vec2 } {
  const dirX = Math.cos(angle);
  const dirY = Math.sin(angle);
  const denom = Math.max(Math.abs(dirX), Math.abs(dirY)) || 1;
  const limit = reach / denom;

  return {
    start: { x: -dirX * limit, y: -dirY * limit },
    end: { x: dirX * limit, y: dirY * limit },
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(Math.floor(value), max));
}
