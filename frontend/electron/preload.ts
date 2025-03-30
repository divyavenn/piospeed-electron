import { contextBridge, ipcRenderer } from 'electron';
import { AppSettings } from '../src/components/Settings/SettingsModal';

// any components that subscribe to these events will be notified of whenever it changes
// React UI → preload.ts → ipcHandlers.ts → messageQueue.ts → Python bridge.py

interface ElectronAPI {
  // Python bridge operations
  sendToPython: (message: any) => Promise<void>;
  onPythonMessage: (callback: (data: any) => void) => void;
  removePythonMessageListener: (callback: (data: any) => void) => void;
  
  // Connection state operations
  getConnectionState: () => Promise<number>;
  onConnectionStateChange: (callback: (state: number) => void) => void;
  removeConnectionStateListener: (callback: (state: number) => void) => void;

  // Settings operations
  retrieveSettings: () => Promise<{settings : AppSettings}>;
  setSettings: (settings: Partial<AppSettings>) => Promise<{ success: boolean; error?: string }>;
  
  // Store operations
  getSettings: () => Promise<any>;
  saveSettings: (settings: any) => Promise<any>;

  // Path methods
  setSolverPath: (path: string) => Promise<void>;
  setResultsPath: (path: string) => Promise<void>;
  setAccuracy: (accuracy: any) => Promise<void>;
  onAccuracyUpdated: (callback: (value: any) => void) => void;
  removeAccuracyListener: (callback: (value: any) => void) => void;

  // File dialog operations
  selectPath: (options?: { 
    type?: 'file' | 'directory' | 'both';
    defaultPath?: string;
    title?: string;
    filters?: { name: string; extensions: string[] }[];
  }) => Promise<string | null>;

  // Error dialog operations
  showError: (message: string) => Promise<void>;
}

// exposes a set of functions to the renderer process (the React app) under the global variable electron
contextBridge.exposeInMainWorld('electron', {

  //Sends a message to the Python backend via IPC, wait for confirmation
  sendToPython: (message) => ipcRenderer.invoke('send-to-python', message), 

  // sets up a python listener for messages
  onPythonMessage: (callback: (data: any) => void) => {
    ipcRenderer.on('python-message', (_, data) => callback(data));
  },

  //Removes a previously  listner
  removePythonMessageListener: (callback: (data: any) => void) => {
    ipcRenderer.removeListener('python-message', callback);
  },
  

  // Gets the current connection state
  getConnectionState: () => ipcRenderer.invoke('get-connection-state'),

  // sets up a listener for connection state changes
  onConnectionStateChange: (callback: (state: number) => void) => {
    ipcRenderer.on('connection-state-change', (_, state) => callback(state));
  },

  //Removes the connection state lisener 
  removeConnectionStateListener: (callback: (state: number) => void) => {
    ipcRenderer.removeListener('connection-state-change', callback);
  },

  // Retrieves all application settings at once
  retrieveSettings: () => ipcRenderer.invoke('retrieve-settings'),

  // Updates application settings
  setSettings: (settings) => ipcRenderer.invoke('set-settings', settings),

  // Store operations
  getSettings: () => {
    return ipcRenderer.invoke('get-settings');
  },
  saveSettings: (settings) => {
    return ipcRenderer.invoke('save-settings', settings);
  },
  
  // Path methods
  setSolverPath: (path) => {
    return ipcRenderer.invoke('set-solver-path', path);
  },
  setResultsPath: (path) => {
    return ipcRenderer.invoke('set-results-path', path);
  },
  setAccuracy: (accuracy) => {
    return ipcRenderer.invoke('set-accuracy', accuracy);
  },
  onAccuracyUpdated: (callback) => {
    ipcRenderer.on('accuracy-updated', (_, value) => callback(value));
  },
  removeAccuracyListener: (callback) => {
    ipcRenderer.removeListener('accuracy-updated', callback);
  },

  // Opens a file or directory selection dialog
  selectPath: (options) => ipcRenderer.invoke('select-path', options),

  // Error dialog operations
  showError: (message) => ipcRenderer.invoke('show-error', message)
} as ElectronAPI);

// We'll keep the version display code if it's being used
window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector: string, text: string) => {
    const element = document.getElementById(selector);
    if (element) element.innerText = text;
  };

  for (const dependency of ['chrome', 'node', 'electron']) {
    replaceText(`${dependency}-version`, process.versions[dependency] || 'unknown');
  }
});