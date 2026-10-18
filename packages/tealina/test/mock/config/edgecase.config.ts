import { defineConfig } from '../../../src/index.js'

export default defineConfig({
  template: {
    handlers: [{ alias: 'c', generateFn: () => '', name: '' }],
    test: {
      genSuite: _ctx =>
        ['import {describe} from "vitest"', 'describe.skip(()=>{})'].join('\n'),
      genHelper: _ctx => 'const me = "test helper"',
    },
  },
  testDir: '',
  typesDir: '',
  apiDir: 'src/api',
  apiBaseURL: '/api',
})
