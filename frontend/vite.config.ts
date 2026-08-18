import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: true,
    proxy: {
      '/uploads': { target: 'http://localhost:3000' },
      '/riskimage': { target: 'http://localhost:3000' },
      '/trigger-tools': { target: 'http://localhost:3000', bypass: (req) => req.headers.accept?.includes('html') ? '/index.html' : undefined },
      '/rca': { target: 'http://localhost:3000', bypass: (req) => req.headers.accept?.includes('html') ? '/index.html' : undefined },
      '/incidents': { target: 'http://localhost:3000', bypass: (req) => req.headers.accept?.includes('html') ? '/index.html' : undefined },
      '/departments': { target: 'http://localhost:3000', bypass: (req) => req.headers.accept?.includes('html') ? '/index.html' : undefined },
      '/auth': { target: 'http://localhost:3000', bypass: (req) => req.headers.accept?.includes('html') ? '/index.html' : undefined },
      '/risk-analysis': { target: 'http://localhost:3000', bypass: (req) => req.headers.accept?.includes('html') ? '/index.html' : undefined },
    }
  }
})
