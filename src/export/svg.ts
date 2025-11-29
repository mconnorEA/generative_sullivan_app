import { Vec2, Rect, PathCommand, OrnamentResult, OrnamentNode, OrnamentNodeType, Transform } from '../model/types';

interface Mat2D {
  a: number; b: number;
  c: number; d: number;
  e: number; f: number;
}

const IDENTITY_MATRIX: Mat2D = {
  a: 1, b: 0,
  c: 0, d: 1,
  e: 0, f: 0,
};

function matFromTransform(t: Transform): Mat2D {
  const cos = Math.cos(t.rotation);
  const sin = Math.sin(t.rotation);

  const a = cos * t.scaleX;
  const b = sin * t.scaleX;
  const c = -sin * t.scaleY;
  const d = cos * t.scaleY;
  const e = t.tx;
  const f = t.ty;

  return { a, b, c, d, e, f };
}

function matMul(m1: Mat2D, m2: Mat2D): Mat2D {
  // m1 * m2
  return {
    a: m1.a * m2.a + m1.c * m2.b,
    b: m1.b * m2.a + m1.d * m2.b,
    c: m1.a * m2.c + m1.c * m2.d,
    d: m1.b * m2.c + m1.d * m2.d,
    e: m1.a * m2.e + m1.c * m2.f + m1.e,
    f: m1.b * m2.e + m1.d * m2.f + m1.f,
  };
}

function applyMat(m: Mat2D, p: Vec2): Vec2 {
  return {
    x: m.a * p.x + m.c * p.y + m.e,
    y: m.b * p.x + m.d * p.y + m.f,
  };
}

interface FlattenedPath {
  commands: PathCommand[];
  closed: boolean;
  nodeType: OrnamentNodeType;
}

function flattenNode(
  node: OrnamentNode,
  parentMatrix: Mat2D,
  out: FlattenedPath[]
): void {
  const nodeMatrix = matFromTransform(node.transform);
  const combined = matMul(parentMatrix, nodeMatrix);

  for (const path of node.paths) {
    const cmds: PathCommand[] = path.commands.map(cmd => {
      switch (cmd.type) {
        case 'M':
        case 'L': {
          const p = applyMat(combined, cmd.p);
          return { type: cmd.type, p };
        }
        case 'Q': {
          const p1 = applyMat(combined, cmd.p1);
          const p = applyMat(combined, cmd.p);
          return { type: 'Q', p1, p };
        }
        case 'C': {
          const p1 = applyMat(combined, cmd.p1);
          const p2 = applyMat(combined, cmd.p2);
          const p = applyMat(combined, cmd.p);
          return { type: 'C', p1, p2, p };
        }
        case 'Z':
          return cmd;
      }
    });

    out.push({
      commands: cmds,
      closed: path.closed,
      nodeType: node.type,
    });
  }

  for (const child of node.children) {
    flattenNode(child, combined, out);
  }
}

function pathCommandsToD(
  cmds: PathCommand[],
  precision: number
): string {
  const fmt = (n: number) => n.toFixed(precision);

  const parts: string[] = [];

  for (const cmd of cmds) {
    switch (cmd.type) {
      case 'M':
        parts.push(`M ${fmt(cmd.p.x)} ${fmt(cmd.p.y)}`);
        break;
      case 'L':
        parts.push(`L ${fmt(cmd.p.x)} ${fmt(cmd.p.y)}`);
        break;
      case 'Q':
        parts.push(
          `Q ${fmt(cmd.p1.x)} ${fmt(cmd.p1.y)} ${fmt(cmd.p.x)} ${fmt(cmd.p.y)}`
        );
        break;
      case 'C':
        parts.push(
          `C ${fmt(cmd.p1.x)} ${fmt(cmd.p1.y)} ` +
          `${fmt(cmd.p2.x)} ${fmt(cmd.p2.y)} ` +
          `${fmt(cmd.p.x)} ${fmt(cmd.p.y)}`
        );
        break;
      case 'Z':
        parts.push('Z');
        break;
    }
  }

  return parts.join(' ');
}

export interface SvgRenderOptions {
  stroke?: string;
  fill?: string;
  strokeWidth?: number;
  includeConstruction?: boolean; // show auxiliary/grid lines?
  precision?: number;
  includeXmlDeclaration?: boolean;
  width?: number;
  height?: number;
}

/**
 * Render a Scene as an SVG string.
 * Coordinates are based on scene.bounds.
 */
export function ornamentToSvg(
  ornament: OrnamentResult,
  options: SvgRenderOptions = {}
): string {
  const stroke = options.stroke ?? '#333';
  const fill = options.fill ?? 'none';
  const strokeWidth = options.strokeWidth ?? 0.01;
  const includeConstruction = options.includeConstruction ?? true;
  const precision = options.precision ?? 4;
  const includeXmlDeclaration = options.includeXmlDeclaration ?? false;

  const flattened: FlattenedPath[] = [];
  flattenNode(ornament.root, IDENTITY_MATRIX, flattened);

  const viewBox: Rect = ornament.bounds;
  const vbStr = `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`;

  let svg = '';

  if (includeXmlDeclaration) {
    svg += '<?xml version="1.0" encoding="UTF-8"?>\n';
  }

  svg += `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vbStr}" `;
  if (options.width !== undefined) {
    svg += `width="${options.width}" `;
  }
  if (options.height !== undefined) {
    svg += `height="${options.height}" `;
  }
  svg += `fill="none" stroke="${stroke}" stroke-width="${strokeWidth}">\n`;

  // Optional group to set default stroke/fill
  svg += `  <g fill="${fill}" stroke="${stroke}">\n`;

  for (const fp of flattened) {
    if (!includeConstruction && fp.nodeType === 'auxiliary') {
      continue;
    }
    const d = pathCommandsToD(fp.commands, precision);
    svg += `    <path d="${d}" />\n`;
  }

  svg += '  </g>\n';
  svg += '</svg>\n';

  return svg;
}

/**
 * Alias with a name that better matches the higher level "scene" terminology
 * used in the interactive demos.
 */
export function renderSceneToSvg(
  ornament: OrnamentResult,
  options: SvgRenderOptions = {}
): string {
  return ornamentToSvg(ornament, options);
}