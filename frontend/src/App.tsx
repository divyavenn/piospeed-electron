/// <reference path="./electron.d.ts" />
import React, { useEffect, useState } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { RecoilRoot, useRecoilState, useRecoilValue } from 'recoil';
import Background from './components/layout/Background';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Button from './components/UI/Button';
import SettingsButton from './components/UI/SettingsButton';
import SettingsModal from './components/Settings/SettingsModal';
import SetupWizard from './components/Settings/SetupWizard';
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
  AnimationState
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

const CenteredHeaderContainer = styled.div<{ animate: AnimationState }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  position: relative;
  z-index: 10;
  transform: ${({ animate }) => 
    animate === 'intro' || animate === 'moveUp' 
      ? 'translateY(calc(50vh - 200px))' 
      : 'translateY(100px)'};
  transition: transform 0.8s ease-out;
  animation: ${({ animate }) => 
    animate === 'intro' 
      ? css`${fadeIn} 1s ease-out forwards` 
      : animate === 'moveUp'
        ? css`${moveUp} 0.8s ease-out forwards`
        : 'none'};
  margin-bottom: ${({ animate }) => animate !== 'intro' ? '20px' : '0'};
`;

const TaglineWrapper = styled.div<{ animate: AnimationState }>`
  opacity: ${({ animate }) => animate === 'commandPalette' ? 0 : 1};
  transition: opacity 0.5s ease-out;
  animation: ${({ animate }) => 
    animate === 'moveUp' 
      ? css`${fadeOut} 0.5s ease-out forwards` 
      : 'none'};
`;

const MainContent = styled.main<{ animate: AnimationState }>`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-bottom: 60px; /* Space for footer */
  gap: ${({ theme }) => theme.spacing.large};
  margin-top: ${({ theme }) => theme.spacing.large};
  opacity: ${({ animate }) => animate === 'commandPalette' ? 1 : 0};
  transform: ${({ animate }) => animate === 'commandPalette' ? 'translateY(0)' : 'translateY(20px)'};
  transition: opacity 0.8s ease-in-out, transform 0.8s ease-in-out;
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

