import {
  Path,
  Vec2,
  moveTo,
  quadTo,
  OrnamentNode,
  identityTransform,
} from '../model/types';
import { LeafParams, leafToPath, morphLeafParams } from './leaf';

export interface StemWithLeavesOptions {
  /** 0 = straight, 1 = strongly curved */
  curveAmount?: number;
  /** which side of the axis to bow toward: +1 or -1 */
  side?: 1 | -1;
  /** how far to offset leaves away from the stem (in scene units) */
  leafOffset?: number;
}

/**
 * Create a flowing stem as a quadratic Bézier around a straight axis,
 * and distribute morphing leaves along it.
 *
 * Assumes the axis has a single path with commands [M, L].
 */
export function createStemWithLeaves(
  id: string,
  axis: OrnamentNode,
  leafBaseA: LeafParams,
  leafBaseB: LeafParams,
  leafCount: number,
  options: StemWithLeavesOptions = {}
): OrnamentNode {
  if (!axis.paths.length || axis.paths[0].commands.length < 2) {
    throw new Error('createStemWithLeaves: axis must have at least M and L commands');
  }

  const axisPath = axis.paths[0];
  const [moveCmd, lineCmd] = axisPath.commands;

  if (!moveCmd || moveCmd.type !== 'M' || !lineCmd || lineCmd.type !== 'L') {
    throw new Error('createStemWithLeaves: axis must currently be a straight line (M→L)');
  }

  const p0 = moveCmd.p;
  const p1 = lineCmd.p;

  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const length = Math.hypot(dx, dy) || 1;

  const curveAmount = clamp01(options.curveAmount ?? 0.4);
  const side: 1 | -1 = options.side === -1 ? -1 : 1;
  const leafOffset = Math.max(0, options.leafOffset ?? 0.04);

  const ux = dx / length;
  const uy = dy / length;

  const nx = -uy * side;
  const ny = ux * side;

  const mx = (p0.x + p1.x) / 2;
  const my = (p0.y + p1.y) / 2;
  const controlOffset = curveAmount * (length / 2);
  const control: Vec2 = {
    x: mx + nx * controlOffset,
    y: my + ny * controlOffset,
  };

  const stemPath: Path = {
    commands: [
      moveTo(p0.x, p0.y),
      quadTo(control.x, control.y, p1.x, p1.y),
    ],
    closed: false,
  };

  const stemNode: OrnamentNode = {
    id,
    type: 'stem',
    plateOrigin: axis.plateOrigin ?? 1,
    role: 'flowing-stem',
    stepInPlate: axis.stepInPlate ?? 3,
    params: {
      curveAmount,
      side,
      leafCount,
    },
    transform: identityTransform(),
    paths: [stemPath],
    children: [],
  };

  const safeLeafCount = Math.max(0, Math.floor(leafCount));
  for (let i = 1; i <= safeLeafCount; i++) {
    const t = i / (safeLeafCount + 1);

    const pos = quadPoint(p0, control, p1, t);
    const tan = quadTangent(p0, control, p1, t);
    const tanLen = Math.hypot(tan.x, tan.y) || 1;
    const tx = tan.x / tanLen;
    const ty = tan.y / tanLen;

    const normalX = -ty * side;
    const normalY = tx * side;
    const leafOriginX = pos.x + normalX * leafOffset;
    const leafOriginY = pos.y + normalY * leafOffset;

    const leafParams = morphLeafParams(leafBaseA, leafBaseB, t);
    const leafPath = leafToPath(leafParams);
    const rotation = Math.atan2(ty, tx) - Math.PI / 2;

    const leafNode: OrnamentNode = {
      id: `${id}-leaf-${i}`,
      type: 'leaf',
      plateOrigin: 2,
      role: 'stem-leaf',
      stepInPlate: i,
      params: { t },
      transform: {
        tx: leafOriginX,
        ty: leafOriginY,
        rotation,
        scaleX: 1,
        scaleY: 1,
      },
      paths: [leafPath],
      children: [],
    };

    stemNode.children.push(leafNode);
  }

  return stemNode;
}

function quadPoint(p0: Vec2, c: Vec2, p1: Vec2, t: number): Vec2 {
  const u = 1 - t;
  const uu = u * u;
  const tt = t * t;
  return {
    x: uu * p0.x + 2 * u * t * c.x + tt * p1.x,
    y: uu * p0.y + 2 * u * t * c.y + tt * p1.y,
  };
}

function quadTangent(p0: Vec2, c: Vec2, p1: Vec2, t: number): Vec2 {
  const u = 1 - t;
  return {
    x: 2 * u * (c.x - p0.x) + 2 * t * (p1.x - c.x),
    y: 2 * u * (c.y - p0.y) + 2 * t * (p1.y - c.y),
  };
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

