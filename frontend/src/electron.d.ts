interface ElectronAPI {
  // File operations
  selectSolverPath: () => Promise<string | null>;
  selectFile: (options: { filters?: { name: string; extensions: string[] }[] }) => Promise<string | null>;
  selectFolder: () => Promise<string | null>;
  
  // New unified path selection
  selectPath: (options?: { 
    type?: 'file' | 'directory' | 'both';
    defaultPath?: string;
    title?: string;
    filters?: { name: string; extensions: string[] }[];
  }) => Promise<string | null>;
  
  // Store operations
  saveFolderPath: (params: { key: string; path: string }) => Promise<boolean>;
  getFolderPath: (params: { key: string }) => Promise<string | null>;
  getFilePath: (params: { key: string }) => Promise<string | null>;
  getSolverPath: () => Promise<string | null>;
  
  // Error dialog
  showError: (message: string) => Promise<void>;
  
  // New settings operations
  retrieveSettings: () => Promise<{
    solverPath: string | null;
    cfrFolder: string | null;
    weights: string | null;
    nodeBook: string | null;
    accuracy: number;
  }>;
  setSettings: (settings: {
    solverPath?: string | null;
    cfrFolder?: string | null;
    weights?: string | null;
    nodeBook?: string | null;
    accuracy?: number;
  }) => Promise<{ success: boolean; error?: string }>;
  
  // Python bridge operations
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