const ToggleOption = styled.span<{ active: boolean }>`
  padding: ${({ theme }) => `${theme.spacing.xs} ${theme.spacing.small}`};
  font-size: 0.85rem;
  border-radius: ${({ theme }) => theme.borderRadius.small};
  cursor: pointer;
  background-color: ${({ active, theme }) => active ? theme.colors.primary : 'transparent'};
  color: ${({ active, theme }) => active ? theme.colors.textLight : theme.colors.textFaded};
  transition: all 0.2s ease;
  
  &:hover {
    color: ${({ active, theme }) => active ? theme.colors.textLight : theme.colors.textHighlight};
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
  margin-top: 40px;
  margin-bottom: ${({ theme }) => theme.spacing.xxl};
  width: 100%;
  max-width: 180px;
  animation: ${glowRipple} 2s infinite cubic-bezier(0.36, 0.11, 0.89, 0.32);
  margin-left: auto;
  margin-right: auto;
  display: block;
  
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

// Add interfaces for Python communication
interface PyRequestInput {
  type: 'request_input';
  input_type: 'text' | 'file' | 'directory' | 'command';
  prompt?: string;
  default_location?: string;
  commands?: string[];
}

const RecoilApp: React.FC = () => {
  // Recoil state instead of useState
  const [settingsModalOpen, setSettingsModalOpen] = useRecoilState(settingsModalOpenState);
  const [isNodelock, setIsNodelock] = useRecoilState(nodelockState);
  const [solveType, setSolveType] = useRecoilState(solveTypeState);
  const [saveType, setSaveType] = useRecoilState(saveTypeState);
  const [isRunning, setIsRunning] = useRecoilState(isRunningState);
  const [currentStep, setCurrentStep] = useRecoilState(currentStepState);
  const [animState, setAnimationState] = useRecoilState(animationState);
  
  // Use the direct values and derived command state
  const [currentCommand, setCurrentCommand] = useRecoilState(currentCommandState);
  const [hasCommandSelected, setHasCommandSelected] = useRecoilState(hasCommandSelectedState);
  
  const { 
    settings, 
    saveSettings, 
    isFirstLaunch, 
    setFirstLaunchComplete,
    isLoading
  } = useSettings();

  // Add states for Python communication
  const [pythonSteps, setPythonSteps] = useState<string[]>([]);
  const [pythonCurrentStep, setPythonCurrentStep] = useState<string>('');
  const [availableCommands, setAvailableCommands] = useState<Record<string, string>>({});
  const [pythonInputRequest, setPythonInputRequest] = useState<PyRequestInput | null>(null);
  const [pythonInputValue, setPythonInputValue] = useState<string>('');
  
  // Control the animation sequence
  useEffect(() => {
    if (isLoading || isFirstLaunch) return;
    
    // Step 1: Show intro animation in center of screen
    setAnimationState('intro');
    
    // Step 2: After 1.5 seconds, move header up, fade out subtitle
    const moveUpTimer = setTimeout(() => {
      setAnimationState('moveUp');
    }, 1500);
    
    // Step 3: After transition completes, show command palette
    const showCommandsTimer = setTimeout(() => {
      setAnimationState('commandPalette');
    }, 2300); // 1500ms + 800ms for animation
    
    return () => {
      clearTimeout(moveUpTimer);
      clearTimeout(showCommandsTimer);
    };
  }, [isLoading, isFirstLaunch, setAnimationState]);

  // Effect for initializing Python listeners
  useEffect(() => {
    // Set up listeners for Python communication
    const electron = (window as any).electron;
    
    electron.onPythonStepUpdate((step: string) => {
      setPythonCurrentStep(step);
      setPythonSteps(prev => [...prev, step]);
    });

    electron.onPythonOutput((message: string) => {
      console.log('Python output:', message);
      // You could display this in a toast notification or console
    });

    electron.onPythonError((error: string) => {
      console.error('Python error:', error);
      // Display error in UI
    });

    electron.onPythonRequestInput((request: PyRequestInput) => {
      setPythonInputRequest(request);
    });

    electron.onPythonCommands((commands: Record<string, string>) => {
      setAvailableCommands(commands);
    });

    // Fetch available commands when component mounts
    loadPythonCommands();

    return () => {
      // Clean up event listeners if needed
    };
  }, []);

  // Function to load Python commands
  const loadPythonCommands = async () => {
    try {
      await (window as any).electron.getCommands();
    } catch (error) {
      console.error('Error fetching commands:', error);
    }
  };

  // Handle submit Python input
  const handleSubmitPythonInput = async () => {
    if (!pythonInputRequest) return;
    
    const electron = (window as any).electron;

    try {
      if (pythonInputRequest.input_type === 'file') {
        const filePath = await electron.selectFile({});
        if (filePath) {
          await electron.sendInputToPython(filePath);
        }
      } else if (pythonInputRequest.input_type === 'directory') {
        const dirPath = await electron.selectFolder();
        if (dirPath) {
          await electron.sendInputToPython(dirPath);
        }
      } else {
        await electron.sendInputToPython(pythonInputValue);
      }
      
      setPythonInputRequest(null);
      setPythonInputValue('');
    } catch (error) {
      console.error('Error sending input to Python:', error);
    }
  };

  // Modified function to use Python bridge
  const handleRunSolver = async () => {
    if (!settings.solverPath) {
      alert('Please select the PioSOLVER executable first');
      return;
    }

    try {
      // Initialize the solver with the configured path
      const result = await (window as any).electron.initSolver(settings.solverPath);
      console.log('Solver initialization result:', result);
    } catch (error) {
      console.error('Error initializing solver:', error);
    }
  };

  // Modified function to execute command through Python
  const executeCommand = () => {
    if (currentCommand === CommandMap.NONE) return;
    
    setIsRunning(true);
    setPythonSteps([]);
    setPythonCurrentStep('Initializing command...');
    
    console.log(`Executing command: ${currentCommand}`);
    
    // Convert the command ID to a string command name
    const commandName = getCommandName(currentCommand);
    
    if (!commandName) {
      console.error('Unknown command');
      setIsRunning(false);
      return;
    }
    
    // Execute the command through Python bridge
    (window as any).electron.executeCommand({
      command: commandName,
      args: [] // Add arguments if needed
    }).catch((error: any) => {
      console.error('Error executing command:', error);
      setIsRunning(false);
    });
  };

  // Helper function to get command string name from CommandMap enum
  const getCommandName = (commandEnum: any): string | null => {
    // This will depend on your CommandMap structure
    // Assuming CommandMap has a string name property
    if (typeof commandEnum === 'object' && commandEnum.name) {
      return commandEnum.name;
    }
    return null;
  };

  const cancelCommand = () => {
    setIsRunning(false);
    // Additional cleanup if needed
  };

  // Get the command description using the direct states
  const commandDescription = getCommandDescription(currentCommand);

  // If still loading the settings, show a loading screen
  if (isLoading) {
    return (
      <LoadingScreen>
        <h1>Loading PioSpeed...</h1>
      </LoadingScreen>
    );
  }

  const handleSetupComplete = async (newSettings: typeof settings) => {
    await saveSettings(newSettings);
    await setFirstLaunchComplete();
  };

  return (
    <Background>
      <AppContainer>
        <SettingsButtonContainer>
          <SettingsButton onClick={() => setSettingsModalOpen(true)} />
        </SettingsButtonContainer>
        
        <CenteredHeaderContainer animate={animState}>
          <Header 
            showLogo={true} 
            showTagline={false} 
          />
          
          <TaglineWrapper animate={animState}>
            <div style={{ 
              fontSize: '1.2rem', 
              textAlign: 'center', 
              margin: '1.5rem 0',
              color: '#8493a8',
              fontWeight: 300 
            }}>
              GTO simulations for poker made effortless
            </div>
          </TaglineWrapper>
        </CenteredHeaderContainer>
        
        <MainContent animate={animState}>
          <ContentSection>
            {isRunning ? (
              <ExecutionContainer>
                <ExecutionStatus>
                  <ExecutionTitle>
                    Executing: {typeof currentCommand === 'object' 
                      ? currentCommand.name 
                      : currentCommand}
                  </ExecutionTitle>
                  <StepIndicator>
                    {pythonCurrentStep || currentStep}
                  </StepIndicator>
                  <ProgressBar>
                    <ProgressBarFill />
                  </ProgressBar>
                  {/* Python Input Request UI */}
                  {pythonInputRequest && (
                    <InputRequestContainer>
                      <InputRequestTitle>{pythonInputRequest.prompt || 'Input Requested'}</InputRequestTitle>
                      {pythonInputRequest.input_type === 'text' && (
                        <>
                          <InputField 
                            value={pythonInputValue} 
                            onChange={(e) => setPythonInputValue(e.target.value)} 
                          />
                          <Button onClick={handleSubmitPythonInput}>Submit</Button>
                        </>
                      )}
                      {pythonInputRequest.input_type === 'file' && (
                        <Button onClick={handleSubmitPythonInput}>Select File</Button>
                      )}
                      {pythonInputRequest.input_type === 'directory' && (
                        <Button onClick={handleSubmitPythonInput}>Select Folder</Button>
                      )}
                      {pythonInputRequest.input_type === 'command' && (
                        <CommandSelectionContainer>
                          {pythonInputRequest.commands?.map((cmd) => (
                            <CommandButton 
                              key={cmd}
                              onClick={() => {
                                setPythonInputValue(cmd);
                                handleSubmitPythonInput();
                              }}
                            >
                              {cmd}
                            </CommandButton>
                          ))}
                        </CommandSelectionContainer>
                      )}
                    </InputRequestContainer>
                  )}
                  <CancelButton onClick={cancelCommand}>
                    Cancel
                  </CancelButton>
                </ExecutionStatus>
                {/* Show steps history */}
                {pythonSteps.length > 0 && (
                  <StepsHistory>
                    {pythonSteps.map((step, index) => (
                      <StepItem key={index} completed={true}>
                        {step}
                      </StepItem>
                    ))}
                  </StepsHistory>
                )}
              </ExecutionContainer>
            ) : (
              <CommandSelectionContainer>
                <DescriptionText>
                  {getCommandDescription(currentCommand)}
                </DescriptionText>
                
                <CommandPalette>
                  <ToggleGroup>
                    <ToggleLabel>Nodelock</ToggleLabel>
                    <ToggleContainer>
                      <ToggleOption 
                        active={!isNodelock} 
                        onClick={() => solveType !== 'getResults' && setIsNodelock(false)}
                        style={{ 
                          opacity: solveType === 'getResults' ? 0.5 : 1,
                          cursor: solveType === 'getResults' ? 'not-allowed' : 'pointer'
                        }}
                      >
                        Off
                      </ToggleOption>
                      <ToggleOptionDivider>|</ToggleOptionDivider>
                      <ToggleOption 
                        active={isNodelock} 
                        onClick={() => solveType !== 'getResults' && setIsNodelock(true)}
                        style={{ 
                          opacity: solveType === 'getResults' ? 0.5 : 1,
                          cursor: solveType === 'getResults' ? 'not-allowed' : 'pointer'
                        }}
                      >
                        On
                      </ToggleOption>
                    </ToggleContainer>
                  </ToggleGroup>
                  
                  <ToggleGroup>
                    <ToggleLabel>Solve Mode</ToggleLabel>
                    <ToggleContainer>
                      <ToggleOption 
                        active={solveType === 'none'} 
                        onClick={() => setSolveType('none')}
                      >
                        None
                      </ToggleOption>
                      <ToggleOptionDivider>|</ToggleOptionDivider>
                      <ToggleOption 
                        active={solveType === 'solve'} 
                        onClick={() => setSolveType('solve')}
                      >
                        Solve
                      </ToggleOption>
                      <ToggleOptionDivider>|</ToggleOptionDivider>
                      <ToggleOption 
                        active={solveType === 'getResults'} 
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
                        active={saveType === 'full'} 
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
                        active={saveType === 'mini'} 
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
                        active={saveType === 'tiny'} 
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
                
                {/* Add available Python commands if needed */}
                {Object.entries(availableCommands).length > 0 && (
                  <CommandCategoryContainer>
                    <CategoryTitle>Available Commands:</CategoryTitle>
                    <CommandGrid>
                      {Object.entries(availableCommands).map(([cmdName, description]) => (
                        <CommandButton 
                          key={cmdName}
                          onClick={() => {
                            // Map Python command to UI command
                            // This depends on your CommandMap structure
                            const mappedCommand = mapPythonCommandToUI(cmdName);
                            if (mappedCommand) {
                              setCurrentCommand(mappedCommand);
                              setHasCommandSelected(true);
                            }
                          }}
                        >
                          {cmdName}
                          {description && <CommandDescription>{description}</CommandDescription>}
                        </CommandButton>
                      ))}
                    </CommandGrid>
                  </CommandCategoryContainer>
                )}
              </CommandSelectionContainer>
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
        
        {/* First-time Setup Wizard */}
        <SetupWizard 
          isOpen={isFirstLaunch} 
          onComplete={handleSetupComplete} 
        />
      </AppContainer>
    </Background>
  );
};

// Helper function to map Python commands to UI commands
const mapPythonCommandToUI = (pythonCommand: string) => {
  // Implement the mapping logic based on your command structure
  // This is placeholder code - adjust according to your actual CommandMap structure
  return {
    name: pythonCommand,
    description: '', // Add description if available
    id: pythonCommand
  };
};

// Add styled components for the new Python UI elements
const InputRequestContainer = styled.div`
  margin-top: 20px;
  padding: 15px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const InputRequestTitle = styled.div`
  font-size: 1rem;
  font-weight: 500;
  margin-bottom: 10px;
`;

