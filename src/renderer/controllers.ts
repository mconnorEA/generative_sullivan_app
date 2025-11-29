import { ControllerParams, defaultControllerParams } from '../types/controls';

type SliderId =
  | 'step'
  | 'leafMorph'
  | 'innerMargin'
  | 'subdivisions'
  | 'circleRadius'
  | 'polygonSides'
  | 'polygonRotation'
  | 'radialMultiplier'
  | 'pushAmount'
  | 'pullAmount'
  | 'subCenterDepth'
  | 'subCenterRadius'
  | 'subCenterSides'
  | 'nodeSize'
  | 'edgeBulge'
  | 'edgeRepeat'
  | 'lineWeight'
  | 'lineDiamondWidth';
type SquareCheckboxId =
  | 'showOuterFrame'
  | 'showInnerFrame'
  | 'showCenterCross'
  | 'showDiagonals'
  | 'showSubdivisionGrid'
  | 'showInscribedCircle'
  | 'showDiamondSquare'
  | 'showQuarterArcs';
type FlowCheckboxId =
  | 'showBaseCircle'
  | 'showCross'
  | 'showPolygon'
  | 'showRadials'
  | 'enablePush'
  | 'enablePull'
  | 'radiateSubCenters'
  | 'showStructuralLayer'
  | 'showOrnamentLayer'
  | 'lineDiamondsEnabled';
type SelectId = 'pushMotif' | 'nodeDecorationType' | 'edgeDecorationStyle';

interface SliderBinding {
  input: HTMLInputElement;
  valueEl: HTMLElement;
  format: (value: number) => string;
}

const sliderBindings: Record<SliderId, SliderBinding> = {
  step: bindSlider('step', (value) => `${value}`),
  leafMorph: bindSlider('leafMorph', (value) => value.toFixed(2)),
  innerMargin: bindSlider('innerMargin', (value) => value.toFixed(2)),
  subdivisions: bindSlider('subdivisions', (value) => `${value}`),
  circleRadius: bindSlider('circleRadius', (value) => value.toFixed(2)),
  polygonSides: bindSlider('polygonSides', (value) => `${value}`),
  polygonRotation: bindSlider('polygonRotation', (value) => `${value}°`),
  radialMultiplier: bindSlider('radialMultiplier', (value) => `${value}×`),
  pushAmount: bindSlider('pushAmount', (value) => value.toFixed(2)),
  pullAmount: bindSlider('pullAmount', (value) => value.toFixed(2)),
  subCenterDepth: bindSlider('subCenterDepth', (value) => `${value}`),
  subCenterRadius: bindSlider('subCenterRadius', (value) => value.toFixed(2)),
  subCenterSides: bindSlider('subCenterSides', (value) => `${value}`),
  nodeSize: bindSlider('nodeSize', (value) => value.toFixed(2)),
  edgeBulge: bindSlider('edgeBulge', (value) => value.toFixed(2)),
  edgeRepeat: bindSlider('edgeRepeat', (value) => `${value}`),
  lineWeight: bindSlider('lineWeight', (value) => value.toFixed(2)),
  lineDiamondWidth: bindSlider('lineDiamondWidth', (value) => value.toFixed(2)),
};

const squareCheckboxBindings: Record<SquareCheckboxId, HTMLInputElement> = {
  showOuterFrame: bindCheckbox('showOuterFrame'),
  showInnerFrame: bindCheckbox('showInnerFrame'),
  showCenterCross: bindCheckbox('showCenterCross'),
  showDiagonals: bindCheckbox('showDiagonals'),
  showSubdivisionGrid: bindCheckbox('showSubdivisionGrid'),
  showInscribedCircle: bindCheckbox('showInscribedCircle'),
  showDiamondSquare: bindCheckbox('showDiamondSquare'),
  showQuarterArcs: bindCheckbox('showQuarterArcs'),
};

const flowCheckboxBindings: Record<FlowCheckboxId, HTMLInputElement> = {
  showBaseCircle: bindCheckbox('showBaseCircle'),
  showCross: bindCheckbox('showCross'),
  showPolygon: bindCheckbox('showPolygon'),
  showRadials: bindCheckbox('showRadials'),
  enablePush: bindCheckbox('enablePush'),
  enablePull: bindCheckbox('enablePull'),
  radiateSubCenters: bindCheckbox('radiateSubCenters'),
  showStructuralLayer: bindCheckbox('showStructuralLayer'),
  showOrnamentLayer: bindCheckbox('showOrnamentLayer'),
  lineDiamondsEnabled: bindCheckbox('lineDiamondsEnabled'),
};

const selectBindings: Record<SelectId, HTMLSelectElement> = {
  pushMotif: bindSelect('pushMotif'),
  nodeDecorationType: bindSelect('nodeDecorationType'),
  edgeDecorationStyle: bindSelect('edgeDecorationStyle'),
};

