import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      'scholarsanchor': path.resolve(__dirname, './src'),
      'benchrex': path.resolve(__dirname, './src'),
      '@': path.resolve(__dirname, './src'),
    },
  },
})
