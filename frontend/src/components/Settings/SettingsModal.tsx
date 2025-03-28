import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import Modal from '../UI/Modal';
import Input from '../UI/Input';
import Button from '../UI/Button';
import PathDisplay from '../UI/PathDisplay';

// Settings configuration interface
export interface AppSettings {
  solverPath: string | null;
  cfrFolder: string | null;
  weights: string | null;
  nodeBook: string | null;
  accuracy: number;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
}

const FormSection = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.large};
`;

const SectionTitle = styled.h3`
  margin-bottom: ${({ theme }) => theme.spacing.medium};
  color: ${({ theme }) => theme.colors.textHighlight};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  padding-bottom: ${({ theme }) => theme.spacing.small};
`;

const ButtonRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.medium};
  margin-top: ${({ theme }) => theme.spacing.large};
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

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) => {
  const [formValues, setFormValues] = useState<AppSettings>({
    solverPath: null,
    cfrFolder: null,
    weights: null,
    nodeBook: null,
    accuracy: 0.02,
  });

  // Initialize form with current settings
  useEffect(() => {
    if (isOpen) {
      setFormValues({
        ...settings
      });
    }
  }, [isOpen, settings]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Handle accuracy as a number
    if (name === 'accuracy') {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        setFormValues(prev => ({ ...prev, [name]: numValue }));
      }
    } else {
      setFormValues(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSelectPath = async (key: keyof AppSettings) => {
    let path: string | null = null;
    
    // Configure dialog options based on the setting type
    if (key === 'solverPath') {
      // For solver path, we want to select an executable file
      path = await window.electron.selectPath({
        type: 'file',
        title: 'Select Solver Executable',
        filters: [
          { name: 'Executables', extensions: ['exe', ''] }, // Empty string for macOS/Linux executables
        ]
      });
    } else if (key === 'cfrFolder' || key === 'weights' || key === 'nodeBook') {
      // For folders, we want to select a directory
      path = await window.electron.selectPath({
        type: 'directory',
        title: `Select ${key.charAt(0).toUpperCase() + key.slice(1)} Directory`
      });
    }
    
    if (path) {
      setFormValues(prev => ({ ...prev, [key]: path }));
    }
  };

  const handleSave = () => {
    onSaveSettings(formValues);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settings" width="600px">
      <FormSection>
        <SectionTitle>PioSOLVER Configuration</SectionTitle>
        
        <PathRow>
          <PathContainer>
            <Input 
              label="PioSOLVER Path" 
              name="solverPath"
              value={formValues.solverPath || ''}
              onChange={handleChange}
              disabled
            />
            <PathDisplay path={formValues.solverPath} placeholder="No solver selected" />
          </PathContainer>
          <Button 
            variant="secondary" 
            onClick={() => handleSelectPath('solverPath')}
          >
            Browse
          </Button>
        </PathRow>
      </FormSection>

      <FormSection>
        <SectionTitle>Folders Configuration</SectionTitle>
        
        <PathRow>
          <PathContainer>
            <Input 
              label="CFR Folder" 
              name="cfrFolder"
              value={formValues.cfrFolder || ''}
              onChange={handleChange}
              disabled
            />
            <PathDisplay path={formValues.cfrFolder} placeholder="No CFR folder selected" />
          </PathContainer>
          <Button 
            variant="secondary" 
            onClick={() => handleSelectPath('cfrFolder')}
          >
            Browse
          </Button>
        </PathRow>
        
        <PathRow>
          <PathContainer>
            <Input 
              label="Strategies Folder" 
              name="strategiesFolder"
              value={formValues.weights || ''}
              onChange={handleChange}
              disabled
            />
            <PathDisplay path={formValues.weights} placeholder="No strategy file selected" />
          </PathContainer>
          <Button 
            variant="secondary" 
            onClick={() => handleSelectPath('weights')}
          >
            Browse
          </Button>
        </PathRow>
        
        <PathRow>
          <PathContainer>
            <Input 
              label="NodeBook Folder" 
              name="nodeBookFolder"
              value={formValues.nodeBook || ''}
              onChange={handleChange}
              disabled
            />
            <PathDisplay path={formValues.nodeBook} placeholder="No nodeBook selected" />
          </PathContainer>
          <Button 
            variant="secondary" 
            onClick={() => handleSelectPath('nodeBook')}
          >
            Browse
          </Button>
        </PathRow>
      </FormSection>

      <FormSection>
        <SectionTitle>Solver Parameters</SectionTitle>
        <Input 
          label="Accuracy (as a fraction of pot, e.g. 0.02)" 
          name="accuracy"
          type="number"
          step="0.01"
          min="0.001"
          max="0.1"
          value={formValues.accuracy.toString()}
          onChange={handleChange}
        />
      </FormSection>

      <ButtonRow>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave}>
          Save Settings
        </Button>
      </ButtonRow>
    </Modal>
  );
};

export default SettingsModal; 