import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { ControllerParams } from '../types/controls';

contextBridge.exposeInMainWorld('previewAPI', {
  requestState: (): Promise<ControllerParams> => ipcRenderer.invoke('preview:get-state'),
  onParams: (callback: (params: ControllerParams) => void): (() => void) => {
    const handler = (_event: IpcRendererEvent, params: ControllerParams) => callback(params);
    ipcRenderer.on('preview:update', handler);
    return () => {
      ipcRenderer.removeListener('preview:update', handler);
    };
  },
});

