import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: {
    name: 'doc-ui-src',
    environment: 'jsdom',
    setupFiles: ['test/setup.ts'],
  },
})
