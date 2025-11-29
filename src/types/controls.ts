import { InorganicSquareSettings } from '../plates/inorganicSquare';
import { FlowToolSettings } from './flow';

export interface ControllerParams {
  /**
   * Plate-style preset slider. Higher steps progressively enable more motifs.
   */
  step: number;
  /**
   * Leaf morph slider remains independent of the inorganic square study.
   */
  leafMorphAlpha: number;
  /**
   * Explicit switches for the inorganic square generator.
   */
  square: InorganicSquareSettings;
  /**
   * Radial flow helper that mirrors the written workflow (circle → polygon → energy lines → sub-centers).
   */
  flow: FlowToolSettings;
}

export const defaultControllerParams: ControllerParams = {
  step: 7,
  leafMorphAlpha: 0.35,
  square: {
    showOuterFrame: true,
    showInnerFrame: true,
    innerMargin: 0.18,
    showCenterCross: true,
    showDiagonals: true,
    showSubdivisionGrid: true,
    subdivisions: 6,
    showInscribedCircle: true,
    showDiamondSquare: true,
    showQuarterArcs: true,
  },
  flow: {
    showBaseCircle: true,
    showCross: true,
    showPolygon: false,
    showRadials: false,
    circleRadius: 0.72,
    polygonSides: 6,
    polygonRotation: 0,
    radialMultiplier: 1,
    enablePush: false,
    pushAmount: 0,
    pushMotif: 'diamond',
    enablePull: false,
    pullAmount: 0,
    subCenterDepth: 0,
    subCenterRadius: 0.3,
    subCenterSides: 4,
    radiateSubCenters: false,
    nodeDecorationType: 'none',
    nodeSize: 0.18,
    edgeDecorationStyle: 'straight',
    edgeBulge: 0.3,
    edgeRepeat: 0,
    lineWeight: 1.4,
    showStructuralLayer: true,
    showOrnamentLayer: true,
    lineDiamondsEnabled: false,
    lineDiamondWidth: 0.2,
  },
};

