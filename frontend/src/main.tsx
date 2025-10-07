import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createGlobalStyle, ThemeProvider } from 'styled-components';
import { theme } from './theme';
import App from './App.tsx';

const GlobalStyle = createGlobalStyle`
  :root {
    font-family: ${({ theme }) => theme.typography.families.system};
    line-height: 1.5;
    font-weight: ${({ theme }) => theme.typography.weights.normal};

    color-scheme: light dark;
    color: rgba(255, 255, 255, 0.87);
    background-color: ${({ theme }) => theme.colors.background.body};

    font-synthesis: none;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  a {
    font-weight: ${({ theme }) => theme.typography.weights.medium};
    color: ${({ theme }) => theme.colors.interactive.focus};
    text-decoration: inherit;
  }
  a:hover {
    color: #535bf2;
  }

  body {
    margin: 0;
    display: flex;
    place-items: center;
    min-width: 320px;
    min-height: 100vh;
  }

  h1 {
    font-size: ${({ theme }) => theme.typography.sizes.xl};
    line-height: 1.1;
  }

  button {
    border-radius: ${({ theme }) => theme.radii.lg};
    border: 1px solid transparent;
    padding: 0.6em 1.2em;
    font-size: ${({ theme }) => theme.typography.sizes.lg};
    font-weight: ${({ theme }) => theme.typography.weights.medium};
    font-family: inherit;
    background-color: ${({ theme }) => theme.colors.background.surface};
    cursor: pointer;
    transition: border-color 0.25s;
  }
  button:hover {
    border-color: ${({ theme }) => theme.colors.interactive.borderHover};
  }
  button:focus,
  button:focus-visible {
    outline: 4px auto -webkit-focus-ring-color;
  }

  @media (prefers-color-scheme: light) {
    :root {
      color: #213547;
      background-color: #ffffff;
    }
    a:hover {
      color: #747bff;
    }
    button {
      background-color: #f9f9f9;
    }
  }
`;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      <App />
    </ThemeProvider>
  </StrictMode>,
)
