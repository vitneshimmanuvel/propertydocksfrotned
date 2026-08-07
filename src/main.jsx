import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// Suppress legacy Google Places billing warnings from browser console
if (typeof window !== 'undefined') {
  const origError = console.error;
  console.error = function (...args) {
    if (args[0] && typeof args[0] === 'string' && (args[0].includes('Google Maps') || args[0].includes('Places API') || args[0].includes('BillingNotEnabledMapError'))) {
      return;
    }
    origError.apply(console, args);
  };
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
