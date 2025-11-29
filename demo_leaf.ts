import { writeFileSync } from 'fs';
import { renderSceneToSvg } from './src/export/svg';
import { createLeafGeometry, leafProfiles, morphLeaf } from './src/plates/leaf';
import { OrnamentNode, OrnamentResult } from './src/model/types';

const width = 800;
const height = 800;

const blendedProfile = morphLeaf(leafProfiles.lanceolate, leafProfiles.ovate, 0.35);
const geometry = createLeafGeometry({
  profile: blendedProfile,
  length: 1,
  maxWidth: 0.62,
  curvature: 0.18,
  pullBias: 0.65,
  resolution: 64,
});

const leafNode: OrnamentNode = {
  id: 'plate2-leaf-demo',
  type: 'leaf',
  plateOrigin: 2,
  stepInPlate: 2,
  role: 'morphology',
  params: {
    profile: blendedProfile.id,
    curvature: 0.18,
    maxWidth: 0.62,
    length: 1,
  },
  transform: {
    tx: width / 2,
    ty: height * 0.9,
    rotation: 0,
    scaleX: width * 0.35,
    scaleY: -height * 0.82,
  },
  paths: [geometry.outline, geometry.midrib],
  children: [],
};

const ornament: OrnamentResult = {
  root: leafNode,
  bounds: { x: 0, y: 0, width, height },
};

const svg = renderSceneToSvg(ornament, {
  stroke: '#0b3d2e',
  fill: '#e9f5ec',
  strokeWidth: 2,
  includeConstruction: true,
  includeXmlDeclaration: true,
  width,
  height,
});

const outputPath = 'plate2_leaf.svg';
writeFileSync(outputPath, svg, 'utf8');
console.log(`Wrote ${outputPath}`);

