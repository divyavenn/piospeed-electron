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
  openFile: () => Promise<string | null>;
  saveFile: (content: string) => Promise<boolean>;
  selectSolverPath: () => Promise<string | null>;
  getSolverPath: () => Promise<string | null>;
  selectFile: (options: { filters?: { name: string; extensions: string[] }[] }) => Promise<string | null>;
  selectFolder: () => Promise<string | null>;
  
  // Python bridge operations
  initSolver: (solverPath: string) => Promise<any>;
  executeCommand: (solverPath: string, command: string, args: any) => Promise<any>;
  getCommands: () => Promise<any>;
  sendInputToPython: (input: string) => Promise<any>;
  
  // Store operations
  saveFolderPath: (params: { key: string; path: string }) => Promise<boolean>;
  getFolderPath: (params: { key: string }) => Promise<string | null>;
  
  // Python event listeners
  onPythonOutput: (callback: (output: any) => void) => void;
  onPythonError: (callback: (error: any) => void) => void;
  onPythonStepUpdate: (callback: (step: any) => void) => void;
  onPythonRequestInput: (callback: (data: any) => void) => void;
  onPythonInitComplete: (callback: (data: any) => void) => void;
  onPythonCommandComplete: (callback: (data: any) => void) => void;
  onPythonCommands: (callback: (commands: any) => void) => void;
  onPythonInputReceived: (callback: (data: any) => void) => void;
  sendSolverPath: (path: string) => void;
}

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electron', {
  // File operations
  openFile: () => ipcRenderer.invoke('open-file'),
  saveFile: (content: string) => ipcRenderer.invoke('save-file', content),
  selectSolverPath: () => ipcRenderer.invoke('select-solver-path'),
  getSolverPath: () => ipcRenderer.invoke('get-solver-path'),
  selectFile: (options) => ipcRenderer.invoke('select-file', options),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  
  // Python bridge operations
  initSolver: (solverPath) => ipcRenderer.invoke('init-solver', solverPath),
  executeCommand: (solverPath, command, args) => ipcRenderer.invoke('execute-command', solverPath, command, args),
  getCommands: () => ipcRenderer.invoke('get-commands'),
  sendInputToPython: (input) => ipcRenderer.invoke('send-input-to-python', input),
  
  // Store operations
  saveFolderPath: (params) => ipcRenderer.invoke('save-folder-path', params),
  getFolderPath: (params) => ipcRenderer.invoke('get-folder-path', params),
  
  // Python event listeners
  onPythonOutput: (callback) => {
    const listener = (_: any, output: any) => callback(output);
    ipcRenderer.on('python:output', listener);
    return () => ipcRenderer.removeListener('python:output', listener);
  },
  onPythonError: (callback) => {
    const listener = (_: any, error: any) => callback(error);
    ipcRenderer.on('python:error', listener);
    return () => ipcRenderer.removeListener('python:error', listener);
  },
  onPythonStepUpdate: (callback) => {
    const listener = (_: any, step: any) => callback(step);
    ipcRenderer.on('python:step-update', listener);
    return () => ipcRenderer.removeListener('python:step-update', listener);
  },
  onPythonRequestInput: (callback) => {
    const listener = (_: any, data: any) => callback(data);
    ipcRenderer.on('python:request-input', listener);
    return () => ipcRenderer.removeListener('python:request-input', listener);
  },
  onPythonInitComplete: (callback) => {
    const listener = (_: any, data: any) => callback(data);
    ipcRenderer.on('python:init-complete', listener);
    return () => ipcRenderer.removeListener('python:init-complete', listener);
  },
  onPythonCommandComplete: (callback) => {
    const listener = (_: any, data: any) => callback(data);
    ipcRenderer.on('python:command-complete', listener);
    return () => ipcRenderer.removeListener('python:command-complete', listener);
  },
  onPythonCommands: (callback) => {
    const listener = (_: any, commands: any) => callback(commands);
    ipcRenderer.on('python:commands', listener);
    return () => ipcRenderer.removeListener('python:commands', listener);
  },
  onPythonInputReceived: (callback) => {
    const listener = (_: any, data: any) => callback(data);
    ipcRenderer.on('python:input-received', listener);
    return () => ipcRenderer.removeListener('python:input-received', listener);
  },
  // Menu event listeners
  onMenuSelectSolver: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('menu:select-solver', listener);
    return () => ipcRenderer.removeListener('menu:select-solver', listener);
  },
  sendSolverPath: (path) => ipcRenderer.send('send-solver-path', path)
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