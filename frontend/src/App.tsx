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
} from './styles/AppStyles';

// Create a RecoilApp component to use hooks (RecoilRoot cannot use hooks directly)
const RecoilApp: React.FC = () => {
  const [isLoading, setIsLoading] = React.useState(true);
  const [solverPath, setSolverPath] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const { settings, saveSettings } = useSettings();
  const [isSettingsOpen, setIsSettingsOpen] = useRecoilState(settingsModalOpenState);
  const [isRunning, setIsRunning] = useRecoilState(isRunningState);
  const [currentStep, setCurrentStep] = useRecoilState(currentStepState);
  const currentCommand = useRecoilValue(currentCommandState);
  const hasCommandSelected = useRecoilValue(hasCommandSelectedState);
  const [animation, setAnimation] = useRecoilState(animationState);
  const [solveType, setSolveType] = useRecoilState(solveTypeState);
  const [saveType, setSaveType] = useRecoilState(saveTypeState);
  const [nodelock, setNodelock] = useRecoilState(nodelockState);

  // Check solver path on component mount
  useEffect(() => {
    // Set loading to false immediately
    setIsLoading(false);
    
    // Still listen for Python messages for other functionality
    const handlePythonMessage = (data: any) => {
      console.log('Received message from Python:', data);
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


  const executeCommand = () => {
    if (currentCommand === CommandMap.NONE) return;
    
    if (!solverPath) {
      setCurrentStep('Error: Please set the PioSOLVER executable path in Settings');
      return;
    }
    
    setIsRunning(true);
    
    // Simulate command execution with steps
    const steps = [
      'Initializing command...',
      'Processing files...',
      'Running calculations...',
      'Finalizing results...'
    ];
    
    let stepIndex = 0;
    setCurrentStep(steps[stepIndex]);
    
    console.log(`Executing command: ${currentCommand}`);
    
    const interval = setInterval(() => {
      stepIndex++;
      if (stepIndex < steps.length) {
        setCurrentStep(steps[stepIndex]);
      } else {
        clearInterval(interval);
        // Wait 1 second before ending to show the final step
        setTimeout(() => {
          setIsRunning(false);
        }, 1000);
      }
    }, 2000);
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
  const isSolverPathSet = React.useMemo(() => {
    console.log('Settings in App:', settings);
    console.log('Solver path:', settings?.solverPath);
    const result = settings?.solverPath !== null && settings?.solverPath !== undefined && settings?.solverPath !== '';
    console.log('isSolverPathSet:', result);
    return result;
  }, [settings?.solverPath]);

  return (
    <AppContainer>
      <Background />
      <SettingsButtonContainer>
        <SettingsButton onClick={() => setIsSettingsOpen(true)} />
      </SettingsButtonContainer>
      <CenteredHeaderContainer $animate={animation}>
        <Header showTagline={animation === 'intro'} />
      </CenteredHeaderContainer>

      {error ? (
        <MainContent $animate={animation}>
          <ContentSection>
            <ErrorText>{error}</ErrorText>
          </ContentSection>
        </MainContent>
      ) : (
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
                    disabled={!hasCommandSelected || !isSolverPathSet}
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
      )}

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={async (newSettings: any) => {
          console.log('App received new settings:', newSettings);
          try {
            await saveSettings(newSettings);
            
            if (newSettings.solverPath) {
              setSolverPath(newSettings.solverPath);
              setError(null);
            }
            
            setIsSettingsOpen(false);
          } catch (error) {
            console.error('Error saving settings:', error);
          }
        }}
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