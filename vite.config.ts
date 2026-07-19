import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Relative asset URLs work locally and under a GitHub Pages repository path.
  base: './',
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'react', test: /node_modules[\\/]react(?:-dom)?[\\/]/u },
            { name: 'react-flow', test: /node_modules[\\/]@xyflow[\\/]/u },
          ],
        },
      },
    },
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test/setup.ts'],
  },
})
