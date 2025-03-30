import { atom, selector } from 'recoil';

// Types
export type SaveType = 'full' | 'mini';
export type SolveType = 'none' |'solve' | 'getResults';
export type AnimationState = 'intro' | 'moveUp' | 'commandPalette';

// Command types from menu.py (as a const object instead of enum)

export type Input = {
  extension: string;
  prompt: string;
  type: 'board_file' | 'weights_file' | 'cfr_folder';
}

export const Inputs = {
  nodeBook: { extension: ".json", prompt: "Pick a .json file with the nodeID and board texture for each .cfr file", type: 'board_file' } as Input,
  weights: { extension: ".json", prompt: "Pick a .json file with the desired weights for each hand category.", type: 'weights_file' } as Input,
  cfrFolder: { extension: ".cfr", prompt: "Pick a single .cfr file or folder of files to run", type: 'cfr_folder' } as Input
}

// Define interface for command definition
export interface CommandDefinition {
  name: string;
  inputs?: Input[];
}

// Define type for CommandMap
export type CommandMapType = {
  [key: string]: CommandDefinition;
}

export const CommandMap: CommandMapType = {
  NODELOCK_SOLVE: {
    name: "nodelock_solve",
    inputs: [Inputs.cfrFolder, Inputs.nodeBook, Inputs.weights]
  },
  NODELOCK_SOLVE_MINI: {
    name: "nodelock_solve_mini",
    inputs: [Inputs.cfrFolder, Inputs.nodeBook, Inputs.weights]
  },
  RUN_AUTO: {
    name: "run_auto",
    inputs: [Inputs.cfrFolder, Inputs.nodeBook]
  },
  RUN_FULL_SAVE: {
    name: "run_full_save",
    inputs: [Inputs.cfrFolder, Inputs.nodeBook]
  },
  NODELOCK: {
    name: "nodelock",
    inputs: [Inputs.cfrFolder, Inputs.nodeBook, Inputs.weights]
  },
  GET_RESULTS: {
    name: "get_results",
    inputs: [Inputs.cfrFolder, Inputs.nodeBook]
  },
  SAVE_NO_RIVERS: {
    name: "save_no_rivers",
    inputs: [Inputs.cfrFolder]
  },
  SAVE_NO_TURNS: {
    name: "save_no_turns",
    inputs: [Inputs.cfrFolder]
  },
  NONE: {
    name: "none"
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

export const accuracyState = atom({
  key: 'accuracyState',
  default: 0.002
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
    if (isNodelock && solveType === 'solve' && saveType === 'mini') {
      return CommandMap.NODELOCK_SOLVE_MINI;
    }
    // Map the states to commands
    if (isNodelock && solveType === 'solve' && saveType === 'full') {
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
      } else { // tiny
        return CommandMap.RUN_AUTO;
      }
    }
    
    if (solveType === 'none') {
      if (saveType === 'mini') {
        return CommandMap.SAVE_NO_TURNS;
      }
    }
    
    return CommandMap.NONE;
  }
});

// Command description selector
export const commandDescriptionState = selector({
  key: 'commandDescriptionState',
  get: ({ get }) => {
    const currentCommand = get(currentCommandState);
    const accuracy = get(accuracyState);
    
    if (!currentCommand) return '';
    
    switch (currentCommand.name) {
      case 'nodelock_solve':
        return `Nodelock a folder of files and run the solver to an accuracy of ${accuracy}`;
      case 'nodelock_solve_mini':
        return `Nodelock a folder of files and run the solver to an accuracy of ${accuracy} and compress all unnecessary nodes when saving.`;
      case 'run_auto':
        return `Run the solver on the selected files to an accuracy of ${accuracy} and compress all unnecessary nodes when saving.`;
      case 'run_full_save':
        return `Run the solver to an accuracy of ${accuracy} and save complete data including all streets (Accuracy: ${accuracy})`;
      case 'nodelock':
        return 'Apply nodelocking to a folder of files without solving';
      case 'get_results':
        return 'Calculate and display results from existing solutions without solving again';
      case 'save_no_rivers':
        return 'Resave files without rivers to reduce file size';
      case 'save_no_turns':
        return 'Resave files without turns to reduce file size';
      case 'none':
        return 'No command selected';
      default:
        return '';
    }
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