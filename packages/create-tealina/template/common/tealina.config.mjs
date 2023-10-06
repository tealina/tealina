// @ts-check
import { defineConfig } from 'tealina'
import apiTemplates from './dev-templates/handlers/index.mjs'
import { genTestSuite, genTestHelper } from './dev-templates/test/index.mjs'

export default defineConfig({
  template: {
    handlers: apiTemplates,
    test: {
      genSuite: genTestSuite,
      genHelper: genTestHelper,
    },
  },
  testDir: 'test-integration',
  typesDir: 'types',
})
