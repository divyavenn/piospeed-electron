import { createGlobalStyle } from 'styled-components';
import  theme from './theme';

// Define theme colors and properties
export const GlobalStyle = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
      sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background-color: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.text};
    line-height: 1.6;
    overflow-x: hidden;
  }

  code {
    font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
      monospace;
  }

  button {
    cursor: pointer;
    border: none;
    outline: none;
    background: none;
    font-family: inherit;
  }

  a {
    color: inherit;
    text-decoration: none;
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
    background-color: transparent;
  }

  ::-webkit-scrollbar-track {
    background-color: transparent;
  }

  ::-webkit-scrollbar-thumb {
    background-color: rgba(150, 150, 150, 0.5);
    border-radius: 4px;
  }

  /* Hide scrollbar when not scrolling */
  *:not(:hover)::-webkit-scrollbar-thumb {
    background-color: transparent;
  }

  /* Firefox scrollbar styling */
  * {
    scrollbar-width: thin;
    scrollbar-color: rgba(150, 150, 150, 0.5) transparent;
  }

  /* For Firefox, to hide scrollbar when not in use */
  @-moz-document url-prefix() {
    * {
      scrollbar-width: thin;
      scrollbar-color: transparent transparent;
    }
    *:hover {
      scrollbar-color: rgba(150, 150, 150, 0.5) transparent;
    }
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