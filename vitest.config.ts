import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // jsdom UI tests run ~5s on slow machines (PRoot) under full-suite load; default 5s flakes.
    testTimeout: 15000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/utils/**', 'src/hooks/**', 'src/components/**', 'src/pages/**'],
      exclude: ['src/test/**', '**/*.test.*', '**/*.spec.*'],
    },
  },
})
