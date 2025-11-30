import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  Handle,
  Position,
  ReactFlowInstance,
  XYPosition,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  OnSelectionChangeParams,
} from 'reactflow';

import { ControllerParams, defaultControllerParams } from '../types/controls';
import {
  WorkflowEdgeSnapshot,
  WorkflowFilePayload,
  WorkflowNodeKind,
  WorkflowNodeSnapshot,
} from '../types/workflow';

type WorkflowNodeData = {
  title: string;
  subtitle?: string;
  icon: string;
  tint: string;
  kind: WorkflowNodeKind;
  summary: string[];
};

type PolygonFieldNodeData = WorkflowNodeData & {
  type: 'polygon-field';
  params: {
    sides: number;
    radius: number;
    rotation: number;
    radialMultiplier: number;
    showPolygon: boolean;
    showRadials: boolean;
  };
  onChange: {
    sides: (value: number) => void;
    radius: (value: number) => void;
    rotation: (value: number) => void;
    radialMultiplier: (value: number) => void;
    showPolygon: (value: boolean) => void;
    showRadials: (value: boolean) => void;
  };
};

type NodeData = WorkflowNodeData | PolygonFieldNodeData;

type WorkflowSnapshot = {
  params: ControllerParams;
  nodes: Node<NodeData>[];
  edges: Edge[];
};

type NodeBlueprint = {
  id: string;
  title: string;
  subtitle?: string;
  icon: string;
  tint: string;
  kind: WorkflowNodeKind;
  position: { x: number; y: number };
};

type NodeLibraryGroup = {
  title: string;
  subtitle?: string;
  entries: NodeBlueprint[];
};

const nodeBlueprints: NodeBlueprint[] = [
  {
    id: 'stage-preset',
    title: 'Plate Step',
    subtitle: 'Guides motif presets',
    icon: 'S',
    tint: '#f87171',
    kind: 'preset',
    position: { x: 40, y: 120 },
  },
  {
    id: 'stage-square',
    title: 'Square Motifs',
    subtitle: 'Framing toggles',
    icon: '□',
    tint: '#f59e0b',
    kind: 'square',
    position: { x: 260, y: 60 },
  },
  {
    id: 'stage-circle',
    title: 'Circle Field',
    subtitle: 'Circle + cross',
    icon: 'C',
    tint: '#38bdf8',
    kind: 'circle',
    position: { x: 500, y: 40 },
  },
  {
    id: 'stage-polygon',
    title: 'Polygon Field',
    subtitle: 'Vertices + radials',
    icon: 'P',
    tint: '#60a5fa',
    kind: 'polygon',
    position: { x: 740, y: 60 },
  },
  {
    id: 'stage-energy',
    title: 'Energy Lines',
    subtitle: 'Push + pull',
    icon: 'E',
    tint: '#c084fc',
    kind: 'energy',
    position: { x: 980, y: 60 },
  },
  {
    id: 'stage-subcenter',
    title: 'Sub-centers',
    subtitle: 'Recursive blooms',
    icon: 'R',
    tint: '#34d399',
    kind: 'subcenter',
    position: { x: 1220, y: 60 },
  },
  {
    id: 'stage-ornament',
    title: 'Ornament Layer',
    subtitle: 'Nodes + edges',
    icon: 'O',
    tint: '#fb7185',
    kind: 'ornament',
    position: { x: 1460, y: 60 },
  },
  {
    id: 'stage-layers',
    title: 'Render Layers',
    subtitle: 'Visibility toggles',
    icon: 'L',
    tint: '#fcd34d',
    kind: 'layers',
    position: { x: 1700, y: 60 },
  },
  {
    id: 'stage-leaf',
    title: 'Leaf Study',
    subtitle: 'Morph alpha',
    icon: '🌿',
    tint: '#4ade80',
    kind: 'leaf',
    position: { x: 500, y: 300 },
  },
];

const blueprintByKind = nodeBlueprints.reduce<Record<WorkflowNodeKind, NodeBlueprint>>((map, blueprint) => {
  map[blueprint.kind] = blueprint;
  return map;
}, {} as Record<WorkflowNodeKind, NodeBlueprint>);

const nodeLibraryEntries = Object.values(blueprintByKind);

const nodeLibraryGroups: NodeLibraryGroup[] = [
  {
    title: 'Workflow stages',
    subtitle: 'Drag or click to add new stages',
    entries: nodeLibraryEntries,
  },
];

const nodeTypes = {
  workflow: WorkflowNode,
  polygonField: PolygonFieldNode,
};

const panelResetMap: Record<WorkflowNodeKind, string[]> = {
  preset: ['step'],
  square: [
    'square.showOuterFrame',
    'square.showInnerFrame',
    'square.showCenterCross',
    'square.showDiagonals',
    'square.showSubdivisionGrid',
    'square.subdivisions',
    'square.innerMargin',
    'square.showInscribedCircle',
    'square.showDiamondSquare',
    'square.showQuarterArcs',
  ],
  circle: ['flow.circleRadius', 'flow.showBaseCircle', 'flow.showCross'],
  polygon: ['flow.polygonSides', 'flow.polygonRotation', 'flow.radialMultiplier', 'flow.showPolygon', 'flow.showRadials'],
  energy: ['flow.enablePush', 'flow.pushAmount', 'flow.pushMotif', 'flow.enablePull', 'flow.pullAmount'],
  subcenter: ['flow.subCenterDepth', 'flow.subCenterRadius', 'flow.subCenterSides', 'flow.radiateSubCenters'],
  ornament: [
    'flow.nodeDecorationType',
    'flow.nodeSize',
    'flow.edgeDecorationStyle',
    'flow.edgeBulge',
    'flow.edgeRepeat',
    'flow.lineWeight',
    'flow.lineDiamondsEnabled',
    'flow.lineDiamondWidth',
  ],
  layers: ['flow.showStructuralLayer', 'flow.showOrnamentLayer'],
  leaf: ['leafMorphAlpha'],
};

