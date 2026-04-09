import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      axios: resolve(__dirname, 'src/shims/axios.ts'),
      'react-router-dom': resolve(__dirname, 'src/router/react-router-dom.tsx'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://support.bsquareg-developers.com',
        changeOrigin: true,
      },
    },
  },
})
