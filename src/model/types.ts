// Core geometric and ornament data structures for the Sullivan ornament engine.

export interface Vec2 {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type PathCommand =
  | { type: 'M'; p: Vec2 }
  | { type: 'L'; p: Vec2 }
  | { type: 'Q'; p1: Vec2; p: Vec2 }
  | { type: 'C'; p1: Vec2; p2: Vec2; p: Vec2 }
  | { type: 'Z' };

export interface Path {
  commands: PathCommand[];
  closed: boolean;
}

export type OrnamentNodeType =
  | 'container'
  | 'axis'
  | 'stem'
  | 'leaf'
  | 'medallion'
  | 'overlay'
  | 'auxiliary';

export interface Transform {
  tx: number;
  ty: number;
  rotation: number; // radians
  scaleX: number;
  scaleY: number;
}

export function identityTransform(): Transform {
  return {
    tx: 0,
    ty: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
  };
}

export interface OrnamentNode {
  id: string;
  type: OrnamentNodeType;

  plateOrigin?: number;   // e.g. 1 for Plate 1
  stepInPlate?: number;   // step within a plate, if applicable
  role?: string;          // 'main-axis', 'grid-line', 'petal', ...

  params: Record<string, number | string | boolean>;

  transform: Transform;
  paths: Path[];
  children: OrnamentNode[];
}

export interface OrnamentResult {
  root: OrnamentNode;
  bounds: Rect; // normalized coordinate bounds, e.g. -1..1
}

// Helpers for building paths

export function moveTo(x: number, y: number): PathCommand {
  return { type: 'M', p: { x, y } };
}

export function lineTo(x: number, y: number): PathCommand {
  return { type: 'L', p: { x, y } };
}

export function quadTo(cx: number, cy: number, x: number, y: number): PathCommand {
  return { type: 'Q', p1: { x: cx, y: cy }, p: { x, y } };
}

export function cubicTo(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x: number,
  y: number
): PathCommand {
  return { type: 'C', p1: { x: x1, y: y1 }, p2: { x: x2, y: y2 }, p: { x, y } };
}

export function closePath(): PathCommand {
  return { type: 'Z' };
}

// Axis-aligned rectangle path, starting at (x,y)
export function rectPath(x: number, y: number, width: number, height: number): Path {
  const cmds: PathCommand[] = [];
  cmds.push(moveTo(x, y));
  cmds.push(lineTo(x + width, y));
  cmds.push(lineTo(x + width, y + height));
  cmds.push(lineTo(x, y + height));
  cmds.push(closePath());
  return { commands: cmds, closed: true };
}

/**
 * Ellipse centered at origin, axis-aligned, using 4 cubic Bézier segments.
 * rx, ry are radii along x and y.
 */
export function ellipsePath(rx: number, ry: number): Path {
  const kappa = 0.5522847498307936; // control point constant

  const cmds: PathCommand[] = [];

  // Start at (rx, 0)
  cmds.push(moveTo(rx, 0));

  // Four cubic segments around the ellipse
  cmds.push(cubicTo(
    rx, kappa * ry,
    kappa * rx, ry,
    0, ry
  ));

  cmds.push(cubicTo(
    -kappa * rx, ry,
    -rx, kappa * ry,
    -rx, 0
  ));

  cmds.push(cubicTo(
    -rx, -kappa * ry,
    -kappa * rx, -ry,
    0, -ry
  ));

  cmds.push(cubicTo(
    kappa * rx, -ry,
    rx, -kappa * ry,
    rx, 0
  ));

  cmds.push(closePath());

  return { commands: cmds, closed: true };
}
