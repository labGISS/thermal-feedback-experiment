import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AccuracyApp } from './AccuracyApp.tsx'

const root = document.getElementById('root')!

createRoot(root).render(
  <StrictMode>
    {window.location.pathname === '/cube2/accuracy' ? <AccuracyApp /> : <App />}
  </StrictMode>,
)
