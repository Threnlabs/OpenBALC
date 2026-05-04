import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'benchrex': path.resolve(__dirname, './src'),
      '@': path.resolve(__dirname, './src'),
    },
  },
})