const summaryBuilders: Record<WorkflowNodeKind, (params: ControllerParams) => string[]> = {
  preset: (params) => [`Step ${params.step}`, params.step >= 4 ? 'Full motif suite' : 'Partial motif suite'],
  square: (params) => [
    `Inner margin ${params.square.innerMargin.toFixed(2)}`,
    `Subdivisions ${params.square.subdivisions}`,
    `${countToggled(params.square)} / 8 motifs enabled`,
  ],
  circle: (params) => [
    `Radius ${params.flow.circleRadius.toFixed(2)}`,
    params.flow.showBaseCircle ? 'Base circle ✓' : 'Base circle ✕',
    params.flow.showCross ? 'Cross guides ✓' : 'Cross guides ✕',
  ],
  polygon: (params) => [
    `${params.flow.polygonSides} sides`,
    `Rotation ${params.flow.polygonRotation}°`,
    `Radials ×${params.flow.radialMultiplier}`,
    params.flow.showPolygon ? 'Polygon visible' : 'Polygon hidden',
    params.flow.showRadials ? 'Radials visible' : 'Radials hidden',
  ],
  energy: (params) => [
    params.flow.enablePush ? `Push ${params.flow.pushAmount.toFixed(2)} (${params.flow.pushMotif})` : 'Push disabled',
    params.flow.enablePull ? `Pull ${params.flow.pullAmount.toFixed(2)}` : 'Pull disabled',
  ],
  subcenter: (params) => [
    `Depth ${params.flow.subCenterDepth}`,
    `Radius ${params.flow.subCenterRadius.toFixed(2)}`,
    `${params.flow.subCenterSides} sides`,
    params.flow.radiateSubCenters ? 'Radiating' : 'Static',
  ],
  ornament: (params) => [
    `Nodes: ${params.flow.nodeDecorationType}`,
    `Node size ${params.flow.nodeSize.toFixed(2)}`,
    `Edge: ${params.flow.edgeDecorationStyle}`,
    params.flow.lineDiamondsEnabled ? `Diamonds width ${params.flow.lineDiamondWidth.toFixed(2)}` : 'Diamonds disabled',
  ],
  layers: (params) => [
    params.flow.showStructuralLayer ? 'Structural layer on' : 'Structural layer off',
    params.flow.showOrnamentLayer ? 'Ornament layer on' : 'Ornament layer off',
  ],
  leaf: (params) => [`Morph α ${(params.leafMorphAlpha * 100).toFixed(0)}%`],
};

