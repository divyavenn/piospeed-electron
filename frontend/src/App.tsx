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
  ContentSection,
  LoadingScreen,
  DescriptionText,
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
} from './styles/AppStyles';

// Create a RecoilApp component to use hooks (RecoilRoot cannot use hooks directly)
const RecoilApp: React.FC = () => {
  const [isLoading, setIsLoading] = React.useState(true);
  const [solverPath, setSolverPath] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const { settings } = useSettings();
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
    const checkSolverPath = async () => {
      try {
        const path = await window.electron.selectSolverPath();
        if (!path) {
          setError('Please set solver executable path in settings.');
          setIsLoading(false);
          return;
        }
        setSolverPath(path);
        window.electron.sendSolverPath(path);
        setIsLoading(false);
      } catch (err) {
        setError('Failed to load solver path. Please check settings.');
        setIsLoading(false);
      }
    };

    checkSolverPath();
  }, []);

  // Control the animation sequence
  useEffect(() => {
    if (isLoading) return;
    
    // Step 1: Show intro animation in center of screen
    setAnimation('intro');
    
    // Step 2: After 1.5 seconds, move header up, fade out subtitle
    const moveUpTimer = setTimeout(() => {
      setAnimation('moveUp');
    }, 1500);
    
    // Step 3: After transition completes, show command palette
    const showCommandsTimer = setTimeout(() => {
      setAnimation('commandPalette');
    }, 2300); // 1500ms + 800ms for animation
    
    return () => {
      clearTimeout(moveUpTimer);
      clearTimeout(showCommandsTimer);
    };
  }, [isLoading, setAnimation]);

  // If still loading the settings, show a loading screen
  if (isLoading) {
    return (
      <LoadingScreen>
        <Spinner />
        <DescriptionText>Loading...</DescriptionText>
      </LoadingScreen>
    );
  }

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
    setIsRunning(false);
  };

  return (
    <AppContainer>
      <Background />
      <SettingsButtonContainer>
        <SettingsButton onClick={() => setIsSettingsOpen(true)} />
      </SettingsButtonContainer>
      <CenteredHeaderContainer $animate={animation}>
        <Header />
        <TaglineWrapper $animate={animation}>
          <Tagline>Poker Game Solver</Tagline>
        </TaglineWrapper>
      </CenteredHeaderContainer>

      {isLoading ? (
        <LoadingScreen>
          <Spinner />
          <DescriptionText>Loading...</DescriptionText>
        </LoadingScreen>
      ) : error ? (
        <MainContent $animate={animation}>
          <ContentSection>
            <ErrorText>{error}</ErrorText>
            <Button onClick={() => setIsSettingsOpen(true)}>Open Settings</Button>
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
                <ExecuteButton 
                  variant="secondary" 
                  onClick={cancelCommand}
                >
                  Cancel
                </ExecuteButton>
              </ExecutionContainer>
            ) : (
              <>
                <DescriptionText>
                  {getCommandDescription(currentCommand)}
                </DescriptionText>
                
                <CommandPalette>
                  <ToggleGroup>
                    <ToggleLabel>Nodelock</ToggleLabel>
                    <ToggleContainer>
                      <ToggleOption 
                        $active={!nodelock} 
                        onClick={() => solveType !== 'getResults' && setNodelock(false)}
                        style={{ 
                          opacity: solveType === 'getResults' ? 0.5 : 1,
                          cursor: solveType === 'getResults' ? 'not-allowed' : 'pointer'
                        }}
                      >
                        No
                      </ToggleOption>
                      <ToggleOptionDivider>|</ToggleOptionDivider>
                      <ToggleOption 
                        $active={nodelock} 
                        onClick={() => solveType !== 'getResults' && setNodelock(true)}
                        style={{ 
                          opacity: solveType === 'getResults' ? 0.5 : 1,
                          cursor: solveType === 'getResults' ? 'not-allowed' : 'pointer'
                        }}
                      >
                        Yes
                      </ToggleOption>
                    </ToggleContainer>
                  </ToggleGroup>
                  
                  <ToggleGroup>
                    <ToggleLabel>Solve Mode</ToggleLabel>
                    <ToggleContainer>
                      <ToggleOption 
                        $active={solveType === 'none'} 
                        onClick={() => setSolveType('none')}
                      >
                        None
                      </ToggleOption>
                      <ToggleOptionDivider>|</ToggleOptionDivider>
                      <ToggleOption 
                        $active={solveType === 'solve'} 
                        onClick={() => setSolveType('solve')}
                      >
                        Solve
                      </ToggleOption>
                      <ToggleOptionDivider>|</ToggleOptionDivider>
                      <ToggleOption 
                        $active={solveType === 'getResults'} 
                        onClick={() => {
                          setSolveType('getResults');
                          // Force nodelock off and saveType to full when getResults is selected
                          setNodelock(false);
                          setSaveType('full');
                        }}
                      >
                        Get Results
                      </ToggleOption>
                    </ToggleContainer>
                  </ToggleGroup>
                  
                  <ToggleGroup>
                    <ToggleLabel>Save Type</ToggleLabel>
                    <ToggleContainer>
                      <ToggleOption 
                        $active={saveType === 'full'} 
                        onClick={() => solveType !== 'getResults' && setSaveType('full')}
                        style={{ 
                          opacity: solveType === 'getResults' ? 0.5 : 1,
                          cursor: solveType === 'getResults' ? 'not-allowed' : 'pointer'
                        }}
                      >
                        Full
                      </ToggleOption>
                      <ToggleOptionDivider>|</ToggleOptionDivider>
                      <ToggleOption 
                        $active={saveType === 'mini'} 
                        onClick={() => solveType !== 'getResults' && setSaveType('mini')}
                        style={{ 
                          opacity: solveType === 'getResults' ? 0.5 : 1,
                          cursor: solveType === 'getResults' ? 'not-allowed' : 'pointer'
                        }}
                      >
                        Mini
                      </ToggleOption>
                      <ToggleOptionDivider>|</ToggleOptionDivider>
                      <ToggleOption 
                        $active={saveType === 'tiny'} 
                        onClick={() => solveType !== 'getResults' && setSaveType('tiny')}
                        style={{ 
                          opacity: solveType === 'getResults' ? 0.5 : 1,
                          cursor: solveType === 'getResults' ? 'not-allowed' : 'pointer'
                        }}
                      >
                        Tiny
                      </ToggleOption>
                    </ToggleContainer>
                  </ToggleGroup>
                </CommandPalette>
                
                <ExecuteButton 
                  variant="primary" 
                  onClick={executeCommand}
                  disabled={!hasCommandSelected}
                >
                  Go
                </ExecuteButton>
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
          setIsSettingsOpen(false);
          if (newSettings.solverPath) {
            setSolverPath(newSettings.solverPath);
            window.electron.sendSolverPath(newSettings.solverPath);
            setError(null);
          }
        }}
      />
      <Footer />
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