import React, { useEffect } from 'react';
import styled, { keyframes, css } from 'styled-components';
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


// Animation keyframes
const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const moveUp = keyframes`
  from { transform: translateY(calc(50vh - 200px)); }
  to { transform: translateY(100px); }
`;

const fadeOut = keyframes`
  from { opacity: 1; }
  to { opacity: 0; }
`;

const AppContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: ${({ theme }) => theme.spacing.large};
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
`;

const SettingsButtonContainer = styled.div`
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 20;
`;

const CenteredHeaderContainer = styled.div<{ $animate: AnimationState }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  position: relative;
  z-index: 10;
  transform: ${({ $animate }) => 
    $animate === 'intro' || $animate === 'moveUp' 
      ? 'translateY(calc(50vh - 200px))' 
      : 'translateY(100px)'};
  transition: transform 0.8s ease-out;
  animation: ${({ $animate }) => 
    $animate === 'intro' 
      ? css`${fadeIn} 1s ease-out forwards` 
      : $animate === 'moveUp'
        ? css`${moveUp} 0.8s ease-out forwards`
        : 'none'};
  margin-bottom: ${({ $animate }) => $animate !== 'intro' ? '50px' : '0'};
`;

const TaglineWrapper = styled.div<{ $animate: AnimationState }>`
  opacity: ${({ $animate }) => $animate === 'commandPalette' ? 0 : 1};
  transition: opacity 0.5s ease-out;
  animation: ${({ $animate }) => 
    $animate === 'moveUp' 
      ? css`${fadeOut} 0.5s ease-out forwards` 
      : 'none'};
`;

const MainContent = styled.div<{ $animate: AnimationState }>`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing.large};
  opacity: 0;
  transform: translateY(20px);
  transition: ${({ theme }) => theme.transitions.normal};
  
  ${({ $animate, theme }) => {
    switch ($animate) {
      case 'intro':
        return css`
          opacity: 1;
          transform: translateY(0);
        `;
      case 'moveUp':
        return css`
          opacity: 1;
          transform: translateY(-100px);
        `;
      case 'commandPalette':
        return css`
          opacity: 1;
          transform: translateY(-100px);
        `;
      default:
        return '';
    }
  }}
`;

const ContentSection = styled.div`
  width: 100%;
  max-width: 800px;
  padding: ${({ theme }) => theme.spacing.medium};
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const LoadingScreen = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  color: ${({ theme }) => theme.colors.textHighlight};
  background-color: ${({ theme }) => theme.colors.background};
`;

const DescriptionText = styled.p`
  margin-bottom: 50px;
  font-size: 1.1em;
  color: ${({ theme }) => theme.colors.textFaded};
  line-height: 1.5;
  text-align: center;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
`;

const CommandPalette = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.medium};
  margin-bottom: ${({ theme }) => theme.spacing.large};
  width: 100%;
  max-width: 700px;
`;

const ToggleGroup = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 180px;
`;

const ToggleLabel = styled.div`
  color: ${({ theme }) => theme.colors.textFaded};
  margin-bottom: ${({ theme }) => theme.spacing.small};
  font-size: 0.85rem;
  letter-spacing: 0.5px;
  text-align: center;
`;

const ToggleContainer = styled.div`
  display: flex;
  align-items: center;
  background-color: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.borderRadius.normal};
  padding: ${({ theme }) => theme.spacing.xs};
  box-shadow: ${({ theme }) => theme.shadows.small};
`;

const ToggleOption = styled.span<{ $active: boolean }>`
  padding: ${({ theme }) => `${theme.spacing.xs} ${theme.spacing.small}`};
  border-radius: ${({ theme }) => theme.borderRadius.small};
  cursor: pointer;
  background-color: ${({ $active, theme }) => $active ? theme.colors.primary : 'transparent'};
  color: ${({ $active, theme }) => $active ? theme.colors.textLight : theme.colors.textFaded};
  transition: all 0.2s ease;
  
  &:hover {
    color: ${({ $active, theme }) => $active ? theme.colors.textLight : theme.colors.textHighlight};
  }
`;

const ToggleOptionDivider = styled.span`
  margin: 0 ${({ theme }) => theme.spacing.xs};
  color: ${({ theme }) => theme.colors.textFaded};
`;

const pulseAnimation = keyframes`
  0% { opacity: 0.6; }
  50% { opacity: 1; }
  100% { opacity: 0.6; }
`;

const glowRipple = keyframes`
  0% { 
    box-shadow: 0 0 0 0 rgba(81, 147, 253, 0.7);
    transform: scale(1);
  }
  70% { 
    box-shadow: 0 0 0 10px rgba(81, 147, 253, 0);
    transform: scale(1.02);
  }
  100% { 
    box-shadow: 0 0 0 0 rgba(81, 147, 253, 0);
    transform: scale(1);
  }
`;

const spinAnimation = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const ExecutionContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  padding: ${({ theme }) => theme.spacing.large};
`;

const ExecutionStatus = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  margin-bottom: ${({ theme }) => theme.spacing.large};
`;

