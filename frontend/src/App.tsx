import React, { useEffect, useCallback, useState } from 'react';
import { RecoilRoot, useRecoilState, useRecoilValue } from 'recoil';
import Background from './components/layout/Background';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Button from './components/UI/Button';
import SettingsButton from './components/UI/SettingsButton';
import SettingsModal from './components/Settings/SettingsModal';
import CommandSummaryModal from './components/SummaryModal';
import { useSettings, AppSettings } from './contexts/SettingsContext';
import { 
  currentCommandState, 
  CommandMap, 
  hasCommandSelectedState, 
  currentStepState, 
  animationState, 
  settingsModalOpenState,
  nodelockState,
  solveTypeState,
  saveTypeState,
  isRunningState,
  SolveType,
  SaveType,
  AnimationState,
  Inputs,
  specificSaveState,
  commandDescriptionState
} from './recoil/atoms'; 

import {
  AppContainer,
  SettingsButtonContainer,
  CenteredHeaderContainer,
  TaglineWrapper,
  MainContent,
  Toggles,
  ContentSection,
  LoadingScreen,
  CommandPalette,
  ToggleGroup,
  ToggleLabel,
  ToggleContainer,
  ToggleOption,
  ToggleOptionDivider,
  ExecutionContainer,
  ExecutionStatus,
  ExecutionTitle,
  ExecutionStep,
  Spinner,
  ExecuteButton,
  CommandDescriptionText,
  Tagline,
  ErrorText,
  DescriptionText,
  ModalOverlay,
  ModalContainer,
  ModalTitle,
  ModalMessage,
  ModalButtonContainer,
  ModalButton,
  NotificationContainer
} from './styles/AppStyles';

// Command Summary Modal interface
interface CommandSummary {
  command: string;
  processed_files: string[];
  weights_file: string;
  board_file: string;
  results_path: string;
}

