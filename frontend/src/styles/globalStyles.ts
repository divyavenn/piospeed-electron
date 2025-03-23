import { createGlobalStyle } from 'styled-components';

// Define theme colors and properties
export const theme = {
  colors: {
    background: '#0A0F1F',
    surface: '#151E33',
    surfaceLight: '#1E283A',
    surfaceBorder: '#2C3E50',
    primary: '#3961FB',
    primaryDark: '#2E52E0',
    secondary: '#FF9800',
    secondaryDark: '#F57C00',
    text: '#e1e1e8',
    textHighlight: '#FFFFFF',
    textFaded: '#B3E5FC',
    error: '#FF5252',
    disabled: '#45526e',
    border: '#384860',
  },
  fonts: {
    primary: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    monospace: 'Monaco, Consolas, "Courier New", monospace',
  },
  sizes: {
    small: '0.9rem',
    normal: '1rem',
    medium: '1.1rem',
    large: '1.4rem',
    xlarge: '2.5rem',
  },
  borderRadius: {
    small: '4px',
    normal: '6px',
    large: '8px',
  },
  spacing: {
    xs: '4px',
    small: '8px',
    normal: '12px',
    medium: '16px',
    large: '20px',
    xl: '24px',
    xxl: '32px',
  },
  shadows: {
    small: '0 2px 4px rgba(0, 0, 0, 0.2)',
    normal: '0 4px 8px rgba(0, 0, 0, 0.2)',
    large: '0 5px 15px rgba(0, 0, 0, 0.3)',
    glow: '0 0 10px rgba(57, 97, 251, 0.3)',
  },
  animations: {
    pulse: '@keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(57, 97, 251, 0.4); } 70% { box-shadow: 0 0 0 10px rgba(57, 97, 251, 0); } 100% { box-shadow: 0 0 0 0 rgba(57, 97, 251, 0); } }',
  },
  transitions: {
    normal: 'all 0.3s ease',
    fast: 'all 0.15s ease',
  },
};

// Global styles
export const GlobalStyle = createGlobalStyle<{ theme: typeof theme }>`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: ${({ theme }) => theme.fonts.primary};
    background-color: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.text};
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    overflow-x: hidden;
  }

  /* Set a more readable selection color */
  ::selection {
    background-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.textHighlight};
  }

  /* Scrollbar styling */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.colors.background};
  }

  ::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.primary};
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.colors.primaryDark};
  }

  /* Custom animations */
  @keyframes pulse {
    0% {
      box-shadow: 0 0 0 0 rgba(57, 97, 251, 0.4);
    }
    70% {
      box-shadow: 0 0 0 10px rgba(57, 97, 251, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(57, 97, 251, 0);
    }
  }

  /* Default button and input styling */
  button, input {
    font-family: ${({ theme }) => theme.fonts.primary};
    font-size: ${({ theme }) => theme.sizes.normal};
  }

  /* Set a max-width for body content on large screens */
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
  }

  /* For screen readers only */
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }
`; 