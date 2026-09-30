import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Served from GitHub Pages at https://ritesh-dhekane.github.io/streakline/
export default defineConfig({
  base: '/streakline/',
  plugins: [react(), tailwindcss()],
  test: {
    passWithNoTests: true,
    include: ['src/**/*.test.{ts,tsx}', 'shared/**/*.test.ts', 'worker/**/*.test.ts'],
  },
})
