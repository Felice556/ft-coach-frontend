import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { applicaTema, leggiSceltaTema, seguiTemaDelTelefono } from './tema';

// Tema salvato (o quello del telefono) e aggiornamento automatico se il telefono passa da chiaro a scuro.
applicaTema(leggiSceltaTema());
seguiTemaDelTelefono();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
