import { contextBridge, ipcRenderer } from 'electron';



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
  }
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