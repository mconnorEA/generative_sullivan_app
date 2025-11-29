"use strict";
(() => {
  // src/model/types.ts
  function identityTransform() {
    return {
      tx: 0,
      ty: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1
    };
  }
  function moveTo(x, y) {
    return { type: "M", p: { x, y } };
  }
  function lineTo(x, y) {
    return { type: "L", p: { x, y } };
  }
  function quadTo(cx, cy, x, y) {
    return { type: "Q", p1: { x: cx, y: cy }, p: { x, y } };
  }
  function cubicTo(x1, y1, x2, y2, x, y) {
    return { type: "C", p1: { x: x1, y: y1 }, p2: { x: x2, y: y2 }, p: { x, y } };
  }
  function closePath() {
    return { type: "Z" };
  }
  function rectPath(x, y, width, height) {
    const cmds = [];
    cmds.push(moveTo(x, y));
    cmds.push(lineTo(x + width, y));
    cmds.push(lineTo(x + width, y + height));
    cmds.push(lineTo(x, y + height));
    cmds.push(closePath());
    return { commands: cmds, closed: true };
  }
  function ellipsePath(rx, ry) {
    const kappa = 0.5522847498307936;
    const cmds = [];
    cmds.push(moveTo(rx, 0));
    cmds.push(cubicTo(
      rx,
      kappa * ry,
      kappa * rx,
      ry,
      0,
      ry
    ));
    cmds.push(cubicTo(
      -kappa * rx,
      ry,
      -rx,
      kappa * ry,
      -rx,
      0
    ));
    cmds.push(cubicTo(
      -rx,
      -kappa * ry,
      -kappa * rx,
      -ry,
      0,
      -ry
    ));
    cmds.push(cubicTo(
      kappa * rx,
      -ry,
      rx,
      -kappa * ry,
      rx,
      0
    ));
    cmds.push(closePath());
    return { commands: cmds, closed: true };
  }

  // src/plates/radialFlow.ts
  function generateRadialFlowScene(settings) {
    const circleRadius = clamp(settings.circleRadius ?? 0.65, 0.25, 0.98);
    const polygonSides = clampInt(settings.polygonSides ?? 6, 3, 18);
    const polygonRotation = degToRad(settings.polygonRotation ?? 0);
    const radialMultiplier = clampInt(settings.radialMultiplier ?? 1, 1, 4);
    const radialCount = clampInt(polygonSides * radialMultiplier, polygonSides, 96);
    const radialData = buildRadialData(radialCount, polygonRotation, circleRadius);
    const polygonVertices = buildPolygonVertices(circleRadius, polygonSides, polygonRotation);
    const pushAmount = clamp01(settings.pushAmount ?? 0);
    const pullAmount = clamp01(settings.pullAmount ?? 0);
    const subCenterDepth = clampInt(settings.subCenterDepth ?? 0, 0, 4);
    const subCenterRadiusRatio = clamp(settings.subCenterRadius ?? 0.35, 0.05, 0.85);
    const subCenterSides = clampInt(settings.subCenterSides ?? 4, 3, 12);
    const nodeSize = clamp(settings.nodeSize ?? 0.18, 0.01, 0.6);
    const edgeBulge = clamp01(settings.edgeBulge ?? 0.3);
    const edgeRepeat = clampInt(settings.edgeRepeat ?? 0, 0, 16);
    const lineDiamondWidth = clamp(settings.lineDiamondWidth ?? 0.2, 0.01, 0.8);
    const structuralEnabled = settings.showStructuralLayer !== false;
    const ornamentEnabled = settings.showOrnamentLayer !== false;
    const extent = computeExtent(
      circleRadius,
      pushAmount,
      subCenterDepth,
      subCenterRadiusRatio,
      nodeSize,
      edgeBulge,
      settings.lineDiamondsEnabled ? lineDiamondWidth : 0
    );
    const root = {
      id: "radial-flow-root",
      type: "container",
      plateOrigin: 1,
      role: "radial-flow",
      stepInPlate: 0,
      params: {},
      transform: identityTransform(),
      paths: [],
      children: []
    };
    const structureLayer = createLayerNode("flow-structure", "structure-layer", structuralEnabled);
    const ornamentLayer = createLayerNode("flow-ornament", "ornament-layer", ornamentEnabled);
    if (structuralEnabled) {
      if (settings.showBaseCircle) {
        structureLayer.paths.push(ellipsePath(circleRadius, circleRadius));
      }
      if (settings.showCross) {
        structureLayer.children.push(createCrossNode(circleRadius));
      }
      if (settings.showPolygon) {
        structureLayer.children.push(createPolygonNode(polygonVertices));
      }
      if (settings.showRadials) {
        structureLayer.children.push(createRadialsNode(circleRadius, radialCount, polygonRotation));
      }
      if (subCenterDepth > 0) {
        const subCenterRadius = circleRadius * subCenterRadiusRatio;
        const subCenters = createSubCenterGroup({
          depth: subCenterDepth,
          radius: subCenterRadius,
          anchorRadius: circleRadius,
          radialCount,
          baseRotation: polygonRotation,
          sides: subCenterSides,
          radiate: settings.radiateSubCenters
        });
        if (subCenters) {
          structureLayer.children.push(subCenters);
        }
      }
    }
    if (ornamentEnabled) {
      if (settings.enablePush && pushAmount > 0) {
        ornamentLayer.children.push(
          createPushMotifNode(circleRadius, radialCount, polygonRotation, pushAmount, settings.pushMotif)
        );
      }
      if (settings.enablePull && pullAmount > 0) {
        ornamentLayer.children.push(
          createPullMotifNode(circleRadius, radialCount, polygonRotation, pullAmount)
        );
      }
      const nodeDecorations = createNodeDecorationNode(
        settings.nodeDecorationType,
        nodeSize,
        radialData,
        circleRadius
      );
      if (nodeDecorations) {
        ornamentLayer.children.push(nodeDecorations);
      }
      const edgeDecorations = createEdgeDecorationNode(
        settings.edgeDecorationStyle,
        edgeRepeat,
        edgeBulge,
        radialData,
        circleRadius,
        nodeSize
      );
      if (edgeDecorations) {
        ornamentLayer.children.push(edgeDecorations);
      }
      if (settings.lineDiamondsEnabled) {
        const diamonds = createLineDiamondsNode(lineDiamondWidth, polygonVertices);
        if (diamonds) {
          ornamentLayer.children.push(diamonds);
        }
      }
    }
    if (structureLayer.paths.length || structureLayer.children.length) {
      root.children.push(structureLayer);
    }
    if (ornamentLayer.paths.length || ornamentLayer.children.length) {
      root.children.push(ornamentLayer);
    }
    return {
      root,
      bounds: makeBounds(extent)
    };
  }
  function createPolygonNode(vertices) {
    const path = polygonPathFromVertices(vertices);
    return {
      id: "flow-dividing-polygon",
      type: "auxiliary",
      plateOrigin: 1,
      role: "dividing-polygon",
      stepInPlate: 1,
      params: { sides: vertices.length },
      transform: identityTransform(),
      paths: [path],
      children: []
    };
  }
  function polygonPathFromVertices(vertices) {
    const commands = [];
    vertices.forEach((vertex, index) => {
      if (index === 0) {
        commands.push(moveTo(vertex.x, vertex.y));
      } else {
        commands.push(lineTo(vertex.x, vertex.y));
      }
    });
    commands.push(closePath());
    return { commands, closed: true };
  }
  function createRadialsNode(radius, count, rotation) {
    const node = {
      id: "flow-radials",
      type: "axis",
      plateOrigin: 1,
      role: "radial-energy",
      stepInPlate: 2,
      params: { count },
      transform: identityTransform(),
      paths: [],
      children: []
    };
    const reach = radius * 1.08;
    for (let i = 0; i < count; i++) {
      const angle = rotation + 2 * Math.PI * i / count;
      const x = Math.cos(angle) * reach;
      const y = Math.sin(angle) * reach;
      node.paths.push({
        commands: [moveTo(0, 0), lineTo(x, y)],
        closed: false
      });
    }
    return node;
  }
  function createCrossNode(radius) {
    const reach = Math.max(radius * 1.35, radius + 0.2);
    const node = {
      id: "flow-cross",
      type: "axis",
      plateOrigin: 1,
      role: "circle-cross",
      stepInPlate: 1,
      params: {},
      transform: identityTransform(),
      paths: [],
      children: []
    };
    node.paths.push({
      commands: [moveTo(-reach, 0), lineTo(reach, 0)],
      closed: false
    });
    node.paths.push({
      commands: [moveTo(0, -reach), lineTo(0, reach)],
      closed: false
    });
    return node;
  }
  function createPushMotifNode(baseRadius, radialCount, rotation, amount, motif = "square") {
    const group = {
      id: "flow-push-motifs",
      type: "overlay",
      plateOrigin: 1,
      role: "push-motif",
      stepInPlate: 3,
      params: { motif },
      transform: identityTransform(),
      paths: [],
      children: []
    };
    const motifSize = 0.08 + amount * 0.18;
    const radius = baseRadius * (1 + amount * 0.45);
    const motifPath = createMotifPath(motif, motifSize);
    for (let i = 0; i < radialCount; i++) {
      const angle = rotation + 2 * Math.PI * i / radialCount;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      group.children.push({
        id: `push-${i}`,
        type: "overlay",
        plateOrigin: 1,
        role: "push-instance",
        stepInPlate: 3,
        params: { angle },
        transform: {
          tx: x,
          ty: y,
          rotation: angle + Math.PI / 2,
          scaleX: 1,
          scaleY: 1
        },
        paths: [motifPath],
        children: []
      });
    }
    return group;
  }
  function createPullMotifNode(baseRadius, radialCount, rotation, amount) {
    const group = {
      id: "flow-pull-motifs",
      type: "overlay",
      plateOrigin: 1,
      role: "pull-motif",
      stepInPlate: 3,
      params: {},
      transform: identityTransform(),
      paths: [],
      children: []
    };
    const innerRadius = baseRadius * (1 - 0.6 * amount);
    const radius = (baseRadius + innerRadius) / 2;
    const motifSize = 0.06 + amount * 0.16;
    const motifPath = createPullMotifPath(motifSize);
    for (let i = 0; i < radialCount; i++) {
      const angle = rotation + 2 * Math.PI * i / radialCount;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      group.children.push({
        id: `pull-${i}`,
        type: "overlay",
        plateOrigin: 1,
        role: "pull-instance",
        stepInPlate: 3,
        params: { angle },
        transform: {
          tx: x,
          ty: y,
          rotation: angle + Math.PI,
          scaleX: 1,
          scaleY: 1
        },
        paths: [motifPath],
        children: []
      });
    }
    return group;
  }
  function createMotifPath(kind, size) {
    switch (kind) {
      case "diamond": {
        const h = size;
        const w = size * 0.65;
        return {
          commands: [
            moveTo(0, -h),
            lineTo(w, 0),
            lineTo(0, h),
            lineTo(-w, 0),
            closePath()
          ],
          closed: true
        };
      }
      case "lobe": {
        return ellipsePath(size * 0.5, size * 0.9);
      }
      case "pyramid": {
        return {
          commands: [
            moveTo(-size * 0.6, size * 0.5),
            lineTo(size * 0.6, size * 0.5),
            lineTo(0, -size * 0.65),
            closePath()
          ],
          closed: true
        };
      }
      case "square":
      default:
        return rectPath(-size / 2, -size / 2, size, size);
    }
  }
  function createPullMotifPath(size) {
    const width = size * 0.5;
    const height = size * 1.4;
    return {
      commands: [
        moveTo(0, -height * 0.5),
        lineTo(width, 0),
        lineTo(0, height * 0.5),
        lineTo(-width, 0),
        closePath()
      ],
      closed: true
    };
  }
  function createSubCenterGroup(options) {
    if (options.depth <= 0 || options.radius <= 0) {
      return null;
    }
    const group = {
      id: "flow-sub-centers",
      type: "container",
      plateOrigin: 1,
      role: "sub-centers",
      stepInPlate: 4,
      params: { depth: options.depth },
      transform: identityTransform(),
      paths: [],
      children: []
    };
    for (let i = 0; i < options.radialCount; i++) {
      const angle = options.baseRotation + 2 * Math.PI * i / options.radialCount;
      const x = Math.cos(angle) * options.anchorRadius;
      const y = Math.sin(angle) * options.anchorRadius;
      const transform = identityTransform();
      transform.tx = x;
      transform.ty = y;
      const node = createSubCenterNode(
        `sub-center-${i}`,
        options.depth,
        options.radius,
        options.sides,
        options.radiate,
        transform
      );
      group.children.push(node);
    }
    return group;
  }
  function createSubCenterNode(id, depth, radius, sides, radiate, transform = identityTransform()) {
    const node = {
      id,
      type: "container",
      plateOrigin: 1,
      role: "sub-center",
      stepInPlate: 4 - depth,
      params: { radius, depth },
      transform,
      paths: [ellipsePath(radius * 0.4, radius * 0.4)],
      children: []
    };
    if (radiate) {
      node.children.push(createLocalRadialsNode(radius, sides));
    }
    if (depth > 1) {
      const childRadius = radius * 0.6;
      for (let i = 0; i < sides; i++) {
        const angle = 2 * Math.PI * i / sides;
        const childTransform = identityTransform();
        childTransform.tx = Math.cos(angle) * radius;
        childTransform.ty = Math.sin(angle) * radius;
        childTransform.rotation = 0;
        const child = createSubCenterNode(
          `${id}-${i}`,
          depth - 1,
          childRadius,
          sides,
          radiate,
          childTransform
        );
        node.children.push(child);
      }
    }
    return node;
  }
  function createLocalRadialsNode(radius, sides) {
    const node = {
      id: "sub-center-radials",
      type: "axis",
      plateOrigin: 1,
      role: "sub-center-radial",
      stepInPlate: 4,
      params: { sides },
      transform: identityTransform(),
      paths: [],
      children: []
    };
    for (let i = 0; i < sides; i++) {
      const angle = 2 * Math.PI * i / sides;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      node.paths.push({
        commands: [moveTo(0, 0), lineTo(x, y)],
        closed: false
      });
    }
    return node;
  }
  function makeBounds(extent) {
    return {
      x: -extent,
      y: -extent,
      width: extent * 2,
      height: extent * 2
    };
  }
  function computeExtent(circleRadius, pushAmount, subCenterDepth, subCenterRadiusRatio, nodeSize, edgeBulge, lineDiamondWidth) {
    let extent = circleRadius * (1.1 + nodeSize * 0.8);
    extent = Math.max(extent, circleRadius * (1 + edgeBulge * 0.5));
    extent = Math.max(extent, circleRadius * (1 + lineDiamondWidth));
    const pushReach = circleRadius * (1 + pushAmount * 0.6);
    extent = Math.max(extent, pushReach);
    if (subCenterDepth > 0 && subCenterRadiusRatio > 0) {
      let offset = circleRadius;
      let currentRadius = circleRadius * subCenterRadiusRatio;
      for (let depth = 0; depth < subCenterDepth; depth++) {
        offset += currentRadius;
        currentRadius *= 0.6;
      }
      extent = Math.max(extent, offset);
    }
    return Math.max(extent, 1.6);
  }
  function createLayerNode(id, role, enabled) {
    return {
      id,
      type: "container",
      plateOrigin: 1,
      role,
      stepInPlate: 0,
      params: { enabled },
      transform: identityTransform(),
      paths: [],
      children: []
    };
  }
  function buildRadialData(count, rotation, radius) {
    const data = [];
    for (let i = 0; i < count; i++) {
      const angle = rotation + 2 * Math.PI * i / count;
      const dir = { x: Math.cos(angle), y: Math.sin(angle) };
      const normal = { x: -dir.y, y: dir.x };
      const end = { x: dir.x * radius, y: dir.y * radius };
      data.push({ angle, dir, normal, end });
    }
    return data;
  }
  function buildPolygonVertices(radius, sides, rotation) {
    const vertices = [];
    for (let i = 0; i < sides; i++) {
      const angle = rotation + 2 * Math.PI * i / sides;
      vertices.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius
      });
    }
    return vertices;
  }
  function createNodeDecorationNode(type, sizeRatio, radials, circleRadius) {
    if (type === "none" || sizeRatio <= 0 || !radials.length) {
      return null;
    }
    const size = circleRadius * sizeRatio;
    const path = createNodeDecorationPath(type, size);
    const node = {
      id: "node-decorations",
      type: "overlay",
      plateOrigin: 1,
      role: "node-decoration",
      stepInPlate: 4,
      params: { type, size },
      transform: identityTransform(),
      paths: [],
      children: []
    };
    node.children.push({
      id: "node-center",
      type: "overlay",
      plateOrigin: 1,
      role: "node-center",
      stepInPlate: 4,
      params: {},
      transform: identityTransform(),
      paths: [path],
      children: []
    });
    radials.forEach((radial, index) => {
      node.children.push({
        id: `node-${index}`,
        type: "overlay",
        plateOrigin: 1,
        role: "node-ray",
        stepInPlate: 4,
        params: { angle: radial.angle },
        transform: {
          tx: radial.end.x,
          ty: radial.end.y,
          rotation: radial.angle,
          scaleX: 1,
          scaleY: 1
        },
        paths: [path],
        children: []
      });
    });
    return node;
  }
  function createNodeDecorationPath(type, size) {
    switch (type) {
      case "circle":
        return ellipsePath(size * 0.5, size * 0.5);
      case "square":
        return rectPath(-size / 2, -size / 2, size, size);
      case "petal": {
        const petal = ellipsePath(size * 0.35, size * 0.65);
        return petal;
      }
      case "custom": {
        const w = size * 0.6;
        const h = size;
        return {
          commands: [
            moveTo(0, -h / 2),
            lineTo(w / 2, -h / 4),
            lineTo(w / 2, h / 4),
            lineTo(0, h / 2),
            lineTo(-w / 2, h / 4),
            lineTo(-w / 2, -h / 4),
            closePath()
          ],
          closed: true
        };
      }
      case "none":
      default:
        return ellipsePath(size * 0.5, size * 0.5);
    }
  }
  function createEdgeDecorationNode(style, repeats, bulge, radials, circleRadius, sizeRatio) {
    if (style === "straight" || repeats <= 0 || !radials.length) {
      return null;
    }
    const span = circleRadius * Math.max(0.04, sizeRatio * 0.25);
    const node = {
      id: "edge-ornaments",
      type: "overlay",
      plateOrigin: 1,
      role: "edge-decoration",
      stepInPlate: 4,
      params: { style, repeats },
      transform: identityTransform(),
      paths: [],
      children: []
    };
    radials.forEach((radial, index) => {
      for (let r = 0; r < repeats; r++) {
        const t = (r + 1) / (repeats + 1);
        const base = {
          x: radial.dir.x * circleRadius * t,
          y: radial.dir.y * circleRadius * t
        };
        const lateral = span * (0.8 + r * 0.05);
        if (style === "arched") {
          const start = {
            x: base.x - radial.normal.x * lateral,
            y: base.y - radial.normal.y * lateral
          };
          const end = {
            x: base.x + radial.normal.x * lateral,
            y: base.y + radial.normal.y * lateral
          };
          const control = {
            x: base.x + radial.dir.x * (bulge * lateral * 1.4),
            y: base.y + radial.dir.y * (bulge * lateral * 1.4)
          };
          node.paths.push({
            commands: [moveTo(start.x, start.y), quadTo(control.x, control.y, end.x, end.y)],
            closed: false
          });
        } else if (style === "double") {
          const gap = span * (0.4 + bulge * 0.5);
          const startA = {
            x: base.x - radial.dir.x * span,
            y: base.y - radial.dir.y * span
          };
          const endA = {
            x: base.x + radial.dir.x * span,
            y: base.y + radial.dir.y * span
          };
          const offsetA = {
            x: radial.normal.x * gap,
            y: radial.normal.y * gap
          };
          const offsetB = {
            x: -offsetA.x,
            y: -offsetA.y
          };
          node.paths.push({
            commands: [
              moveTo(startA.x + offsetA.x, startA.y + offsetA.y),
              lineTo(endA.x + offsetA.x, endA.y + offsetA.y)
            ],
            closed: false
          });
          node.paths.push({
            commands: [
              moveTo(startA.x + offsetB.x, startA.y + offsetB.y),
              lineTo(endA.x + offsetB.x, endA.y + offsetB.y)
            ],
            closed: false
          });
        }
      }
    });
    return node.paths.length ? node : null;
  }
  function createLineDiamondsNode(widthRatio, vertices) {
    if (widthRatio <= 0 || vertices.length < 2) {
      return null;
    }
    const node = {
      id: "line-diamonds",
      type: "overlay",
      plateOrigin: 1,
      role: "line-diamonds",
      stepInPlate: 4,
      params: { widthRatio },
      transform: identityTransform(),
      paths: [],
      children: []
    };
    const count = vertices.length;
    for (let i = 0; i < count; i++) {
      const start = vertices[i];
      const end = vertices[(i + 1) % count];
      const edgeX = end.x - start.x;
      const edgeY = end.y - start.y;
      const length = Math.hypot(edgeX, edgeY);
      if (length === 0) {
        continue;
      }
      const dir = { x: edgeX / length, y: edgeY / length };
      const normal = { x: -dir.y, y: dir.x };
      const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
      const offsetMagnitude = length * widthRatio;
      const offset = { x: normal.x * offsetMagnitude, y: normal.y * offsetMagnitude };
      const diamondPath = {
        commands: [
          moveTo(start.x, start.y),
          lineTo(mid.x + offset.x, mid.y + offset.y),
          lineTo(end.x, end.y),
          lineTo(mid.x - offset.x, mid.y - offset.y),
          closePath()
        ],
        closed: true
      };
      node.paths.push(diamondPath);
    }
    return node.paths.length ? node : null;
  }
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }
  function clamp01(value) {
    return clamp(value, 0, 1);
  }
  function clampInt(value, min, max) {
    const v = Math.floor(value);
    return Math.max(min, Math.min(max, v));
  }
  function degToRad(value) {
    return value * Math.PI / 180;
  }

  // src/export/svg.ts
  var IDENTITY_MATRIX = {
    a: 1,
    b: 0,
    c: 0,
    d: 1,
    e: 0,
    f: 0
  };
  function matFromTransform(t) {
    const cos = Math.cos(t.rotation);
    const sin = Math.sin(t.rotation);
    const a = cos * t.scaleX;
    const b = sin * t.scaleX;
    const c = -sin * t.scaleY;
    const d = cos * t.scaleY;
    const e = t.tx;
    const f = t.ty;
    return { a, b, c, d, e, f };
  }
  function matMul(m1, m2) {
    return {
      a: m1.a * m2.a + m1.c * m2.b,
      b: m1.b * m2.a + m1.d * m2.b,
      c: m1.a * m2.c + m1.c * m2.d,
      d: m1.b * m2.c + m1.d * m2.d,
      e: m1.a * m2.e + m1.c * m2.f + m1.e,
      f: m1.b * m2.e + m1.d * m2.f + m1.f
    };
  }
  function applyMat(m, p) {
    return {
      x: m.a * p.x + m.c * p.y + m.e,
      y: m.b * p.x + m.d * p.y + m.f
    };
  }
  function flattenNode(node, parentMatrix, out) {
    const nodeMatrix = matFromTransform(node.transform);
    const combined = matMul(parentMatrix, nodeMatrix);
    for (const path of node.paths) {
      const cmds = path.commands.map((cmd) => {
        switch (cmd.type) {
          case "M":
          case "L": {
            const p = applyMat(combined, cmd.p);
            return { type: cmd.type, p };
          }
          case "Q": {
            const p1 = applyMat(combined, cmd.p1);
            const p = applyMat(combined, cmd.p);
            return { type: "Q", p1, p };
          }
          case "C": {
            const p1 = applyMat(combined, cmd.p1);
            const p2 = applyMat(combined, cmd.p2);
            const p = applyMat(combined, cmd.p);
            return { type: "C", p1, p2, p };
          }
          case "Z":
            return cmd;
        }
      });
      out.push({
        commands: cmds,
        closed: path.closed,
        nodeType: node.type
      });
    }
    for (const child of node.children) {
      flattenNode(child, combined, out);
    }
  }
  function pathCommandsToD(cmds, precision) {
    const fmt = (n) => n.toFixed(precision);
    const parts = [];
    for (const cmd of cmds) {
      switch (cmd.type) {
        case "M":
          parts.push(`M ${fmt(cmd.p.x)} ${fmt(cmd.p.y)}`);
          break;
        case "L":
          parts.push(`L ${fmt(cmd.p.x)} ${fmt(cmd.p.y)}`);
          break;
        case "Q":
          parts.push(
            `Q ${fmt(cmd.p1.x)} ${fmt(cmd.p1.y)} ${fmt(cmd.p.x)} ${fmt(cmd.p.y)}`
          );
          break;
        case "C":
          parts.push(
            `C ${fmt(cmd.p1.x)} ${fmt(cmd.p1.y)} ${fmt(cmd.p2.x)} ${fmt(cmd.p2.y)} ${fmt(cmd.p.x)} ${fmt(cmd.p.y)}`
          );
          break;
        case "Z":
          parts.push("Z");
          break;
      }
    }
    return parts.join(" ");
  }
  function ornamentToSvg(ornament, options = {}) {
    const stroke = options.stroke ?? "#333";
    const fill = options.fill ?? "none";
    const strokeWidth = options.strokeWidth ?? 0.01;
    const includeConstruction = options.includeConstruction ?? true;
    const precision = options.precision ?? 4;
    const includeXmlDeclaration = options.includeXmlDeclaration ?? false;
    const flattened = [];
    flattenNode(ornament.root, IDENTITY_MATRIX, flattened);
    const viewBox = ornament.bounds;
    const vbStr = `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`;
    let svg = "";
    if (includeXmlDeclaration) {
      svg += '<?xml version="1.0" encoding="UTF-8"?>\n';
    }
    svg += `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vbStr}" `;
    if (options.width !== void 0) {
      svg += `width="${options.width}" `;
    }
    if (options.height !== void 0) {
      svg += `height="${options.height}" `;
    }
    svg += `fill="none" stroke="${stroke}" stroke-width="${strokeWidth}">
`;
    svg += `  <g fill="${fill}" stroke="${stroke}">
`;
    for (const fp of flattened) {
      if (!includeConstruction && fp.nodeType === "auxiliary") {
        continue;
      }
      const d = pathCommandsToD(fp.commands, precision);
      svg += `    <path d="${d}" />
`;
    }
    svg += "  </g>\n";
    svg += "</svg>\n";
    return svg;
  }
  function renderSceneToSvg(ornament, options = {}) {
    return ornamentToSvg(ornament, options);
  }

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

  // src/renderer/preview.ts
  window.addEventListener("DOMContentLoaded", () => {
    const flowViewport = getElement("flow-viewport");
    const flowSvgHost = getElement("flow-svg");
    const zoomInButton = getElement("zoom-in");
    const zoomOutButton = getElement("zoom-out");
    const zoomFitButton = getElement("zoom-fit");
    const zoomController = createZoomController(flowViewport);
    const renderState = (params) => {
      flowSvgHost.innerHTML = buildFlowSvg(params.flow);
      zoomController.apply();
    };
    zoomInButton.addEventListener("click", () => zoomController.step(0.2));
    zoomOutButton.addEventListener("click", () => zoomController.step(-0.2));
    zoomFitButton.addEventListener("click", () => zoomController.fit());
    const previewApi = window.previewAPI;
    if (previewApi) {
      previewApi.onParams(renderState);
      previewApi.requestState().then(renderState).catch(() => renderState(defaultControllerParams));
    } else {
      renderState(defaultControllerParams);
    }
    window.exportCurrentSvg = () => {
      const svgElement = flowSvgHost.querySelector("svg");
      if (!svgElement) {
        return "";
      }
      const serializer = new XMLSerializer();
      return serializer.serializeToString(svgElement);
    };
    window.exportCurrentSvg = () => {
      const svgElement = flowSvgHost.querySelector("svg");
      if (!svgElement) {
        return "";
      }
      const serializer = new XMLSerializer();
      return serializer.serializeToString(svgElement);
    };
  });
  function buildFlowSvg(flow) {
    const flowScene = generateRadialFlowScene(flow);
    const scaled = scaleScene(flowScene, 600, 600);
    const strokeWidth = clamp2(flow.lineWeight ?? 1.4, 0.4, 4);
    return renderSceneToSvg(scaled, {
      stroke: "#ffd7a1",
      fill: "none",
      strokeWidth,
      includeConstruction: true,
      width: 600,
      height: 600
    });
  }
  function getElement(id) {
    const el = document.getElementById(id);
    if (!el) {
      throw new Error(`Missing element #${id}`);
    }
    return el;
  }
  function scaleScene(scene, width, height) {
    return {
      root: {
        ...scene.root,
        transform: {
          tx: width / 2,
          ty: height / 2,
          rotation: 0,
          scaleX: width / 2,
          scaleY: height / 2
        }
      },
      bounds: { x: 0, y: 0, width, height }
    };
  }
  function createZoomController(target) {
    let scale = 1;
    const min = 0.5;
    const max = 3;
    const apply = () => {
      target.style.transform = `scale(${scale})`;
    };
    const step = (delta) => {
      scale = clamp2(scale + delta, min, max);
      apply();
    };
    const fit = () => {
      scale = 1;
      apply();
    };
    apply();
    return { step, fit, apply };
  }
  function clamp2(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }
})();
//# sourceMappingURL=preview.js.map
