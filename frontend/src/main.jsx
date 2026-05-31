import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { loader } from '@monaco-editor/react';
import './index.css';
import App from './App.jsx';
import { AppProvider } from './context/AppContext';

loader.init().then((monaco) => {
    monaco.editor.defineTheme('dark-surface', {
        base: 'vs-dark',
        inherit: true,
        rules: [],
        colors: {
            'editor.background': '#4a4e51',
        },
    });
    monaco.editor.defineTheme('light-surface', {
        base: 'vs',
        inherit: true,
        rules: [],
        colors: {
            'editor.background': '#eaebed',
        },
    });
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AppProvider>
        <App />
      </AppProvider>
    </BrowserRouter>
  </StrictMode>,
);