import { generateRadialFlowScene } from '../plates/radialFlow';
import { renderSceneToSvg } from '../export/svg';
import { OrnamentResult } from '../model/types';
import { ControllerParams, defaultControllerParams } from '../types/controls';
import { FlowToolSettings } from '../types/flow';

window.addEventListener('DOMContentLoaded', () => {
  const flowViewport = getElement('flow-viewport');
  const flowSvgHost = getElement('flow-svg');
  const zoomInButton = getElement('zoom-in') as HTMLButtonElement;
  const zoomOutButton = getElement('zoom-out') as HTMLButtonElement;
  const zoomFitButton = getElement('zoom-fit') as HTMLButtonElement;
  const zoomController = createZoomController(flowViewport);

  const renderState = (params: ControllerParams): void => {
    flowSvgHost.innerHTML = buildFlowSvg(params.flow);
    zoomController.apply();
  };

  zoomInButton.addEventListener('click', () => zoomController.step(0.2));
  zoomOutButton.addEventListener('click', () => zoomController.step(-0.2));
  zoomFitButton.addEventListener('click', () => zoomController.fit());

  const previewApi = window.previewAPI;

  if (previewApi) {
    previewApi.onParams(renderState);
    previewApi.requestState().then(renderState).catch(() => renderState(defaultControllerParams));
  } else {
    renderState(defaultControllerParams);
  }

  window.exportCurrentSvg = () => {
    const svgElement = flowSvgHost.querySelector('svg');
    if (!svgElement) {
      return '';
    }
    const serializer = new XMLSerializer();
    return serializer.serializeToString(svgElement);
  };
  window.exportCurrentSvg = () => {
    const svgElement = flowSvgHost.querySelector('svg');
    if (!svgElement) {
      return '';
    }
    const serializer = new XMLSerializer();
    return serializer.serializeToString(svgElement);
  };
});

function buildFlowSvg(flow: FlowToolSettings): string {
  const flowScene = generateRadialFlowScene(flow);
  const scaled = scaleScene(flowScene, 600, 600);
  const strokeWidth = clamp(flow.lineWeight ?? 1.4, 0.4, 4);

  return renderSceneToSvg(scaled, {
    stroke: '#ffd7a1',
    fill: 'none',
    strokeWidth,
    includeConstruction: true,
    width: 600,
    height: 600,
  });
}

function getElement(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) {
    throw new Error(`Missing element #${id}`);
  }
  return el;
}

function scaleScene(scene: OrnamentResult, width: number, height: number): OrnamentResult {
  return {
    root: {
      ...scene.root,
      transform: {
        tx: width / 2,
        ty: height / 2,
        rotation: 0,
        scaleX: width / 2,
        scaleY: height / 2,
      },
    },
    bounds: { x: 0, y: 0, width, height },
  };
}

function createZoomController(target: HTMLElement) {
  let scale = 1;
  const min = 0.5;
  const max = 3;

  const apply = () => {
    target.style.transform = `scale(${scale})`;
  };

  const step = (delta: number) => {
    scale = clamp(scale + delta, min, max);
    apply();
  };

  const fit = () => {
    scale = 1;
    apply();
  };

  apply();

  return { step, fit, apply };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

