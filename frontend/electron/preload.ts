import { contextBridge, ipcRenderer } from 'electron';

// Define the Python request input interface
interface PyRequestInput {
  type: 'request_input';
  input_type: 'text' | 'file' | 'directory' | 'command';
  prompt?: string;
  default_location?: string;
  commands?: string[];
}

// Define the exposed API types
interface ElectronAPI {
  // File operations
  selectSolverPath: () => Promise<string | null>;
  selectFile: (options: { filters?: { name: string; extensions: string[] }[] }) => Promise<string | null>;
  selectFolder: () => Promise<string | null>;
  
  // Store operations
  saveFolderPath: (params: { key: string; path: string }) => Promise<boolean>;
  getFolderPath: (params: { key: string }) => Promise<string | null>;
  getFilePath: (params: { key: string }) => Promise<string | null>;
  getSolverPath: () => Promise<string | null>;
  
  // Python bridge operations
  sendSolverPath: (path: string) => void;
  onPythonMessage: (callback: (data: any) => void) => void;
  removePythonMessageListener: (callback: (data: any) => void) => void;
}

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electron', {
  // File operations
  selectSolverPath: () => ipcRenderer.invoke('select-solver-path'),
  selectFile: (options) => ipcRenderer.invoke('select-file', options),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  
  // Store operations
  saveFolderPath: (params) => ipcRenderer.invoke('save-folder-path', params),
  getFolderPath: (params) => ipcRenderer.invoke('get-folder-path', params),
  getSolverPath: () => ipcRenderer.invoke('get-solver-path'),
  
  // Python bridge operations
  sendSolverPath: (path) => ipcRenderer.send('send-solver-path', path),
  onPythonMessage: (callback: (data: any) => void) => {
    ipcRenderer.on('python-message', (_, data) => callback(data));
  },
  removePythonMessageListener: (callback: (data: any) => void) => {
    ipcRenderer.removeListener('python-message', callback);
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