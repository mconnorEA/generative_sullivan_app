import { generatePlate1Scene } from '../plates/plate1';
import { renderSceneToSvg } from '../export/svg';
import { createLeafGeometry, leafProfiles, morphLeaf } from '../plates/leaf';
import { OrnamentNode, OrnamentResult } from '../model/types';

type SliderId = 'step' | 'medallionRadius' | 'leafMorph' | 'density';

interface SliderBinding {
  input: HTMLInputElement;
  valueEl: HTMLElement;
  format?: (value: number) => string;
}

const sliderBindings: Record<SliderId, SliderBinding> = {
  step: bindSlider('step', (value) => `${value}`),
  medallionRadius: bindSlider('medallionRadius', (value) => value.toFixed(2)),
  leafMorph: bindSlider('leafMorph', (value) => value.toFixed(2)),
  density: bindSlider('density', (value) => `${value}`),
};

const plateContainer = getElement('plate-preview');
const leafContainer = getElement('leaf-preview');

Object.values(sliderBindings).forEach((binding) => {
  binding.input.addEventListener('input', () => {
    updateSliderLabel(binding);
    updateScene();
  });
  updateSliderLabel(binding);
});

updateScene();

function updateScene(): void {
  const step = parseInt(sliderBindings.step.input.value, 10);
  const medallionRadius = parseFloat(sliderBindings.medallionRadius.input.value);
  const leafMorphAlpha = parseFloat(sliderBindings.leafMorph.input.value);
  const subdivisions = parseInt(sliderBindings.density.input.value, 10);

  const plateSvg = buildPlateSvg({ step, medallionRadius, leafMorphAlpha, subdivisions });
  const leafSvg = buildLeafSvg(leafMorphAlpha);

  plateContainer.innerHTML = plateSvg;
  leafContainer.innerHTML = leafSvg;
}

function buildPlateSvg(config: {
  step: number;
  medallionRadius: number;
  leafMorphAlpha: number;
  subdivisions: number;
}): string {
  const { step, medallionRadius, leafMorphAlpha, subdivisions } = config;
  const densityRatio = clamp01((subdivisions - 2) / 10);
  const symmetryBias = clamp01(Math.abs(leafMorphAlpha - 0.5) * 2);
  const secondaryAxisPairs = Math.max(1, Math.round(subdivisions / 3));
  const stemCount = 4 + Math.round(symmetryBias * 4);

  const plateScene = generatePlate1Scene({
    subdivisions,
    step,
    medallionRadius,
    secondaryAxisPairs,
    stemCount,
    stemLength: 0.55 + (1 - densityRatio) * 0.35,
    symmetryBias,
    width: 600,
    height: 600,
  });

  return renderSceneToSvg(plateScene, {
    stroke: '#f4f6ff',
    fill: 'none',
    strokeWidth: 1.6,
    includeConstruction: true,
    width: 600,
    height: 600,
  });
}

function buildLeafSvg(alpha: number): string {
  const blendedProfile = morphLeaf(leafProfiles.lanceolate, leafProfiles.cordate, alpha);
  const geometry = createLeafGeometry({
    profile: blendedProfile,
    length: 1,
    maxWidth: 0.58 + alpha * 0.15,
    curvature: -0.15 + alpha * 0.3,
    pullBias: 0.55 + (1 - alpha) * 0.25,
    resolution: 72,
  });

  const leafNode: OrnamentNode = {
    id: 'ui-leaf',
    type: 'leaf',
    plateOrigin: 2,
    stepInPlate: 2,
    role: 'leaf-study',
    params: { morphAlpha: alpha },
    transform: {
      tx: 300,
      ty: 560,
      rotation: 0,
      scaleX: 260,
      scaleY: -260,
    },
    paths: [geometry.outline, geometry.midrib],
    children: [],
  };

  const leafOrnament: OrnamentResult = {
    root: leafNode,
    bounds: { x: 0, y: 0, width: 600, height: 600 },
  };

  return renderSceneToSvg(leafOrnament, {
    stroke: '#7af7d6',
    fill: '#0c1f18',
    strokeWidth: 1.25,
    includeConstruction: true,
    width: 300,
    height: 300,
  });
}

function bindSlider(id: SliderId, format: (value: number) => string): SliderBinding {
  const input = document.getElementById(id) as HTMLInputElement | null;
  const valueEl = document.querySelector(`[data-value-for="${id}"]`) as HTMLElement | null;

  if (!input || !valueEl) {
    throw new Error(`Missing slider binding for ${id}`);
  }

  return { input, valueEl, format };
}

function updateSliderLabel(binding: SliderBinding): void {
  const numericValue = parseFloat(binding.input.value);
  binding.valueEl.textContent = binding.format ? binding.format(numericValue) : `${numericValue}`;
}

function getElement(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) {
    throw new Error(`Missing element #${id}`);
  }
  return el;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

