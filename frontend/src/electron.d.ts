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

interface Window {
  electron: ElectronAPI;
} 