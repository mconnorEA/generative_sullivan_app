import { contextBridge, ipcRenderer } from 'electron';
import { ControllerParams } from '../types/controls';
import { WorkflowFileDialogResult, WorkflowFileOpenResult, WorkflowFilePayload } from '../types/workflow';

contextBridge.exposeInMainWorld('controllersAPI', {
  requestState: (): Promise<ControllerParams> => ipcRenderer.invoke('controller:get-state'),
  updateState: (params: ControllerParams): void => {
    ipcRenderer.send('controller:update', params);
  },
  requestCurrentSvg: (): Promise<string> => ipcRenderer.invoke('controller:export-svg'),
  saveWorkflow: (payload: WorkflowFilePayload): Promise<WorkflowFileDialogResult> =>
    ipcRenderer.invoke('workflow:save', payload),
  openWorkflow: (): Promise<WorkflowFileOpenResult> => ipcRenderer.invoke('workflow:open'),
  onMenuCommand: (callback: (command: { action: string; payload?: string }) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, command: { action: string; payload?: string }) =>
      callback(command);
    ipcRenderer.on('controllers:command', handler);
    return () => ipcRenderer.removeListener('controllers:command', handler);
  },
});

