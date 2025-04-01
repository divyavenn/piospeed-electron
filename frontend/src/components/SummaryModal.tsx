import React from 'react';
import { 
  ModalOverlay, 
  ModalContainer, 
  ModalTitle, 
  ModalMessage, 
  ModalButtonContainer, 
  ModalButton 
} from '../styles/AppStyles';
import styled from 'styled-components';

interface CommandSummaryProps {
  isOpen: boolean;
  onClose: () => void;
  summary: {
    command: string;
    processed_files: string[];
    weights_file: string;
    board_file: string;
    results_path: string;
  } | null;
}

const SummarySection = styled.div`
  margin-bottom: 16px;
`;

const SummaryTitle = styled.h4`
  margin-top: 0;
  margin-bottom: 8px;
  font-size: 16px;
  color: ${({ theme }) => theme.colors.primary};
  font-family: 'JetBrains Mono', monospace;
`;

const SummaryContent = styled.div`
  background-color: rgba(0, 0, 0, 0.2);
  padding: 8px 12px;
  border-radius: 6px;
  max-height: 150px;
  overflow-y: auto;
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.textLight};
`;

const FileList = styled.ul`
  margin: 0;
  padding-left: 20px;
`;

const CommandSummaryModal: React.FC<CommandSummaryProps> = ({ isOpen, onClose, summary }) => {
  if (!summary || !isOpen) return null;
  
  // Format the command name for display
  const getCommandDisplayName = (command: string) => {
    return command
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <ModalOverlay>
      <ModalContainer>
        <ModalTitle>Command Execution Summary</ModalTitle>
        
        <SummarySection>
          <SummaryTitle>Command</SummaryTitle>
          <SummaryContent>{getCommandDisplayName(summary.command)}</SummaryContent>
        </SummarySection>
        
        <SummarySection>
          <SummaryTitle>Processed Files</SummaryTitle>
          <SummaryContent>
            <FileList>
              {summary.processed_files.map((file, index) => (
                <li key={index}>{file}</li>
              ))}
            </FileList>
          </SummaryContent>
        </SummarySection>
        
        <SummarySection>
          <SummaryTitle>Weights File</SummaryTitle>
          <SummaryContent>{summary.weights_file}</SummaryContent>
        </SummarySection>
        
        <SummarySection>
          <SummaryTitle>Board File</SummaryTitle>
          <SummaryContent>{summary.board_file}</SummaryContent>
        </SummarySection>
        
        <SummarySection>
          <SummaryTitle>Results Path</SummaryTitle>
          <SummaryContent>{summary.results_path}</SummaryContent>
        </SummarySection>
        
        <ModalButtonContainer>
          <ModalButton onClick={onClose}>OK</ModalButton>
        </ModalButtonContainer>
      </ModalContainer>
    </ModalOverlay>
  );
};

export default CommandSummaryModal;