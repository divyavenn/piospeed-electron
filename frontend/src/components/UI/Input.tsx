import React from 'react';
import styled from 'styled-components';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  fullWidth?: boolean;
}

const InputContainer = styled.div<{ fullWidth?: boolean }>`
  margin-bottom: ${({ theme }) => theme.spacing.medium};
  width: ${({ fullWidth }) => fullWidth ? '100%' : 'auto'};
`;

const InputLabel = styled.label`
  display: block;
  margin-bottom: ${({ theme }) => theme.spacing.small};
  color: ${({ theme }) => theme.colors.textFaded};
  font-size: ${({ theme }) => theme.sizes.small};
`;

const StyledInput = styled.input`
  width: 100%;
  padding: ${({ theme }) => theme.spacing.normal};
  background-color: ${({ theme }) => theme.colors.surfaceLight};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.normal};
  color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.fonts.primary};
  font-size: ${({ theme }) => theme.sizes.normal};
  transition: ${({ theme }) => theme.transitions.fast};
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 2px rgba(57, 97, 251, 0.2);
  }
  
  &::placeholder {
    color: ${({ theme }) => theme.colors.disabled};
  }
  
  &:disabled {
    background-color: ${({ theme }) => theme.colors.background};
    cursor: not-allowed;
    opacity: 0.7;
  }
`;

const ErrorText = styled.div`
  color: ${({ theme }) => theme.colors.error};
  font-size: ${({ theme }) => theme.sizes.small};
  margin-top: ${({ theme }) => theme.spacing.xs};
  min-height: 18px;
`;

const Input: React.FC<InputProps> = ({ 
  label, 
  error, 
  fullWidth = true,
  ...props 
}) => {
  const id = `input-${label.toLowerCase().replace(/\s+/g, '-')}`;
  
  return (
    <InputContainer fullWidth={fullWidth}>
      <InputLabel htmlFor={id}>{label}</InputLabel>
      <StyledInput id={id} {...props} />
      <ErrorText>{error || ''}</ErrorText>
    </InputContainer>
  );
};

export default Input; 