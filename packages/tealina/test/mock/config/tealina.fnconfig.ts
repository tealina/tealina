import { defineConfig } from '../../../src/index.js'
import { FuncTemplates } from './funcCRUD.js'

export default defineConfig({
  template: {
    handlers: FuncTemplates,
    test: {
      genSuite: ctx =>
        ['import {describe} from "vitest"', 'describe.skip(()=>{})'].join('\n'),
      genHelper: ctx => 'const me = "test hepler"',
    },
  },
  testDir: '',
  typesDir: '',
})
