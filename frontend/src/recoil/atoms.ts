import { atom, selector } from 'recoil';

// Types
export type SaveType = 'full' | 'mini';
export type SolveType = 'none' | 'solve' | 'getResults';
export type AnimationState = 'intro' | 'moveUp' | 'commandPalette';

// Command types from menu.py (as a const object instead of enum)
export const CommandMap = {
  NODELOCK_SOLVE: {
    name: "nodelock and run",
    description: "Nodelock a folder of files and run the solver with the specified accuracy."
  },
  RUN_MINI: {
    name: "run",
    description: "Run the solver on the selected files and compress all unnecessary nodes when saving"
  },
  RUN_FULL_SAVE: {
    name: "run (full save)",
    description: "Run the solver and save complete data including all streets."
  },
  NODELOCK: {
    name: "nodelock",
    description: "Apply nodelocking to a folder of files without solving."
  },
  GET_RESULTS: {
    name: "get results",
    description: "Calculate and display results from existing solutions without solving again."
  },
  SAVE_MINI: {
    name: "resave micro (no turns)",
    description: "Compress all unnecessary nodes when saving to minimize file size."
  },
  NONE: {
    name: "none",
    description: "No command selected."
  }
} as const;

// Type for the CommandType keys
export type Command = keyof typeof CommandMap;


// Basic atoms
export const nodelockState = atom({
  key: 'nodelockState',
  default: false
});

export const solveTypeState = atom({
  key: 'solveTypeState',
  default: 'solve' as SolveType
});

export const saveTypeState = atom({
  key: 'saveTypeState',
  default: 'full' as SaveType
});

export const isRunningState = atom({
  key: 'isRunningState',
  default: false
});

export const currentStepState = atom({
  key: 'currentStepState',
  default: ''
});

export const animationState = atom({
  key: 'animationState',
  default: 'intro' as AnimationState
});

export const settingsModalOpenState = atom({
  key: 'settingsModalOpenState',
  default: false
});

// Helper function for command descriptions
export const getCommandDescription = (command: any) => {
  if (typeof command === 'object' && command.description) {
    return command.description;
  }
  return String(command);
};

// Current command selector
export const currentCommandState = selector({
  key: 'currentCommandState',
  get: ({ get }) => {
    const isNodelock = get(nodelockState);
    const solveType = get(solveTypeState);
    const saveType = get(saveTypeState);
    
    // Map the states to commands
    if (isNodelock && solveType === 'solve') {
      return CommandMap.NODELOCK_SOLVE;
    }
    
    if (isNodelock && solveType === 'none') {
      return CommandMap.NODELOCK;
    }
    
    if (solveType === 'getResults') {
      return CommandMap.GET_RESULTS;
    }
    
    if (solveType === 'solve') {
      if (saveType === 'full') {
        return CommandMap.RUN_FULL_SAVE;
      } else if (saveType === 'small') {
        return CommandMap.RUN_SMALL;
      } else { // tiny
        return CommandMap.RUN_MINI;
      }
    }
    
    if (solveType === 'none') {
      if (saveType === 'small') {
        return CommandMap.SAVE_NO_RIVERS;
      } else if (saveType === 'mini') {
        return CommandMap.SAVE_NO_TURNS;
      }
    }
    
    return CommandMap.NONE;
  }
});

// Has command selected selector
export const hasCommandSelectedState = selector({
  key: 'hasCommandSelectedState',
  get: ({ get }) => {
    const currentCommand = get(currentCommandState);
    return currentCommand !== CommandMap.NONE;
  }
}); 