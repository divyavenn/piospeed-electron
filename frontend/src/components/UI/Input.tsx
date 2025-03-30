import React from 'react';
import styled from 'styled-components';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  fullWidth?: boolean;
}

const InputContainer = styled.div<{ $fullWidth?: boolean }>`
  margin-bottom: ${({ theme }) => theme.spacing.medium};
  width: ${({ $fullWidth }) => $fullWidth ? '100%' : 'auto'};
`;

const InputLabel = styled.label`
  display: block;
  margin-bottom: ${({ theme }) => theme.spacing.small};
  color: ${({ theme }) => theme.colors.textFaded};
  font-size: ${({ theme }) => theme.sizes.small};
`;

interface StyledInputProps {
  error?: string;
}

const StyledInput = styled.input<StyledInputProps>`
  width: 100%;
  padding: ${({ theme }) => theme.spacing.medium};
  background-color: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme, error }) => error ? theme.colors.error : theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.normal};
  font-size: ${({ theme }) => theme.sizes.normal};
  color: ${({ theme }) => theme.colors.text};
  transition: all 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 2px rgba(57, 97, 251, 0.2);
  }
  
  &::placeholder {
    color: ${({ theme }) => theme.colors.textFaded};
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
  min-height: 20px;
`;

const Input: React.FC<InputProps> = ({ 
  label, 
  error, 
  fullWidth = true,
  ...props 
}) => {
  const id = `input-${label.toLowerCase().replace(/\s+/g, '-')}`;
  
  return (
    <InputContainer $fullWidth={fullWidth}>
      <InputLabel htmlFor={id}>{label}</InputLabel>
      <StyledInput id={id} error={error} {...props} />
      <ErrorText>{error || ''}</ErrorText>
    </InputContainer>
  );
};

export default Input;