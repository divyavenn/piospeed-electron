export interface AppSettings {
  solverPath: string | null;
  cfrFolder: string | null;
  weights: string | null;
  nodeBook: string | null;
  accuracy: number;
  resultsPath: string | null;
}

export interface ElectronAPI {
  showError: (message: string) => void;
  showDialog: (options: any) => Promise<any>;
  openFile: (options: any) => Promise<any>;
  openDirectory: (options: any) => Promise<any>;
  getConnectionState: () => Promise<string>;
  validateInput: (input_type: string, value: string) => Promise<any>;
  runCommand: (command: string, args: string[]) => void;
  
  // Store methods
  getSettings: () => Promise<AppSettings>;
  saveSettings: (settings: AppSettings) => Promise<void>;
  
  // Path methods
  setSolverPath: (path: string) => Promise<void>;
  setResultsPath: (path: string) => Promise<void>;
  selectPath: (options?: { 
    type?: 'file' | 'directory' | 'both';
    defaultPath?: string;
    title?: string;
    filters?: { name: string; extensions: string[] }[];
  }) => Promise<string | null>;
  
  // Accuracy methods
  setAccuracy: (accuracy: number) => Promise<void>;
  
  // Legacy methods (for backward compatibility)
  retrieveSettings: () => Promise<AppSettings>;
  sendToPython: (message: any) => Promise<void>;
  onPythonMessage: (callback: (data: any) => void) => void;
  removePythonMessageListener: (callback: (data: any) => void) => void;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}

export {};