import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { AlertProvider } from './shared/alerts/AlertProvider'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <AlertProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AlertProvider>
    </AuthProvider>
  </StrictMode>,
)
