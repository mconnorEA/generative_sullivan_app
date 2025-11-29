import { ControllerParams } from './controls';

export type WorkflowNodeKind =
  | 'preset'
  | 'square'
  | 'circle'
  | 'polygon'
  | 'energy'
  | 'subcenter'
  | 'ornament'
  | 'layers'
  | 'leaf';

export interface WorkflowNodeSnapshot {
  id: string;
  kind: WorkflowNodeKind;
  position: { x: number; y: number };
}

export interface WorkflowEdgeSnapshot {
  id: string;
  source: string;
  target: string;
  animated?: boolean;
}

export interface WorkflowFilePayload {
  version: number;
  params: ControllerParams;
  nodes: WorkflowNodeSnapshot[];
  edges: WorkflowEdgeSnapshot[];
}

export interface WorkflowFileDialogResult {
  canceled: boolean;
  filePath?: string;
}

export interface WorkflowFileOpenResult extends WorkflowFileDialogResult {
  data?: WorkflowFilePayload;
}


