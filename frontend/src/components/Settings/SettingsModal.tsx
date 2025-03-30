import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import Modal from '../UI/Modal';
import Input from '../UI/Input';
import Button from '../UI/Button';
import PathDisplay from '../UI/PathDisplay';
import { FaSearch } from 'react-icons/fa';
import { useRecoilState } from 'recoil';
import { accuracyState } from '../../recoil/atoms';

// Settings configuration interface
export interface AppSettings {
  solverPath: string | null;
  cfrFolder: string | null;
  weights: string | null;
  nodeBook: string | null;
  accuracy: number;
  resultsPath: string | null;
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
  justify-content: center;
  margin-top: ${({ theme }) => theme.spacing.large};
`;

const SaveButton = styled.button`
  background-color: #3961fb;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 10px 20px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(57, 97, 251, 0.3);
  transition: background-color 0.2s ease;

  &:hover {
    background-color: #2a4cd7;
  }

  &:active {
    background-color: #1e3bb8;
    transform: translateY(1px);
  }
`;

const PathRow = styled.div`
  display: flex;
  align-items: center;
`;

const PathContainer = styled.div`
  flex: 1;
  position: relative;
`;

const SearchIconButton = styled.button`
  position: absolute;
  right: 10px;
  top: 38px;
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.textFaded};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 5px;
  border-radius: 4px;
  transition: all 0.2s ease;
  z-index: 10;

  &:hover {
    color: ${({ theme }) => theme.colors.textHighlight};
    background-color: rgba(255, 255, 255, 0.05);
  }
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
    resultsPath: null,
  });
  const [, setAccuracy] = useRecoilState(accuracyState);

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
      const numValue = value === '' ? 0 : parseFloat(value);
      if (!isNaN(numValue) && numValue > 0 && numValue < 1) {
        setFormValues(prev => ({ ...prev, accuracy: numValue }));
        setAccuracy(numValue);
        window.electron.setAccuracy(numValue);
      }
    } else {
      setFormValues(prev => ({ ...prev, [name]: value }));
    }
  };

  useEffect(() => {
    const handleAccuracyUpdate = (value: number) => {
      setFormValues(prev => ({ ...prev, accuracy: value }));
    };

    window.electron.onAccuracyUpdated(handleAccuracyUpdate);

    return () => {
      window.electron.removeAccuracyListener(handleAccuracyUpdate);
    };
  }, []);

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
    } else if (key === 'cfrFolder' || key === 'weights' || key === 'nodeBook' || key === 'resultsPath') {
      // For folders, we want to select a directory
      path = await window.electron.selectPath({
        type: 'directory',
        title: `Select ${key.charAt(0).toUpperCase() + key.slice(1)} Directory`
      });
    }
    
    if (path) {
      const updatedValues = { ...formValues, [key]: path };
      setFormValues(updatedValues);
      
      // If solver path is selected, immediately send it to Python to attempt connection
      if (key === 'solverPath') {
        try {
          window.electron.sendToPython({ type: "solverPath", data: path });
          
          // Immediately save the settings when solver path is selected
          onSaveSettings(updatedValues);
          
        } catch (error) {
          console.error('Error sending solver path to Python:', error);
        }
      }
    }
  };

  const handleSave = async () => {
    const accuracy = parseFloat(formValues.accuracy.toString());
    if (isNaN(accuracy) || accuracy <= 0 || accuracy >= 1) {
      await window.electron.showError('Accuracy must be between 0 and 1');
      return;
    }
    
    setAccuracy(accuracy);
    await window.electron.setAccuracy(accuracy);

    console.log('Saving settings:', formValues);
    onSaveSettings(formValues);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settings" width="600px">
      <FormSection>
        <SectionTitle>Configuration</SectionTitle>
        
        <PathRow>
          <PathContainer>
            <Input 
              label="PioSOLVER Path" 
              name="solverPath"
              value={formValues.solverPath || ''}
              onChange={handleChange}
              disabled
            />
            <SearchIconButton onClick={() => handleSelectPath('solverPath')} title="Browse for PioSOLVER">
              <FaSearch size={16} />
            </SearchIconButton>
          </PathContainer>
        </PathRow>
        <PathRow>
          <PathContainer>
            <Input 
              label="CFR Folder" 
              name="cfrFolder"
              value={formValues.cfrFolder || ''}
              onChange={handleChange}
              disabled
            />
            <SearchIconButton onClick={() => handleSelectPath('cfrFolder')} title="Browse for CFR Folder">
              <FaSearch size={16} />
            </SearchIconButton>
          </PathContainer>
        </PathRow>
        
        <PathRow>
          <PathContainer>
            <Input 
              label="Strategies Folder" 
              name="weights"
              value={formValues.weights || ''}
              onChange={handleChange}
              disabled
            />
            <SearchIconButton onClick={() => handleSelectPath('weights')} title="Browse for Strategies Folder">
              <FaSearch size={16} />
            </SearchIconButton>
          </PathContainer>
        </PathRow>
        
        <PathRow>
          <PathContainer>
            <Input 
              label="NodeBook Folder" 
              name="nodeBook"
              value={formValues.nodeBook || ''}
              onChange={handleChange}
              disabled
            />
            <SearchIconButton onClick={() => handleSelectPath('nodeBook')} title="Browse for NodeBook Folder">
              <FaSearch size={16} />
            </SearchIconButton>
          </PathContainer>
        </PathRow>
        <PathRow>
          <PathContainer>
            <Input 
              label="Results Folder" 
              name="resultsPath"
              value={formValues.resultsPath || ''}
              onChange={handleChange}
              disabled
            />
            <SearchIconButton onClick={() => handleSelectPath('resultsPath')} title="Browse for Results Folder">
              <FaSearch size={16} />
            </SearchIconButton>
          </PathContainer>
        </PathRow>
        <Input 
          label="Accuracy (as a fraction of pot, e.g. 0.02)" 
          name="accuracy"
          type="number"
          value={formValues.accuracy.toString()}
          onChange={handleChange}
        />
      </FormSection>

      <ButtonRow>
        <SaveButton onClick={handleSave}>
          save
        </SaveButton>
      </ButtonRow>
    </Modal>
  );
};

export default SettingsModal;