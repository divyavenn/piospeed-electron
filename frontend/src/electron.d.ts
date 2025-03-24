interface ElectronAPI {
  selectSolverPath: () => Promise<string | null>;
  selectFolder: () => Promise<string | null>;
  sendSolverPath: (path: string) => void;
  // Add other methods that your Electron API exposes
}

declare interface Window {
  electron: ElectronAPI;
}