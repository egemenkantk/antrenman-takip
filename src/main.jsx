import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { OturumSaglayici } from './auth/OturumContext';
import App from './App';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <OturumSaglayici>
      <App />
    </OturumSaglayici>
  </StrictMode>
);
