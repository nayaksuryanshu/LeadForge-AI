import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { LeadsProvider } from './context/LeadsContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <LeadsProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </LeadsProvider>
    </AuthProvider>
  </StrictMode>,
)