function WorkflowNode({ data }: { data: WorkflowNodeData }) {
  return (
    <>
      <div className="node-card" style={{ borderColor: data.tint }}>
        <div className="node-card__hdr" style={{ background: `${data.tint}22` }}>
          <span className="node-card__icon" style={{ color: data.tint }}>
            {data.icon}
          </span>
          <div className="node-card__meta">
            <div className="node-card__title">{data.title}</div>
            {data.subtitle && <div className="node-card__subtitle">{data.subtitle}</div>}
          </div>
        </div>
        {data.summary?.length ? (
          <ul className="node-card__summary">
            {data.summary.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : null}
      </div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </>
  );
}

function PolygonFieldNode({ data }: { data: PolygonFieldNodeData }) {
  const { params, onChange } = data;
  const snapRotation = useCallback(
    (value: number) => snapRotationToSymmetry(value, params.sides, 1, 0, 360),
    [params.sides]
  );

  return (
    <>
      <div className="node-card node-card--polygon" style={{ borderColor: data.tint }}>
        <div className="node-card__hdr" style={{ background: `${data.tint}22` }}>
          <span className="node-card__icon" style={{ color: data.tint }}>
            {data.icon}
          </span>
          <div className="node-card__meta">
            <div className="node-card__title">{data.title}</div>
            {data.subtitle && <div className="node-card__subtitle">{data.subtitle}</div>}
          </div>
        </div>
        <div className="node-card__body">
          <div className="polygon-node__controls">
            <RangeField
              label="Sides"
              value={params.sides}
              min={3}
              max={18}
              step={1}
              onChange={(value) => onChange.sides(Math.round(value))}
            />
            <RangeField
              label="Radius"
              value={params.radius}
              min={0.25}
              max={0.95}
              step={0.01}
              onChange={(value) => onChange.radius(parseFloat(value.toFixed(2)))}
              format={(value) => value.toFixed(2)}
            />
            <RangeField
              label="Rotation"
              value={params.rotation}
              min={0}
              max={360}
              step={1}
              onChange={(value) => onChange.rotation(Math.round(value))}
              onShiftSnap={snapRotation}
              format={(value) => `${value}°`}
            />
            <RangeField
              label="Radial multiplier"
              value={params.radialMultiplier}
              min={1}
              max={6}
              step={1}
              onChange={(value) => onChange.radialMultiplier(Math.round(value))}
              format={(value) => `×${value}`}
            />
            <ToggleField
              label="Show polygon"
              checked={params.showPolygon}
              onChange={onChange.showPolygon}
            />
            <ToggleField
              label="Show radial lines"
              checked={params.showRadials}
              onChange={onChange.showRadials}
            />
          </div>
          <div className="polygon-node__outputs" aria-label="Polygon outputs">
            <div className="polygon-node__port">
              <span>polygonVertices</span>
              <Handle type="source" position={Position.Right} id="polygonVertices" style={{ top: '55%' }} />
            </div>
            <div className="polygon-node__port">
              <span>edges</span>
              <Handle type="source" position={Position.Right} id="edges" style={{ top: '70%' }} />
            </div>
            <div className="polygon-node__port">
              <span>radials</span>
              <Handle type="source" position={Position.Right} id="radials" style={{ top: '85%' }} />
            </div>
          </div>
        </div>
      </div>
      <Handle type="target" position={Position.Left} id="polygon-field-input" />
    </>
  );
}

function App(): JSX.Element {
  const initialNodes = useMemo(() => buildInitialNodes(defaultControllerParams), []);
  const initialEdges = useMemo(() => buildInitialEdges(), []);

  const [nodes, setNodes, onNodesChange] = useNodesState<NodeData>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [params, setParams] = useState<ControllerParams>(defaultControllerParams);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [undoStack, setUndo] = useState<WorkflowSnapshot[]>([]);
  const [redoStack, setRedo] = useState<WorkflowSnapshot[]>([]);
  const [log, setLog] = useState<string[]>(['Workflow ready']);
  const [status, setStatus] = useState('Ready');
  const flowWrapperRef = useRef<HTMLDivElement | null>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [isLibraryOpen, setLibraryOpen] = useState(false);

  const selectedNode = useMemo(() => nodes.find((n) => n.id === selectedId) ?? null, [nodes, selectedId]);
  const hasNodes = nodes.length > 0;

  const getSnapshot = useCallback(
    (): WorkflowSnapshot => ({
      params: cloneDeep(params),
      nodes: cloneDeep(nodes),
      edges: cloneDeep(edges),
    }),
    [params, nodes, edges]
  );

  const updateNodeSummaries = useCallback(
    (nextParams: ControllerParams) => {
      setNodes((current) =>
        current.map((node) => {
          if (node.type === 'polygonField') {
            const data = node.data as PolygonFieldNodeData;
            return {
              ...node,
              data: {
                ...data,
                params: extractPolygonParams(nextParams),
                summary: summarizeNode(node.data.kind, nextParams),
              },
            };
          }
          return {
            ...node,
            data: {
              ...node.data,
              summary: summarizeNode(node.data.kind, nextParams),
            },
          };
        })
      );
    },
    [setNodes]
  );

  const pushSnapshot = useCallback(() => {
    const snapshot = getSnapshot();
    setUndo((stack) => stack.concat([snapshot]));
    setRedo([]);
  }, [getSnapshot, updateParam]);

  const applyParams = useCallback(
    (mutator: (draft: ControllerParams) => void) => {
      pushSnapshot();
      setParams((prev) => {
        const next = cloneDeep(prev);
        mutator(next);
        return next;
      });
    },
    [pushSnapshot]
  );

  const updateParam = useCallback(
    (path: string, value: boolean | number | string) => {
      const current = getByPath(params, path);
      if (current === value) {
        return;
      }
      applyParams((draft) => setByPath(draft, path, value));
    },
    [applyParams, params]
  );

  const updateStep = useCallback(
    (value: number) => {
      if (params.step === value) {
        applyParams((draft) => applyStepPreset(draft));
        return;
      }
      applyParams((draft) => {
        draft.step = value;
        applyStepPreset(draft);
      });
    },
    [applyParams, params.step]
  );

  const resetNode = useCallback(
    (kind: WorkflowNodeKind) => {
      const fields = panelResetMap[kind];
      if (!fields) {
        return;
      }
      applyParams((draft) => {
        fields.forEach((path) => {
          const nextValue = getByPath(defaultControllerParams, path);
          setByPath(draft, path, cloneValue(nextValue));
        });
      });
    },
    [applyParams]
  );

  const addNode = useCallback(
    (kind: WorkflowNodeKind, position?: XYPosition) => {
      pushSnapshot();
      const targetPosition =
        position ??
        (reactFlowInstance && flowWrapperRef.current
          ? reactFlowInstance.project({
              x: flowWrapperRef.current.clientWidth / 2,
              y: flowWrapperRef.current.clientHeight / 2,
            })
          : { x: 200, y: 200 });
      const node = createNode(kind, params, { position: targetPosition, updateParam });
      setNodes((nds) => nds.concat(node));
      setSelectedId(node.id);
      setStatus(`Added ${node.data.title}`);
    },
    [params, pushSnapshot, reactFlowInstance, updateParam]
  );

  const handleAddFromLibrary = useCallback(
    (kind: WorkflowNodeKind) => {
      addNode(kind);
      setLibraryOpen(false);
    },
    [addNode]
  );

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const kind = event.dataTransfer.getData('application/workflow-kind') as WorkflowNodeKind;
      if (!kind || !reactFlowInstance || !flowWrapperRef.current) {
        return;
      }
      const bounds = flowWrapperRef.current.getBoundingClientRect();
      const position = reactFlowInstance.project({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });
      addNode(kind, position);
    },
    [addNode, reactFlowInstance, flowWrapperRef]
  );

  const undo = useCallback(() => {
    setUndo((stack) => {
      if (!stack.length) {
        return stack;
      }
      const previous = stack[stack.length - 1];
      setRedo((redo) => redo.concat([getSnapshot()]));
      setParams(previous.params);
      setNodes(previous.nodes);
      setEdges(previous.edges);
      return stack.slice(0, -1);
    });
  }, [getSnapshot]);

  const redo = useCallback(() => {
    setRedo((stack) => {
      if (!stack.length) {
        return stack;
      }
      const next = stack[stack.length - 1];
      setUndo((undoList) => undoList.concat([getSnapshot()]));
      setParams(next.params);
      setNodes(next.nodes);
      setEdges(next.edges);
      return stack.slice(0, -1);
    });
  }, [getSnapshot]);

  const resetAll = useCallback(() => {
    const snapshot = getSnapshot();
    setUndo((stack) => stack.concat([snapshot]));
    setRedo([]);
    const resetParams = cloneDeep(defaultControllerParams);
    setParams(resetParams);
    setNodes(buildInitialNodes(resetParams));
    setEdges(buildInitialEdges());
    setStatus('Reset to defaults');
  }, [getSnapshot]);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge({ ...connection, animated: true, type: 'default' }, eds));
    },
    [setEdges]
  );

  const serializeNodes = useCallback(
    () =>
      nodes.map<WorkflowNodeSnapshot>((node) => ({
        id: node.id,
        kind: node.data.kind,
        position: cloneDeep(node.position),
      })),
    [nodes]
  );

  const serializeEdges = useCallback(
    () =>
      edges.map<WorkflowEdgeSnapshot>((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        animated: edge.animated,
      })),
    [edges]
  );

  const saveWorkflow = useCallback(async () => {
    const payload: WorkflowFilePayload = {
      version: 1,
      params,
      nodes: serializeNodes(),
      edges: serializeEdges(),
    };
    const result = await window.controllersAPI?.saveWorkflow(payload);
    if (result && !result.canceled && result.filePath) {
      setStatus(`Saved ${result.filePath}`);
    }
  }, [params, serializeEdges, serializeNodes]);

  const openWorkflow = useCallback(async () => {
    const result = await window.controllersAPI?.openWorkflow();
    if (!result || result.canceled || !result.data) {
      return;
    }
    const snapshot = getSnapshot();
    setUndo((stack) => stack.concat([snapshot]));
    setRedo([]);
    const payload = result.data;
    setParams(payload.params);
    if (payload.nodes?.length) {
      setNodes(
        payload.nodes.map((node) =>
          createNode(node.kind, payload.params, {
            id: node.id,
            position: cloneDeep(node.position),
            updateParam,
          })
        )
      );
    } else {
      setNodes(buildInitialNodes(payload.params));
    }
    if (payload.edges?.length) {
      setEdges(
        payload.edges.map((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          animated: edge.animated,
          type: 'default',
        }))
      );
    } else {
      setEdges(buildInitialEdges());
    }
    setStatus(result.filePath ? `Loaded ${result.filePath}` : 'Workflow loaded');
  }, [getSnapshot]);

  const exportSvg = useCallback(async () => {
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
    setStatus('SVG exported');
  }, []);

  const runWorkflow = useCallback(() => {
    const lines = ['Workflow execution plan'];
    lines.push(`Step ${params.step}: ${params.step >= 4 ? 'full motif suite' : 'limited motif suite'}`);
    lines.push(
      `Square motifs: ${countToggled(params.square)} enabled / 8, subdivisions ${params.square.subdivisions}`
    );
    lines.push(`Radius ${params.flow.circleRadius.toFixed(2)} with ${params.flow.polygonSides}-gon dividers`);
    lines.push(
      params.flow.enablePush
        ? `Push motif "${params.flow.pushMotif}" @ ${params.flow.pushAmount.toFixed(2)}`
        : 'Push disabled'
    );
    lines.push(
      params.flow.enablePull ? `Pull strength ${params.flow.pullAmount.toFixed(2)}` : 'Pull disabled'
    );
    lines.push(
      params.flow.subCenterDepth
        ? `Recursive sub-centers depth ${params.flow.subCenterDepth} (${params.flow.subCenterSides} sides)`
        : 'No sub-centers'
    );
    lines.push(`Node decorations: ${params.flow.nodeDecorationType}, edge ${params.flow.edgeDecorationStyle}`);
    lines.push(
      params.flow.lineDiamondsEnabled
        ? `Line diamonds width ${params.flow.lineDiamondWidth.toFixed(2)}`
        : 'Line diamonds disabled'
    );
    lines.push(
      `Layers: structural ${params.flow.showStructuralLayer ? 'on' : 'off'}, ornament ${
        params.flow.showOrnamentLayer ? 'on' : 'off'
      }`
    );
    lines.push(`Leaf morph α ${(params.leafMorphAlpha * 100).toFixed(0)}%`);
    setLog(lines);
    setStatus('Execution plan generated');
  }, [params]);

  useEffect(() => {
    let mounted = true;
    window.controllersAPI
      ?.requestState()
      .then((state) => {
        if (!mounted || !state) {
          return;
        }
        setParams(state);
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const dispose = window.controllersAPI?.onMenuCommand((command) => {
      if (!command) {
        return;
      }
      switch (command.action) {
        case 'saveWorkflow':
          void saveWorkflow();
          break;
        case 'openWorkflow':
          void openWorkflow();
          break;
        case 'exportSvg':
          void exportSvg();
          break;
        default:
          break;
      }
    });
    return () => dispose?.();
  }, [openWorkflow, saveWorkflow, exportSvg]);

  useEffect(() => {
    updateNodeSummaries(params);
    window.controllersAPI?.updateState(params);
    setStatus(`Updated ${new Date().toLocaleTimeString()}`);
  }, [params, updateNodeSummaries]);

  const onSelectionChange = useCallback((sel: OnSelectionChangeParams) => {
    setSelectedId(sel?.nodes?.[0]?.id ?? null);
  }, []);

  return (
    <div className="workflow-shell">
      <header className="topbar">
        <div className="brand">
          Sullivan Workflow <span className="brand__muted">Node Editor</span>
        </div>
        <div className="status">{status}</div>
        <div className="spacer" />
        <ActionButton label="Open" onClick={openWorkflow} />
        <ActionButton label="Save" onClick={saveWorkflow} />
        <ActionButton label="Undo" onClick={undo} disabled={!undoStack.length} />
        <ActionButton label="Redo" onClick={redo} disabled={!redoStack.length} />
        <ActionButton label="Reset" onClick={resetAll} />
        <ActionButton label="Run" onClick={runWorkflow} />
        <ActionButton label="Export SVG" onClick={exportSvg} />
      </header>
      <main className="workflow-main">
        <div className="canvas" ref={flowWrapperRef}>
          {!hasNodes && (
            <div className="canvas-empty" aria-live="polite">
              <button
                type="button"
                className="canvas-empty__button"
                aria-label="Open node library to add your first stage"
                onClick={() => setLibraryOpen(true)}
              >
                <span className="canvas-empty__icon">+</span>
                <span className="canvas-empty__label">Add your first node</span>
                <span className="canvas-empty__hint">Tap the plus to open the library</span>
              </button>
            </div>
          )}
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView
            fitViewOptions={{ padding: 0.25 }}
            onSelectionChange={onSelectionChange}
            proOptions={{ hideAttribution: true }}
            onInit={(instance) => setReactFlowInstance(instance)}
            onDrop={onDrop}
            onDragOver={onDragOver}
            defaultEdgeOptions={{ type: 'default' }}
          >
            <Panel position="top-right" className="node-fab__panel">
              <button
                className={`node-fab${isLibraryOpen ? ' node-fab--active' : ''}`}
                aria-label="Toggle node library"
                onClick={() => setLibraryOpen((open) => !open)}
              >
                +
              </button>
            </Panel>
            <Controls />
            <MiniMap pannable zoomable />
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
          </ReactFlow>
        </div>
        <aside className="sidebar">
          <PropertyPanel
            node={selectedNode}
            params={params}
            updateParam={updateParam}
            updateStep={updateStep}
            resetNode={resetNode}
          />
          <div className="log">
            {log.map((line, idx) => (
              <div key={`${line}-${idx}`}>{line}</div>
            ))}
          </div>
        </aside>
      </main>
      <NodeLibrary
        open={isLibraryOpen}
        groups={nodeLibraryGroups}
        onClose={() => setLibraryOpen(false)}
        onAdd={handleAddFromLibrary}
      />
    </div>
  );
}

function PropertyPanel({
  node,
  params,
  updateParam,
  updateStep,
  resetNode,
}: {
  node: Node<NodeData> | null;
  params: ControllerParams;
  updateParam: (path: string, value: boolean | number | string) => void;
  updateStep: (value: number) => void;
  resetNode: (kind: WorkflowNodeKind) => void;
}) {
  if (!node) {
    return <div className="panel panel-empty">Select a stage to edit parameters.</div>;
  }

  const { kind } = node.data;

  return (
    <div className="panel">
      <div className="panel__header">
        <div>
          <div className="panel__title">{node.data.title}</div>
          {node.data.subtitle && <div className="panel__subtitle">{node.data.subtitle}</div>}
        </div>
        <button className="btn btn--ghost" onClick={() => resetNode(kind)}>
          Reset stage
        </button>
      </div>
      <div className="panel__body">
        {renderFields(kind, params, updateParam, updateStep)}
      </div>
    </div>
  );
}

interface NodeLibraryProps {
  open: boolean;
  groups: NodeLibraryGroup[];
  onClose: () => void;
  onAdd: (kind: WorkflowNodeKind) => void;
}

function NodeLibrary({ open, groups, onClose, onAdd }: NodeLibraryProps) {
  const dragStart = (event: React.DragEvent<HTMLDivElement>, kind: WorkflowNodeKind) => {
    event.dataTransfer.setData('application/workflow-kind', kind);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <>
      <div className={`node-library__overlay${open ? ' node-library__overlay--visible' : ''}`} onClick={onClose} />
      <aside className={`node-library${open ? ' node-library--open' : ''}`}>
        <div className="node-library__hdr">
          <div>
            <div className="node-library__title">Node Library</div>
            <div className="node-library__subtitle">Drag or click to add new stages</div>
          </div>
          <button className="btn btn--ghost" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="node-library__list">
          {groups.map((group) => (
            <div key={group.title} className="node-library__group">
              <div className="node-library__group-hdr">
                <div className="node-library__group-title">{group.title}</div>
                {group.subtitle ? <div className="node-library__group-subtitle">{group.subtitle}</div> : null}
              </div>
              <div className="node-library__items">
                {group.entries.map((node) => (
                  <div
                    key={node.kind}
                    className="node-library__item"
                    draggable
                    onDragStart={(event) => dragStart(event, node.kind)}
                  >
                    <div className="node-library__icon" style={{ color: node.tint }}>
                      {node.icon}
                    </div>
                    <div className="node-library__meta">
                      <div className="node-library__name">{node.title}</div>
                      {node.subtitle && <div className="node-library__hint">{node.subtitle}</div>}
                    </div>
                    <button className="btn btn--small" onClick={() => onAdd(node.kind)}>
                      Add
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </aside>
    </>
  );
}

function renderFields(
  kind: WorkflowNodeKind,
  params: ControllerParams,
  updateParam: (path: string, value: boolean | number | string) => void,
  updateStep: (value: number) => void
): JSX.Element | null {
  switch (kind) {
    case 'preset':
      return (
        <>
          <RangeField
            label="Plate step"
            value={params.step}
            min={0}
            max={7}
            step={1}
            onChange={(value) => updateStep(Math.round(value))}
            format={(value) => `Step ${value}`}
          />
          <small className="help">
            Steps progressively enable motifs. Adjusting the slider reapplies the recommended preset.
          </small>
        </>
      );
    case 'square':
      return (
        <>
          <RangeField
            label="Inner margin"
            value={params.square.innerMargin}
            min={0}
            max={0.9}
            step={0.01}
            onChange={(value) => updateParam('square.innerMargin', parseFloat(value.toFixed(2)))}
            format={(value) => value.toFixed(2)}
          />
          <RangeField
            label="Subdivisions"
            value={params.square.subdivisions}
            min={2}
            max={12}
            step={1}
            onChange={(value) => updateParam('square.subdivisions', Math.round(value))}
          />
          <div className="toggle-grid">
            {([
              ['square.showOuterFrame', 'Outer frame'],
              ['square.showInnerFrame', 'Inner frame'],
              ['square.showCenterCross', 'Center cross'],
              ['square.showDiagonals', 'Diagonals'],
              ['square.showSubdivisionGrid', 'Subdivision grid'],
              ['square.showInscribedCircle', 'Inscribed circle'],
              ['square.showDiamondSquare', 'Diamond square'],
              ['square.showQuarterArcs', 'Quarter arcs'],
            ] as const).map(([path, label]) => (
              <ToggleField
                key={path}
                label={label}
                checked={Boolean(getByPath(params, path))}
                onChange={(value) => updateParam(path, value)}
              />
            ))}
          </div>
        </>
      );
    case 'circle':
      return (
        <>
          <RangeField
            label="Radius"
            value={params.flow.circleRadius}
            min={0.3}
            max={0.95}
            step={0.01}
            onChange={(value) => updateParam('flow.circleRadius', parseFloat(value.toFixed(2)))}
            format={(value) => value.toFixed(2)}
          />
          <div className="toggle-grid">
            <ToggleField
              label="Show base circle"
              checked={params.flow.showBaseCircle}
              onChange={(value) => updateParam('flow.showBaseCircle', value)}
            />
            <ToggleField
              label="Show cross"
              checked={params.flow.showCross}
              onChange={(value) => updateParam('flow.showCross', value)}
            />
          </div>
          <div className="info-list">
            <div className="info-list__title">Outputs</div>
            <ul>
              <li>Points (center + perimeter sample points)</li>
              <li>Lines (rays, diameter lines, polygon edges)</li>
            </ul>
          </div>
        </>
      );
    case 'polygon':
      return (
        <>
          <RangeField
            label="Polygon sides"
            value={params.flow.polygonSides}
            min={3}
            max={12}
            step={1}
            onChange={(value) => updateParam('flow.polygonSides', Math.round(value))}
          />
          <RangeField
            label="Rotation"
            value={params.flow.polygonRotation}
            min={0}
            max={90}
            step={1}
            onChange={(value) => updateParam('flow.polygonRotation', Math.round(value))}
            onShiftSnap={(value) =>
              snapRotationToSymmetry(value, params.flow.polygonSides, params.flow.radialMultiplier, 0, 90)
            }
            format={(value) => `${value}°`}
          />
          <RangeField
            label="Radial multiplier"
            value={params.flow.radialMultiplier}
            min={1}
            max={4}
            step={1}
            onChange={(value) => updateParam('flow.radialMultiplier', Math.round(value))}
            format={(value) => `×${value}`}
          />
          <div className="toggle-grid">
            <ToggleField
              label="Show polygon"
              checked={params.flow.showPolygon}
              onChange={(value) => updateParam('flow.showPolygon', value)}
            />
            <ToggleField
              label="Show radials"
              checked={params.flow.showRadials}
              onChange={(value) => updateParam('flow.showRadials', value)}
            />
          </div>
          <div className="info-list">
            <div className="info-list__title">Outputs</div>
            <ul>
              <li>Polygon vertices (circle touch points)</li>
              <li>Edges (lines between vertices)</li>
              <li>Radials (symmetry energy lines)</li>
            </ul>
          </div>
        </>
      );
    case 'energy':
      return (
        <>
          <ToggleField
            label="Enable push"
            checked={params.flow.enablePush}
            onChange={(value) => updateParam('flow.enablePush', value)}
          />
          <RangeField
            label="Push amount"
            value={params.flow.pushAmount}
            min={0}
            max={1}
            step={0.01}
            onChange={(value) => updateParam('flow.pushAmount', parseFloat(value.toFixed(2)))}
            format={(value) => value.toFixed(2)}
          />
          <SelectField
            label="Push motif"
            value={params.flow.pushMotif}
            onChange={(value) => updateParam('flow.pushMotif', value)}
            options={[
              { value: 'square', label: 'Square' },
              { value: 'diamond', label: 'Diamond' },
              { value: 'lobe', label: 'Lobe' },
              { value: 'pyramid', label: 'Pyramid' },
            ]}
          />
          <ToggleField
            label="Enable pull"
            checked={params.flow.enablePull}
            onChange={(value) => updateParam('flow.enablePull', value)}
          />
          <RangeField
            label="Pull amount"
            value={params.flow.pullAmount}
            min={0}
            max={1}
            step={0.01}
            onChange={(value) => updateParam('flow.pullAmount', parseFloat(value.toFixed(2)))}
            format={(value) => value.toFixed(2)}
          />
        </>
      );
    case 'subcenter':
      return (
        <>
          <RangeField
            label="Recursion depth"
            value={params.flow.subCenterDepth}
            min={0}
            max={3}
            step={1}
            onChange={(value) => updateParam('flow.subCenterDepth', Math.round(value))}
          />
          <RangeField
            label="Sub-center radius"
            value={params.flow.subCenterRadius}
            min={0.1}
            max={0.6}
            step={0.01}
            onChange={(value) => updateParam('flow.subCenterRadius', parseFloat(value.toFixed(2)))}
            format={(value) => value.toFixed(2)}
          />
          <RangeField
            label="Sub-center sides"
            value={params.flow.subCenterSides}
            min={3}
            max={8}
            step={1}
            onChange={(value) => updateParam('flow.subCenterSides', Math.round(value))}
          />
          <ToggleField
            label="Radiate each sub-center"
            checked={params.flow.radiateSubCenters}
            onChange={(value) => updateParam('flow.radiateSubCenters', value)}
          />
        </>
      );
    case 'ornament':
      return (
        <>
          <SelectField
            label="Node decoration"
            value={params.flow.nodeDecorationType}
            onChange={(value) => updateParam('flow.nodeDecorationType', value)}
            options={[
              { value: 'none', label: 'None' },
              { value: 'circle', label: 'Circle' },
              { value: 'square', label: 'Square' },
              { value: 'petal', label: 'Petal' },
              { value: 'custom', label: 'Custom' },
            ]}
          />
          <RangeField
            label="Node size"
            value={params.flow.nodeSize}
            min={0.05}
            max={0.5}
            step={0.01}
            onChange={(value) => updateParam('flow.nodeSize', parseFloat(value.toFixed(2)))}
            format={(value) => value.toFixed(2)}
          />
          <SelectField
            label="Edge style"
            value={params.flow.edgeDecorationStyle}
            onChange={(value) => updateParam('flow.edgeDecorationStyle', value)}
            options={[
              { value: 'straight', label: 'Straight' },
              { value: 'arched', label: 'Arched' },
              { value: 'double', label: 'Double line' },
            ]}
          />
          <RangeField
            label="Edge bulge"
            value={params.flow.edgeBulge}
            min={0}
            max={1}
            step={0.01}
            onChange={(value) => updateParam('flow.edgeBulge', parseFloat(value.toFixed(2)))}
            format={(value) => value.toFixed(2)}
          />
          <RangeField
            label="Edge repeat"
            value={params.flow.edgeRepeat}
            min={0}
            max={8}
            step={1}
            onChange={(value) => updateParam('flow.edgeRepeat', Math.round(value))}
          />
          <RangeField
            label="Line weight"
            value={params.flow.lineWeight}
            min={0.4}
            max={4}
            step={0.1}
            onChange={(value) => updateParam('flow.lineWeight', parseFloat(value.toFixed(1)))}
            format={(value) => value.toFixed(1)}
          />
          <ToggleField
            label="Enable line diamonds"
            checked={params.flow.lineDiamondsEnabled}
            onChange={(value) => updateParam('flow.lineDiamondsEnabled', value)}
          />
          <RangeField
            label="Diamond width"
            value={params.flow.lineDiamondWidth}
            min={0.05}
            max={0.6}
            step={0.01}
            onChange={(value) => updateParam('flow.lineDiamondWidth', parseFloat(value.toFixed(2)))}
            format={(value) => value.toFixed(2)}
          />
        </>
      );
    case 'layers':
      return (
        <div className="toggle-grid">
          <ToggleField
            label="Structural layer"
            checked={params.flow.showStructuralLayer}
            onChange={(value) => updateParam('flow.showStructuralLayer', value)}
          />
          <ToggleField
            label="Ornament layer"
            checked={params.flow.showOrnamentLayer}
            onChange={(value) => updateParam('flow.showOrnamentLayer', value)}
          />
        </div>
      );
    case 'leaf':
      return (
        <RangeField
          label="Leaf morph α"
          value={params.leafMorphAlpha}
          min={0}
          max={1}
          step={0.01}
          onChange={(value) => updateParam('leafMorphAlpha', parseFloat(value.toFixed(2)))}
          format={(value) => `${Math.round(value * 100)}%`}
        />
      );
    default:
      return null;
  }
}

function RangeField({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
  onShiftSnap,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
  onShiftSnap?: (value: number) => number;
}) {
  const [shiftPressed, setShiftPressed] = useState(false);

  useEffect(() => {
    if (!onShiftSnap) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Shift') {
        setShiftPressed(true);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Shift') {
        setShiftPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [!!onShiftSnap]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = parseFloat(event.target.value);
    const nextValue = onShiftSnap && shiftPressed ? onShiftSnap(rawValue) : rawValue;
    onChange(nextValue);
  };

  return (
    <div className="field field--range">
      <div className="field__label">
        <span>{label}</span>
        <span className="field__value">{format ? format(value) : value}</span>
      </div>
      <input type="range" value={value} min={min} max={max} step={step} onChange={handleChange} />
    </div>
  );
}

function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="select">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ActionButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void | Promise<void>;
  disabled?: boolean;
}) {
  return (
    <button className="btn" onClick={() => onClick()} disabled={disabled} type="button">
      {label}
    </button>
  );
}

function buildInitialNodes(_: ControllerParams): Node<NodeData>[] {
  return [];
}

function buildInitialEdges(): Edge[] {
  return [];
}

function createNode(
  kind: WorkflowNodeKind,
  params: ControllerParams,
  options?: { id?: string; position?: XYPosition; updateParam?: (path: string, value: boolean | number | string) => void }
): Node<NodeData> {
  const template = blueprintByKind[kind];
  const position = options?.position ?? { ...(template?.position ?? { x: 0, y: 0 }) };

  if (kind === 'polygon') {
    const polygonParams = extractPolygonParams(params);
    return {
      id: options?.id ?? createNodeId(kind),
      type: 'polygonField',
      position,
      data: {
        title: template?.title ?? kind,
        subtitle: template?.subtitle,
        icon: template?.icon ?? '•',
        tint: template?.tint ?? '#7ce6ff',
        kind,
        summary: summarizeNode(kind, params),
        type: 'polygon-field',
        params: polygonParams,
        onChange: {
          sides: (value) => options?.updateParam?.('flow.polygonSides', Math.round(value)),
          radius: (value) => options?.updateParam?.('flow.circleRadius', value),
          rotation: (value) => options?.updateParam?.('flow.polygonRotation', Math.round(value)),
          radialMultiplier: (value) => options?.updateParam?.('flow.radialMultiplier', Math.round(value)),
          showPolygon: (value) => options?.updateParam?.('flow.showPolygon', value),
          showRadials: (value) => options?.updateParam?.('flow.showRadials', value),
        },
      },
    };
  }

  return {
    id: options?.id ?? createNodeId(kind),
    type: 'workflow',
    position,
    data: {
      title: template?.title ?? kind,
      subtitle: template?.subtitle,
      icon: template?.icon ?? '•',
      tint: template?.tint ?? '#7ce6ff',
      kind,
      summary: summarizeNode(kind, params),
    },
  };
}

function createNodeId(kind: WorkflowNodeKind): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${kind}-${crypto.randomUUID()}`;
  }
  return `${kind}-${Math.random().toString(36).slice(2, 8)}`;
}

function extractPolygonParams(params: ControllerParams) {
  return {
    sides: params.flow.polygonSides,
    radius: params.flow.circleRadius,
    rotation: params.flow.polygonRotation,
    radialMultiplier: params.flow.radialMultiplier,
    showPolygon: params.flow.showPolygon,
    showRadials: params.flow.showRadials,
  };
}

function summarizeNode(kind: WorkflowNodeKind, params: ControllerParams): string[] {
  const builder = summaryBuilders[kind];
  if (!builder) {
    return [];
  }
  const result = builder(params);
  return Array.isArray(result) ? result : [];
}

function snapRotationToSymmetry(
  value: number,
  sides: number,
  radialMultiplier: number,
  min: number,
  max: number
): number {
  const axisCount = Math.max(1, Math.round(sides * radialMultiplier));
  const increment = 360 / axisCount;
  const snapped = Math.round(value / increment) * increment;
  return clamp(snapped, min, max);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function countToggled(square: ControllerParams['square']): number {
  return Object.entries(square).filter(([, value]) => typeof value === 'boolean' && value).length;
}

function getByPath(obj: unknown, path: string): any {
  return path.split('.').reduce((acc: any, segment) => acc?.[segment], obj as any);
}

function setByPath(obj: unknown, path: string, value: any): void {
  const segments = path.split('.');
  let cursor: any = obj;
  for (let i = 0; i < segments.length - 1; i += 1) {
    cursor = cursor[segments[i]];
  }
  cursor[segments[segments.length - 1]] = value;
}

function cloneDeep<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function cloneValue<T>(value: T): T {
  return cloneDeep(value);
}

function applyStepPreset(params: ControllerParams): void {
  const { step } = params;
  const toggles = {
    showOuterFrame: step >= 1,
    showInnerFrame: step >= 2,
    showCenterCross: step >= 3,
    showDiagonals: step >= 4,
    showInscribedCircle: step >= 5,
    showDiamondSquare: step >= 6,
    showQuarterArcs: step >= 7,
    showSubdivisionGrid: step >= 7,
  };
  (Object.keys(toggles) as Array<keyof typeof toggles>).forEach((key) => {
    params.square[key] = toggles[key];
  });
}

const container = document.getElementById('root');
if (!container) {
  throw new Error('Missing root element');
}

const root = createRoot(container);
root.render(<App />);