const controllerApi = window.controllersAPI;

window.addEventListener('DOMContentLoaded', () => {
  const loadInput = document.getElementById('loadPresetInput') as HTMLInputElement | null;

  (Object.keys(sliderBindings) as SliderId[]).forEach((id) => {
    const binding = sliderBindings[id];
    binding.input.addEventListener('input', () => handleSliderInput(id));
    updateSliderLabel(binding, getSliderValue(id));
  });

  Object.values(squareCheckboxBindings).forEach((input) => {
    input.addEventListener('input', handleInputChange);
  });

  Object.values(flowCheckboxBindings).forEach((input) => {
    input.addEventListener('input', handleInputChange);
  });

  Object.values(selectBindings).forEach((input) => {
    input.addEventListener('change', handleInputChange);
  });

  loadInput?.addEventListener('change', (event) => handlePresetFileSelected(event));
  window.controllersAPI?.onMenuCommand((command) => handleMenuCommand(command, loadInput));

  bootstrapState();
});

async function bootstrapState(): Promise<void> {
  const savedState = controllerApi
    ? await controllerApi.requestState().catch(() => defaultControllerParams)
    : defaultControllerParams;
  applyStateToControls(savedState);
  emitState(savedState);
}

function handleSliderInput(id: SliderId): void {
  let value = getSliderValue(id);

  if (id === 'polygonRotation') {
    value = snapPolygonRotation(value);
    sliderBindings.polygonRotation.input.value = value.toString();
  }

  updateSliderLabel(sliderBindings[id], value);

  if (id === 'step') {
    applyStepPreset(parseInt(sliderBindings.step.input.value, 10));
  }

  handleInputChange();
}

function handleInputChange(): void {
  const state = collectCurrentState();
  emitState(state);
}

function emitState(state: ControllerParams): void {
  controllerApi?.updateState(state);
}

function collectCurrentState(): ControllerParams {
  return {
    step: parseInt(sliderBindings.step.input.value, 10),
    leafMorphAlpha: parseFloat(sliderBindings.leafMorph.input.value),
    square: {
      showOuterFrame: squareCheckboxBindings.showOuterFrame.checked,
      showInnerFrame: squareCheckboxBindings.showInnerFrame.checked,
      innerMargin: parseFloat(sliderBindings.innerMargin.input.value),
      showCenterCross: squareCheckboxBindings.showCenterCross.checked,
      showDiagonals: squareCheckboxBindings.showDiagonals.checked,
      showSubdivisionGrid: squareCheckboxBindings.showSubdivisionGrid.checked,
      subdivisions: parseInt(sliderBindings.subdivisions.input.value, 10),
      showInscribedCircle: squareCheckboxBindings.showInscribedCircle.checked,
      showDiamondSquare: squareCheckboxBindings.showDiamondSquare.checked,
      showQuarterArcs: squareCheckboxBindings.showQuarterArcs.checked,
    },
    flow: {
      showBaseCircle: flowCheckboxBindings.showBaseCircle.checked,
      showCross: flowCheckboxBindings.showCross.checked,
      showPolygon: flowCheckboxBindings.showPolygon.checked,
      showRadials: flowCheckboxBindings.showRadials.checked,
      circleRadius: parseFloat(sliderBindings.circleRadius.input.value),
      polygonSides: parseInt(sliderBindings.polygonSides.input.value, 10),
      polygonRotation: parseInt(sliderBindings.polygonRotation.input.value, 10),
      radialMultiplier: parseInt(sliderBindings.radialMultiplier.input.value, 10),
      enablePush: flowCheckboxBindings.enablePush.checked,
      pushAmount: parseFloat(sliderBindings.pushAmount.input.value),
      pushMotif: selectBindings.pushMotif.value as ControllerParams['flow']['pushMotif'],
      enablePull: flowCheckboxBindings.enablePull.checked,
      pullAmount: parseFloat(sliderBindings.pullAmount.input.value),
      subCenterDepth: parseInt(sliderBindings.subCenterDepth.input.value, 10),
      subCenterRadius: parseFloat(sliderBindings.subCenterRadius.input.value),
      subCenterSides: parseInt(sliderBindings.subCenterSides.input.value, 10),
      radiateSubCenters: flowCheckboxBindings.radiateSubCenters.checked,
      nodeDecorationType: selectBindings.nodeDecorationType.value as ControllerParams['flow']['nodeDecorationType'],
      nodeSize: parseFloat(sliderBindings.nodeSize.input.value),
      edgeDecorationStyle: selectBindings.edgeDecorationStyle.value as ControllerParams['flow']['edgeDecorationStyle'],
      edgeBulge: parseFloat(sliderBindings.edgeBulge.input.value),
      edgeRepeat: parseInt(sliderBindings.edgeRepeat.input.value, 10),
      lineWeight: parseFloat(sliderBindings.lineWeight.input.value),
      showStructuralLayer: flowCheckboxBindings.showStructuralLayer.checked,
      showOrnamentLayer: flowCheckboxBindings.showOrnamentLayer.checked,
      lineDiamondsEnabled: flowCheckboxBindings.lineDiamondsEnabled.checked,
      lineDiamondWidth: parseFloat(sliderBindings.lineDiamondWidth.input.value),
    },
  };
}

