import { writeFileSync } from 'fs';
import { generatePlate1Scene } from './src/plates/plate1';
import { renderSceneToSvg } from './src/export/svg';

const scene = generatePlate1Scene({
  subdivisions: 4,
  step: 3,
  medallionRadius: 0.4,
  secondaryAxisPairs: 2,
  stemCount: 5,
  stemLength: 0.75,
  symmetryBias: 0.15,
});

const svg = renderSceneToSvg(scene, {
  stroke: '#222',
  strokeWidth: 0.01,
  includeConstruction: true,
  includeXmlDeclaration: true,
});

writeFileSync('plate1.svg', svg, 'utf8');
console.log('Wrote plate1.svg');