const ExecutionTitle = styled.h2`
  color: ${({ theme }) => theme.colors.primary};
  margin-bottom: ${({ theme }) => theme.spacing.medium};
  animation: ${pulseAnimation} 2s infinite ease-in-out;
`;

const ExecutionStep = styled.div`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.textHighlight};
  margin-top: ${({ theme }) => theme.spacing.medium};
`;

const Spinner = styled.div`
  width: 50px;
  height: 50px;
  border: 4px solid ${({ theme }) => theme.colors.surfaceLight};
  border-top: 4px solid ${({ theme }) => theme.colors.primary};
  border-radius: 50%;
  animation: ${spinAnimation} 1s linear infinite;
  margin: ${({ theme }) => theme.spacing.large} 0;
`;

const ExecuteButton = styled(Button)`
  margin-top: 100px;
  margin-bottom: ${({ theme }) => theme.spacing.xxl};
  width: 100%;
  max-width: 180px;
  animation: ${glowRipple} 2s infinite cubic-bezier(0.36, 0.11, 0.89, 0.32);
  
  &:hover {
    animation-play-state: paused;
  }
  
  &:disabled {
    animation: none;
  }
`;

const CommandDescriptionText = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-top: ${({ theme }) => theme.spacing.xs};
  margin-bottom: ${({ theme }) => theme.spacing.small};
  min-height: 40px;
`;

const Tagline = styled.div`
  font-size: ${({ theme }) => theme.sizes.large};
  color: ${({ theme }) => theme.colors.textFaded};
  margin-top: ${({ theme }) => theme.spacing.medium};
  text-align: center;
`;

// Create a RecoilApp component to use hooks (RecoilRoot cannot use hooks directly)
const RecoilApp: React.FC = () => {
  const { settings, isLoading, saveSettings } = useSettings();
  const [settingsModalOpen, setSettingsModalOpen] = useRecoilState(settingsModalOpenState);
  const [isNodelock, setIsNodelock] = useRecoilState(nodelockState);
  const [solveType, setSolveType] = useRecoilState(solveTypeState);
  const [saveType, setSaveType] = useRecoilState(saveTypeState);
  const [isRunning, setIsRunning] = useRecoilState(isRunningState);
  const [currentStep, setCurrentStep] = useRecoilState(currentStepState);
  const [animState, setAnimState] = useRecoilState(animationState);
  
  // Use the direct values and derived command state
  const currentCommand = useRecoilValue(currentCommandState);
  const hasCommandSelected = useRecoilValue(hasCommandSelectedState);

  // Send solver path to Python when settings are loaded
  useEffect(() => {
    if (!isLoading && settings.solverPath) {
      window.electron.sendSolverPath(settings.solverPath);
    }
  }, [isLoading, settings.solverPath]);

  // Control the animation sequence
  useEffect(() => {
    if (isLoading) return;
    
    // Step 1: Show intro animation in center of screen
    setAnimState('intro');
    
    // Step 2: After 1.5 seconds, move header up, fade out subtitle
    const moveUpTimer = setTimeout(() => {
      setAnimState('moveUp');
    }, 1500);
    
    // Step 3: After transition completes, show command palette
    const showCommandsTimer = setTimeout(() => {
      setAnimState('commandPalette');
    }, 2300); // 1500ms + 800ms for animation
    
    return () => {
      clearTimeout(moveUpTimer);
      clearTimeout(showCommandsTimer);
    };
  }, [isLoading, setAnimState]);

  // If still loading the settings, show a loading screen
  if (isLoading) {
    return (
      <LoadingScreen>
        <h1>Loading PioSpeed...</h1>
      </LoadingScreen>
    );
  }

  const executeCommand = () => {
    if (currentCommand === CommandMap.NONE) return;
    
    if (!settings.solverPath) {
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
    <Background>
      <AppContainer>
        <SettingsButtonContainer>
          <SettingsButton onClick={() => setSettingsModalOpen(true)} />
        </SettingsButtonContainer>
        
        <CenteredHeaderContainer $animate={animState}>
          <Header />
          <TaglineWrapper $animate={animState}>
            <Tagline>Select your command and options</Tagline>
          </TaglineWrapper>
        </CenteredHeaderContainer>
        
        <MainContent $animate={animState}>
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
                        $active={!isNodelock} 
                        onClick={() => solveType !== 'getResults' && setIsNodelock(false)}
                        style={{ 
                          opacity: solveType === 'getResults' ? 0.5 : 1,
                          cursor: solveType === 'getResults' ? 'not-allowed' : 'pointer'
                        }}
                      >
                        No
                      </ToggleOption>
                      <ToggleOptionDivider>|</ToggleOptionDivider>
                      <ToggleOption 
                        $active={isNodelock} 
                        onClick={() => solveType !== 'getResults' && setIsNodelock(true)}
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
                          setIsNodelock(false);
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
        
        {animState === 'commandPalette' && <Footer />}
        
        {/* Settings Modal */}
        <SettingsModal 
          isOpen={settingsModalOpen} 
          onClose={() => setSettingsModalOpen(false)}
          settings={settings}
          onSaveSettings={saveSettings}
        />
      </AppContainer>
    </Background>
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