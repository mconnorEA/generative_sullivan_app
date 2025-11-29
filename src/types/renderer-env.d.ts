import { ControllerParams } from './controls';
import { WorkflowFileDialogResult, WorkflowFileOpenResult, WorkflowFilePayload } from './workflow';

interface ControllerMenuCommand {
  action: string;
  payload?: string;
}

interface ControllersBridge {
  requestState(): Promise<ControllerParams>;
  updateState(params: ControllerParams): void;
  requestCurrentSvg(): Promise<string>;
  saveWorkflow(payload: WorkflowFilePayload): Promise<WorkflowFileDialogResult>;
  openWorkflow(): Promise<WorkflowFileOpenResult>;
  onMenuCommand(callback: (command: ControllerMenuCommand) => void): () => void;
}

interface PreviewBridge {
  requestState(): Promise<ControllerParams>;
  onParams(callback: (params: ControllerParams) => void): () => void;
}

declare global {
  interface Window {
    controllersAPI?: ControllersBridge;
    previewAPI?: PreviewBridge;
    exportCurrentSvg?: () => string;
  }
}

export {};

