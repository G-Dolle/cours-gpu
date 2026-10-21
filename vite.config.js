import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages sert le site sous /cours-gpu/ ; en dev on reste à la racine.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/cours-gpu/' : '/',
  plugins: [react()],
  server: { host: 'localhost' },
}))