function applyStateToControls(state: ControllerParams): void {
  sliderBindings.step.input.value = state.step.toString();
  sliderBindings.leafMorph.input.value = state.leafMorphAlpha.toString();
  sliderBindings.innerMargin.input.value = state.square.innerMargin.toString();
  sliderBindings.subdivisions.input.value = state.square.subdivisions.toString();
  sliderBindings.circleRadius.input.value = state.flow.circleRadius.toString();
  sliderBindings.polygonSides.input.value = state.flow.polygonSides.toString();
  sliderBindings.polygonRotation.input.value = state.flow.polygonRotation.toString();
  sliderBindings.radialMultiplier.input.value = state.flow.radialMultiplier.toString();
  sliderBindings.pushAmount.input.value = state.flow.pushAmount.toString();
  sliderBindings.pullAmount.input.value = state.flow.pullAmount.toString();
  sliderBindings.subCenterDepth.input.value = state.flow.subCenterDepth.toString();
  sliderBindings.subCenterRadius.input.value = state.flow.subCenterRadius.toString();
  sliderBindings.subCenterSides.input.value = state.flow.subCenterSides.toString();
  sliderBindings.nodeSize.input.value = state.flow.nodeSize.toString();
  sliderBindings.edgeBulge.input.value = state.flow.edgeBulge.toString();
  sliderBindings.edgeRepeat.input.value = state.flow.edgeRepeat.toString();
  sliderBindings.lineWeight.input.value = state.flow.lineWeight.toString();
  sliderBindings.lineDiamondWidth.input.value = state.flow.lineDiamondWidth.toString();

  (Object.keys(squareCheckboxBindings) as SquareCheckboxId[]).forEach((key) => {
    squareCheckboxBindings[key].checked = state.square[key];
  });

  (Object.keys(flowCheckboxBindings) as FlowCheckboxId[]).forEach((key) => {
    flowCheckboxBindings[key].checked = state.flow[key];
  });

  selectBindings.pushMotif.value = state.flow.pushMotif;
  selectBindings.nodeDecorationType.value = state.flow.nodeDecorationType;
  selectBindings.edgeDecorationStyle.value = state.flow.edgeDecorationStyle;

  updateSliderLabels(state);
}

function updateSliderLabels(state: ControllerParams): void {
  const sliderValues: Partial<Record<SliderId, number>> = {
    step: state.step,
    leafMorph: state.leafMorphAlpha,
    innerMargin: state.square.innerMargin,
    subdivisions: state.square.subdivisions,
    circleRadius: state.flow.circleRadius,
    polygonSides: state.flow.polygonSides,
    polygonRotation: state.flow.polygonRotation,
    radialMultiplier: state.flow.radialMultiplier,
    pushAmount: state.flow.pushAmount,
    pullAmount: state.flow.pullAmount,
    subCenterDepth: state.flow.subCenterDepth,
    subCenterRadius: state.flow.subCenterRadius,
    subCenterSides: state.flow.subCenterSides,
    nodeSize: state.flow.nodeSize,
    edgeBulge: state.flow.edgeBulge,
    edgeRepeat: state.flow.edgeRepeat,
    lineWeight: state.flow.lineWeight,
    lineDiamondWidth: state.flow.lineDiamondWidth,
  };

  (Object.keys(sliderValues) as SliderId[]).forEach((id) => {
    const value = sliderValues[id];
    if (value === undefined) {
      return;
    }
    sliderBindings[id].valueEl.textContent = sliderBindings[id].format(value);
  });
}

function updateSliderLabel(binding: SliderBinding, value: number): void {
  binding.valueEl.textContent = binding.format(value);
}

function getSliderValue(id: SliderId): number {
  const raw = sliderBindings[id].input.value;
  const intSliders: SliderId[] = [
    'step',
    'subdivisions',
    'polygonSides',
    'polygonRotation',
    'radialMultiplier',
    'subCenterDepth',
    'subCenterSides',
    'edgeRepeat',
  ];
  return intSliders.includes(id) ? parseInt(raw, 10) : parseFloat(raw);
}

