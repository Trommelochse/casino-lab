import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // Tailwind CSS v4 Vite plugin
  ],
  server: {
    port: 5173,
    proxy: {
      // Proxy API calls to backend
      '/state': 'http://localhost:3000',
      '/players': 'http://localhost:3000',
      '/simulate': 'http://localhost:3000',
    },
  },
})
