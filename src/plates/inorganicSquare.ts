import {
  rectPath,
  moveTo,
  lineTo,
  ellipsePath,
  closePath,
  OrnamentNode,
  OrnamentResult,
  identityTransform,
} from '../model/types';

export type Scene = OrnamentResult;

export interface InorganicSquareSettings {
  // container bounds are still [-1, 1] by [-1, 1]
  showOuterFrame: boolean;
  showInnerFrame: boolean;
  innerMargin: number; // 0..0.9
  showCenterCross: boolean;
  showDiagonals: boolean;
  showSubdivisionGrid: boolean;
  subdivisions: number; // 2..N
  showInscribedCircle: boolean;
  showDiamondSquare: boolean; // rotated square (45°)
  showQuarterArcs: boolean; // arcs from side-midpoints
}

export function generateInorganicSquareScene(
  settings: InorganicSquareSettings
): Scene {
  const s = { ...settings };

  const root: OrnamentNode = {
    id: 'inorganic-square-root',
    type: 'container',
    plateOrigin: 1,
    role: 'panel',
    stepInPlate: 0,
    params: {},
    transform: identityTransform(),
    paths: [],
    children: [],
  };

  // Outer frame
  if (s.showOuterFrame) {
    root.paths.push(rectPath(-1, -1, 2, 2));
  }

  // Inner frame
  if (s.showInnerFrame) {
    const m = Math.max(0, Math.min(s.innerMargin, 0.9));
    const size = 2 - 2 * m;
    root.paths.push(rectPath(-1 + m, -1 + m, size, size));
  }

  // Center cross (H & V)
  if (s.showCenterCross) {
    const crossNode: OrnamentNode = {
      id: 'center-cross',
      type: 'auxiliary',
      plateOrigin: 1,
      role: 'center-cross',
      stepInPlate: 0,
      params: {},
      transform: identityTransform(),
      paths: [],
      children: [],
    };
    crossNode.paths.push({
      commands: [moveTo(-1, 0), lineTo(1, 0)],
      closed: false,
    });
    crossNode.paths.push({
      commands: [moveTo(0, -1), lineTo(0, 1)],
      closed: false,
    });
    root.children.push(crossNode);
  }

  // Diagonals
  if (s.showDiagonals) {
    const diagNode: OrnamentNode = {
      id: 'diagonals',
      type: 'auxiliary',
      plateOrigin: 1,
      role: 'diagonals',
      stepInPlate: 0,
      params: {},
      transform: identityTransform(),
      paths: [],
      children: [],
    };
    diagNode.paths.push({
      commands: [moveTo(-1, -1), lineTo(1, 1)],
      closed: false,
    });
    diagNode.paths.push({
      commands: [moveTo(-1, 1), lineTo(1, -1)],
      closed: false,
    });
    root.children.push(diagNode);
  }

  // Subdivision grid
  if (s.showSubdivisionGrid && s.subdivisions > 1) {
    const n = Math.max(2, Math.floor(s.subdivisions));
    const gridNode: OrnamentNode = {
      id: 'subdivision-grid',
      type: 'auxiliary',
      plateOrigin: 1,
      role: 'grid',
      stepInPlate: 0,
      params: { subdivisions: n },
      transform: identityTransform(),
      paths: [],
      children: [],
    };

    for (let i = 1; i < n; i++) {
      const t = -1 + (2 * i) / n;

      gridNode.paths.push({
        commands: [moveTo(t, -1), lineTo(t, 1)],
        closed: false,
      });
      gridNode.paths.push({
        commands: [moveTo(-1, t), lineTo(1, t)],
        closed: false,
      });
    }

    root.children.push(gridNode);
  }

  // Inscribed circle (center = 0, radius chosen to just touch inner frame or outer)
  if (s.showInscribedCircle) {
    const r = s.showInnerFrame ? 1 - Math.max(0, Math.min(s.innerMargin, 0.9)) : 1;
    root.children.push({
      id: 'inscribed-circle',
      type: 'auxiliary',
      plateOrigin: 1,
      role: 'inscribed-circle',
      stepInPlate: 0,
      params: { r },
      transform: identityTransform(),
      paths: [ellipsePath(r, r)],
      children: [],
    });
  }

  // Diamond (square rotated 45°, corners touching midpoints of outer frame)
  if (s.showDiamondSquare) {
    const k = 1 / Math.SQRT2; // half-side length
    const diamondPath = {
      commands: [
        moveTo(0, -k),
        lineTo(k, 0),
        lineTo(0, k),
        lineTo(-k, 0),
        closePath(),
      ],
      closed: true,
    };
    root.children.push({
      id: 'diamond-square',
      type: 'auxiliary',
      plateOrigin: 1,
      role: 'diamond-square',
      stepInPlate: 0,
      params: {},
      transform: identityTransform(),
      paths: [diamondPath],
      children: [],
    });
  }

  // Quarter arcs from the side midpoints to the center (straight approximations for now)
  if (s.showQuarterArcs) {
    const arcNode: OrnamentNode = {
      id: 'quarter-arcs',
      type: 'auxiliary',
      plateOrigin: 1,
      role: 'quarter-arcs',
      stepInPlate: 0,
      params: {},
      transform: identityTransform(),
      paths: [],
      children: [],
    };

    const arc = (startX: number, startY: number, endX: number, endY: number) => ({
      commands: [moveTo(startX, startY), lineTo(endX, endY)],
      closed: false,
    });

    arcNode.paths.push(arc(0, -1, 1, 0));
    arcNode.paths.push(arc(1, 0, 0, 1));
    arcNode.paths.push(arc(0, 1, -1, 0));
    arcNode.paths.push(arc(-1, 0, 0, -1));

    root.children.push(arcNode);
  }

  return {
    root,
    bounds: { x: -1, y: -1, width: 2, height: 2 },
  };
}


