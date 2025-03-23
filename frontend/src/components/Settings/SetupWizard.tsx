import React, { useState } from 'react';
import styled from 'styled-components';
import Modal from '../UI/Modal';
import Button from '../UI/Button';
import Input from '../UI/Input';
import PathDisplay from '../UI/PathDisplay';
import { AppSettings } from './SettingsModal';

interface SetupWizardProps {
  isOpen: boolean;
  onComplete: (settings: AppSettings) => void;
}

const WizardContent = styled.div`
  min-height: 300px;
  display: flex;
  flex-direction: column;
`;

const StepContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const StepTitle = styled.h2`
  color: ${({ theme }) => theme.colors.textHighlight};
  margin-bottom: ${({ theme }) => theme.spacing.medium};
`;

const StepDescription = styled.p`
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing.large};
  line-height: 1.5;
`;

const PathRow = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.medium};
  gap: ${({ theme }) => theme.spacing.medium};
`;

const PathContainer = styled.div`
  flex: 1;
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: ${({ theme }) => theme.spacing.xl};
`;

const ProgressIndicator = styled.div`
  display: flex;
  justify-content: center;
  margin-top: ${({ theme }) => theme.spacing.large};
  gap: ${({ theme }) => theme.spacing.small};
`;

const ProgressDot = styled.div<{ active: boolean }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: ${({ active, theme }) => 
    active ? theme.colors.primary : theme.colors.border};
  transition: ${({ theme }) => theme.transitions.normal};
`;

const SetupWizard: React.FC<SetupWizardProps> = ({ isOpen, onComplete }) => {
  const [step, setStep] = useState(0);
  const [settings, setSettings] = useState<AppSettings>({
    solverPath: null,
    cfrFolder: null,
    strategiesFolder: null,
    nodeBookFolder: null,
    accuracy: 0.02,
  });

  const totalSteps = 4;

  const handleNext = () => {
    if (step < totalSteps - 1) {
      setStep(prev => prev + 1);
    } else {
      onComplete(settings);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(prev => prev - 1);
    }
  };

  const handleSelectPath = async (key: keyof AppSettings) => {
    let path: string | null = null;
    
    if (key === 'solverPath') {
      path = await window.electron.selectSolverPath();
    } else {
      path = await window.electron.selectFolder();
    }
    
    if (path) {
      setSettings(prev => ({ ...prev, [key]: path }));
    }
  };

  const handleAccuracyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      setSettings(prev => ({ ...prev, accuracy: value }));
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <StepContainer>
            <StepTitle>Welcome to PioSpeed</StepTitle>
            <StepDescription>
              This setup wizard will help you configure the application for first use.
              You'll need to specify the location of your PioSOLVER executable and set
              up folders for storing calculation results.
            </StepDescription>
            <StepDescription>
              Let's get started by locating your PioSOLVER executable.
            </StepDescription>
            
            <PathRow>
              <PathContainer>
                <PathDisplay 
                  path={settings.solverPath} 
                  placeholder="Click 'Browse' to select your PioSOLVER executable" 
                />
              </PathContainer>
              <Button 
                variant="secondary" 
                onClick={() => handleSelectPath('solverPath')}
              >
                Browse
              </Button>
            </PathRow>
          </StepContainer>
        );
      
      case 1:
        return (
          <StepContainer>
            <StepTitle>CFR Folder</StepTitle>
            <StepDescription>
              Select a folder where PioSpeed will store CFR (Counterfactual Regret) files.
              These files contain the core solver data.
            </StepDescription>
            
            <PathRow>
              <PathContainer>
                <PathDisplay 
                  path={settings.cfrFolder} 
                  placeholder="Click 'Browse' to select your CFR folder" 
                />
              </PathContainer>
              <Button 
                variant="secondary" 
                onClick={() => handleSelectPath('cfrFolder')}
              >
                Browse
              </Button>
            </PathRow>
          </StepContainer>
        );
      
      case 2:
        return (
          <StepContainer>
            <StepTitle>Additional Folders</StepTitle>
            <StepDescription>
              Select folders for strategies and nodeBook files. These store weights
              and board configurations for your solver calculations.
            </StepDescription>
            
            <PathRow>
              <PathContainer>
                <Input label="Strategies Folder" disabled />
                <PathDisplay 
                  path={settings.strategiesFolder} 
                  placeholder="Click 'Browse' to select strategies folder" 
                />
              </PathContainer>
              <Button 
                variant="secondary" 
                onClick={() => handleSelectPath('strategiesFolder')}
              >
                Browse
              </Button>
            </PathRow>
            
            <PathRow>
              <PathContainer>
                <Input label="NodeBook Folder" disabled />
                <PathDisplay 
                  path={settings.nodeBookFolder} 
                  placeholder="Click 'Browse' to select nodeBook folder" 
                />
              </PathContainer>
              <Button 
                variant="secondary" 
                onClick={() => handleSelectPath('nodeBookFolder')}
              >
                Browse
              </Button>
            </PathRow>
          </StepContainer>
        );
      
      case 3:
        return (
          <StepContainer>
            <StepTitle>Solver Settings</StepTitle>
            <StepDescription>
              Set the accuracy for solver calculations. Lower values give more accurate results
              but take longer to compute. The recommended default is 0.02 (2% of pot).
            </StepDescription>
            
            <Input 
              label="Accuracy (as a fraction of pot)" 
              type="number"
              step="0.01"
              min="0.001"
              max="0.1"
              value={settings.accuracy.toString()}
              onChange={handleAccuracyChange}
            />
            
            <StepDescription>
              Click "Complete Setup" to finish configuration and start using PioSpeed.
              You can always change these settings later through the settings menu.
            </StepDescription>
          </StepContainer>
        );
      
      default:
        return null;
    }
  };

  // Check if the current step is valid (i.e., has required fields filled)
  const isStepValid = () => {
    switch (step) {
      case 0:
        return !!settings.solverPath;
      case 1:
        return !!settings.cfrFolder;
      case 2:
        return !!settings.strategiesFolder && !!settings.nodeBookFolder;
      case 3:
        return settings.accuracy > 0 && settings.accuracy <= 0.1;
      default:
        return false;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => {}} title="PioSpeed Setup" width="600px">
      <WizardContent>
        {renderStep()}
        
        <ProgressIndicator>
          {Array.from({ length: totalSteps }).map((_, index) => (
            <ProgressDot key={index} active={index === step} />
          ))}
        </ProgressIndicator>
        
        <ButtonContainer>
          <Button 
            variant="secondary" 
            onClick={handleBack} 
            disabled={step === 0}
          >
            Back
          </Button>
          <Button 
            onClick={handleNext} 
            disabled={!isStepValid()}
          >
            {step === totalSteps - 1 ? 'Complete Setup' : 'Next'}
          </Button>
        </ButtonContainer>
      </WizardContent>
    </Modal>
  );
};

export default SetupWizard; 