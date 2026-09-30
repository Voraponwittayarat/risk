import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios'
import './index.css'
import App from './App.tsx'

axios.defaults.baseURL = import.meta.env.VITE_API_URL || window.location.origin

// Attach authentication before page effects issue requests, including hard refreshes.
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  const apiOrigin = new URL(axios.defaults.baseURL!, window.location.origin).origin;
  const requestBase = new URL(config.baseURL || axios.defaults.baseURL!, window.location.origin);
  const requestOrigin = new URL(config.url || '', requestBase).origin;
  if (token && requestOrigin === apiOrigin) config.headers.Authorization = `Bearer ${token}`;
  else delete config.headers.Authorization;
  return config;
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
