export type FlowMotif = 'square' | 'diamond' | 'lobe' | 'pyramid';
export type NodeDecorationType = 'none' | 'circle' | 'square' | 'petal' | 'custom';
export type EdgeDecorationStyle = 'straight' | 'arched' | 'double';

export interface FlowToolSettings {
  /** Show the originating circle scaffold. */
  showBaseCircle: boolean;
  /** Show a simple cross that divides the circle horizontally/vertically. */
  showCross: boolean;
  /** Draw the dividing polygon over the circle. */
  showPolygon: boolean;
  /** Display the radial guides generated from the polygon. */
  showRadials: boolean;
  /** Radius of the base circle (relative to the -1..1 canvas). */
  circleRadius: number;
  /** How many sides the dividing polygon has (3 = triangle). */
  polygonSides: number;
  /** Rotate the polygon/radials in degrees. */
  polygonRotation: number;
  /** Multiply the number of radial energy lines beyond the polygon sides. */
  radialMultiplier: number;
  /** Enable outward pushes along the radials. */
  enablePush: boolean;
  /** Strength of the outward push. */
  pushAmount: number;
  /** Motif shape used when pushing outward along the radials. */
  pushMotif: FlowMotif;
  /** Enable inward pulls from the perimeter toward the center. */
  enablePull: boolean;
  /** Strength of the inward pull. */
  pullAmount: number;
  /** Depth of sub-center recursion (0 = none). */
  subCenterDepth: number;
  /** Radius of spawned sub-centers relative to the base circle. */
  subCenterRadius: number;
  /** Polygon/radial count used by sub-centers. */
  subCenterSides: number;
  /** Allow each sub-center to radiate its own energy lines. */
  radiateSubCenters: boolean;
  /** Decoration shape placed at radial intersections. */
  nodeDecorationType: NodeDecorationType;
  /** Relative size for node decorations (0..1 scaled by radius/edge). */
  nodeSize: number;
  /** Edge ornament style. */
  edgeDecorationStyle: EdgeDecorationStyle;
  /** Bulge amount for arched edge ornaments (0..1). */
  edgeBulge: number;
  /** Repeat count along each edge/ray (0 disables). */
  edgeRepeat: number;
  /** Base line weight for rendering (pixels). */
  lineWeight: number;
  /** Toggle structural layer visibility. */
  showStructuralLayer: boolean;
  /** Toggle ornament layer visibility. */
  showOrnamentLayer: boolean;
  /** Convert selected lines into diamond motifs along radials. */
  lineDiamondsEnabled: boolean;
  /** Short-axis size ratio for line diamonds. */
  lineDiamondWidth: number;
}


