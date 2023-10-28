import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  {
    test: {
      name: 'create-tealina',
      include: ['packages/create-tealina/test/**/*.test.ts'],
    },
  },
  {
    test: {
      name: 'tealina',
      include: ['packages/tealina/test/**/*.test.ts'],
    },
  },
  {
    test: {
      name: 'tealina-doc-ui',
      include: ['packages/tealina-doc-ui/test/**/*.test.ts'],
    },
  },
  {
    test: {
      name: 'doc-ui-src',
      environment: 'jsdom',
      include: ['packages/tealina-doc-ui-src/test/**/*.test.ts'],
      setupFiles: ['packages/tealina-doc-ui-src/test/setup.ts'],
    },
  },
])
