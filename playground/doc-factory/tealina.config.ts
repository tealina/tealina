// @ts-check
import { defineConfig } from 'tealina'

export default defineConfig({
  template: {
    handlers: [],
    test: {
      genSuite: () => '',
    },
  },
  testDir: 'test-integration',
  typesDir: 'types',
})
