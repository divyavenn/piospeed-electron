import { contextBridge, ipcRenderer } from 'electron';

// Define the exposed API types
interface ElectronAPI {
  selectSolverPath: () => Promise<string | null>;
  getSolverPath: () => Promise<string | null>;
  selectFile: (options: { filters?: { name: string; extensions: string[] }[] }) => Promise<string | null>;
  selectFolder: () => Promise<string | null>;
  runSolverCommand: (params: { solverPath: string; command: string; args: string[] }) => Promise<any>;
  saveFolderPath: (params: { key: string; path: string }) => Promise<boolean>;
  getFolderPath: (params: { key: string }) => Promise<string | null>;
  onSolverOutput: (callback: (data: string) => void) => void;
  onSolverError: (callback: (data: string) => void) => void;
}

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electron', {
  // File operations
  selectSolverPath: () => ipcRenderer.invoke('select-solver-path'),
  getSolverPath: () => ipcRenderer.invoke('get-solver-path'),
  selectFile: (options) => ipcRenderer.invoke('select-file', options),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  
  // Solver operations
  runSolverCommand: (params) => ipcRenderer.invoke('run-solver-command', params),
  
  // Store operations
  saveFolderPath: (params) => ipcRenderer.invoke('save-folder-path', params),
  getFolderPath: (params) => ipcRenderer.invoke('get-folder-path', params),
  
  // Event listeners
  onSolverOutput: (callback) => {
    ipcRenderer.on('solver-output', (_event, data) => callback(data));
  },
  onSolverError: (callback) => {
    ipcRenderer.on('solver-error', (_event, data) => callback(data));
  }
} as ElectronAPI);

// Let the renderer know preload script has loaded
window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector: string, text: string) => {
    const element = document.getElementById(selector);
    if (element) element.innerText = text;
  };

  for (const dependency of ['chrome', 'node', 'electron']) {
    replaceText(`${dependency}-version`, process.versions[dependency] || 'unknown');
  }
}); 