function bindSlider(id: SliderId, format: (value: number) => string): SliderBinding {
  const input = document.getElementById(id) as HTMLInputElement | null;
  const valueEl = document.querySelector(`[data-value-for="${id}"]`) as HTMLElement | null;

  if (!input || !valueEl) {
    throw new Error(`Missing slider binding for ${id}`);
  }

  return { input, valueEl, format };
}

function bindCheckbox(id: SquareCheckboxId | FlowCheckboxId): HTMLInputElement {
  const input = document.getElementById(id) as HTMLInputElement | null;
  if (!input) {
    throw new Error(`Missing checkbox binding for ${id}`);
  }
  return input;
}

function bindSelect(id: SelectId): HTMLSelectElement {
  const input = document.getElementById(id) as HTMLSelectElement | null;
  if (!input) {
    throw new Error(`Missing select binding for ${id}`);
  }
  return input;
}

function applyStepPreset(step: number): void {
  const toggles: Record<SquareCheckboxId, boolean> = {
    showOuterFrame: step >= 1,
    showInnerFrame: step >= 2,
    showCenterCross: step >= 3,
    showDiagonals: step >= 4,
    showInscribedCircle: step >= 5,
    showDiamondSquare: step >= 6,
    showQuarterArcs: step >= 7,
    showSubdivisionGrid: step >= 7,
  };

  (Object.keys(squareCheckboxBindings) as SquareCheckboxId[]).forEach((key) => {
    squareCheckboxBindings[key].checked = toggles[key];
  });
}

function handleSavePreset(): void {
  const state = collectCurrentState();
  const serialized = JSON.stringify(state, null, 2);
  // Keep a quick-access copy for auto-load fallback
  window.localStorage.setItem('flowControllerPreset', serialized);

  const blob = new Blob([serialized], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `sullivan-flow-${Date.now()}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function handleLoadPreset(input: HTMLInputElement | null): void {
  if (input) {
    input.value = '';
    input.click();
    return;
  }
  loadPresetFromLocalStorage();
}

function handlePresetFileSelected(event: Event): void {
  const input = event.target as HTMLInputElement;
  const file = input.files && input.files[0];
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const text = reader.result;
    if (typeof text !== 'string') {
      return;
    }
    tryApplyPreset(text);
  };
  reader.readAsText(file);
}

function loadPresetFromLocalStorage(): void {
  const raw = window.localStorage.getItem('flowControllerPreset');
  if (raw) {
    tryApplyPreset(raw);
  }
}

function tryApplyPreset(serialized: string): void {
  try {
    const state = JSON.parse(serialized) as ControllerParams;
    applyStateToControls(state);
    emitState(state);
  } catch {
    // ignore malformed state
  }
}

async function handleExportSvg(): Promise<void> {
  try {
    const svg = await window.controllersAPI?.requestCurrentSvg();
    if (!svg) {
      return;
    }
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `sullivan-flow-${Date.now()}.svg`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  } catch {
    // ignore errors
  }
}

interface ControllerCommand {
  action: string;
  payload?: string;
}

function handleMenuCommand(command: ControllerCommand, loadInput: HTMLInputElement | null): void {
  const { action, payload } = command;
  switch (action) {
    case 'savePreset':
      handleSavePreset();
      break;
    case 'loadPreset':
      handleLoadPreset(loadInput);
      break;
    case 'loadPresetContent':
      if (payload) {
        tryApplyPreset(payload);
      }
      break;
    case 'exportSvg':
      handleExportSvg();
      break;
    default:
      break;
  }
}

function snapPolygonRotation(value: number): number {
  const sides = Math.max(3, parseInt(sliderBindings.polygonSides.input.value, 10) || 3);
  const stops = computeRotationStops(sides);
  if (!stops.length) {
    return clampRotation(value);
  }

  let closest = stops[0];
  let minDiff = Math.abs(value - closest);

  for (let i = 1; i < stops.length; i++) {
    const candidate = stops[i];
    const diff = Math.abs(value - candidate);
    if (diff < minDiff) {
      closest = candidate;
      minDiff = diff;
    }
  }

  return clampRotation(closest);
}

function computeRotationStops(sides: number): number[] {
  const stops = new Set<number>();
  const maxAngle = 90;

  for (let k = 0; k < sides; k++) {
    const axisAngle = (k * 180) / sides;
    const mod = axisAngle % 90;
    const snap = (90 - mod) % 90;
    stops.add(Number(snap.toFixed(3)));
  }

  const list = Array.from(stops).filter((angle) => angle <= maxAngle);
  if (!list.includes(0)) {
    list.push(0);
  }
  return list.sort((a, b) => a - b);
}

function clampRotation(value: number): number {
  return Math.max(0, Math.min(90, Math.round(value)));
}


