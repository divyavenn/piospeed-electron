import styled, { keyframes, css } from 'styled-components';
import { AnimationState } from '../recoil/atoms';
import Button from '../components/UI/Button';

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

export const AppContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: ${({ theme }) => theme.spacing.large};
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
`;

export const SettingsButtonContainer = styled.div`
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 20;
`;

export const CenteredHeaderContainer = styled.div<{ $animate: AnimationState }>`
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

export const TaglineWrapper = styled.div<{ $animate: AnimationState }>`
  opacity: ${({ $animate }) => $animate === 'commandPalette' || $animate === 'moveUp' ? 0 : 1};
  transition: opacity 0.5s ease-out;
  animation: ${({ $animate }) => 
    $animate === 'moveUp' 
      ? css`${fadeOut} 0.5s ease-out forwards` 
      : 'none'};
  display: ${({ $animate }) => $animate === 'commandPalette' ? 'none' : 'block'};
`;

export const MainContent = styled.div<{ $animate: AnimationState }>`
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

export const ContentSection = styled.div`
  width: 100%;
  max-width: 800px;
  padding: ${({ theme }) => theme.spacing.medium};
  display: flex;
  flex-direction: column;
  align-items: center;
`;

export const LoadingScreen = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  color: ${({ theme }) => theme.colors.textHighlight};
  background-color: ${({ theme }) => theme.colors.background};
`;

export const DescriptionText = styled.p`
  margin-bottom: 50px;
  font-size: 1.1em;
  color: ${({ theme }) => theme.colors.textFaded};
  line-height: 1.5;
  text-align: center;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
`;

export const CommandPalette = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.medium};
  margin-bottom: ${({ theme }) => theme.spacing.large};
  width: 100%;
  max-width: 700px;
`;

export const ToggleGroup = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 180px;
`;

export const ToggleLabel = styled.div`
  color: ${({ theme }) => theme.colors.textFaded};
  margin-bottom: ${({ theme }) => theme.spacing.small};
  font-size: 0.85rem;
  letter-spacing: 0.5px;
  text-align: center;
`;

export const ToggleContainer = styled.div`
  display: flex;
  align-items: center;
  background-color: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.borderRadius.normal};
  padding: ${({ theme }) => theme.spacing.xs};
  box-shadow: ${({ theme }) => theme.shadows.small};
`;

export const ToggleOption = styled.span<{ $active: boolean }>`
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

export const ToggleOptionDivider = styled.span`
  margin: 0 ${({ theme }) => theme.spacing.xs};
  color: ${({ theme }) => theme.colors.textFaded};
`;

export const ExecutionContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  padding: ${({ theme }) => theme.spacing.large};
`;

export const ExecutionStatus = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  margin-bottom: ${({ theme }) => theme.spacing.large};
`;

export const ExecutionTitle = styled.h2`
  color: ${({ theme }) => theme.colors.primary};
  margin-bottom: ${({ theme }) => theme.spacing.medium};
  animation: ${pulseAnimation} 2s infinite ease-in-out;
`;

export const ExecutionStep = styled.div`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.textHighlight};
  margin-top: ${({ theme }) => theme.spacing.medium};
`;

export const Spinner = styled.div`
  width: 50px;
  height: 50px;
  border: 4px solid ${({ theme }) => theme.colors.surfaceLight};
  border-top: 4px solid ${({ theme }) => theme.colors.primary};
  border-radius: 50%;
  animation: ${spinAnimation} 1s linear infinite;
  margin: ${({ theme }) => theme.spacing.large} 0;
`;

export const ExecuteButton = styled(Button)`
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

export const CommandDescriptionText = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-top: ${({ theme }) => theme.spacing.xs};
  margin-bottom: ${({ theme }) => theme.spacing.small};
  min-height: 40px;
`;

export const Tagline = styled.div`
  font-size: ${({ theme }) => theme.sizes.large};
  color: ${({ theme }) => theme.colors.textFaded};
  margin-top: ${({ theme }) => theme.spacing.medium};
  text-align: center;
`;

export const ErrorText = styled.div`
  color: #ff4444;
  font-size: 1.2rem;
  text-align: center;
  margin-bottom: 1rem;
  font-weight: 500;
`; 