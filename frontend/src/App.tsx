import React, { useEffect } from 'react';
import { RecoilRoot, useRecoilState, useRecoilValue } from 'recoil';
import Background from './components/layout/Background';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Button from './components/UI/Button';
import SettingsButton from './components/UI/SettingsButton';
import SettingsModal from './components/Settings/SettingsModal';
import { useSettings } from './contexts/SettingsContext';
import {
  nodelockState,
  solveTypeState,
  saveTypeState,
  isRunningState,
  currentStepState,
  animationState,
  settingsModalOpenState,
  currentCommandState,
  hasCommandSelectedState,
  CommandMap,
  getCommandDescription,
  AnimationState,
  Inputs,
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

// Create a RecoilApp component to use hooks (RecoilRoot cannot use hooks directly)
const RecoilApp: React.FC = () => {
  const {settings, saveSettings } = useSettings();
  const [isSettingsOpen, setIsSettingsOpen] = useRecoilState(settingsModalOpenState);
  const [isRunning, setIsRunning] = useRecoilState(isRunningState);
  const [currentStep, setCurrentStep] = useRecoilState(currentStepState);
  const currentCommand = useRecoilValue(currentCommandState);
  const [animation, setAnimation] = useRecoilState(animationState);
  const [solveType, setSolveType] = useRecoilState(solveTypeState);
  const [saveType, setSaveType] = useRecoilState(saveTypeState);
  const [nodelock, setNodelock] = useRecoilState(nodelockState);

  
  // Check solver path on component mount
  useEffect(() => {
    
    // Listen for messages from Python
    const handlePythonMessage = (data: any) => {
      console.log('Received message from Python:', data);
      
      // Handle ready message
      if (data.type === 'ready') {
        setCurrentStep('Python backend is ready');
      }
      
      // Handle notifications from Python
      if (data.type === 'notification') {
        setCurrentStep(data.data);
      }
      
      // Handle command completion
      if (data.type === 'command_complete') {
        setIsRunning(false);
        setCurrentStep('Command completed successfully');
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
    console.log("Executing command");
    if (currentCommand === CommandMap.NONE) return;
    console.log("Current command:", currentCommand);
    setIsRunning(true);
    setCurrentStep('Preparing command execution...');
    
    try {
      console.log(`Preparing to execute command: ${currentCommand.name}`);
      
      // Get required inputs for the command
      const requiredInputs = currentCommand.inputs || [];
      const collectedInputs: string[] = [];
      
      // Get saved paths from settings
      const settings = await window.electron.retrieveSettings();
      
      // Process inputs sequentially with validation
      for (let i = 0; i < requiredInputs.length; i++) {
        const input = requiredInputs[i];
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
        
          let inputType = input.type;

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
              input_type: inputType,
              value: selectedPath
            }
          });
            
          // Wait for validation response
          await new Promise<void>((resolve) => {
            const handleValidationResponse = async (data: any) => {
              if (data.type === 'input_validation' && data.data.input_type === inputType) {
                if (data.data.is_valid === true) {
                  // If input is valid, resolve immediately
                  collectedInputs.push(selectedPath);
                  isValidInput = true;
                  window.electron.removePythonMessageListener(handleValidationResponse);
                  resolve();
                } else {
                  // If input is invalid, show error dialog
                  try {
                    await window.electron.showError(data.data.error || 'Invalid input');
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
            type: Object.keys(CommandMap).find(key => CommandMap[key] === currentCommand) || 'NONE',
            args: collectedInputs
          }
        });
        
        setCurrentStep('Command sent. Processing...');
      } catch (error) {
        console.error('Error executing command:', error);
        setCurrentStep(`Error: ${error instanceof Error ? error.message : String(error)}`);
        setIsRunning(false);
      }
    } catch (error) {
      console.error('Error executing command:', error);
      setCurrentStep(`Error: ${error instanceof Error ? error.message : String(error)}`);
      setIsRunning(false);
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
                    : getCommandDescription(currentCommand)}
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
                        Off
                      </ToggleOption>
                      <ToggleOption 
                        $active={nodelock} 
                        onClick={() => isSolverPathSet && solveType !== 'getResults' && setNodelock(true)}
                        style={{ 
                          opacity: !isSolverPathSet || solveType === 'getResults' ? 0.5 : 1,
                          cursor: !isSolverPathSet || solveType === 'getResults' ? 'not-allowed' : 'pointer'
                        }}
                      >
                        On
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
                        Solve
                      </ToggleOption>
                      <ToggleOption 
                        $active={solveType === 'getResults'} 
                        onClick={() => isSolverPathSet && setSolveType('getResults')}
                        style={{ 
                          opacity: !isSolverPathSet ? 0.5 : 1,
                          cursor: !isSolverPathSet ? 'not-allowed' : 'pointer'
                        }}
                      >
                        Results
                      </ToggleOption>
                    </ToggleContainer>
                  </ToggleGroup>

                  <ToggleGroup>
                    <ToggleLabel>Save Type</ToggleLabel>
                    <ToggleContainer>
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

                    </ToggleContainer>
                  </ToggleGroup>
                  
                  </Toggles>

                  <ExecuteButton 
                    variant="primary" 
                    onClick={executeCommand}
                    disabled={!isSolverPathSet}
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
        onSaveSettings={saveSettings}
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
            Cancel
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