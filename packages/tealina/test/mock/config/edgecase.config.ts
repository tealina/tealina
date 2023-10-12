import { defineConfig } from '../../../src/index.js'

export default defineConfig({
  template: {
    handlers: [{ alias: 'c', generateFn: x => '', name: '' }],
    test: {
      genSuite: ctx =>
        ['import {describe} from "vitest"', 'describe.skip(()=>{})'].join('\n'),
      genHelper: ctx => 'const me = "test helper"',
    },
  },
  testDir: '',
  typesDir: '',
})
