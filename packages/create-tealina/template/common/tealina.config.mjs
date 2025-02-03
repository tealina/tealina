// @ts-check
import { defineConfig } from 'tealina'
import apiTemplates from './dev-templates/handlers/index.mjs'

export default defineConfig({
  template: {
    handlers: apiTemplates,
  },
  testDir: 'test-integration',
  typesDir: 'types',
  gtype: {
    output: '../shared-type/pure.d.ts'
  }
})
