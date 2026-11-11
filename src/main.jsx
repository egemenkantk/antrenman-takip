import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { OturumSaglayici } from './auth/OturumContext';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <OturumSaglayici>
      <App />
    </OturumSaglayici>
  </StrictMode>
);
