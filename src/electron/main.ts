import { app, BrowserWindow, ipcMain, Menu, MenuItemConstructorOptions, dialog } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import { ControllerParams, defaultControllerParams } from '../types/controls';
import { WorkflowFilePayload } from '../types/workflow';

let controllerWindow: BrowserWindow | null = null;
let previewWindow: BrowserWindow | null = null;
let currentParams: ControllerParams = { ...defaultControllerParams };

function createControllerWindow(): void {
  controllerWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    resizable: true,
    title: 'Sullivan Controls',
    webPreferences: {
      preload: path.join(__dirname, 'preloadControllers.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  controllerWindow.on('closed', () => {
    controllerWindow = null;
  });

  controllerWindow.loadFile(resolvePublicAsset('controllers.html'));
}

function createPreviewWindow(): void {
  previewWindow = new BrowserWindow({
    width: 860,
    height: 920,
    title: 'Sullivan Preview',
    webPreferences: {
      preload: path.join(__dirname, 'preloadPreview.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  previewWindow.on('closed', () => {
    previewWindow = null;
  });

  previewWindow.loadFile(resolvePublicAsset('preview.html'));
}

function resolvePublicAsset(fileName: string): string {
  return path.join(__dirname, '../../public', fileName);
}

function createWindows(): void {
  createControllerWindow();
  createPreviewWindow();
}

function buildMenu(): void {
  const fileMenu: MenuItemConstructorOptions = {
    label: 'File',
    submenu: [
      {
        label: 'Open Workflow…',
        accelerator: 'CmdOrCtrl+O',
        click: () => sendControllerCommand('openWorkflow'),
      },
      {
        label: 'Save Workflow…',
        accelerator: 'CmdOrCtrl+S',
        click: () => sendControllerCommand('saveWorkflow'),
      },
      {
        label: 'Export Current SVG',
        accelerator: 'CmdOrCtrl+Shift+E',
        click: () => sendControllerCommand('exportSvg'),
      },
      { type: 'separator' },
      { role: 'quit' },
    ],
  };

  const template: MenuItemConstructorOptions[] = [
    fileMenu,
    { role: 'editMenu' },
    { role: 'viewMenu' },
    { role: 'windowMenu' },
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  createWindows();
  buildMenu();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindows();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.on('controller:update', (_event, params: ControllerParams) => {
  currentParams = { ...params };
  if (previewWindow) {
    previewWindow.webContents.send('preview:update', currentParams);
  }
});

ipcMain.handle('controller:get-state', () => currentParams);
ipcMain.handle('preview:get-state', () => currentParams);
ipcMain.handle('controller:export-svg', async () => {
  if (!previewWindow) {
    return '';
  }
  return previewWindow.webContents.executeJavaScript('window.exportCurrentSvg?.() ?? ""', true);
});

ipcMain.handle('workflow:save', async (_event, payload: WorkflowFilePayload) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Save Workflow',
    defaultPath: 'workflow.json',
    filters: [{ name: 'Workflow', extensions: ['json'] }],
  });
  if (canceled || !filePath) {
    return { canceled: true };
  }
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf8');
  return { canceled: false, filePath };
});

ipcMain.handle('workflow:open', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Workflow', extensions: ['json'] }],
  });
  if (canceled || !filePaths?.length) {
    return { canceled: true };
  }
  const filePath = filePaths[0];
  const raw = await fs.readFile(filePath, 'utf8');
  const data = JSON.parse(raw) as WorkflowFilePayload;
  return { canceled: false, filePath, data };
});

function sendControllerCommand(action: string, payload?: string): void {
  if (controllerWindow) {
    controllerWindow.webContents.send('controllers:command', { action, payload });
  }
}

