interface PyRequestInput {
  input_type: string;
  prompt: string;
  default_location?: string;
}

interface ElectronAPI {
  // File operations
  openFile: () => Promise<string | null>;
  saveFile: (content: string) => Promise<boolean>;
  selectSolverPath: () => Promise<string | null>;
  getSolverPath: () => Promise<string | null>;
  selectFilePath: (params: { title: string; extensions: string[] }) => Promise<string | null>;
  getFolderPath: (params: { key: string }) => Promise<string | null>;
  
  // Python bridge operations
  initSolver: (solverPath: string) => Promise<any>;
  executeCommand: (solverPath: string, command: string, args: any) => Promise<any>;
  getCommands: () => Promise<any>;
  sendInputToPython: (input: string) => Promise<any>;
  
  // Python event listeners
  onPythonOutput: (callback: (output: any) => void) => (() => void);
  onPythonError: (callback: (error: any) => void) => (() => void);
  onPythonStepUpdate: (callback: (step: any) => void) => (() => void);
  onPythonRequestInput: (callback: (data: any) => void) => (() => void);
  onPythonInitComplete: (callback: (data: any) => void) => (() => void);
  onPythonCommandComplete: (callback: (data: any) => void) => (() => void);
  onPythonCommands: (callback: (commands: any) => void) => (() => void);
  onPythonInputReceived: (callback: (data: any) => void) => (() => void);
  
  // Menu event listeners
  onMenuSelectSolver: (callback: () => void) => (() => void);
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
} 