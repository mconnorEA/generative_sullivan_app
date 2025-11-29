import { ControllerParams } from './controls';

interface ControllerMenuCommand {
  action: string;
  payload?: string;
}

interface ControllersBridge {
  requestState(): Promise<ControllerParams>;
  updateState(params: ControllerParams): void;
  requestCurrentSvg(): Promise<string>;
  onMenuCommand(callback: (command: ControllerMenuCommand) => void): void;
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

