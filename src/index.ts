import { generatePlate1, Plate1Params } from './plates/plate1';
import { ornamentToSvg } from './export/svg';
import { writeFileSync } from 'fs';

const width = 800;
const height = 800;

const params: Plate1Params = {
  subdivisions: 4,
  step: 3,
  medallionRadius: 0.5,
};

const ornament = generatePlate1(width, height, params);
const svg = ornamentToSvg(ornament, {
  stroke: '#2c3e50',
  fill: 'none',
  strokeWidth: 2,
  includeConstruction: true,
  includeXmlDeclaration: true,
  width,
  height,
});

const outputPath = 'plate1_example.svg';
writeFileSync(outputPath, svg, 'utf8');
console.log(`Wrote ${outputPath}`);
