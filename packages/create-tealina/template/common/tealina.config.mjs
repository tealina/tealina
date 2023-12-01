// @ts-check
import { defineConfig } from 'tealina'
import apiTemplates from './dev-templates/handlers/index.mjs'
import { genTestSuite } from './dev-templates/test/index.mjs'

export default defineConfig({
  template: {
    handlers: apiTemplates,
    test: {
      genSuite: genTestSuite,
    },
  },
  testDir: 'test-integration',
  typesDir: 'types',
})
