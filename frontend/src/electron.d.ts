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

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}

export {};