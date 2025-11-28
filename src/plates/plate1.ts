import {
  Path,
  Rect,
  rectPath,
  lineTo,
  moveTo,
  ellipsePath,
  OrnamentResult,
  OrnamentNode,
  identityTransform,
} from '../model/types';

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
   * 2: + diagonals
   * 3+: + medallion
   */
  step: number;

  /**
   * Radius of the medallion relative to half the container size (0..1).
   * For container from -1..1, 0.5 means radius ~0.5.
   */
  medallionRadius: number;
}

/**
 * Generate a Plate-1-inspired "inorganic" scene:
 * blank block, geometric manipulations, central medallion.
 */
export function generatePlate1(width: number, height: number, params: Plate1Params): OrnamentResult {
  const subdivisions = Math.max(2, Math.floor(params.subdivisions));
  const step = Math.max(0, Math.floor(params.step));
  const medallionRadius = Math.max(0.1, Math.min(params.medallionRadius, 0.9));

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

  // Step 2+: diagonals
  if (step >= 2) {
    const diagNode = createDiagonalNode();
    root.children.push(diagNode);
  }

  // Step 3+: central medallion
  if (step >= 3) {
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

function createDiagonalNode(): OrnamentNode {
  const node: OrnamentNode = {
    id: 'diagonals',
    type: 'auxiliary',
    plateOrigin: 1,
    role: 'diagonals',
    stepInPlate: 2,
    params: {},
    transform: identityTransform(),
    paths: [],
    children: [],
  };

  // Diagonal from bottom-left to top-right
  node.paths.push({
    commands: [
      moveTo(-1, -1),
      lineTo(1, 1),
    ],
    closed: false,
  });

  // Diagonal from top-left to bottom-right
  node.paths.push({
    commands: [
      moveTo(-1, 1),
      lineTo(1, -1),
    ],
    closed: false,
  });

  return node;
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
