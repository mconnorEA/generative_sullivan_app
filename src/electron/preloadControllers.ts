import { contextBridge, ipcRenderer } from 'electron';
import { ControllerParams } from '../types/controls';

contextBridge.exposeInMainWorld('controllersAPI', {
  requestState: (): Promise<ControllerParams> => ipcRenderer.invoke('controller:get-state'),
  updateState: (params: ControllerParams): void => {
    ipcRenderer.send('controller:update', params);
  },
  requestCurrentSvg: (): Promise<string> => ipcRenderer.invoke('controller:export-svg'),
  onMenuCommand: (callback: (command: { action: string; payload?: string }) => void): void => {
    ipcRenderer.on('controllers:command', (_event, command) => callback(command));
  },
});