// Create a RecoilApp component to use hooks (RecoilRoot cannot use hooks directly)
const RecoilApp: React.FC = () => {
  const { settings, updateSettings, isLoading } = useSettings();
  const [isSettingsOpen, setIsSettingsOpen] = useRecoilState(settingsModalOpenState);
  const [isRunning, setIsRunning] = useRecoilState(isRunningState);
  const [currentStep, setCurrentStep] = useRecoilState(currentStepState);
  const currentCommand = useRecoilValue(currentCommandState);
  const [animation, setAnimation] = useRecoilState(animationState);
  const [solveType, setSolveType] = useRecoilState(solveTypeState);
  const [saveType, setSaveType] = useRecoilState(saveTypeState);
  const [nodelock, setNodelock] = useRecoilState(nodelockState);
  const commandDescription = useRecoilValue(commandDescriptionState);
  const specificSaves = useRecoilValue(specificSaveState)


  const handleSettingsSubmit = async (newSettings: AppSettings) => {
    try {
      await updateSettings(newSettings);
      if (newSettings.solverPath) {
        window.electron.setSolverPath(newSettings.solverPath);
      }
      if (newSettings.resultsPath) {
        window.electron.setResultsPath(newSettings.resultsPath);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  // Check connection state on component mount
  useEffect(() => {
    const checkConnectionAndSendSolver = async () => {
      // Check if already connected
      console.log('Checking connection state...');
      const state = await window.electron.getConnectionState();
      if (state === 'READY') {
        console.log('Python backend is ready');
        setCurrentStep('Python backend is ready');
        // Send solver path if it exists
        const settings = await window.electron.retrieveSettings();
        if (settings?.solverPath) {
          await window.electron.sendToPython({
            type: 'solverPath',
            data: settings.solverPath
          });
        }
      }
    };
    
    // Check initial state
    checkConnectionAndSendSolver();
    
    // Listen for messages from Python
    const handlePythonMessage = async (data: any) => {
      console.log('Received message from Python:', data);
      
      // Handle notifications from Python
      if (data.type === 'notification') {
        setCurrentStep(data.data);
        if (data.data === 'Command completed.') {
          console.log('Command completed.');
          setIsRunning(false);
          setAnimation('commandPalette');
        }
      }
      
      // Handle command completion
      if (data.type === 'command_complete') {
        setIsRunning(false);
        setCurrentStep('Command completed.');
        setAnimation('commandPalette');
      }
      
      // Handle command summary messages
      else if (data.type === 'command_summary') {
        console.log('Received command summary:', data.data);
        setCommandSummary(data.data);
        setIsRunning(false); // Command is complete
      }
      
      // Handle errors from Python
      if (data.type === 'error') {
        setIsRunning(false);
        setCurrentStep(`Error: ${data.data}`);
      }
    };

    window.electron.onPythonMessage(handlePythonMessage);

    // Cleanup listener on unmount
    return () => {
      window.electron.removePythonMessageListener(handlePythonMessage);
    };
  }, []);

  // Start animation immediately, don't wait for Python to be ready
  useEffect(() => {
    // Step 1: Show intro animation in center of screen
    setAnimation('intro');
    
    // Step 2: After 2 seconds, move header up, fade out subtitle
    const moveUpTimer = setTimeout(() => {
      setAnimation('moveUp');
    }, 2000);
    
    // Step 3: After transition completes, show command palette
    const showCommandsTimer = setTimeout(() => {
      setAnimation('commandPalette');
    }, 2800); // 2000ms + 800ms for animation
    
    return () => {
      clearTimeout(moveUpTimer);
      clearTimeout(showCommandsTimer);
    };
  }, [setAnimation]);


  const executeCommand = async () => {
    if (!currentCommand || !isSolverPathSet) return;
    
    setIsRunning(true);
    const collectedInputs: { [key: string]: string } = {};
    
    // Get required inputs for the command
    const requiredInputs = currentCommand.inputs || [];
    
    // Collect all required inputs
    for (const input of requiredInputs) {
      let isValidInput = false;
      
        // Keep prompting until we get a valid input
      while (!isValidInput) {
          setCurrentStep(`Input required: ${input.prompt}`);

          // Get default path from settings based on input type
          let defaultPath = null;
          if (input.type === 'cfr_folder') defaultPath = settings.cfrFolder;
          else if (input.type === 'weights_file') defaultPath = settings.weights;
          else if (input.type === 'board_file') defaultPath = settings.nodeBook;
          
          // Determine file dialog options based on input type
          const options: any = {
            type: input.type === 'cfr_folder' ? 'both' : 'file',
          title: input.prompt,
            defaultPath: defaultPath ? defaultPath : ''
          };

          // Only add filters for file selection
          if (options.type === 'file') {
            options.filters = [{ 
              name: `${input.extension.toUpperCase()} Files`, 
              extensions: [input.extension.replace('.', '')] 
            }];
          }
      

          // Open file dialog
          const selectedPath = await window.electron.selectPath(options);
          
          if (!selectedPath) {
            // User cancelled input
            setIsRunning(false);
            setCurrentStep('Command cancelled: Missing required input');
            return;
          }
          
          // Validate the input with Python
          setCurrentStep(`Validating input: ${selectedPath}...`);
          
          // Send validation request to Python
          await window.electron.sendToPython({
            type: 'validate_input',
            data: {
              input_type: input.type,
              value: selectedPath
            }
          });
            
          // Wait for validation response
          await new Promise<void>((resolve) => {
            const handleValidationResponse = async (data: any) => {
              if (data.type === 'input_validation' && data.data.input_type === input.type) {
                if (data.data.is_valid === true) {
                  // If input is valid, resolve immediately
                  collectedInputs[input.type] = selectedPath;
                  isValidInput = true;
                  window.electron.removePythonMessageListener(handleValidationResponse);
                  resolve();
                } else {
                  // If input is invalid, show error dialog and try again
                  try {
                    await window.electron.showError(data.data.error || 'Invalid input');
                  } catch (error) {
                    console.error('Error showing error dialog:', error);
                    // If error dialog fails, still show error in UI
                    setCurrentStep(`Error: ${data.data.error || 'Invalid input'}`);
                  } finally {
                    window.electron.removePythonMessageListener(handleValidationResponse);
                    resolve();
                  }
                }
              }
            };
            
            // Register the message listener
            window.electron.onPythonMessage(handleValidationResponse);
          });

      }
    }
    
    // All inputs collected and validated, send the command to Python
    setCurrentStep('Sending command to Python...');
    
    try {
      await window.electron.sendToPython({
        type: 'command',
        data: {
          type: currentCommand.name,
          args: collectedInputs
        }
      });
    } catch (error) {
      console.error('Error executing command:', error);
      setIsRunning(false);
      setCurrentStep(`Error: ${error.message}`);
    }
  };

  const cancelCommand = () => {
    // Send a cancel command to Python
    window.electron.sendToPython({ type: "cancel", data: null });
    
    // Update UI state
    setIsRunning(false);
    setCurrentStep("Command cancelled by user");
    
    // Reset after a short delay
    setTimeout(() => {
      setCurrentStep("");
    }, 2000);
  };

  // Check if solver path is set
  const isSolverPathSet = Boolean(settings.solverPath);

  // State for command summary modal
  const [commandSummary, setCommandSummary] = useState<CommandSummary | null>(null);

  return (
    <AppContainer>
      <Background />
      <SettingsButtonContainer>
        <SettingsButton onClick={() => setIsSettingsOpen(true)} />
      </SettingsButtonContainer>
      <CenteredHeaderContainer $animate={animation}>
        <Header showTagline={animation === 'intro'} />
      </CenteredHeaderContainer>

      <MainContent $animate={animation}>
          <ContentSection>
            {isRunning ? (
              <ExecutionContainer>
                <ExecutionStatus>
                  <ExecutionTitle>
                    Executing: {typeof currentCommand === 'object' 
                      ? currentCommand.name 
                      : currentCommand}
                  </ExecutionTitle>
                  <Spinner />
                  <ExecutionStep>{currentStep}</ExecutionStep>
                </ExecutionStatus>
              </ExecutionContainer>
            ) : (
              <>
                <DescriptionText $animate={animation}>
                  {!isSolverPathSet 
                    ? "Select a piosolver executable in settings" 
                    : commandDescription}
                </DescriptionText>
                
                <CommandPalette $animate={animation}>
                  <Toggles>
                  <ToggleGroup>
                    <ToggleLabel>Nodelock</ToggleLabel>
                    <ToggleContainer>
                      <ToggleOption 
                        $active={!nodelock} 
                        onClick={() => isSolverPathSet && solveType !== 'getResults' && setNodelock(false)}
                        style={{ 
                          opacity: !isSolverPathSet || solveType === 'getResults' ? 0.5 : 1,
                          cursor: !isSolverPathSet || solveType === 'getResults' ? 'not-allowed' : 'pointer'
                        }}
                      >
                        off
                      </ToggleOption>
                      <ToggleOption 
                        $active={nodelock} 
                        onClick={() => isSolverPathSet && solveType !== 'getResults' && setNodelock(true)}
                        style={{ 
                          opacity: !isSolverPathSet || solveType === 'getResults' ? 0.5 : 1,
                          cursor: !isSolverPathSet || solveType === 'getResults' ? 'not-allowed' : 'pointer'
                        }}
                      >
                        on
                      </ToggleOption>
                    </ToggleContainer>
                  </ToggleGroup>

                  <ToggleGroup>
                    <ToggleLabel>Solve Type</ToggleLabel>
                    <ToggleContainer>
                      <ToggleOption 
                        $active={solveType === 'solve'} 
                        onClick={() => isSolverPathSet && setSolveType('solve')}
                        style={{ 
                          opacity: !isSolverPathSet ? 0.5 : 1,
                          cursor: !isSolverPathSet ? 'not-allowed' : 'pointer'
                        }}
                      >
                        solve
                      </ToggleOption>
                      <ToggleOption 
                        $active={solveType === 'getResults'} 
                        onClick={() => isSolverPathSet && setSolveType('getResults')}
                        style={{ 
                          opacity: !isSolverPathSet ? 0.5 : 1,
                          cursor: !isSolverPathSet ? 'not-allowed' : 'pointer'
                        }}
                      >
                        results
                      </ToggleOption>
                      <ToggleOption 
                        $active={solveType === 'none'} 
                        onClick={() => isSolverPathSet && setSolveType('none')}
                        style={{ 
                          opacity: !isSolverPathSet ? 0.5 : 1,
                          cursor: !isSolverPathSet ? 'not-allowed' : 'pointer'
                        }}
                      >
                        none
                      </ToggleOption>
                    </ToggleContainer>
                  </ToggleGroup>

                  <ToggleGroup>
                    <ToggleLabel>Save Type</ToggleLabel>
                    <ToggleContainer>
                      {!specificSaves ? 
                      (<ToggleContainer>
                        <ToggleOption 
                          $active={saveType === 'full'} 
                          onClick={() => isSolverPathSet && solveType !== 'getResults' && setSaveType('full')}
                          style={{ 
                            opacity: !isSolverPathSet || solveType === 'getResults' ? 0.5 : 1,
                          cursor: !isSolverPathSet || solveType === 'getResults' ? 'not-allowed' : 'pointer'
                        }}
                      >
                        full
                      </ToggleOption>
                      <ToggleOption 
                        $active={saveType === 'mini'} 
                        onClick={() => isSolverPathSet && solveType !== 'getResults' && setSaveType('mini')}
                        style={{ 
                          opacity: !isSolverPathSet || solveType === 'getResults' ? 0.5 : 1,
                          cursor: !isSolverPathSet || solveType === 'getResults' ? 'not-allowed' : 'pointer'
                        }}
                      >
                        mini
                      </ToggleOption>
                      </ToggleContainer>) : (
                      <ToggleContainer>
                      <ToggleOption 
                        $active={saveType === 'no rivers'} 
                        onClick={() => isSolverPathSet && solveType !== 'getResults' && setSaveType('no rivers')}
                        style={{ 
                          opacity: !isSolverPathSet || solveType === 'getResults' ? 0.5 : 1,
                        cursor: !isSolverPathSet || solveType === 'getResults' ? 'not-allowed' : 'pointer'
                      }}
                    >
                      no rivers
                    </ToggleOption>
                    <ToggleOption 
                      $active={saveType === 'no turns'} 
                      onClick={() => isSolverPathSet && solveType !== 'getResults' && setSaveType('no turns')}
                      style={{ 
                        opacity: !isSolverPathSet || solveType === 'getResults' ? 0.5 : 1,
                        cursor: !isSolverPathSet || solveType === 'getResults' ? 'not-allowed' : 'pointer'
                      }}
                    >
                      no turns
                    </ToggleOption>
                    </ToggleContainer>
                      )}

                    </ToggleContainer>
                  </ToggleGroup>
                  
                  </Toggles>

                  <ExecuteButton 
                    variant="primary" 
                    onClick={executeCommand}
                    disabled={currentCommand == CommandMap.NONE || !isSolverPathSet}
                    $animate={animation}
                    style={{ 
                      opacity: !isSolverPathSet ? 0.5 : 1,
                      cursor: !isSolverPathSet ? 'not-allowed' : 'pointer'
                    }}
                  >
                    GO
                  </ExecuteButton>
                </CommandPalette>
              </>
            )}
          </ContentSection>
      </MainContent>
    

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSettingsSubmit}
      />
      <CommandSummaryModal
        isOpen={commandSummary !== null}
        onClose={() => setCommandSummary(null)}
        summary={commandSummary}
      />
      <Footer />
      
      {/* Cancel button at bottom of screen when running */}
      {isRunning && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '0',
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <ExecuteButton 
            variant="secondary" 
            onClick={cancelCommand}
            style={{
              opacity: 1,
              visibility: 'visible',
              backgroundColor: 'transparent',
              color: '#888888',
              padding: '8px 24px',
              borderRadius: '8px',
              fontFamily: 'Inter, sans-serif',
              border: '1px solid #555555',
              animation: 'none',
              boxShadow: 'none'
            }}
          >
            cancel
          </ExecuteButton>
        </div>
      )}
    </AppContainer>
  );
};

// Create a wrapper App component that provides RecoilRoot
const App: React.FC = () => {
  return (
    <RecoilRoot>
      <RecoilApp />
    </RecoilRoot>
  );
};

export default App;