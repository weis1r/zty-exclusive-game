import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

function syncAppViewportHeight() {
  document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`)
}

syncAppViewportHeight()
window.addEventListener('resize', syncAppViewportHeight)
window.addEventListener('orientationchange', syncAppViewportHeight)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
