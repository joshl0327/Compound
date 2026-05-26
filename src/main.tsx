import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { DataProvider } from './context/DataContext'
import { UIProvider } from './context/UIContext'
import { AuthProvider } from './context/AuthContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <DataProvider>
        <UIProvider>
          <App />
        </UIProvider>
      </DataProvider>
    </AuthProvider>
  </StrictMode>,
)