const InputField = styled.input`
  padding: 8px 12px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(0, 0, 0, 0.3);
  color: #fff;
  font-size: 1rem;
  
  &:focus {
    outline: none;
    border-color: #3f8cff;
  }
`;

const StepsHistory = styled.div`
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const StepItem = styled.div<{ completed: boolean }>`
  padding: 8px 12px;
  background: ${props => props.completed ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)'};
  border-left: 3px solid ${props => props.completed ? '#00ff00' : '#aaa'};
  border-radius: 4px;
  font-size: 0.9rem;
  color: ${props => props.completed ? '#fff' : '#aaa'};
`;

const CommandCategoryContainer = styled.div`
  margin-top: 20px;
`;

const CategoryTitle = styled.h3`
  font-size: 1.1rem;
  margin-bottom: 10px;
  color: #fff;
  font-weight: 500;
`;

const CommandGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
`;

const CommandDescription = styled.div`
  font-size: 0.8rem;
  color: #aaa;
  margin-top: 5px;
`;

const CommandButton = styled.button`
  background: rgba(25, 38, 56, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  padding: 12px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  
  &:hover {
    background: rgba(63, 140, 255, 0.2);
    border-color: rgba(63, 140, 255, 0.5);
  }
`;

const CommandSelectionContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 15px;
  width: 100%;
`;

const StepIndicator = styled.div`
  font-size: 1.2rem;
  color: #fff;
  margin: 15px 0;
  font-weight: 300;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 6px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  margin: 15px 0;
  overflow: hidden;
  position: relative;
`;

const ProgressBarFill = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 30%;
  background: linear-gradient(90deg, #3f8cff, #2fd8d8);
  border-radius: 3px;
  animation: progress 2s infinite ease-in-out;
  
  @keyframes progress {
    0% { width: 0; left: 0; }
    50% { width: 30%; }
    100% { width: 0; left: 100%; }
  }
`;

const CancelButton = styled.button`
  background: rgba(255, 100, 100, 0.2);
  border: 1px solid rgba(255, 100, 100, 0.4);
  color: #fff;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  margin-top: 20px;
  align-self: flex-end;
  
  &:hover {
    background: rgba(255, 100, 100, 0.3);
    border-color: rgba(255, 100, 100, 0.6);
  }
`;

const App: React.FC = () => {
  return (
    <RecoilRoot>
      <RecoilApp />
    </RecoilRoot>
  );
};

export default App; 