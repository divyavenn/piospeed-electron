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
  width: 100%;
  position: relative;
  overflow-x: hidden;
`;

export const SettingsButtonContainer = styled.div`
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 20;
  margin-right: 60px;
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
  transition: all 0.3s ease;
  
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

export const DescriptionText = styled.p<{ $animate?: AnimationState }>`
  font-size: 1em;
  color: ${({ theme }) => theme.colors.accent};
  line-height: 1.5;
  text-align: center;
  max-width: 600px;
  margin-top:100px;
  margin-bottom:50px;
  margin-left: auto;
  margin-right: auto;
  opacity: 0.8;
  font-weight: 300;
  margin-bottom: 30px;
  padding: 15px 25px;
  background-color: rgba(0, 0, 0, 0);
  backdrop-filter: blur(10px);
  border-radius: 15px;

  opacity: ${({ $animate }) => $animate === 'commandPalette' ? 1 : 0};
  visibility: ${({ $animate }) => $animate === 'commandPalette' ? 'visible' : 'hidden'};
  transition: opacity 0.8s ease-in-out, visibility 0.8s ease-in-out;
`;

export const CommandPalette = styled.div<{ $animate?: AnimationState }>`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing.large};
  margin-bottom: ${({ theme }) => theme.spacing.large};
  align-items: center;
  width: 100%;
  max-width: 700px;
  opacity: ${({ $animate }) => $animate === 'commandPalette' ? 1 : 0};
  visibility: ${({ $animate }) => $animate === 'commandPalette' ? 'visible' : 'hidden'};
  transition: opacity 0.8s ease-in-out, visibility 0.8s ease-in-out;
  margin-bottom: 100px;
`;

export const Toggles = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.large};
  margin-bottom: 100px;
  flex-wrap: wrap;
`;

export const ToggleGroup = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  margin-bottom: ${({ theme }) => theme.spacing.medium};
  width: auto;
  min-width: 150px;
`;

export const ToggleLabel = styled.div`
  color: ${({ theme }) => theme.colors.textFaded};
  font-size: 14px;
  letter-spacing: 0.5px;
  text-align: center;
  font-family: monospace;
  margin-bottom: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const ToggleContainer = styled.div`
  display: flex;
  align-items: center;
  background-color: rgba(26, 32, 53, 0.7);
  border-radius: 10px;
  box-shadow: ${({ theme }) => theme.shadows.small};
`;

export const ToggleOption = styled.span<{ $active: boolean }>`
  padding: 5px;
  padding-left: 20px;
  padding-right: 20px;
  border-radius: 10px;
  cursor: pointer;
  background-color: ${({ $active, theme }) => $active ? theme.colors.primary : 'transparent'};
  color: ${({ $active, theme }) => $active ? theme.colors.textLight : theme.colors.textFaded};
  transition: all 0.2s ease;
  font-family: Inter;
  font-size: 14px;
  
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
  margin-bottom: ${({ theme }) => theme.spacing.large};
`;

export const ExecutionTitle = styled.h3`
  font-size: ${({ theme }) => theme.sizes.large};
  margin-bottom: ${({ theme }) => theme.spacing.medium};
  color: ${({ theme }) => theme.colors.textHighlight};
`;

export const ExecutionStep = styled.div`
  font-size: ${({ theme }) => theme.sizes.small};
  color: ${({ theme }) => theme.colors.textSecondary};
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

export const ExecuteButton = styled(Button)<{ $animate?: AnimationState }>`
  margin-top: ${({ theme }) => theme.spacing.large};
  margin-bottom: ${({ theme }) => theme.spacing.xxl};
  border-radius: 20px;
  padding-top: 5px;
  padding-bottom: 5px;
  padding-left: 30px;
  padding-right: 30px;
  animation: ${glowRipple} 2s infinite cubic-bezier(0.36, 0.11, 0.89, 0.32);
  opacity: ${({ $animate }) => $animate === 'commandPalette' ? 1 : 0};
  visibility: ${({ $animate }) => $animate === 'commandPalette' ? 'visible' : 'hidden'};
  transition: opacity 0.8s ease-in-out, visibility 0.8s ease-in-out;
  color: white;
  background-color: ${({ theme, variant }) => 
    variant === 'primary' ? theme.colors.primary : theme.colors.surface};
  font-family: monospace;
  letter-spacing: 1px;
  
  &:hover {
    animation-play-state: paused;
    background-color: ${({ theme, variant }) => 
      variant === 'primary' ? theme.colors.primaryDark : theme.colors.surfaceLight};
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
  color: ${({ theme }) => theme.colors.error};
  margin-top: ${({ theme }) => theme.spacing.small};
  font-size: 14px;
`;

// Error Dialog Components
export const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
`;

export const ModalContainer = styled.div`
  background-color: rgba(13, 17, 23, 0.85);
  backdrop-filter: blur(8px);
  border-radius: 12px;
  padding: ${({ theme }) => theme.spacing.large};
  max-width: 500px;
  width: 90%;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
`;

export const ModalTitle = styled.h3`
  color: ${({ theme }) => theme.colors.error};
  margin-top: 0;
  font-size: 20px;
  font-weight: 600;
  margin-bottom: ${({ theme }) => theme.spacing.medium};
  font-family: 'JetBrains Mono', monospace;
`;

export const ModalMessage = styled.p`
  color: ${({ theme }) => theme.colors.textLight};
  font-size: 16px;
  line-height: 1.5;
  margin-bottom: ${({ theme }) => theme.spacing.large};
`;

export const ModalButtonContainer = styled.div`
  display: flex;
  justify-content: flex-end;
`;

export const ModalButton = styled.button`
  padding: 8px 20px;
  background-color: ${({ theme }) => theme.colors.primary};
  color: #ffffff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  
  &:hover {
    background-color: ${({ theme }) => theme.colors.primaryLight};
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  }
  
  &:active {
    transform: translateY(0);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
`;

export const NotificationContainer = styled.div`
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.9);
  color: #ff4444;
  padding: 12px 24px;
  border-radius: 8px;
  z-index: 2000;
  font-family: monospace;
  max-width: 80%;
  text-align: center;
  pointer-events: none; // Allow clicking through the notification
`;