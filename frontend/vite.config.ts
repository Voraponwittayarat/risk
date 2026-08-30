import { defineConfig, type ProxyOptions } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const backendTarget = 'http://127.0.0.1:3000'
const apiProxy: ProxyOptions = {
  target: backendTarget,
  changeOrigin: true,
  // The browser talks to Vite on the same origin. This trusted internal Origin
  // keeps the backend's development CORS policy from rejecting the proxy hop.
  headers: { Origin: 'http://localhost:5173' },
  bypass: (req) => req.headers.accept?.includes('html') ? '/index.html' : undefined,
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: true,
    proxy: {
      '/uploads': { target: backendTarget, changeOrigin: true },
      '/riskimage': { target: backendTarget, changeOrigin: true },
      '/auth': { ...apiProxy },
      '/capa': { ...apiProxy },
      '/departments': { ...apiProxy },
      '/incidents': { ...apiProxy },
      '/members': { ...apiProxy },
      '/nrls-riskstore': { ...apiProxy },
      '/programs': { ...apiProxy },
      '/rca': { ...apiProxy },
      '/risk-analysis': { ...apiProxy },
      '/risk-topics': { ...apiProxy },
      '/trigger-tools': { ...apiProxy },
      '/users': { ...apiProxy },
    }
  }
})
