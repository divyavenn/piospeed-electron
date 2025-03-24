import { contextBridge, ipcRenderer } from 'electron';

interface ElectronAPI {
  selectSolverPath: () => Promise<string | null>;
  selectFolder: () => Promise<string | null>;
  selectFile: (options?: { filters?: { name: string; extensions: string[] }[] }) => Promise<string | null>;
  getSolverPath: () => Promise<string | null>;
  getFolderPath: (options: { key: string }) => Promise<string | null>;
  saveFolderPath: (options: { key: string; path: string }) => Promise<void>;
  sendSolverPath: (path: string) => void;
}

const api: ElectronAPI = {
  selectSolverPath: () => ipcRenderer.invoke('select-solver-path'),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  selectFile: (options) => ipcRenderer.invoke('select-file', options),
  getSolverPath: () => ipcRenderer.invoke('get-solver-path'),
  getFolderPath: (options) => ipcRenderer.invoke('get-folder-path', options),
  saveFolderPath: (options) => ipcRenderer.invoke('save-folder-path', options),
  sendSolverPath: (path) => ipcRenderer.send('send-solver-path', path),
};

contextBridge.exposeInMainWorld('electron', api); 