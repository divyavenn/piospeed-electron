import React from 'react';
import styled, { css } from 'styled-components';

// Button variants
type ButtonVariant = 'primary' | 'secondary' | 'command';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  isFullWidth?: boolean;
  children: React.ReactNode;
}

// Styled button with variants
const StyledButton = styled.button<{ 
  $variant: ButtonVariant; 
  $isFullWidth: boolean; 
  disabled: boolean;
}>`
  padding: ${({ theme }) => `${theme.spacing.normal} ${theme.spacing.large}`};
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.normal};
  cursor: pointer;
  font-size: ${({ theme }) => theme.sizes.normal};
  font-weight: 500;
  transition: ${({ theme }) => theme.transitions.normal};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.small};
  width: ${({ $isFullWidth }) => $isFullWidth ? '100%' : 'auto'};
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.shadows.normal};
  }
  
  &:active:not(:disabled) {
    transform: translateY(0);
  }
  
  ${({ $variant, disabled, theme }) => {
    if (disabled) {
      return css`
        background-color: ${theme.colors.disabled};
        color: ${theme.colors.text};
        cursor: not-allowed;
        opacity: 0.7;
        box-shadow: none;
        &:hover {
          transform: none;
        }
      `;
    }
    
    switch ($variant) {
      case 'primary':
        return css`
          background-color: ${theme.colors.primary};
          color: ${theme.colors.textHighlight};
          box-shadow: ${theme.shadows.glow};
          animation: pulse 2s infinite;
          
          &:hover {
            background-color: ${theme.colors.primaryDark};
          }
        `;
      case 'secondary':
        return css`
          background-color: ${theme.colors.surfaceLight};
          color: ${theme.colors.text};
          border: 1px solid ${theme.colors.border};
          
          &:hover {
            background-color: ${theme.colors.surfaceBorder};
          }
        `;
      case 'command':
        return css`
          background-color: ${theme.colors.secondary};
          color: ${theme.colors.textHighlight};
          margin: 5px;
          font-weight: 500;
          min-height: 60px;
          padding: ${theme.spacing.medium};
          box-shadow: ${theme.shadows.small};
          
          &:hover {
            background-color: ${theme.colors.secondaryDark};
          }
        `;
      default:
        return '';
    }
  }}
`;

// Button component
const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  isFullWidth = false,
  disabled = false,
  children,
  ...props
}) => {
  return (
    <StyledButton
      $variant={variant}
      $isFullWidth={isFullWidth}
      disabled={disabled}
      {...props}
    >
      {children}
    </StyledButton>
  );
};

export default Button; 