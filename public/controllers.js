"use strict";
(() => {
  // src/types/controls.ts
  var defaultControllerParams = {
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
      showQuarterArcs: true
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
      pushMotif: "diamond",
      enablePull: false,
      pullAmount: 0,
      subCenterDepth: 0,
      subCenterRadius: 0.3,
      subCenterSides: 4,
      radiateSubCenters: false,
      nodeDecorationType: "none",
      nodeSize: 0.18,
      edgeDecorationStyle: "straight",
      edgeBulge: 0.3,
      edgeRepeat: 0,
      lineWeight: 1.4,
      showStructuralLayer: true,
      showOrnamentLayer: true,
      lineDiamondsEnabled: false,
      lineDiamondWidth: 0.2
    }
  };

  // src/renderer/controllers.ts
  var sliderBindings = {
    step: bindSlider("step", (value) => `${value}`),
    leafMorph: bindSlider("leafMorph", (value) => value.toFixed(2)),
    innerMargin: bindSlider("innerMargin", (value) => value.toFixed(2)),
    subdivisions: bindSlider("subdivisions", (value) => `${value}`),
    circleRadius: bindSlider("circleRadius", (value) => value.toFixed(2)),
    polygonSides: bindSlider("polygonSides", (value) => `${value}`),
    polygonRotation: bindSlider("polygonRotation", (value) => `${value}\xB0`),
    radialMultiplier: bindSlider("radialMultiplier", (value) => `${value}\xD7`),
    pushAmount: bindSlider("pushAmount", (value) => value.toFixed(2)),
    pullAmount: bindSlider("pullAmount", (value) => value.toFixed(2)),
    subCenterDepth: bindSlider("subCenterDepth", (value) => `${value}`),
    subCenterRadius: bindSlider("subCenterRadius", (value) => value.toFixed(2)),
    subCenterSides: bindSlider("subCenterSides", (value) => `${value}`),
    nodeSize: bindSlider("nodeSize", (value) => value.toFixed(2)),
    edgeBulge: bindSlider("edgeBulge", (value) => value.toFixed(2)),
    edgeRepeat: bindSlider("edgeRepeat", (value) => `${value}`),
    lineWeight: bindSlider("lineWeight", (value) => value.toFixed(2)),
    lineDiamondWidth: bindSlider("lineDiamondWidth", (value) => value.toFixed(2))
  };
  var squareCheckboxBindings = {
    showOuterFrame: bindCheckbox("showOuterFrame"),
    showInnerFrame: bindCheckbox("showInnerFrame"),
    showCenterCross: bindCheckbox("showCenterCross"),
    showDiagonals: bindCheckbox("showDiagonals"),
    showSubdivisionGrid: bindCheckbox("showSubdivisionGrid"),
    showInscribedCircle: bindCheckbox("showInscribedCircle"),
    showDiamondSquare: bindCheckbox("showDiamondSquare"),
    showQuarterArcs: bindCheckbox("showQuarterArcs")
  };
  var flowCheckboxBindings = {
    showBaseCircle: bindCheckbox("showBaseCircle"),
    showCross: bindCheckbox("showCross"),
    showPolygon: bindCheckbox("showPolygon"),
    showRadials: bindCheckbox("showRadials"),
    enablePush: bindCheckbox("enablePush"),
    enablePull: bindCheckbox("enablePull"),
    radiateSubCenters: bindCheckbox("radiateSubCenters"),
    showStructuralLayer: bindCheckbox("showStructuralLayer"),
    showOrnamentLayer: bindCheckbox("showOrnamentLayer"),
    lineDiamondsEnabled: bindCheckbox("lineDiamondsEnabled")
  };
  var selectBindings = {
    pushMotif: bindSelect("pushMotif"),
    nodeDecorationType: bindSelect("nodeDecorationType"),
    edgeDecorationStyle: bindSelect("edgeDecorationStyle")
  };
  var controllerApi = window.controllersAPI;
  window.addEventListener("DOMContentLoaded", () => {
    const loadInput = document.getElementById("loadPresetInput");
    Object.keys(sliderBindings).forEach((id) => {
      const binding = sliderBindings[id];
      binding.input.addEventListener("input", () => handleSliderInput(id));
      updateSliderLabel(binding, getSliderValue(id));
    });
    Object.values(squareCheckboxBindings).forEach((input) => {
      input.addEventListener("input", handleInputChange);
    });
    Object.values(flowCheckboxBindings).forEach((input) => {
      input.addEventListener("input", handleInputChange);
    });
    Object.values(selectBindings).forEach((input) => {
      input.addEventListener("change", handleInputChange);
    });
    loadInput?.addEventListener("change", (event) => handlePresetFileSelected(event));
    window.controllersAPI?.onMenuCommand((command) => handleMenuCommand(command, loadInput));
    bootstrapState();
  });
  async function bootstrapState() {
    const savedState = controllerApi ? await controllerApi.requestState().catch(() => defaultControllerParams) : defaultControllerParams;
    applyStateToControls(savedState);
    emitState(savedState);
  }
  function handleSliderInput(id) {
    let value = getSliderValue(id);
    if (id === "polygonRotation") {
      value = snapPolygonRotation(value);
      sliderBindings.polygonRotation.input.value = value.toString();
    }
    updateSliderLabel(sliderBindings[id], value);
    if (id === "step") {
      applyStepPreset(parseInt(sliderBindings.step.input.value, 10));
    }
    handleInputChange();
  }
  function handleInputChange() {
    const state = collectCurrentState();
    emitState(state);
  }
  function emitState(state) {
    controllerApi?.updateState(state);
  }
  function collectCurrentState() {
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
        showQuarterArcs: squareCheckboxBindings.showQuarterArcs.checked
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
        pushMotif: selectBindings.pushMotif.value,
        enablePull: flowCheckboxBindings.enablePull.checked,
        pullAmount: parseFloat(sliderBindings.pullAmount.input.value),
        subCenterDepth: parseInt(sliderBindings.subCenterDepth.input.value, 10),
        subCenterRadius: parseFloat(sliderBindings.subCenterRadius.input.value),
        subCenterSides: parseInt(sliderBindings.subCenterSides.input.value, 10),
        radiateSubCenters: flowCheckboxBindings.radiateSubCenters.checked,
        nodeDecorationType: selectBindings.nodeDecorationType.value,
        nodeSize: parseFloat(sliderBindings.nodeSize.input.value),
        edgeDecorationStyle: selectBindings.edgeDecorationStyle.value,
        edgeBulge: parseFloat(sliderBindings.edgeBulge.input.value),
        edgeRepeat: parseInt(sliderBindings.edgeRepeat.input.value, 10),
        lineWeight: parseFloat(sliderBindings.lineWeight.input.value),
        showStructuralLayer: flowCheckboxBindings.showStructuralLayer.checked,
        showOrnamentLayer: flowCheckboxBindings.showOrnamentLayer.checked,
        lineDiamondsEnabled: flowCheckboxBindings.lineDiamondsEnabled.checked,
        lineDiamondWidth: parseFloat(sliderBindings.lineDiamondWidth.input.value)
      }
    };
  }
  function applyStateToControls(state) {
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
    Object.keys(squareCheckboxBindings).forEach((key) => {
      squareCheckboxBindings[key].checked = state.square[key];
    });
    Object.keys(flowCheckboxBindings).forEach((key) => {
      flowCheckboxBindings[key].checked = state.flow[key];
    });
    selectBindings.pushMotif.value = state.flow.pushMotif;
    selectBindings.nodeDecorationType.value = state.flow.nodeDecorationType;
    selectBindings.edgeDecorationStyle.value = state.flow.edgeDecorationStyle;
    updateSliderLabels(state);
  }
  function updateSliderLabels(state) {
    const sliderValues = {
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
      lineDiamondWidth: state.flow.lineDiamondWidth
    };
    Object.keys(sliderValues).forEach((id) => {
      const value = sliderValues[id];
      if (value === void 0) {
        return;
      }
      sliderBindings[id].valueEl.textContent = sliderBindings[id].format(value);
    });
  }
  function updateSliderLabel(binding, value) {
    binding.valueEl.textContent = binding.format(value);
  }
  function getSliderValue(id) {
    const raw = sliderBindings[id].input.value;
    const intSliders = [
      "step",
      "subdivisions",
      "polygonSides",
      "polygonRotation",
      "radialMultiplier",
      "subCenterDepth",
      "subCenterSides",
      "edgeRepeat"
    ];
    return intSliders.includes(id) ? parseInt(raw, 10) : parseFloat(raw);
  }
  function bindSlider(id, format) {
    const input = document.getElementById(id);
    const valueEl = document.querySelector(`[data-value-for="${id}"]`);
    if (!input || !valueEl) {
      throw new Error(`Missing slider binding for ${id}`);
    }
    return { input, valueEl, format };
  }
  function bindCheckbox(id) {
    const input = document.getElementById(id);
    if (!input) {
      throw new Error(`Missing checkbox binding for ${id}`);
    }
    return input;
  }
  function bindSelect(id) {
    const input = document.getElementById(id);
    if (!input) {
      throw new Error(`Missing select binding for ${id}`);
    }
    return input;
  }
  function applyStepPreset(step) {
    const toggles = {
      showOuterFrame: step >= 1,
      showInnerFrame: step >= 2,
      showCenterCross: step >= 3,
      showDiagonals: step >= 4,
      showInscribedCircle: step >= 5,
      showDiamondSquare: step >= 6,
      showQuarterArcs: step >= 7,
      showSubdivisionGrid: step >= 7
    };
    Object.keys(squareCheckboxBindings).forEach((key) => {
      squareCheckboxBindings[key].checked = toggles[key];
    });
  }
  function handleSavePreset() {
    const state = collectCurrentState();
    const serialized = JSON.stringify(state, null, 2);
    window.localStorage.setItem("flowControllerPreset", serialized);
    const blob = new Blob([serialized], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `sullivan-flow-${Date.now()}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }
  function handleLoadPreset(input) {
    if (input) {
      input.value = "";
      input.click();
      return;
    }
    loadPresetFromLocalStorage();
  }
  function handlePresetFileSelected(event) {
    const input = event.target;
    const file = input.files && input.files[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result;
      if (typeof text !== "string") {
        return;
      }
      tryApplyPreset(text);
    };
    reader.readAsText(file);
  }
  function loadPresetFromLocalStorage() {
    const raw = window.localStorage.getItem("flowControllerPreset");
    if (raw) {
      tryApplyPreset(raw);
    }
  }
  function tryApplyPreset(serialized) {
    try {
      const state = JSON.parse(serialized);
      applyStateToControls(state);
      emitState(state);
    } catch {
    }
  }
  async function handleExportSvg() {
    try {
      const svg = await window.controllersAPI?.requestCurrentSvg();
      if (!svg) {
        return;
      }
      const blob = new Blob([svg], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `sullivan-flow-${Date.now()}.svg`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch {
    }
  }
  function handleMenuCommand(command, loadInput) {
    const { action, payload } = command;
    switch (action) {
      case "savePreset":
        handleSavePreset();
        break;
      case "loadPreset":
        handleLoadPreset(loadInput);
        break;
      case "loadPresetContent":
        if (payload) {
          tryApplyPreset(payload);
        }
        break;
      case "exportSvg":
        handleExportSvg();
        break;
      default:
        break;
    }
  }
  function snapPolygonRotation(value) {
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
  function computeRotationStops(sides) {
    const stops = /* @__PURE__ */ new Set();
    const maxAngle = 90;
    for (let k = 0; k < sides; k++) {
      const axisAngle = k * 180 / sides;
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
  function clampRotation(value) {
    return Math.max(0, Math.min(90, Math.round(value)));
  }
})();
//# sourceMappingURL=controllers.js.map
