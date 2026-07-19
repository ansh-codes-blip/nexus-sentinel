import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './', // This MUST be here for Electron packaging
  server: {
    port: 5173,
    strictPort: true
  }
})